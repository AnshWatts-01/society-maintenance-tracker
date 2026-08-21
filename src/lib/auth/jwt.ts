/**
 * Minimal, dependency-free HS256 JWT sign/verify built on the Web Crypto API
 * (`crypto.subtle`), which is available both in Node.js API routes and in
 * the Edge runtime used by `middleware.ts` — one implementation works
 * everywhere, so we avoid adding `jsonwebtoken` (which also assumes a Node
 * runtime and would break middleware) or maintaining two code paths.
 */

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + "=".repeat(padding));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const textToBase64Url = (text: string) => bytesToBase64Url(new TextEncoder().encode(text));
const base64UrlToText = (value: string) => new TextDecoder().decode(base64UrlToBytes(value));

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export interface SessionJwtPayload {
  sub: string;
  role: "RESIDENT" | "ADMIN";
  email: string;
  iat: number;
  exp: number;
}

const HEADER_SEGMENT = textToBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));

export async function signSessionJwt(
  payload: Omit<SessionJwtPayload, "iat" | "exp">,
  secret: string,
  expiresInSeconds: number
): Promise<string> {
  const key = await importHmacKey(secret);
  const iat = Math.floor(Date.now() / 1000);
  const fullPayload: SessionJwtPayload = { ...payload, iat, exp: iat + expiresInSeconds };

  const data = `${HEADER_SEGMENT}.${textToBase64Url(JSON.stringify(fullPayload))}`;
  const signatureBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${bytesToBase64Url(new Uint8Array(signatureBytes))}`;
}

/**
 * Returns null for ANY invalid token rather than throwing. A malformed
 * cookie is an expected, attacker-controllable input — `atob` throws on
 * non-base64 segments, and an exception escaping here would surface as a
 * 500 from Edge middleware instead of a clean redirect to /login.
 */
export async function verifySessionJwt(token: string, secret: string): Promise<SessionJwtPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerSeg, payloadSeg, signatureSeg] = parts as [string, string, string];

    // Only HS256 is ever accepted, so a token advertising "none" (or any
    // other algorithm) is rejected before its signature is even considered.
    const header = JSON.parse(base64UrlToText(headerSeg)) as { alg?: string };
    if (header.alg !== "HS256") return null;

    const key = await importHmacKey(secret);
    const data = `${headerSeg}.${payloadSeg}`;
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(signatureSeg),
      new TextEncoder().encode(data)
    );
    if (!isValid) return null;

    const payload = JSON.parse(base64UrlToText(payloadSeg)) as SessionJwtPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (typeof payload.sub !== "string" || (payload.role !== "RESIDENT" && payload.role !== "ADMIN")) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
