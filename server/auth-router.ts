import { env } from "./lib/env";
import { createRouter, authedQuery, publicQuery } from "./middleware";

export const authRouter = createRouter({
  me: authedQuery.query((opts) => opts.ctx.user),
  // Público: la pantalla de inicio de sesión valida el dominio antes de enviar el enlace.
  config: publicQuery.query(() => ({ allowedEmailDomains: env.allowedEmailDomains })),
});
