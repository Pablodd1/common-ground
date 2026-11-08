import { authRouter } from "./auth-router";
import { adminRouter } from "./admin-router";
import { assistantRouter } from "./assistant-router";
import { communityRouter } from "./community-router";
import { notificationsRouter } from "./notifications-router";
import { ticketsRouter } from "./tickets-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  admin: adminRouter,
  assistant: assistantRouter,
  community: communityRouter,
  notifications: notificationsRouter,
  tickets: ticketsRouter,
});

export type AppRouter = typeof appRouter;
