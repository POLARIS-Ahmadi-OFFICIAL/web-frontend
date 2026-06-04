"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { Alert, Button, StreamlitPage } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function LoginPageClient() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const error = searchParams.get("error")
    ? "Sign-in failed. Check Supabase GitHub provider configuration."
    : actionError;

  async function signInWithGitHub() {
    const supabase = createClient();
    if (!supabase) {
      setActionError("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and ANON_KEY.");
      return;
    }
    setLoading(true);
    setActionError(null);
    const next = searchParams.get("next") || "/home";
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo },
    });
    if (authError) {
      setActionError(authError.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--st-main)] p-6">
      <div className="w-full max-w-md">
        <StreamlitPage title="Sign in to POLARIS" layout="centered">
          <p className="mb-4 text-sm text-[var(--st-muted)]">
            Use your GitHub account via Supabase Auth. Enable the GitHub provider in your Supabase
            dashboard and add this redirect URL:
          </p>
          <code className="mb-4 block rounded bg-[var(--st-code-bg)] p-2 text-xs text-[var(--st-code-text)]">
            {typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback`
              : "http://localhost:3000/auth/callback"}
          </code>
          {error ? <Alert variant="error">{error}</Alert> : null}
          {!supabaseConfigured ? (
            <Alert variant="warning">
              Supabase env vars missing — configure .env.local or continue without auth (API
              AUTH_DISABLED).
            </Alert>
          ) : null}
          <div className="mt-4 space-y-2">
            <Button fullWidth onClick={signInWithGitHub} disabled={loading || !supabaseConfigured}>
              {loading ? "Redirecting…" : "Continue with GitHub"}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                const next = searchParams.get("next") || "/home";
                document.cookie = "polaris_dev_bypass=1; path=/; max-age=86400; SameSite=Lax";
                window.location.href = next;
              }}
            >
              Skip (dev only)
            </Button>
          </div>
        </StreamlitPage>
      </div>
    </div>
  );
}
