import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { inject } from "vitest";

const stack = inject("stack");

const options = { auth: { persistSession: false, autoRefreshToken: false } };

/** Bypasses row-level security: only for arranging and checking test state. */
export const admin = createClient(stack.url, stack.secretKey, options);

/** A client with no session, as a signed-out browser would have. */
export const anon = () => createClient(stack.url, stack.publishableKey, options);

export interface TestUser {
  id: string;
  email: string;
  client: SupabaseClient;
}

/** Creates a confirmed user and returns a client signed in as them. */
export async function createUser(label: string): Promise<TestUser> {
  // Tests sign in with a password; the app itself uses the emailed link.
  const email = `${label}-${crypto.randomUUID()}@test.local`;
  const password = crypto.randomUUID();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;

  const client = anon();
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  return { id: created.data.user.id, email, client };
}

/** Deletes users left over from a test, with their records (cascade) and images. */
export async function removeUsers(...users: TestUser[]) {
  for (const user of users) {
    const { data } = await admin.storage.from("note-images").list(user.id);
    if (data?.length) await admin.storage.from("note-images").remove(data.map((f) => `${user.id}/${f.name}`));
    await admin.auth.admin.deleteUser(user.id);
  }
}

export interface Change {
  kind: "folder" | "card" | "notebook" | "canvas_item";
  id: string;
  data?: Record<string, unknown>;
  deleted?: boolean;
  modified_at: number;
  modified_by: string;
}

export interface PushResult {
  applied: string[];
  skipped: string[];
  server_time: string;
}

export async function push(client: SupabaseClient, changes: Change[]): Promise<PushResult> {
  const { data, error } = await client.rpc("push_records", { changes });
  if (error) throw error;
  return data as PushResult;
}

/** A row as stored, read with the secret key so row-level security can't hide it. */
export async function storedRow(userId: string, kind: string, id: string) {
  const { data, error } = await admin
    .from("records")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** A 1×1 transparent PNG. */
export const PNG = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="),
  (c) => c.charCodeAt(0),
);
