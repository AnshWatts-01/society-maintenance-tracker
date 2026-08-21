/**
 * Browser-side half of the direct-to-cloud pipeline: PUTs the file straight
 * to the signed Supabase Storage URL minted by /api/uploads/sign-url. The
 * anon key is intentionally public (Supabase's model, gated further by the
 * request-scoped signed token and bucket policies), so this is safe to run
 * client-side without exposing the service role key.
 */
export async function uploadFileDirect(uploadUrl: string, file: File): Promise<void> {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured");

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Upload failed (${response.status}): ${await response.text()}`);
  }
}
