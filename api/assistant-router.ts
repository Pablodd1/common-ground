import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { asc, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assistantMessages } from "@db/schema";
import { authedQuery, createRouter } from "./middleware";
import { getDb } from "./queries/connection";
import {
  AiInvalidRequest,
  AiMisconfigured,
  AiTransient,
  AiUnavailable,
  ContentRejected,
  classifyAiError,
  listModels,
} from "./lib/ai-client";
import { companyManual, retrieveManualSources, toManualSource, type ManualSource } from "./lib/company-manual";

function friendlyAiError(error: unknown): TRPCError {
  const classified = classifyAiError(error);
  if (classified instanceof AiUnavailable) {
    return new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The company assistant is unavailable because the site's AI quota is exhausted. An administrator needs to add quota in Kimi.",
      cause: classified,
    });
  }
  if (classified instanceof AiMisconfigured) {
    return new TRPCError({ code: "PRECONDITION_FAILED", message: "The company assistant needs to be reprovisioned. Please contact the site administrator.", cause: classified });
  }
  if (classified instanceof ContentRejected) {
    return new TRPCError({ code: "BAD_REQUEST", message: "That question could not be processed. Please rephrase it using company-related language.", cause: classified });
  }
  if (classified instanceof AiTransient) {
    return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The assistant is temporarily unavailable. Your question was not submitted again automatically; please retry deliberately in a moment.", cause: classified });
  }
  if (classified instanceof AiInvalidRequest) {
    console.error("Company assistant request error:", classified.message);
    return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The assistant could not process this request. Please try a different question.", cause: classified });
  }
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The assistant is temporarily unavailable. Please try again later.", cause: classified });
}

export const assistantRouter = createRouter({
  manual: authedQuery.query(() => ({
    documents: companyManual,
    source: "Public information from unitecusadesign.com",
    retrievedAt: "2026-11-05",
  })),

  history: authedQuery.query(async ({ ctx }) => {
    const rows = await getDb().select().from(assistantMessages)
      .where(eq(assistantMessages.userId, ctx.user.id))
      .orderBy(desc(assistantMessages.createdAt))
      .limit(100);
    return rows.reverse().map((row) => ({
      ...row,
      sources: Array.isArray(row.sources) ? row.sources as unknown as ManualSource[] : [],
    }));
  }),

  ask: authedQuery
    .input(z.object({ question: z.string().trim().min(2).max(1200) }))
    .mutation(async ({ ctx, input }) => {
      const documents = retrieveManualSources(input.question);
      let answer: string;
      let sources: ManualSource[] = [];

      if (!documents.length) {
        answer = "I couldn’t find that in the public company manual. I don’t want to guess about staff, internal policies, pricing or commitments. Try asking about the company, products, imports, locations, commercial terms or contact channels—or check with the responsible internal team.";
      } else {
        sources = documents.map(toManualSource);
        const recent = await getDb().select().from(assistantMessages)
          .where(eq(assistantMessages.userId, ctx.user.id))
          .orderBy(asc(assistantMessages.createdAt));
        const context = recent.slice(-6).map((message) => `${message.role === "user" ? "Employee" : "Assistant"}: ${message.body}`).join("\n");
        const sourceText = documents.map((document, index) => [
          `SOURCE ${index + 1}: ${document.title}`,
          `URL: ${document.url}`,
          `RETRIEVED: ${document.retrievedAt}`,
          document.content,
        ].join("\n")).join("\n\n---\n\n");

        try {
          const { defaultModelId } = await listModels();
          const kimiGw = createOpenAICompatible({
            name: "kimi-gw",
            baseURL: process.env.KIMI_AGENTGW_BASE_URL!,
            apiKey: process.env.KIMI_AGENTGW_API_KEY!,
            includeUsage: true,
            supportsStructuredOutputs: true,
          });
          const result = await generateText({
            model: kimiGw(defaultModelId),
            system: `You are the employee company-manual assistant for UNITEC USA Design. Answer using ONLY the supplied public website sources. Never use outside knowledge and never invent staff details, headcount, internal policies, prices, stock, promotions, dates, warranties, capabilities or commitments. Do not infer unwritten services or uses from a contact channel or location. If the sources do not answer the question, clearly say the public manual does not contain that information and suggest the appropriate internal team. Answer in the same language as the employee's latest question (English or Spanish). Be concise, warm and practical, normally under 220 words. Use short plain-text paragraphs or simple hyphen bullets. Do not use Markdown formatting markers such as **, ## or bold links. Do not claim to be a human, a lawyer, or an official approval. Distinguish public website terms from internal HR policies. When a question is about a separate product privacy policy, keep that scope clear. Do not provide links in the answer; the interface displays the exact source links separately.`,
            prompt: `${context ? `RECENT CONVERSATION (context only, never a factual source):\n${context}\n\n` : ""}LATEST EMPLOYEE QUESTION:\n${input.question}\n\nPUBLIC COMPANY SOURCES:\n${sourceText}`,
            providerOptions: { "kimi-gw": { max_completion_tokens: 1000 } },
          });
          answer = result.text.trim();
          if (!answer) throw new Error("The model returned an empty answer.");
        } catch (error) {
          throw friendlyAiError(error);
        }
      }

      const db = getDb();
      const saved = await db.transaction(async (tx) => {
        await tx.insert(assistantMessages).values({ userId: ctx.user.id, role: "user", body: input.question, sources: [] });
        const [{ id }] = await tx.insert(assistantMessages).values({ userId: ctx.user.id, role: "assistant", body: answer, sources }).$returningId();
        return id;
      });
      return { id: saved, answer, sources };
    }),

  clear: authedQuery.mutation(async ({ ctx }) => {
    await getDb().delete(assistantMessages).where(eq(assistantMessages.userId, ctx.user.id));
    return { ok: true };
  }),
});
