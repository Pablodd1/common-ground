// @mention parsing and handle management. Shared by posts, comments and
// messages so the syntax is identical everywhere text is written.
import { eq, inArray, isNull, and } from "drizzle-orm";
import { users } from "@db/schema";
import { getDb } from "./queries/connection";

const MENTION_RE = /(^|[^@\w])@([a-z0-9._-]{2,40})/gi;
export const MAX_MENTIONS = 10;

export function slugifyHandle(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "colega"
  );
}

/** Guarantees the user has a unique handle, minting one from the name if needed. */
export async function ensureHandle(userId: number, name: string | null): Promise<string> {
  const db = getDb();
  const current = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (current?.handle) return current.handle;

  const base = slugifyHandle(name ?? "colega");
  let candidate = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await db.query.users.findFirst({
      where: eq(users.handle, candidate),
    });
    if (!clash) {
      await db.update(users).set({ handle: candidate }).where(eq(users.id, userId));
      return candidate;
    }
    candidate = `${base}${Math.floor(Math.random() * 900 + 100)}`;
  }
  // Astronomically unlikely; last resort with a unique suffix.
  candidate = `${base}-${Date.now().toString(36).slice(-4)}`;
  await db.update(users).set({ handle: candidate }).where(eq(users.id, userId));
  return candidate;
}

export function extractMentionHandles(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(MENTION_RE)) {
    found.add(match[2].toLowerCase());
    if (found.size >= MAX_MENTIONS) break;
  }
  return [...found];
}

/**
 * Resolves @handles to active, real (non-demo) users. Mentioning a disabled
 * or sample account is silently ignored rather than erroring — a mention is
 * social, not a security boundary.
 */
export async function resolveMentions(
  handles: string[],
): Promise<Map<string, { id: number; name: string | null }>> {
  if (!handles.length) return new Map();
  const rows = await getDb()
    .select({ id: users.id, handle: users.handle, name: users.name })
    .from(users)
    .where(
      and(
        inArray(users.handle, handles.map((h) => h.toLowerCase())),
        isNull(users.disabledAt),
        eq(users.isDemo, false),
      ),
    );
  const map = new Map<string, { id: number; name: string | null }>();
  for (const row of rows) {
    if (row.handle) map.set(row.handle.toLowerCase(), { id: row.id, name: row.name });
  }
  return map;
}

/** True if the text starts with a ticket command (/ticket or #ticket). */
export function parseTicketCommand(text: string): { isTicket: true; body: string } | { isTicket: false } {
  const trimmed = text.trim();
  const match = trimmed.match(/^[/#]ticket\s+([\s\S]+)/i);
  if (!match) return { isTicket: false };
  return { isTicket: true, body: match[1].trim() };
}
