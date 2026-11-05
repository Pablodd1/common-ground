import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertUser } from "@db/schema";
import { getDb } from "./connection";
import { env } from "../lib/env";

export async function findUserByUnionId(unionId: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.unionId, unionId))
    .limit(1);
  return rows.at(0);
}

export async function upsertUser(data: InsertUser) {
  const values = { ...data };
  // En un inicio de sesión posterior NO se sobrescribe `name`: la persona puede
  // haberlo cambiado en su perfil y el nombre del proveedor OAuth lo borraría en
  // cada login. El nombre del proveedor solo se usa al crear la cuenta.
  const { name: _providerName, ...returning } = data;
  void _providerName;
  const updateSet: Partial<InsertUser> = {
    lastSignInAt: new Date(),
    ...returning,
  };

  if (
    values.role === undefined &&
    values.unionId &&
    values.unionId === env.ownerUnionId
  ) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  await getDb()
    .insert(schema.users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}
