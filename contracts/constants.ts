export const LOGIN_PATH = "/login";

export const ErrorMessages = {
  unauthenticated: "Debes iniciar sesión para continuar.",
  insufficientRole: "No tienes permisos suficientes para realizar esta acción.",
  domainNotAllowed: "Este correo no pertenece a un dominio autorizado de la empresa.",
} as const;

export const Paths = {
  login: "/login",
} as const;

/** "unitec.com, @Otra.co " → ["unitec.com", "otra.co"] */
export function parseEmailDomains(value: string | undefined | null): string[] {
  return (value ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

/** Coincidencia exacta del dominio (no subdominios ni sufijos parecidos). */
export function isAllowedEmail(email: string | undefined | null, domains: string[]): boolean {
  if (!email || !domains.length) return false;
  const at = email.lastIndexOf("@");
  if (at < 1) return false;
  return domains.includes(email.slice(at + 1).trim().toLowerCase());
}
