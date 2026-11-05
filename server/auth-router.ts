import * as cookie from "cookie";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { env } from "./lib/env";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import {
  AuthRejected,
  adminCreateUser,
  assertEmailAllowed,
  signInWithPassword,
} from "./auth/supabase";
import { signSessionToken } from "./auth/session";
import { upsertUserByAuthId } from "./queries/users";
import { log } from "./lib/logger";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Ingresa un correo válido.");
const passwordSchema = z
  .string()
  .min(10, "La contraseña debe tener al menos 10 caracteres.")
  .max(128, "La contraseña es demasiado larga.");

function toAuthError(error: unknown): never {
  if (error instanceof AuthRejected) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: error.message });
  }
  log.error("auth mutation failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "No pudimos completar la operación. Inténtalo de nuevo.",
  });
}

export const authRouter = createRouter({
  // Public sign-in parameters for the login screen (domains only; never the
  // owner address or any key material).
  publicConfig: publicQuery.query(() => ({
    allowedDomains: env.allowedEmailDomains,
  })),

  signUp: publicQuery
    .input(
      z.object({
        name: z.string().trim().min(2, "Ingresa tu nombre.").max(80),
        email: emailSchema,
        password: passwordSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        assertEmailAllowed(input.email);
        await adminCreateUser(input.email, input.password, input.name);
      } catch (error) {
        toAuthError(error);
      }
      // Fall through to the shared sign-in path so the new account gets a
      // session cookie immediately, with no extra round-trip in the browser.
      return signInAndMintSession(ctx, input.email, input.password);
    }),

  login: publicQuery
    .input(z.object({ email: emailSchema, password: passwordSchema }))
    .mutation(({ ctx, input }) => {
      try {
        assertEmailAllowed(input.email);
        return signInAndMintSession(ctx, input.email, input.password);
      } catch (error) {
        toAuthError(error);
      }
    }),

  me: authedQuery.query((opts) => opts.ctx.user),

  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
});

type AuthContext = { req: Request; resHeaders: Headers };

async function signInAndMintSession(
  ctx: AuthContext,
  email: string,
  password: string,
) {
  const token = await signInWithPassword(email, password);
  const profile = token.user;
  const user = await upsertUserByAuthId({
    authId: profile.id,
    email,
    name:
      profile.userMetadata?.name ??
      profile.userMetadata?.full_name ??
      email.split("@")[0],
  });
  const sessionToken = await signSessionToken({ authId: profile.id });
  const opts = getSessionCookieOptions(ctx.req.headers);
  const serialized = cookie.serialize(Session.cookieName, sessionToken, {
    httpOnly: opts.httpOnly,
    path: opts.path,
    sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
    secure: opts.secure,
    maxAge: Session.maxAgeMs / 1000,
  });
  ctx.resHeaders.append("set-cookie", serialized);
  return { user };
}
