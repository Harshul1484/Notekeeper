import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, createUser, PNG, push, removeUsers, type TestUser } from "./helpers";

const BUCKET = "note-images";

// Storage path policies and account deletion (issue #2, §8 and §10).
describe("note-images storage", () => {
  let a: TestUser;
  let b: TestUser;
  const path = () => `${a.id}/${crypto.randomUUID()}.png`;

  beforeAll(async () => {
    a = await createUser("img-a");
    b = await createUser("img-b");
  });

  afterAll(() => removeUsers(a, b));

  it("lets a user upload into their own folder and serves it by public URL", async () => {
    const p = path();
    const up = await a.client.storage.from(BUCKET).upload(p, PNG, { contentType: "image/png" });
    expect(up.error).toBeNull();

    const url = a.client.storage.from(BUCKET).getPublicUrl(p).data.publicUrl;
    const res = await fetch(url);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
  });

  it("refuses uploads into another user's folder", async () => {
    const { error } = await b.client.storage.from(BUCKET).upload(path(), PNG, { contentType: "image/png" });
    expect(error).not.toBeNull();
  });

  it("doesn't let another user overwrite, delete or list a file", async () => {
    const p = path();
    await a.client.storage.from(BUCKET).upload(p, PNG, { contentType: "image/png" });

    const overwrite = await b.client.storage.from(BUCKET).upload(p, PNG, { contentType: "image/png", upsert: true });
    expect(overwrite.error).not.toBeNull();

    // Removing something you can't see reports success but removes nothing.
    await b.client.storage.from(BUCKET).remove([p]);
    const stillThere = await admin.storage.from(BUCKET).list(a.id, { search: p.split("/")[1] });
    expect(stillThere.data).toHaveLength(1);

    expect((await b.client.storage.from(BUCKET).list(a.id)).data ?? []).toEqual([]);
    expect((await anon().storage.from(BUCKET).list(a.id)).data ?? []).toEqual([]);
  });

  it("refuses types other than images", async () => {
    const { error } = await a.client.storage
      .from(BUCKET)
      .upload(`${a.id}/${crypto.randomUUID()}.html`, "<script></script>", { contentType: "text/html" });
    expect(error).not.toBeNull();
  });
});

describe("delete_my_account", () => {
  let u: TestUser;

  beforeAll(async () => {
    u = await createUser("leaving");
    await push(u.client, [{ kind: "folder", id: "f-start", data: {}, modified_at: 1, modified_by: "dev" }]);
    await u.client.storage.from(BUCKET).upload(`${u.id}/${crypto.randomUUID()}.png`, PNG, { contentType: "image/png" });
  });

  afterAll(() => removeUsers(u).catch(() => {}));

  it("is refused for signed-out clients", async () => {
    const { error } = await anon().rpc("delete_my_account");
    expect(error).not.toBeNull();
  });

  it("removes the user and their records after the client empties their images", async () => {
    // The order agreed on the issue: Storage API first, then the RPC.
    const { data: files } = await u.client.storage.from(BUCKET).list(u.id);
    expect(files).toHaveLength(1);
    const removed = await u.client.storage.from(BUCKET).remove(files!.map((f) => `${u.id}/${f.name}`));
    expect(removed.error).toBeNull();

    const { error } = await u.client.rpc("delete_my_account");
    expect(error).toBeNull();

    expect((await admin.auth.admin.getUserById(u.id)).data.user).toBeNull();
    const rows = await admin.from("records").select("id").eq("user_id", u.id);
    expect(rows.data).toEqual([]);
    expect((await admin.storage.from(BUCKET).list(u.id)).data ?? []).toEqual([]);
  });
});
