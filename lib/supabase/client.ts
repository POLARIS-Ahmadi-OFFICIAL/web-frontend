import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // Desktop always runs against the local backend with auth disabled — never
  // talk to Supabase there, even if a build accidentally baked in URL/key.
  if (typeof window !== "undefined" && window.polaris?.isDesktop) {
    return null;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return null;
  }
  return createBrowserClient(url, key);
}
