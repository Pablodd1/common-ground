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
  changePassword as supabaseChangePassword,
  signInWithPassword,
} from "./auth/supabase";
import { signSessionToken } from "./auth/session";
import { upsertUserByAuthId } from "./queries/users";
import { log } from "./lib/logger";
import { clientIp, consumeRateLimit } from "./lib/rate-limit";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Ingresa un correo válido.");
const passwordSchema = z
  .string()
  .min(10, "La contraseña debe tener al menos 10 caracteres.")
  .max(128, "La contraseña es demasiado larga.");

// Credential endpoints are rate limited per IP+email: 8 attempts / 5 minutes.
// Supabase's own per-email limits back this up; see lib/rate-limit.ts for the
// serverless caveats.
const AUTH_RATE_LIMIT = { limit: 8, windowMs: 5 * 60 * 1000 };

function enforceAuthRateLimit(headers: Headers, email: string): void {
  const { allowed, retryAfterSeconds } = consumeRateLimit(
    `${clientIp(headers)}|${email}`,
    AUTH_RATE_LIMIT.limit,
    AUTH_RATE_LIMIT.windowMs,
  );
  if (!allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Demasiados intentos. Espera ${retryAfterSeconds} segundos y vuelve a intentar.`,
    });
  }
}

function toAuthError(error: unknown): never {
  // Deliberate tRPC answers (rate limit, validation) must pass through —
  // swallowing them here would relabel a 429 as a generic 500.
  if (error instanceof TRPCError) throw error;
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
        enforceAuthRateLimit(ctx.req.headers, input.email);
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
        enforceAuthRateLimit(ctx.req.headers, input.email);
        assertEmailAllowed(input.email);
        return signInAndMintSession(ctx, input.email, input.password);
      } catch (error) {
        toAuthError(error);
      }
    }),

  me: authedQuery.query((opts) => opts.ctx.user),

  // Password change requires the current password; no e-mail round-trip, so it
  // works regardless of Supabase's Site URL / SMTP configuration.
  changePassword: authedQuery
    .input(
      z.object({
        current: z.string().min(1, "Ingresa tu contraseña actual."),
        next: passwordSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.current === input.next) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La nueva contraseña debe ser diferente de la actual.",
        });
      }
      enforceAuthRateLimit(ctx.req.headers, ctx.user.email);
      try {
        await supabaseChangePassword(
          ctx.user.email,
          input.current,
          input.next,
        );
      } catch (error) {
        toAuthError(error);
      }
      return { ok: true };
    }),

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
  if (user.disabledAt) {
    throw new AuthRejected(
      "Tu cuenta está desactivada. Contacta al administrador de la empresa.",
    );
  }
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
