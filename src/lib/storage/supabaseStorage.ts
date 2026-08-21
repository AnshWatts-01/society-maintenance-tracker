/**
 * Direct-to-cloud photo pipeline, talking to the Supabase Storage REST API
 * with plain `fetch` (no `@supabase/supabase-js` dependency — the whole
 * integration is two well-defined HTTP calls). The server only ever mints a
 * short-lived, single-object signed upload URL; the actual photo bytes are
 * PUT straight from the browser to Supabase and never transit our own
 * Next.js server or count against its request body limits.
 */

function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  return url.replace(/\/$/, "");
}

function serviceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return key;
}

function bucketName(): string {
  return process.env.SUPABASE_STORAGE_BUCKET ?? "complaint-photos";
}

/** True only when every storage variable needed to mint an upload URL is set. */
export function isStorageConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function publicObjectUrl(objectPath: string): string {
  return `${supabaseUrl()}/storage/v1/object/public/${bucketName()}/${objectPath}`;
}

/**
 * Accepts only the exact shape `buildObjectPath` emits, owned by this
 * resident. Requiring exactly two segments makes `..` traversal
 * unrepresentable, so a client cannot claim an object in someone else's
 * namespace by hand-crafting a path.
 */
export function isOwnedObjectPath(residentId: string, objectPath: string): boolean {
  const segments = objectPath.split("/");
  if (segments.length !== 2) return false;
  if (segments[0] !== residentId) return false;
  return /^\d+-[a-zA-Z0-9._-]{1,100}$/.test(segments[1]!);
}

export interface SignedUploadTarget {
  /** Absolute URL the browser PUTs the raw file bytes to. */
  uploadUrl: string;
  /** Storage object path, persisted as Complaint.photoPath. */
  path: string;
  /** Absolute URL to display the photo once the upload completes. */
  publicUrl: string;
}

export async function createSignedUploadTarget(objectPath: string): Promise<SignedUploadTarget> {
  const base = supabaseUrl();
  const bucket = bucketName();

  const response = await fetch(`${base}/storage/v1/object/upload/sign/${bucket}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey(),
      Authorization: `Bearer ${serviceRoleKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`Failed to create signed upload URL (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { url: string };
  return {
    uploadUrl: `${base}/storage/v1${data.url}`,
    path: objectPath,
    publicUrl: publicObjectUrl(objectPath),
  };
}

/** Namespaces every object under the uploading resident's own id, so a leaked
 *  signed token still only ever grants writes within that resident's folder. */
export function buildObjectPath(residentId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
  return `${residentId}/${Date.now()}-${safeName}`;
}
