// Telegram bot integration: users link their chat with a one-time code shown
// in their profile settings ("Conectar Telegram" → t.me/<bot>?start=CODE).
// The webhook route below receives the /start and stores the chat id. The
// webhook itself is registered lazily the first time a link code is issued —
// one less manual setup step once TELEGRAM_BOT_TOKEN exists.
import { createHash, randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { users } from "@db/schema";
import { getDb } from "./queries/connection";
import { env } from "./lib/env";
import { log } from "./lib/logger";

export function newLinkCode(): string {
  return randomBytes(4).toString("hex");
}

let webhookEnsured = false;

/** Idempotent setWebhook against this deployment's public URL. */
export async function ensureWebhook(): Promise<string | null> {
  if (!env.telegramBotToken) return null;
  const appUrl = (process.env.APP_URL ?? "").replace(/\/+$/, "");
  if (!appUrl) return null;
  const secret = env.telegramWebhookSecret || sha256(env.telegramBotToken);
  const resp = await fetch(
    `https://api.telegram.org/bot${env.telegramBotToken}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: `${appUrl}/api/telegram/webhook`,
        secret_token: secret,
        allowed_updates: ["message"],
        drop_pending_updates: true,
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!resp.ok) {
    throw new Error(`setWebhook ${resp.status}: ${(await resp.text()).slice(0, 150)}`);
  }
  return secret;
}

async function ensureWebhookOnce(): Promise<void> {
  if (webhookEnsured) return;
  webhookEnsured = true;
  try {
    await ensureWebhook();
  } catch (error) {
    // Non-fatal: linking simply won't work until the webhook registers; the
    // error is visible in the log and the UI tells the user to retry.
    log.error("telegram setWebhook failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function getBotUsername(): Promise<string | null> {
  if (!env.telegramBotToken) return null;
  const resp = await fetch(
    `https://api.telegram.org/bot${env.telegramBotToken}/getMe`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!resp.ok) return null;
  const body = (await resp.json()) as { result?: { username?: string } };
  return body.result?.username ?? null;
}

/** Issues (or reissues) the one-time link code for a user. */
export async function issueLinkCode(userId: number): Promise<string> {
  await ensureWebhookOnce();
  const code = newLinkCode();
  await getDb()
    .update(users)
    .set({ telegramLinkCode: code })
    .where(eq(users.id, userId));
  return code;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

type TelegramUpdate = {
  message?: {
    chat?: { id?: number };
    from?: { first_name?: string };
    text?: string;
  };
};

/** POST /api/telegram/webhook — called by Telegram's servers. */
export async function handleTelegramWebhook(c: Context) {
  const expected =
    env.telegramWebhookSecret ||
    (env.telegramBotToken ? sha256(env.telegramBotToken) : "");
  const provided = c.req.header("x-telegram-bot-api-secret-token");
  if (!expected || provided !== expected) {
    // Not configured or wrong secret: acknowledge as 200 so Telegram stops
    // retrying, but do nothing. (A 401 would cause an endless retry loop.)
    return c.body(null, 200);
  }
  const update = (await c.req.json().catch(() => null)) as TelegramUpdate | null;
  const text = update?.message?.text ?? "";
  const chatId = update?.message?.chat?.id;
  const name = update?.message?.from?.first_name ?? "";
  const code = text.startsWith("/start ") ? text.slice(7).trim() : "";
  if (!code || !chatId) return c.body(null, 200);

  const db = getDb();
  const candidate = await db.query.users.findFirst({
    where: eq(users.telegramLinkCode, code),
  });
  if (!candidate) {
    await reply(chatId, "Ese código no es válido o ya fue usado. Genera uno nuevo en tu perfil de Unitec Familia.");
    return c.body(null, 200);
  }
  await db
    .update(users)
    .set({
      telegramChatId: String(chatId),
      telegramLinkedAt: new Date(),
      telegramLinkCode: null,
    })
    .where(eq(users.id, candidate.id));
  await reply(
    chatId,
    `¡Listo, ${name || candidate.name || "colega"}! Ahora recibirás avisos de Unitec Familia cuando alguien te mencione. 🎉`,
  );
  return c.body(null, 200);
}

async function reply(chatId: number, text: string): Promise<void> {
  if (!env.telegramBotToken) return;
  try {
    await fetch(
      `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    // Best effort.
  }
}
