// Server-side Supabase Auth REST client. The service key never leaves the
// server: sign-up, sign-in and verification all happen through our API so the
// domain allow-list is enforced in exactly one place.
import { env } from "../lib/env";
import { isEmailAllowed } from "../lib/email-policy";

type SupabaseAuthError = {
  error?: string;
  error_code?: string;
  error_description?: string;
  code?: number;
  msg?: string;
  message?: string;
};

export class AuthRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthRejected";
  }
}

export type SupabaseUser = {
  id: string;
  email: string;
  userMetadata?: { name?: string; full_name?: string };
};

function authHeaders(bearer?: string): Record<string, string> {
  return {
    apikey: env.supabaseServiceKey,
    Authorization: `Bearer ${bearer ?? env.supabaseServiceKey}`,
    "Content-Type": "application/json",
  };
}

async function authFetch<T>(
  path: string,
  init: RequestInit,
  failure: string,
): Promise<T> {
  const resp = await fetch(`${env.supabaseUrl}/auth/v1${path}`, {
    ...init,
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await resp.json().catch(() => ({}))) as T & SupabaseAuthError;
  if (!resp.ok) {
    throw new AuthRejected(mapAuthError(resp.status, body, failure));
  }
  return body;
}

function mapAuthError(
  status: number,
  body: SupabaseAuthError,
  fallback: string,
): string {
  const code = body.error_code ?? body.error ?? "";
  if (status === 400 && code.includes("invalid_credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (status === 400 && code.includes("email_not_confirmed")) {
    return "Tu correo aún no está confirmado. Vuelve a intentarlo en unos minutos.";
  }
  if (status === 422 && code.includes("email_exists")) {
    return "Ya existe una cuenta con este correo. Inicia sesión.";
  }
  if (status === 422 && code.includes("weak_password")) {
    return "La contraseña es muy débil. Usa al menos 10 caracteres combinando letras y números.";
  }
  if (status === 429) {
    return "Demasiados intentos seguidos. Espera un momento y vuelve a intentar.";
  }
  if (status === 401 || status === 403) {
    return "Correo o contraseña incorrectos.";
  }
  return fallback;
}

export function assertEmailAllowed(email: string): void {
  if (!isEmailAllowed(email, env.allowedEmailDomains, env.ownerEmail)) {
    throw new AuthRejected(
      "Solo pueden entrar correos autorizados de la empresa. Verifica tu dirección o contacta al administrador.",
    );
  }
}

type TokenResponse = {
  access_token: string;
  user: SupabaseUser;
};

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<TokenResponse> {
  return authFetch<TokenResponse>(
    "/token?grant_type=password",
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ email, password }),
    },
    "No pudimos iniciar sesión. Inténtalo de nuevo.",
  );
}

export async function adminCreateUser(
  email: string,
  password: string,
  name: string,
): Promise<SupabaseUser> {
  // email_confirm skips the e-mail round-trip: memberships are vetted by the
  // domain allow-list instead of mailbox ownership.
  const body = await authFetch<{ user?: SupabaseUser } | SupabaseUser>(
    "/admin/users",
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      }),
    },
    "No pudimos crear tu cuenta. Inténtalo de nuevo.",
  );
  return "user" in body && body.user ? body.user : (body as SupabaseUser);
}

export async function getUserByToken(accessToken: string): Promise<SupabaseUser> {
  return authFetch<SupabaseUser>(
    "/user",
    {
      method: "GET",
      headers: {
        apikey: env.supabaseServiceKey,
        Authorization: `Bearer ${accessToken}`,
      },
    },
    "Tu sesión con el proveedor no es válida. Vuelve a iniciar sesión.",
  );
}
