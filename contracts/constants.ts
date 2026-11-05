export const Session = {
  cookieName: "unitec_session",
  maxAgeMs: 30 * 24 * 60 * 60 * 1000,
} as const;

export const ErrorMessages = {
  unauthenticated: "Debes iniciar sesión para continuar.",
  insufficientRole: "No tienes permisos suficientes para realizar esta acción.",
} as const;

export const Paths = {
  login: "/login",
} as const;
