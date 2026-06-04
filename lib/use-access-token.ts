"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function useAccessToken() {
  const [token, setToken] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) {
      setToken(null);
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
