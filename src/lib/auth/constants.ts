/**
 * Isolated so `middleware.ts` (Edge runtime) can read the cookie name
 * without importing `session.ts`, which pulls in `next/headers` — a
 * server-only module that is not available in Edge middleware.
 */
export const SESSION_COOKIE_NAME = "smt_session";
