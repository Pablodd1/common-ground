// Supabase Storage REST client for the private "media" bucket. All calls run
// server-side with the service key; the browser only ever receives short-lived
// signed URLs, so object bytes never pass through the Vercel function.
import { env } from "./env";

const SERVICE_HEADERS = () => ({
  apikey: env.supabaseServiceKey,
  Authorization: `Bearer ${env.supabaseServiceKey}`,
  "Content-Type": "application/json",
});

function storageUrl(path: string): string {
  return `${env.supabaseUrl}/storage/v1${path}`;
}

/** Builds a REST path with each key segment encoded exactly once. */
function objectPath(prefix: string, key: string): string {
  return `${prefix}/${env.storageBucket}/${key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function absolute(signedPath: string): string {
  return signedPath.startsWith("http")
    ? signedPath
    : `${env.supabaseUrl}/storage/v1${signedPath.startsWith("/") ? "" : "/"}${signedPath}`;
}

async function storageFetch<T>(path: string, init: RequestInit): Promise<T> {
  const resp = await fetch(storageUrl(path), {
    ...init,
    headers: { ...SERVICE_HEADERS(), ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(30_000),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Supabase Storage ${path} failed (${resp.status}): ${text.slice(0, 200)}`);
  }
  return resp.json() as Promise<T>;
}

/**
 * Uploads raw bytes server-side with the service key. The bytes transiting the
 * Vercel function is a deliberate trade-off: this project's storage endpoints
 * only accept legacy JWT-format keys as browser `authorization`, and no such
 * key may be embedded in the bundle — so direct-from-browser signed uploads are
 * unavailable. Body size stays capped by the route (well under Vercel's 4.5 MB
 * request ceiling) and the client downsizes photos before sending.
 */
export async function putObject(
  key: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const resp = await fetch(
    storageUrl(objectPath("/object", key)),
    {
      method: "PUT",
      headers: {
        apikey: env.supabaseServiceKey,
        Authorization: `Bearer ${env.supabaseServiceKey}`,
        "Content-Type": contentType,
        "x-upsert": "false",
      },
      body,
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Supabase Storage upload failed (${resp.status}): ${text.slice(0, 200)}`);
  }
}

/** Short-lived read URL for rendering media in the browser. */
export async function signReadUrl(
  key: string,
  expiresInSeconds = 300,
): Promise<string> {
  const body = await storageFetch<{ signedURL?: string; signedUrl?: string }>(
    objectPath("/object/sign", key),
    {
      method: "POST",
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    },
  );
  const signed = body.signedURL ?? body.signedUrl;
  if (!signed) throw new Error("Supabase Storage returned no signed URL.");
  return absolute(signed);
}
