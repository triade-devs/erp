import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { env } from "@/core/config/env";

export function createServiceClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY as string,
  );
}
