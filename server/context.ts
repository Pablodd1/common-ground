import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { authenticateRequest, DomainNotAllowedError } from "./auth";
import { log } from "./lib/logger";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
  /** La sesión es válida pero el correo no pertenece a un dominio autorizado. */
  domainRejected?: boolean;
};

export async function createContext(opts: FetchCreateContextFnOptions): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    ctx.user = (await authenticateRequest(opts.req.headers)) ?? undefined;
  } catch (error) {
    if (error instanceof DomainNotAllowedError) ctx.domainRejected = true;
    else log.error("auth failed", { error: error instanceof Error ? error.message : String(error) });
  }
  return ctx;
}
