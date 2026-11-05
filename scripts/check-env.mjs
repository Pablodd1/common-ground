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
  APP_ID: "ID de la aplicación OAuth de Kimi",
  APP_SECRET: "secreto OAuth; también firma las sesiones",
  KIMI_AUTH_URL: "servidor OAuth (intercambio de tokens y JWKS)",
  KIMI_OPEN_URL: "API de perfil de usuario",
  VITE_APP_ID: "mismo valor que APP_ID, para el navegador",
  VITE_KIMI_AUTH_URL: "mismo valor que KIMI_AUTH_URL, para el navegador",
  DATABASE_URL: "MySQL persistente",
  KIMI_AGENTGW_API_KEY: "clave de la pasarela de IA (asistente)",
  KIMI_AGENTGW_BASE_URL: "URL de la pasarela de IA (asistente)",
  BLOB_READ_WRITE_TOKEN: "Vercel Blob privado (fotos y notas de voz)",
};

for (const [name, purpose] of Object.entries(required)) {
  if (!env[name]?.trim()) errors.push(`${name} falta — ${purpose}.`);
}

const isUrl = (value) => { try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } };

if (env.APP_ID && env.VITE_APP_ID && env.APP_ID !== env.VITE_APP_ID) errors.push("APP_ID y VITE_APP_ID deben ser iguales.");
if (env.KIMI_AUTH_URL && env.VITE_KIMI_AUTH_URL && env.KIMI_AUTH_URL.replace(/\/+$/, "") !== env.VITE_KIMI_AUTH_URL.replace(/\/+$/, "")) {
  errors.push("KIMI_AUTH_URL y VITE_KIMI_AUTH_URL deben ser la misma URL.");
}
for (const name of ["KIMI_AUTH_URL", "KIMI_OPEN_URL", "VITE_KIMI_AUTH_URL", "KIMI_AGENTGW_BASE_URL"]) {
  if (env[name] && !isUrl(env[name])) errors.push(`${name} no es una URL http(s) válida.`);
}
if (env.KIMI_AUTH_URL && /\/+$/.test(env.KIMI_AUTH_URL)) warnings.push("KIMI_AUTH_URL termina en '/'; el código agrega rutas como '/api/oauth/token' y quedaría '//'.");

if (env.APP_SECRET && env.APP_SECRET.length < 32) {
  warnings.push(`APP_SECRET tiene ${env.APP_SECRET.length} caracteres. Firma sesiones de 1 año: usa al menos 32 caracteres aleatorios (openssl rand -base64 48).`);
}
if (env.DATABASE_URL) {
  try {
    const url = new URL(env.DATABASE_URL);
    if (url.protocol !== "mysql:") errors.push("DATABASE_URL debe comenzar por mysql://");
    if (!url.pathname.replace("/", "")) errors.push("DATABASE_URL no indica el nombre de la base de datos.");
    if (["localhost", "127.0.0.1"].includes(url.hostname) && env.VERCEL) errors.push("DATABASE_URL apunta a localhost, que no existe en Vercel.");
  } catch {
    errors.push("DATABASE_URL no es una URL válida (mysql://usuario:clave@host:3306/base).");
  }
}
if (!env.OWNER_UNION_ID?.trim()) warnings.push("OWNER_UNION_ID está vacío: nadie recibirá el rol de administrador automáticamente.");
for (const name of Object.keys(env)) {
  if (name.startsWith("VITE_") && /SECRET|TOKEN|KEY|PASSWORD|DATABASE/i.test(name)) {
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
