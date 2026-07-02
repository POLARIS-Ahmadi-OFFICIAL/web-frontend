"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

function isDesktopBypass() {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("polaris_desktop=1")) ||
    document.cookie.split(";").some((c) => c.trim().startsWith("polaris_dev_bypass=1"));
}

export function useAccessToken() {
  const [token, setToken] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) {
      // No Supabase configured — use a sentinel so token-gated UI is not hard-disabled
      // in desktop or dev-bypass mode. Backend accepts missing bearer when auth_disabled=true.
      if (isDesktopBypass()) setToken("__bypass__");
      return;
    }
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setToken(session?.access_token ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  return token;
}
