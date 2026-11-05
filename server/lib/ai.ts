import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { APICallError } from "ai";
import { TRPCError } from "@trpc/server";
import { env, requireEnv } from "./env";

/** Modelo de DeepSeek (API compatible con OpenAI). */
export function deepseekModel() {
  const provider = createOpenAICompatible({
    name: "deepseek",
    baseURL: env.deepseekBaseUrl,
    apiKey: requireEnv(env.deepseekApiKey, "DEEPSEEK_API_KEY"),
    includeUsage: true,
  });
  return provider(env.deepseekModel);
}

/**
 * Traduce los códigos de error documentados por DeepSeek
 * (https://api-docs.deepseek.com/quick_start/error_codes) a mensajes en español.
 */
export function friendlyAiError(error: unknown): TRPCError {
  const status = APICallError.isInstance(error) ? error.statusCode : undefined;
  if (error instanceof Error && error.message.startsWith("Falta la variable de entorno")) {
    return new TRPCError({ code: "PRECONDITION_FAILED", message: "El asistente no está configurado. Un administrador debe agregar DEEPSEEK_API_KEY.", cause: error });
  }
  switch (status) {
    case 401:
      return new TRPCError({ code: "PRECONDITION_FAILED", message: "La clave de DeepSeek no es válida. Un administrador debe revisar DEEPSEEK_API_KEY.", cause: error });
    case 402:
      return new TRPCError({ code: "PRECONDITION_FAILED", message: "El asistente no está disponible porque la cuenta de DeepSeek no tiene saldo. Un administrador debe recargarla.", cause: error });
    case 400:
    case 422:
      console.error("Solicitud rechazada por DeepSeek:", error instanceof Error ? error.message : error);
      return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "El asistente no pudo procesar esta solicitud. Intenta con otra pregunta.", cause: error });
    case 429:
      return new TRPCError({ code: "TOO_MANY_REQUESTS", message: "El asistente está recibiendo muchas preguntas. Espera un momento e inténtalo de nuevo.", cause: error });
    case 500:
    case 503:
      return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "El servicio de IA está ocupado o con fallas. No volvimos a enviar tu pregunta; inténtalo de nuevo en un momento.", cause: error });
    default:
      return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "El asistente no está disponible temporalmente. Inténtalo de nuevo más tarde.", cause: error });
  }
}
