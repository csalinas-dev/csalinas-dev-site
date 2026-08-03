import { rateLimit } from "@/lib/rate-limit";

import { badRequest } from "./errors";

// Small helpers the four room routes share, so each handler is just its own
// logic plus a try/catch.

export function clientIp(request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

/** @returns a 429 Response when the caller is over budget, otherwise null. */
export function limitOr429(key, limit, windowMs) {
  const result = rateLimit(key, limit, windowMs);
  if (result.ok) return null;
  return Response.json(
    { error: "rate-limited", message: "Slow down a moment." },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
  );
}

/** Parse a JSON body, turning a malformed one into a 400 rather than a 500. */
export async function readJson(request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("not an object");
    }
    return body;
  } catch {
    throw badRequest("Expected a JSON object body.");
  }
}
