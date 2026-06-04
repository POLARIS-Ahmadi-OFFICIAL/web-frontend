import { type NextRequest } from "next/server";

/** Hypothesis agent can take 1–3+ minutes (multiple LLM calls). */
export const maxDuration = 300;

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8080";
const PROXY_TIMEOUT_MS = 300_000;

/** PNG and other binary responses must not pass through res.text() (corrupts bytes). */
function isBinaryContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const ct = contentType.toLowerCase();
  return (
    ct.startsWith("image/") ||
    ct.startsWith("application/octet-stream") ||
    ct.startsWith("application/pdf")
  );
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const segment = path.join("/");
  const target = `${BACKEND}/api/v1/${segment}${request.nextUrl.search}`;
  const isStream = segment.includes("hypothesis/chat/stream");
  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");

  const headers = new Headers();
  if (contentType) headers.set("content-type", contentType);
  const auth = request.headers.get("authorization");
  if (auth) headers.set("authorization", auth);
  if (isStream) headers.set("accept", "text/event-stream");

  const init: RequestInit = {
    method: request.method,
    headers,
    signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = isMultipart ? await request.arrayBuffer() : await request.text();
  }

  try {
    const res = await fetch(target, init);

    if (isStream && res.body) {
      return new Response(res.body, {
        status: res.status,
        headers: {
          "content-type": res.headers.get("content-type") ?? "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        },
      });
    }

    const responseContentType = res.headers.get("content-type");
    if (isBinaryContentType(responseContentType)) {
      const body = await res.arrayBuffer();
      const outHeaders = new Headers();
      if (responseContentType) outHeaders.set("content-type", responseContentType);
      const len = res.headers.get("content-length");
      if (len) outHeaders.set("content-length", len);
      const disposition = res.headers.get("content-disposition");
      if (disposition) outHeaders.set("content-disposition", disposition);
      return new Response(body, { status: res.status, headers: outHeaders });
    }

    const body = await res.text();
    const outHeaders: HeadersInit = {
      "content-type": responseContentType ?? "application/json",
    };
    if (segment === "settings" && request.method === "GET") {
      outHeaders["cache-control"] = "no-store, no-cache, must-revalidate";
    }
    return new Response(body, {
      status: res.status,
      headers: outHeaders,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Backend proxy request failed";
    const isTimeout = message.includes("aborted") || message.includes("timeout");
    const isHypothesis = segment.includes("hypothesis");
    if (isHypothesis) {
      return Response.json(
        {
          stage: "initial",
          assistant_message: "",
          options: [],
          error: isTimeout
            ? "Request timed out waiting for the hypothesis agent. The backend may still be processing — try again in a minute, or call the API directly on port 8080."
            : `Proxy error: ${message}`,
        },
        { status: isTimeout ? 504 : 502 },
      );
    }
    const agentLabel = segment.includes("curve-fitting")
      ? "Curve Fitting Agent"
      : segment.includes("analysis")
        ? "Analysis Agent"
        : segment.includes("experiment")
          ? "Experiment Agent"
          : "Agent";
    const timeoutHint = segment.includes("curve-fitting")
      ? "Curve fitting can take several minutes per plate — try again or use a smaller file."
      : segment.includes("analysis") || segment.includes("experiment")
        ? "LLM agents can take several minutes — wait and retry, or call the API on port 8080 directly."
        : "Try again in a minute.";
    return Response.json(
      {
        agent: agentLabel,
        status: "error",
        message: isTimeout ? `Request timed out. ${timeoutHint}` : `Proxy error: ${message}`,
        data: {},
      },
      { status: isTimeout ? 504 : 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
