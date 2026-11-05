import "dotenv/config";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local", quiet: true });

// Para migrar en Supabase usa la conexión DIRECTA o el "Session pooler" (puerto 5432).
// Si existe DIRECT_DATABASE_URL se usa; si no, DATABASE_URL.
const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL (o DIRECT_DATABASE_URL) es obligatoria para ejecutar drizzle-kit");
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: connectionString },
});
