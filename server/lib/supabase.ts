import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, requireEnv } from "./env";

let admin: SupabaseClient | undefined;

/** Cliente de servidor con la clave secreta. Nunca se envía al navegador. */
export function supabaseAdmin(): SupabaseClient {
  if (!admin) {
    admin = createClient(
      requireEnv(env.supabaseUrl, "SUPABASE_URL"),
      requireEnv(env.supabaseSecretKey, "SUPABASE_SECRET_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    );
  }
  return admin;
}

export type VerifiedAuthUser = { id: string; email: string; name: string | null; avatar: string | null };

/** Valida el token de sesión de Supabase Auth con el propio Supabase. */
export async function verifyAccessToken(token: string): Promise<VerifiedAuthUser | null> {
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user?.email) return null;
  const meta = data.user.user_metadata ?? {};
  return {
    id: data.user.id,
    email: data.user.email,
    name: typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : null,
    avatar: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
  };
}

// ---------- Supabase Storage (bucket privado) ----------

const bucket = () => supabaseAdmin().storage.from(env.storageBucket);

/** URL firmada para que el navegador suba UN archivo directamente a Storage. */
export async function createUploadTarget(path: string) {
  const { data, error } = await bucket().createSignedUploadUrl(path);
  if (error || !data) throw new Error(`No se pudo preparar la carga: ${error?.message ?? "sin datos"}`);
  return { path: data.path, token: data.token, signedUrl: data.signedUrl };
}

/** Metadatos reales del archivo subido (tamaño y tipo), o null si no existe. */
export async function getStoredObject(path: string): Promise<{ size: number; contentType: string } | null> {
  const slash = path.lastIndexOf("/");
  const folder = path.slice(0, slash);
  const name = path.slice(slash + 1);
  const { data, error } = await bucket().list(folder, { search: name, limit: 100 });
  if (error || !data) return null;
  const object = data.find((item) => item.name === name);
  if (!object?.metadata) return null;
  return { size: Number(object.metadata.size), contentType: String(object.metadata.mimetype ?? "") };
}

/** URL de lectura de corta duración (5 minutos). */
export async function createReadUrl(path: string): Promise<string> {
  const { data, error } = await bucket().createSignedUrl(path, 5 * 60);
  if (error || !data) throw new Error(`No se pudo firmar la lectura: ${error?.message ?? "sin datos"}`);
  return data.signedUrl;
}
