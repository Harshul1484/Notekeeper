import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createUser, push, removeUsers, storedRow, type Change, type TestUser } from "./helpers";

// push_records: conditional upsert, last write wins (issue #2, §8 and §9.4).
describe("push_records", () => {
  let u: TestUser;

  beforeAll(async () => {
    u = await createUser("push");
  });

  afterAll(() => removeUsers(u));

  const card = (id: string, title: string, modified_at: number, modified_by = "dev-a"): Change => ({
    kind: "card",
    id,
    data: { title },
    modified_at,
    modified_by,
  });

  it("inserts new records and reports them as applied", async () => {
    const result = await push(u.client, [card("c-1", "first", 100), card("c-2", "second", 100)]);
    expect(result.applied.sort()).toEqual(["card:c-1", "card:c-2"]);
    expect(result.skipped).toEqual([]);
    expect(typeof result.server_time).toBe("string");
  });

  it("applies a newer edit", async () => {
    const result = await push(u.client, [card("c-1", "newer", 200)]);
    expect(result.applied).toEqual(["card:c-1"]);
    expect((await storedRow(u.id, "card", "c-1"))?.data).toEqual({ title: "newer" });
  });

  it("skips an older edit and keeps the stored version", async () => {
    const result = await push(u.client, [card("c-1", "stale", 150)]);
    expect(result).toMatchObject({ applied: [], skipped: ["card:c-1"] });
    expect((await storedRow(u.id, "card", "c-1"))?.data).toEqual({ title: "newer" });
  });

  it("breaks a timestamp tie by the higher device id", async () => {
    await push(u.client, [card("c-tie", "from m", 300, "dev-m")]);

    const lower = await push(u.client, [card("c-tie", "from a", 300, "dev-a")]);
    expect(lower.skipped).toEqual(["card:c-tie"]);

    const higher = await push(u.client, [card("c-tie", "from z", 300, "dev-z")]);
    expect(higher.applied).toEqual(["card:c-tie"]);
    expect((await storedRow(u.id, "card", "c-tie"))?.data).toEqual({ title: "from z" });
  });

  it("stores a delete as a tombstone with empty data", async () => {
    await push(u.client, [{ kind: "card", id: "c-2", data: { title: "ignored" }, deleted: true, modified_at: 400, modified_by: "dev-a" }]);
    const row = await storedRow(u.id, "card", "c-2");
    expect(row).toMatchObject({ deleted: true, data: {} });
  });

  it("lets a later edit bring a deleted record back", async () => {
    await push(u.client, [card("c-2", "restored", 500)]);
    expect(await storedRow(u.id, "card", "c-2")).toMatchObject({ deleted: false, data: { title: "restored" } });
  });

  it("moves the pull cursor only for applied changes", async () => {
    const before = (await storedRow(u.id, "card", "c-1"))!.server_updated_at;
    await push(u.client, [card("c-1", "stale again", 1)]);
    expect((await storedRow(u.id, "card", "c-1"))!.server_updated_at).toBe(before);

    await push(u.client, [card("c-1", "fresh", 600)]);
    const after = (await storedRow(u.id, "card", "c-1"))!.server_updated_at;
    expect(new Date(after).getTime()).toBeGreaterThan(new Date(before).getTime());
  });

  it("returns only the rows it can see when pulling by cursor", async () => {
    const { data, error } = await u.client
      .from("records")
      .select("kind, id, server_updated_at")
      .gt("server_updated_at", new Date(0).toISOString())
      .order("server_updated_at");
    expect(error).toBeNull();
    expect(data!.map((r) => `${r.kind}:${r.id}`).sort()).toEqual(["card:c-1", "card:c-2", "card:c-tie"]);
  });

  it("refuses more than 200 changes in one call", async () => {
    const many = Array.from({ length: 201 }, (_, i) => card(`c-bulk-${i}`, "x", 1));
    const { error } = await u.client.rpc("push_records", { changes: many });
    expect(error?.message).toMatch(/at most 200/);
    expect(await storedRow(u.id, "card", "c-bulk-0")).toBeNull();
  });

  it("refuses a record whose data is 1 MB or more", async () => {
    const big = { kind: "notebook", id: "n-big", data: { content: "x".repeat(1_100_000) }, modified_at: 1, modified_by: "dev-a" };
    const { error } = await u.client.rpc("push_records", { changes: [big] });
    expect(error).not.toBeNull();
    expect(await storedRow(u.id, "notebook", "n-big")).toBeNull();
  });

  it("rejects an unknown kind without applying the rest of the batch", async () => {
    const { error } = await u.client.rpc("push_records", {
      changes: [card("c-batch", "ok", 1), { kind: "tag", id: "t-1", data: {}, modified_at: 1, modified_by: "dev-a" }],
    });
    expect(error).not.toBeNull();
    expect(await storedRow(u.id, "card", "c-batch")).toBeNull();
  });
});
