#!/usr/bin/env node
// Revisa las variables de entorno SIN mostrar sus valores.
// Uso: npm run check:env            (lee .env.local y .env)
//      npm run check:env -- --ci    (solo process.env, p. ej. en Vercel/CI)
import { config } from "dotenv";

if (!process.argv.includes("--ci")) {
  config({ path: ".env.local", quiet: true });
  config({ path: ".env", quiet: true });
}

const env = process.env;
const errors = [];
const warnings = [];

const required = {
  DATABASE_URL: "Postgres de Supabase (Transaction pooler, puerto 6543)",
  SUPABASE_URL: "URL del proyecto de Supabase (servidor)",
  VITE_SUPABASE_URL: "misma URL de Supabase, para el navegador",
  ALLOWED_EMAIL_DOMAINS: "dominios de correo de la empresa que pueden entrar (ej. unitec.com)",
  DEEPSEEK_API_KEY: "clave de la API de DeepSeek (asistente)",
};

for (const [name, purpose] of Object.entries(required)) {
  if (!env[name]?.trim()) errors.push(`${name} falta — ${purpose}.`);
}
const secret = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!secret) errors.push("SUPABASE_SECRET_KEY falta — clave secreta (sb_secret_…) para Auth y Storage en el servidor.");
const publishable = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
if (!publishable) errors.push("VITE_SUPABASE_PUBLISHABLE_KEY falta — clave pública (sb_publishable_…) para iniciar sesión.");

const isUrl = (value) => { try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } };
for (const name of ["SUPABASE_URL", "VITE_SUPABASE_URL", "DEEPSEEK_BASE_URL"]) {
  if (env[name] && !isUrl(env[name])) errors.push(`${name} no es una URL http(s) válida.`);
}
if (env.SUPABASE_URL && env.VITE_SUPABASE_URL && env.SUPABASE_URL.replace(/\/+$/, "") !== env.VITE_SUPABASE_URL.replace(/\/+$/, "")) {
  errors.push("SUPABASE_URL y VITE_SUPABASE_URL deben ser la misma URL.");
}
if (secret && publishable && secret === publishable) errors.push("La clave secreta y la pública son iguales; revisa cuál es cuál.");
if (publishable?.startsWith("sb_secret_")) errors.push("VITE_SUPABASE_PUBLISHABLE_KEY contiene una clave SECRETA (sb_secret_…). Se publicaría en el navegador.");
if (secret?.startsWith("sb_publishable_")) errors.push("SUPABASE_SECRET_KEY contiene la clave pública; usa la secreta (sb_secret_…).");
if (env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_SECRET_KEY) warnings.push("Usas la clave service_role heredada; Supabase la retira a finales de 2026. Cambia a SUPABASE_SECRET_KEY (sb_secret_…).");

if (env.DATABASE_URL) {
  try {
    const url = new URL(env.DATABASE_URL);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) errors.push("DATABASE_URL debe comenzar por postgresql://");
    if (["localhost", "127.0.0.1"].includes(url.hostname) && env.VERCEL) errors.push("DATABASE_URL apunta a localhost, que no existe en Vercel.");
    if (url.hostname.endsWith("pooler.supabase.com") && url.port === "5432") warnings.push("DATABASE_URL usa el Session pooler (5432). En Vercel conviene el Transaction pooler (puerto 6543).");
    if (/^db\..+\.supabase\.co$/.test(url.hostname)) warnings.push("DATABASE_URL usa la conexión directa (solo IPv6). Vercel necesita el pooler: aws-…pooler.supabase.com:6543.");
  } catch {
    errors.push("DATABASE_URL no es una URL válida (postgresql://usuario:clave@host:6543/postgres).");
  }
}
const domains = (env.ALLOWED_EMAIL_DOMAINS ?? "").split(",").map((d) => d.trim().replace(/^@/, "")).filter(Boolean);
for (const domain of domains) if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) errors.push(`ALLOWED_EMAIL_DOMAINS: "${domain}" no parece un dominio (sin @, ej. unitec.com).`);
if (/gmail\.com|hotmail\.com|outlook\.com|yahoo\./i.test(env.ALLOWED_EMAIL_DOMAINS ?? "")) warnings.push("ALLOWED_EMAIL_DOMAINS incluye un correo público (gmail/hotmail/…): cualquiera con ese correo podría entrar.");
if (!env.OWNER_EMAIL?.trim()) warnings.push("OWNER_EMAIL está vacío: nadie recibirá el rol de administrador automáticamente.");
if (env.DEEPSEEK_MODEL && !/^deepseek-/.test(env.DEEPSEEK_MODEL)) warnings.push(`DEEPSEEK_MODEL="${env.DEEPSEEK_MODEL}" no parece un modelo de DeepSeek.`);
for (const name of Object.keys(env)) {
  if (name.startsWith("VITE_") && name !== "VITE_SUPABASE_PUBLISHABLE_KEY" && name !== "VITE_SUPABASE_ANON_KEY" && /SECRET|TOKEN|KEY|PASSWORD|DATABASE/i.test(name)) {
    errors.push(`${name}: las variables VITE_ se publican en el navegador; nunca pongas secretos ahí.`);
  }
}

for (const warning of warnings) console.log(`⚠️  ${warning}`);
for (const error of errors) console.log(`❌ ${error}`);
if (errors.length) {
  console.log(`\n${errors.length} problema(s) que impiden un despliegue correcto.`);
  process.exit(1);
}
console.log(`✅ Variables de entorno completas${warnings.length ? ` (${warnings.length} advertencia(s))` : ""}.`);
