import { createClient } from "@supabase/supabase-js";

// Bypasses RLS — server-side only, never import in client components.
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log("[createServiceClient] SUPABASE_SERVICE_ROLE_KEY length:", key?.length ?? "undefined");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
