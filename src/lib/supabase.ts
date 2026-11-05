import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Clave pública (sb_publishable_…) o la anon heredada. Es segura en el navegador:
// las tablas tienen RLS activado y todo el acceso a datos pasa por el servidor.
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const supabaseConfigured = Boolean(url && key);

export const supabase = createClient(url || "https://falta-configurar.supabase.co", key || "falta-configurar", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
