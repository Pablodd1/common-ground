import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env, requireEnv } from "../lib/env";
import * as schema from "@db/schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// En Vercel cada instancia de la función reutiliza este pool entre solicitudes.
// Con Supabase usa el "Transaction pooler" (puerto 6543) en DATABASE_URL: no
// usamos sentencias preparadas con nombre, así que es compatible.
const globalForDb = globalThis as unknown as { unitecDb?: Db; unitecPool?: Pool };

export function getPool(): Pool {
  if (!globalForDb.unitecPool) {
    const url = new URL(requireEnv(env.databaseUrl, "DATABASE_URL"));
    const sslmode = url.searchParams.get("sslmode");
    // pg da prioridad a ?sslmode= sobre la opción `ssl`; lo quitamos y decidimos aquí.
    url.searchParams.delete("sslmode");
    const isLocal = ["localhost", "127.0.0.1"].includes(url.hostname);
    const ca = process.env.DATABASE_SSL_CA?.replace(/\\n/g, "\n");
    globalForDb.unitecPool = new Pool({
      connectionString: url.toString(),
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      idleTimeoutMillis: 10_000,
      // Supabase exige TLS. Con DATABASE_SSL_CA (certificado de Supabase, en
      // Settings → Database) además se verifica el servidor; sin él, la conexión
      // va cifrada pero sin verificar el certificado.
      ssl: isLocal || sslmode === "disable" ? undefined : ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
    });
  }
  return globalForDb.unitecPool;
}

export function getDb(): Db {
  if (!globalForDb.unitecDb) globalForDb.unitecDb = drizzle(getPool(), { schema });
  return globalForDb.unitecDb;
}
