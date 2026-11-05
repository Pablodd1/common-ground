/**
 * AI client helpers for the OpenAI-compatible gateway (DeepSeek by default).
 *
 * Two responsibilities, deliberately NOT the conversation itself (that lives in
 * assistant-router.ts via the AI SDK):
 *   1. `listModels()` — discovers the default model id instead of hard-coding
 *      one; the configured `DEEPSEEK_MODEL` wins when the gateway lists it.
 *   2. `classifyAiError()` — maps SDK/HTTP failures onto semantic error types so
 *      callers branch on meaning instead of HTTP codes.
 *
 * Server-only environment variables:
 *   DEEPSEEK_API_KEY   — gateway credential (never sent to the browser)
 *   DEEPSEEK_BASE_URL  — gateway entry, defaults to https://api.deepseek.com/v1
 *   DEEPSEEK_MODEL     — preferred model id, defaults to deepseek-chat
 */

function readEnv(key: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const value = proc?.env?.[key];
  if (value !== undefined && value !== "") return value;
  return undefined;
}

// ---------- Error types (callers branch on these, not on HTTP codes) ----------

/** Terminal: quota exhausted / entitlement unavailable. Do NOT retry. */
export class AiUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailable";
  }
}

/** Terminal: content/safety rejection. Ask the user to rephrase. */
export class ContentRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentRejected";
  }
}

/** Terminal: invalid or missing credentials — configuration problem. */
export class AiMisconfigured extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiMisconfigured";
  }
}

/** Terminal: invalid request payload — a development-time error. */
export class AiInvalidRequest extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiInvalidRequest";
  }
}

/**
 * Retryable: 429 / 408 / 424 / 5xx. This module does NOT retry on its own —
 * whether to resend a billed call is the caller's decision.
 */
export class AiTransient extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiTransient";
  }
}

export interface ModelInfo {
  id: string;
  displayName?: string;
}

export interface ModelList {
  models: ModelInfo[];
  /** The model id this deployment should use by default. */
  defaultModelId: string;
}

interface ErrorBody {
  error?: { type?: string; message?: string; code?: string };
  message?: string;
}

// ---------- Configuration & error mapping ----------

interface GatewayConfig {
  baseUrl: string;
  apiKey: string;
  preferredModel: string;
}

function config(): GatewayConfig {
  const baseUrl = readEnv("DEEPSEEK_BASE_URL") ?? "https://api.deepseek.com/v1";
  const apiKey = readEnv("DEEPSEEK_API_KEY");
  if (!apiKey) {
    throw new AiMisconfigured(
      "DEEPSEEK_API_KEY is not configured for this deployment.",
    );
  }
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
    preferredModel: readEnv("DEEPSEEK_MODEL") ?? "deepseek-chat",
  };
}

function mapAiError(status: number, body: ErrorBody | undefined, raw: string): Error {
  const type = body?.error?.type ?? "";
  const detail = body?.error?.message ?? body?.message ?? raw.slice(0, 300);

  if (type.includes("insufficient") || type.includes("quota") || type.includes("balance")) {
    return new AiUnavailable("Provider quota is exhausted.");
  }
  if (type.includes("content") || type.includes("moderation")) {
    return new ContentRejected(detail || "Content was rejected.");
  }
  switch (status) {
    case 401:
    case 403:
      return new AiMisconfigured("Gateway credentials are invalid or missing; redeploy is required.");
    case 402:
      return new AiUnavailable("Provider entitlement unavailable.");
    case 400:
      return new AiInvalidRequest(detail || "Invalid request payload.");
    case 429:
      return new AiTransient("Rate limited; retry later.");
    case 408:
    case 424:
      return new AiTransient(detail || "Upstream temporarily unavailable.");
    default:
      if (status >= 500) return new AiTransient("Provider is busy; retry later.");
      return new AiInvalidRequest(detail || `Request failed (HTTP ${status}).`);
  }
}

/**
 * Classifies an error thrown by the AI SDK onto the semantic types above.
 * SDK errors carry the gateway's status and body under varying field names;
 * missing structured info is treated as transient (network-layer failures
 * usually are).
 */
export function classifyAiError(err: unknown): Error {
  if (
    err instanceof AiUnavailable ||
    err instanceof ContentRejected ||
    err instanceof AiMisconfigured ||
    err instanceof AiInvalidRequest ||
    err instanceof AiTransient
  ) {
    return err;
  }

  const anyErr = err as {
    status?: number;
    statusCode?: number;
    response?: { status?: number; body?: unknown };
    data?: unknown;
    error?: unknown;
    message?: string;
    responseBody?: unknown;
  };

  const status = anyErr?.status ?? anyErr?.statusCode ?? anyErr?.response?.status;
  // Extraction order matters: ai@6's APICallError only attaches `data` when the
  // provider error body fits its schema; otherwise it stops at a bare
  // `responseBody` JSON string. Skipping that fallback silently misclassifies
  // structured provider errors as transient.
  const rawBody =
    anyErr?.response?.body ?? anyErr?.data ?? anyErr?.error ?? anyErr?.responseBody;
  let body: ErrorBody | undefined;
  if (rawBody && typeof rawBody === "object") {
    body = rawBody as ErrorBody;
  } else if (typeof rawBody === "string") {
    try {
      body = JSON.parse(rawBody) as ErrorBody;
    } catch {
      body = undefined;
    }
  }

  if (typeof status === "number") {
    return mapAiError(status, body, typeof rawBody === "string" ? rawBody : "");
  }

  return new AiTransient(anyErr?.message || "AI call failed; retry later.");
}

/** Whether the error is worth retrying (only AiTransient is). */
export function isRetryableAiError(err: unknown): boolean {
  return err instanceof AiTransient;
}

// ---------- Public methods ----------

export async function listModels(): Promise<ModelList> {
  const { baseUrl, apiKey, preferredModel } = config();
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new AiTransient("Could not reach the AI gateway; retry later.");
  }

  const text = await res.text();
  // Judge non-2xx before parsing: an HTML error page from a proxy (401/403/502)
  // is not JSON, and parsing first would misreport it as a transient error.
  if (!res.ok) {
    let errBody: ErrorBody | undefined;
    try {
      errBody = text ? JSON.parse(text) : undefined;
    } catch {
      errBody = undefined;
    }
    throw mapAiError(res.status, errBody, text);
  }

  let body: { data?: Array<{ id?: string }>, default_model_id?: string };
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new AiTransient("Model list response could not be parsed.");
  }

  const models: ModelInfo[] = (body.data ?? [])
    .map((m) => ({ id: String(m.id ?? "") }))
    .filter((m) => m.id);
  const listed = new Set(models.map((m) => m.id));
  const defaultModelId =
    (preferredModel && listed.has(preferredModel) ? preferredModel : "") ||
    body.default_model_id ||
    models[0]?.id ||
    "";
  if (!defaultModelId) throw new AiUnavailable("The gateway lists no usable model.");
  return { models, defaultModelId };
}
