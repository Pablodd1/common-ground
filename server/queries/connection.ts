import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof createDb> | undefined;

function createDb() {
  // prepare: false is mandatory behind the Supabase transaction pooler (port
  // 6543): pgbouncer's transaction mode cannot track named prepared statements,
  // and a prepared statement that survives its connection slot silently returns
  // wrong rows after a re-bind.
  const client = postgres(env.databaseUrl, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(client, { schema: fullSchema });
}

export function getDb() {
  if (!instance) {
    instance = createDb();
  }
  return instance;
}
