import { eq } from "drizzle-orm";
import { users } from "@db/schema";
import { getDb } from "./connection";
import { env } from "../lib/env";

export type AuthIdentity = { authId: string; email: string; name?: string | null; avatar?: string | null };

export async function findUserByAuthId(authId: string) {
  return getDb().query.users.findFirst({ where: eq(users.authId, authId) });
}

/**
 * Crea el perfil la primera vez que alguien inicia sesión y actualiza correo y
 * último acceso después. NUNCA sobrescribe el nombre: la persona lo edita en su perfil.
 * Quien esté en OWNER_EMAIL recibe el rol de administrador.
 */
export async function upsertUserFromAuth(identity: AuthIdentity) {
  const email = identity.email.toLowerCase();
  const isOwner = env.ownerEmails.includes(email);
  const fallbackName = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const [user] = await getDb().insert(users).values({
    authId: identity.authId,
    email,
    name: identity.name?.trim() || fallbackName,
    avatar: identity.avatar ?? null,
    role: isOwner ? "admin" : "user",
    lastSignInAt: new Date(),
  }).onConflictDoUpdate({
    target: users.authId,
    set: { email, lastSignInAt: new Date(), ...(isOwner ? { role: "admin" as const } : {}) },
  }).returning();
  return user;
}
