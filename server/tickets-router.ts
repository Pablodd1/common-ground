// Internal support tickets: any collaborator opens one with /ticket (or
// #ticket) in the composer; every admin's bell rings and the owner's Telegram
// and e-mail channels fire when configured.
import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { tickets, users } from "@db/schema";
import { adminQuery, authedQuery, createRouter } from "./middleware";
import { getDb } from "./queries/connection";
import { notifyOwnerOwners, notifyUser } from "./lib/notify";
import { parseTicketCommand } from "./mentions";

const ticketBody = z.string().trim().min(5, "Describe el problema con al menos 5 caracteres.").max(2000);

export const ticketsRouter = createRouter({
  create: authedQuery
    .input(z.object({ body: ticketBody }))
    .mutation(async ({ ctx, input }) => {
      // Also accept the raw "/ticket …" command for API/smoke callers.
      const parsed = parseTicketCommand(input.body);
      const body = parsed.isTicket ? parsed.body : input.body;

      const creator = await getDb().query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });
      const subject = body.split("\n")[0].slice(0, 120) || "Ticket";

      const [ticket] = await getDb()
        .insert(tickets)
        .values({ creatorId: ctx.user.id, subject, body })
        .returning();

      await notifyOwnerOwners({
        title: `🎫 Ticket #${ticket.id}: ${subject}`.slice(0, 160),
        body: `${creator?.name ?? "Un colaborador"} reportó:\n\n${body.slice(0, 400)}`,
        ticketId: ticket.id,
      });
      await notifyUser({
        userId: ctx.user.id,
        kind: "ticket",
        title: `Recibimos tu ticket #${ticket.id}`,
        body: "El administrador ya fue notificado. Te avisaremos cuando esté resuelto.",
        target: "empresa",
        ticketId: ticket.id,
      });
      return { id: ticket.id };
    }),

  mine: authedQuery.query(async ({ ctx }) => {
    const rows = await getDb()
      .select({
        id: tickets.id,
        subject: tickets.subject,
        body: tickets.body,
        status: tickets.status,
        createdAt: tickets.createdAt,
        resolvedAt: tickets.resolvedAt,
        creatorName: users.name,
      })
      .from(tickets)
      .innerJoin(users, eq(users.id, tickets.creatorId))
      .where(eq(tickets.creatorId, ctx.user.id))
      .orderBy(desc(tickets.createdAt))
      .limit(50);
    return rows;
  }),

  list: adminQuery.query(async () => {
    const rows = await getDb()
      .select({
        id: tickets.id,
        subject: tickets.subject,
        body: tickets.body,
        status: tickets.status,
        createdAt: tickets.createdAt,
        resolvedAt: tickets.resolvedAt,
        creatorName: users.name,
      })
      .from(tickets)
      .innerJoin(users, eq(users.id, tickets.creatorId))
      .orderBy(desc(tickets.status), desc(tickets.createdAt))
      .limit(200);
    return rows;
  }),

  resolve: adminQuery
    .input(z.object({ ticketId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [resolved] = await db.update(tickets)
        .set({ status: "resolved", resolvedAt: new Date(), resolvedBy: ctx.user.id })
        .where(eq(tickets.id, input.ticketId))
        .returning();
      if (!resolved) throw new TRPCError({ code: "NOT_FOUND" });
      await notifyUser({
        userId: resolved.creatorId,
        kind: "ticket",
        title: `Ticket #${resolved.id} resuelto ✅`,
        body: `"${resolved.subject}" fue marcado como resuelto.`,
        target: "empresa",
        ticketId: resolved.id,
      });
      return { id: resolved.id, status: resolved.status };
    }),

  // Hard delete — used by the smoke suite for its own ticket and by admins
  // for spam. Notifications referencing the ticket keep their text (the row
  // is denormalized into title/body on purpose).
  purge: adminQuery
    .input(z.object({ ticketId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const deleted = await getDb().delete(tickets)
        .where(eq(tickets.id, input.ticketId))
        .returning({ id: tickets.id });
      if (!deleted.length) throw new TRPCError({ code: "NOT_FOUND" });
      return { ok: true };
    }),
});
