// Admin-only people management: offboarding and re-enabling accounts.
import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { files, messages, posts, users } from "@db/schema";
import { adminQuery, createRouter } from "./middleware";
import { getDb } from "./queries/connection";
import { removeObject } from "./lib/storage";
import { log } from "./lib/logger";

/**
 * Deletes uploads that are registered in `files` but no longer referenced by
 * any post, message or profile — the "took a photo, never posted it" residue.
 * Exposed to admins and to the daily cron route.
 */
export async function cleanupOrphanUploads(): Promise<{ removed: number; kept: number }> {
  const db = getDb();
  const allFiles = await db.select().from(files);
  let removed = 0;
  let kept = 0;
  for (const file of allFiles) {
    const referenced =
      (await db.query.posts.findFirst({ where: eq(posts.mediaKey, file.key) })) ??
      (await db.query.messages.findFirst({ where: eq(messages.mediaKey, file.key) })) ??
      (await db.query.users.findFirst({ where: eq(users.avatarKey, file.key) }));
    if (referenced) {
      kept += 1;
      continue;
    }
    await db.delete(files).where(eq(files.key, file.key));
    try {
      await removeObject(file.key);
    } catch (error) {
      log.warn("cleanup: storage object delete failed", {
        key: file.key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    removed += 1;
  }
  log.info("orphan upload cleanup", { removed, kept });
  return { removed, kept };
}

export const adminRouter = createRouter({
  listUsers: adminQuery.query(async () => {
    const rows = await getDb()
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        disabledAt: users.disabledAt,
        lastSignInAt: users.lastSignInAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.lastSignInAt))
      .limit(200);
    return rows;
  }),

  // Disabling blocks login AND kills existing sessions (authenticateRequest
  // rejects disabled users); it is reversible, unlike deleting the row, so the
  // person's posts and conversations stay intact.
  setUserDisabled: adminQuery
    .input(
      z.object({
        userId: z.number().int().positive(),
        disabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No puedes desactivar tu propia cuenta.",
        });
      }
      const target = await getDb().query.users.findFirst({
        where: eq(users.id, input.userId),
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      const [updated] = await getDb()
        .update(users)
        .set({ disabledAt: input.disabled ? new Date() : null })
        .where(eq(users.id, input.userId))
        .returning({ id: users.id, disabledAt: users.disabledAt });
      return { id: updated.id, disabledAt: updated.disabledAt };
    }),

  cleanupUploads: adminQuery.mutation(async () => cleanupOrphanUploads()),
});
