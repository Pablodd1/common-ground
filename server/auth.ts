import type { User } from "@db/schema";
import { env } from "./lib/env";
import { isAllowedEmail } from "@contracts/constants";
import { verifyAccessToken } from "./lib/supabase";
import { upsertUserFromAuth } from "./queries/users";

export class DomainNotAllowedError extends Error {
  constructor() {
    super("domain_not_allowed");
  }
}

// Evita consultar a Supabase y escribir en la base en cada solicitud del mismo token.
const cache = new Map<string, { user: User; expires: number }>();
const CACHE_MS = 60_000;

export function bearerToken(headers: Headers): string | null {
  const value = headers.get("authorization");
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

/**
 * Devuelve el usuario de la app para el token de Supabase, o null si no hay sesión.
 * Lanza DomainNotAllowedError si el correo no es de un dominio autorizado.
 */
export async function authenticateRequest(headers: Headers): Promise<User | null> {
  const token = bearerToken(headers);
  if (!token) return null;
  const now = Date.now();
  const cached = cache.get(token);
  if (cached && cached.expires > now) return cached.user;

  const identity = await verifyAccessToken(token);
  if (!identity) return null;
  if (!isAllowedEmail(identity.email, env.allowedEmailDomains)) throw new DomainNotAllowedError();

  const user = await upsertUserFromAuth({ authId: identity.id, email: identity.email, name: identity.name, avatar: identity.avatar });
  if (cache.size > 1000) cache.clear();
  cache.set(token, { user, expires: now + CACHE_MS });
  return user;
}
