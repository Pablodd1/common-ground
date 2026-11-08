// Outbound notifications: in-app rows are the source of truth; Telegram and
// e-mail are best-effort side channels. Every delivery failure is logged and
// swallowed — a notification glitch must never break the post/message/ticket
// that triggered it.
import { eq } from "drizzle-orm";
import { notifications, users } from "@db/schema";
import { getDb } from "../queries/connection";
import { env } from "./env";
import { log } from "./logger";

const APP_URL = (process.env.APP_URL ?? "").replace(/\/+$/, "");

async function deliverTelegram(chatId: string, text: string): Promise<void> {
  if (!env.telegramBotToken) {
    log.warn("telegram delivery skipped: TELEGRAM_BOT_TOKEN not configured", { chatId });
    return;
  }
  const resp = await fetch(
    `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!resp.ok) {
    throw new Error(`Telegram ${resp.status}: ${(await resp.text()).slice(0, 150)}`);
  }
}

async function deliverEmail(to: string, subject: string, text: string): Promise<void> {
  if (!env.resendApiKey) {
    log.warn("email delivery skipped: RESEND_API_KEY not configured", { to });
    return;
  }
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.resendFrom,
      to: [to],
      subject,
      text,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok && resp.status !== 422) {
    throw new Error(`Resend ${resp.status}: ${(await resp.text()).slice(0, 150)}`);
  }
}

export type NotifyInput = {
  userId: number;
  kind: "mention" | "ticket";
  title: string;
  body: string;
  target?: "feed" | "empresa";
  ticketId?: number;
};

/**
 * Records the in-app notification and fans out to the recipient's channels.
 * Resolves once everything attempted; delivery errors never reject.
 */
export async function notifyUser(input: NotifyInput): Promise<void> {
  const db = getDb();
  await db.insert(notifications).values({
    userId: input.userId,
    kind: input.kind,
    title: input.title.slice(0, 160),
    body: input.body.slice(0, 500),
    target: input.target ?? "feed",
    ticketId: input.ticketId,
  });

  const recipient = await db.query.users.findFirst({
    where: eq(users.id, input.userId),
  });
  if (!recipient || recipient.isDemo) return;

  const text = `${input.title}\n${input.body}${APP_URL ? `\n\n${APP_URL}` : ""}`;
  if (recipient.telegramChatId) {
    try {
      await deliverTelegram(recipient.telegramChatId, text);
    } catch (error) {
      log.error("telegram notification failed", {
        userId: recipient.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  if (recipient.notifyByEmail) {
    try {
      await deliverEmail(recipient.email, input.title, text);
    } catch (error) {
      log.error("email notification failed", {
        userId: recipient.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Alert the company owner (tickets, global issues). Reaches every admin via
 * the in-app bell plus the configured owner channels; fire-and-forget.
 */
export async function notifyOwnerOwners(input: {
  title: string;
  body: string;
  ticketId?: number;
}): Promise<void> {
  const db = getDb();
  const admins = await db.select().from(users).where(eq(users.role, "admin"));
  const targets = admins.filter((admin) => !admin.disabledAt && !admin.isDemo);
  for (const admin of targets) {
    await notifyUser({
      userId: admin.id,
      kind: "ticket",
      title: input.title,
      body: input.body,
      target: "empresa",
      ticketId: input.ticketId,
    });
  }
  // Owner's personal Telegram channel (env-configured so the very first
  // ticket reaches the owner even before they ever log in).
  if (env.telegramOwnerChatId) {
    try {
      await deliverTelegram(
        env.telegramOwnerChatId,
        `${input.title}\n${input.body}${APP_URL ? `\n\n${APP_URL}` : ""}`,
      );
    } catch (error) {
      log.error("owner telegram notification failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  if (env.ownerEmail && env.resendApiKey) {
    try {
      await deliverEmail(env.ownerEmail, input.title, `${input.body}\n\n${APP_URL}`);
    } catch (error) {
      log.error("owner email notification failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export { deliverTelegram };
