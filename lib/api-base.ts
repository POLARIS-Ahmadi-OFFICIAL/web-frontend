/**
 * Browser: same-origin `/api/v1` via Next.js rewrite (avoids CORS).
 * Server: direct backend URL from env.
 */
export function getApiBase(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8080";
}
