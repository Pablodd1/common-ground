// Admin-only people management: offboarding and re-enabling accounts.
import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { users } from "@db/schema";
import { adminQuery, createRouter } from "./middleware";
import { getDb } from "./queries/connection";

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
});
