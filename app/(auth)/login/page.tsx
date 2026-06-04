import { Suspense } from "react";

import { LoginPageClient } from "@/components/pages/LoginPageClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--st-muted)]">Loading…</div>}>
      <LoginPageClient />
    </Suspense>
  );
}
