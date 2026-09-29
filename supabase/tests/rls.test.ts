import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anon, createUser, push, removeUsers, storedRow, type TestUser } from "./helpers";

// Phase 0 gate (issue #2, §15): user B can't read, write or delete user A's rows.
describe("records row-level security", () => {
  let a: TestUser;
  let b: TestUser;

  beforeAll(async () => {
    a = await createUser("a");
    b = await createUser("b");
    await push(a.client, [
      { kind: "folder", id: "f-start", data: { name: "A's start" }, modified_at: 1000, modified_by: "dev-a" },
      { kind: "card", id: "c-secret", data: { title: "A's secret" }, modified_at: 1000, modified_by: "dev-a" },
    ]);
  });

  afterAll(() => removeUsers(a, b));

  it("lets a user read their own rows", async () => {
    const { data, error } = await a.client.from("records").select("kind, id, data");
    expect(error).toBeNull();
    expect(data).toHaveLength(2);
  });

  it("hides another user's rows", async () => {
    const { data, error } = await b.client.from("records").select("*");
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const byOwner = await b.client.from("records").select("*").eq("user_id", a.id);
    expect(byOwner.data).toEqual([]);
  });

  it("doesn't let another user update or delete them", async () => {
    const updated = await b.client
      .from("records")
      .update({ data: { title: "hijacked" }, modified_at: 9999 })
      .eq("user_id", a.id)
      .select();
    expect(updated.data ?? []).toEqual([]);

    const deleted = await b.client.from("records").delete().eq("user_id", a.id).select();
    expect(deleted.data ?? []).toEqual([]);

    expect((await storedRow(a.id, "card", "c-secret"))?.data).toEqual({ title: "A's secret" });
  });

  it("doesn't let a user insert rows owned by someone else", async () => {
    const { error } = await b.client.from("records").insert({
      user_id: a.id,
      kind: "card",
      id: "c-planted",
      data: {},
      modified_at: 1,
      modified_by: "dev-b",
    });
    expect(error?.code).toBe("42501");
    expect(await storedRow(a.id, "card", "c-planted")).toBeNull();
  });

  it("keeps the same starter id separate per user", async () => {
    // Starter ids repeat across accounts; B's push must not touch A's copy.
    await push(b.client, [
      { kind: "folder", id: "f-start", data: { name: "B's start" }, modified_at: 5000, modified_by: "dev-b" },
    ]);
    expect((await storedRow(a.id, "folder", "f-start"))?.data).toEqual({ name: "A's start" });
    expect((await storedRow(b.id, "folder", "f-start"))?.data).toEqual({ name: "B's start" });
  });

  it("gives signed-out clients nothing", async () => {
    const client = anon();
    const read = await client.from("records").select("*");
    expect(read.data ?? []).toEqual([]);
    expect(read.error?.code).toBe("42501");

    const rpc = await client.rpc("push_records", {
      changes: [{ kind: "card", id: "c-x", data: {}, modified_at: 1, modified_by: "anon" }],
    });
    expect(rpc.error).not.toBeNull();
  });
});
