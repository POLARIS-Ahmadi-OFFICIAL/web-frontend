"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function AuthNav() {
  const [email, setEmail] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut();
      window.location.href = "/login";
    }
  }

  if (!supabase) {
    return (
      <Link href="/login" className="px-3 text-xs text-[var(--st-muted)] hover:text-[var(--st-text)]">
        Sign in
      </Link>
    );
  }

  return (
    <div className="mt-auto border-t border-[var(--st-border)] px-3 py-4">
      {email ? (
        <>
          <p className="truncate text-xs text-[var(--st-muted)]">{email}</p>
          <button
            type="button"
            onClick={signOut}
            className="mt-2 w-full text-left text-xs text-[var(--st-primary)] hover:underline"
          >
            Sign out
          </button>
        </>
      ) : (
        <Link href="/login">
          <Button variant="secondary" fullWidth>
            Sign in with GitHub
          </Button>
        </Link>
      )}
    </div>
  );
}
