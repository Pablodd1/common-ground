// POST /api/media — proxied upload for photos and voice notes.
//
// Why a plain REST route instead of tRPC: the body is raw binary (tRPC would
// superjson-wrap it, inflating a ~4 MB file by a third in base64), and the
// size ceiling must sit just under Vercel's ~4.5 MB request-body limit so the
// rejection we show is ours, in Spanish, not the platform's 413.
import type { Context } from "hono";
import { getDb } from "./queries/connection";
import { files } from "@db/schema";
import { authenticateRequest } from "./auth/session";
import { putObject } from "./lib/storage";
import { log } from "./lib/logger";

export const MAX_UPLOAD_BYTES = 4_000_000;

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav",
]);

function sanitizeName(raw: string): string {
  return (
    raw
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/\.\./g, "-")
      .replace(/^[-.]+|[-.]+$/g, "")
      .slice(-140) || "archivo"
  );
}

export async function handleMediaUpload(c: Context) {
  let user;
  try {
    user = await authenticateRequest(c.req.raw.headers);
  } catch {
    return c.json({ error: "Debes iniciar sesión para subir archivos." }, 401);
  }

  const contentType = (c.req.header("x-media-type") ?? "").toLowerCase();
  // The client URI-encodes the display name to keep the header ASCII-safe.
  const encodedName = c.req.header("x-media-name") ?? "archivo";
  let rawName = "archivo";
  try {
    rawName = decodeURIComponent(encodedName).slice(0, 180) || "archivo";
  } catch {
    rawName = "archivo";
  }
  const declaredSize = Number(c.req.header("x-media-size") ?? "0");

  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return c.json({ error: "Este tipo de archivo no está permitido." }, 415);
  }
  if (declaredSize > MAX_UPLOAD_BYTES) {
    return c.json({ error: "El archivo supera el límite de 4 MB del demo." }, 413);
  }

  const body = await c.req.raw.arrayBuffer().catch(() => null);
  if (!body || body.byteLength === 0) {
    return c.json({ error: "No recibimos el contenido del archivo." }, 400);
  }
  if (body.byteLength > MAX_UPLOAD_BYTES) {
    return c.json({ error: "El archivo supera el límite de 4 MB del demo." }, 413);
  }

  const key = `u/${user.id}/${Date.now()}-${sanitizeName(rawName)}`;
  try {
    await putObject(key, body, contentType);
  } catch (error) {
    log.error("media upload failed", {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json({ error: "No pudimos guardar el archivo. Inténtalo de nuevo." }, 502);
  }

  try {
    await getDb()
      .insert(files)
      .values({
        key,
        ownerId: user.id,
        name: rawName.slice(0, 180),
        size: body.byteLength,
        contentType,
      })
      .onConflictDoUpdate({
        target: files.key,
        set: { size: body.byteLength, contentType },
      });
  } catch (error) {
    log.error("media row insert failed", {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json({ error: "Guardamos el archivo pero no pudimos registrarlo." }, 500);
  }

  return c.json({ key, contentType });
}
