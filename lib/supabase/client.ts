import { createBrowserClient } from "@supabase/ssr";

// Database generic omitted intentionally — supabase-js 2.x GenericSchema constraints
// conflict with our hand-written types. Results are cast explicitly at call sites.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
