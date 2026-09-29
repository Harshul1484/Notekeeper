import { execSync } from "node:child_process";
import type { TestProject } from "vitest/node";

export interface LocalStack {
  url: string;
  publishableKey: string;
  secretKey: string;
}

declare module "vitest" {
  export interface ProvidedContext {
    stack: LocalStack;
  }
}

/** Reads the local stack's URL and keys, from env vars or from `supabase status`. */
function findStack(): LocalStack {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY } = process.env;
  if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY && SUPABASE_SECRET_KEY) {
    return { url: SUPABASE_URL, publishableKey: SUPABASE_PUBLISHABLE_KEY, secretKey: SUPABASE_SECRET_KEY };
  }
  let status: Record<string, string>;
  try {
    status = JSON.parse(execSync("npx supabase status -o json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  } catch {
    throw new Error("No local Supabase stack found. Start one with `npx supabase start` (needs Docker).");
  }
  return { url: status.API_URL, publishableKey: status.PUBLISHABLE_KEY, secretKey: status.SECRET_KEY };
}

export default function setup(project: TestProject) {
  project.provide("stack", findStack());
}
