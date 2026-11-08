import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  // Postgres (Supabase). Runtime should use the transaction pooler (6543),
  // which requires prepared statements to be disabled — see queries/connection.
  databaseUrl: required("DATABASE_URL"),
  // Server-side project URL for Auth and Storage REST. Deliberately not
  // VITE_-prefixed: nothing in this variable belongs in the browser bundle.
  supabaseUrl: (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, ""),
  supabaseServiceKey: required("SUPABASE_SECRET_KEY"),
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "media",
  allowedEmailDomains: (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean),
  ownerEmail: (process.env.OWNER_EMAIL ?? "").trim().toLowerCase(),
  // OpenAI-compatible gateway (DeepSeek by default).
  deepseekApiKey: required("DEEPSEEK_API_KEY"),
  deepseekBaseUrl: (
    process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1"
  ).replace(/\/+$/, ""),
  deepseekModel: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
  // Notification channels. All optional: when absent the in-app bell still
  // works and deliveries are logged as skipped.
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
  telegramOwnerChatId: process.env.TELEGRAM_OWNER_CHAT_ID ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFrom:
    process.env.RESEND_FROM ?? "Unitec Familia <onboarding@resend.dev>",
};
