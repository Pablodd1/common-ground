import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { notifications, users } from "@db/schema";
import { authedQuery, createRouter } from "./middleware";
import { getDb } from "./queries/connection";
import { env } from "./lib/env";
import { getBotUsername, issueLinkCode } from "./telegram";
import { log } from "./lib/logger";

export const notificationsRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db.select().from(notifications)
      .where(eq(notifications.userId, ctx.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(30);
    const [{ value: unread }] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, ctx.user.id), isNull(notifications.readAt)));
    return { items: rows, unread };
  }),

  markAllRead: authedQuery.mutation(async ({ ctx }) => {
    await getDb().update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, ctx.user.id), isNull(notifications.readAt)));
    return { ok: true };
  }),

  settings: authedQuery.query(async ({ ctx }) => {
    const row = await getDb().query.users.findFirst({
      where: eq(users.id, ctx.user.id),
    });
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    return {
      handle: row.handle,
      notifyByEmail: row.notifyByEmail,
      telegramConfigured: !!env.telegramBotToken,
      telegramLinked: !!row.telegramChatId,
    };
  }),

  updateSettings: authedQuery
    .input(
      z.object({
        notifyByEmail: z.boolean().optional(),
        handle: z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9._-]{2,40}$/, "El @usuario solo puede tener letras, números, punto, guion y guion bajo (2-40).")
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      if (input.handle) {
        if (input.handle === "ticket") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ese usuario está reservado." });
        }
        const clash = await db.query.users.findFirst({
          where: eq(users.handle, input.handle),
        });
        if (clash && clash.id !== ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ese @usuario ya está en uso. Prueba otro." });
        }
      }
      await db.update(users).set({
        ...(input.notifyByEmail !== undefined ? { notifyByEmail: input.notifyByEmail } : {}),
        ...(input.handle ? { handle: input.handle } : {}),
      }).where(eq(users.id, ctx.user.id));
      const updated = await db.query.users.findFirst({ where: eq(users.id, ctx.user.id) });
      return { handle: updated?.handle, notifyByEmail: updated?.notifyByEmail };
    }),

  // Mints a fresh one-time code and the t.me deep link for the user to open.
  telegramLink: authedQuery.mutation(async ({ ctx }) => {
    if (!env.telegramBotToken) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Telegram aún no está configurado en el servidor. Pídele al administrador que agregue el bot.",
      });
    }
    try {
      const [code, botUsername] = await Promise.all([
        issueLinkCode(ctx.user.id),
        getBotUsername(),
      ]);
      if (!botUsername) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No pudimos leer el bot de Telegram. Intenta de nuevo." });
      }
      return { url: `https://t.me/${botUsername}?start=${code}`, code };
    } catch (error) {
      log.error("telegram link issue failed", {
        userId: ctx.user.id,
        error: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No pudimos generar el enlace. Intenta de nuevo." });
    }
  }),
});
