import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import { accessToken } from "@/lib/supabase";
import type { AppRouter } from "../../server/router";
import type { inferRouterOutputs } from "@trpc/server";
import type { ReactNode } from "react";

export const trpc = createTRPCReact<AppRouter>();
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type CommunityUser = RouterOutputs["community"]["me"];
export type Person = RouterOutputs["community"]["people"][number];
export type FeedPost = RouterOutputs["community"]["feed"][number];
export type ConversationItem = RouterOutputs["community"]["conversations"][number];

export const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      // Envía el token de Supabase Auth (se renueva automáticamente).
      async headers() {
        const token = await accessToken();
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
