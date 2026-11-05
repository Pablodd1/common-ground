import { authRouter } from "./auth-router";
import { assistantRouter } from "./assistant-router";
import { communityRouter } from "./community-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  assistant: assistantRouter,
  community: communityRouter,
});

export type AppRouter = typeof appRouter;
