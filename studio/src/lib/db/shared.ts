import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type TypedSupabaseClient = SupabaseClient<Database>;

export async function createDbClient() {
  return createSupabaseServerClient();
}

export function assertNoDbError(error: PostgrestError | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}
