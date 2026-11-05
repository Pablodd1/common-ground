import { eq, sql } from "drizzle-orm";
import { users } from "@db/schema";
import type { User } from "@db/schema";
import { getDb } from "./connection";
import { env } from "../lib/env";

export async function findUserByAuthId(authId: string): Promise<User | undefined> {
  const rows = await getDb()
    .select()
    .from(users)
    .where(eq(users.authId, authId))
    .limit(1);
  return rows.at(0);
}

export async function upsertUserByAuthId(data: {
  authId: string;
  email: string;
  name: string;
}): Promise<User> {
  const db = getDb();
  const isOwner = data.email.toLowerCase() === env.ownerEmail;

  // Reconcile by e-mail first: if the Supabase account was deleted and
  // recreated (same address, new auth id), re-point the existing row instead of
  // tripping the e-mail uniqueness on insert.
  const byEmail = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  });
  if (byEmail && byEmail.authId !== data.authId) {
    const [updated] = await db
      .update(users)
      .set({
        authId: data.authId,
        email: data.email,
        name: data.name,
        lastSignInAt: new Date(),
        ...(isOwner && byEmail.role !== "admin" ? { role: "admin" as const } : {}),
      })
      .where(eq(users.id, byEmail.id))
      .returning();
    return updated;
  }

  const [saved] = await db
    .insert(users)
    .values({
      authId: data.authId,
      email: data.email,
      name: data.name,
      ...(isOwner ? { role: "admin" as const } : {}),
    })
    .onConflictDoUpdate({
      target: users.authId,
      set: {
        email: data.email,
        // Keep a name the user has set in their profile; the sign-in fallback
        // (email prefix) must not overwrite it on every login.
        name: sql`case when ${users.name} is null then ${data.name} else ${users.name} end`,
        lastSignInAt: new Date(),
        // Promote the owner on login, never demote an existing admin.
        ...(isOwner ? { role: "admin" as const } : {}),
      },
    })
    .returning();
  return saved;
}
