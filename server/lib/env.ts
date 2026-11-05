import "dotenv/config";
import { config } from "dotenv";
import { parseEmailDomains } from "@contracts/constants";

config({ path: ".env.local", quiet: true });

function read(name: string, ...fallbacks: string[]): string {
  for (const key of [name, ...fallbacks]) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

/** Lanza un error claro en el momento de usar una variable que falta. */
export function requireEnv(value: string, name: string): string {
  if (!value) throw new Error(`Falta la variable de entorno ${name}. Ejecuta: npm run check:env`);
  return value;
}

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: read("DATABASE_URL"),
  supabaseUrl: read("SUPABASE_URL", "VITE_SUPABASE_URL"),
  // Clave secreta nueva (sb_secret_…) o, si aún no migras, la service_role heredada.
  supabaseSecretKey: read("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
  storageBucket: read("SUPABASE_STORAGE_BUCKET") || "media",
  allowedEmailDomains: parseEmailDomains(read("ALLOWED_EMAIL_DOMAINS")),
  ownerEmails: parseEmailDomains(read("OWNER_EMAIL", "OWNER_EMAILS")),
  deepseekApiKey: read("DEEPSEEK_API_KEY"),
  deepseekBaseUrl: read("DEEPSEEK_BASE_URL") || "https://api.deepseek.com",
  deepseekModel: read("DEEPSEEK_MODEL") || "deepseek-flash",
};
