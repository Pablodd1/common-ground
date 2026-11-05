import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { asc, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assistantMessages, companyResources } from "@db/schema";
import { adminQuery, authedQuery, createRouter } from "./middleware";
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
import { companyManual, retrieveManualSources, toManualSource, type ManualDocument, type ManualSource } from "./lib/company-manual";

type CompanyResource = typeof companyResources.$inferSelect;

function resourceToDocument(resource: CompanyResource): ManualDocument {
  const contactDetails = resource.kind === "contact" ? [
    resource.phone ? `Phone / WhatsApp: ${resource.phone}` : "",
    resource.email ? `Email: ${resource.email}` : "",
    resource.reportsTo ? `Reports to / escalation: ${resource.reportsTo}` : "",
  ].filter(Boolean).join("\n") : "";
  return {
    id: `internal-${resource.id}`,
    resourceId: resource.id,
    title: resource.title,
    category: resource.category,
    summary: resource.summary,
    url: null,
    retrievedAt: resource.updatedAt.toISOString(),
    keywords: `${resource.category} ${resource.kind === "contact" ? "contact phone email report reporting escalation manager hr help who" : "policy standard procedure guideline instructions internal hr"}`,
    content: `${resource.summary}\n\n${resource.body}${contactDetails ? `\n\n${contactDetails}` : ""}`,
    body: resource.body,
    visibility: "private",
    kind: resource.kind,
    isPublished: resource.isPublished,
    phone: resource.phone,
    email: resource.email,
    reportsTo: resource.reportsTo,
  };
}

async function loadInternalDocuments(includeDrafts = false) {
  const resources = await getDb().select().from(companyResources).orderBy(asc(companyResources.category), asc(companyResources.title));
  return resources.filter((resource) => includeDrafts || resource.isPublished).map(resourceToDocument);
}

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
  manual: authedQuery.query(async ({ ctx }) => ({
    documents: [...companyManual, ...await loadInternalDocuments(ctx.user.role === "admin")],
    source: "Public website information and admin-published internal company resources",
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
      const internalDocuments = await loadInternalDocuments();
      const documents = retrieveManualSources(input.question, 3, internalDocuments);
      let answer: string;
      let sources: ManualSource[] = [];

      if (!documents.length) {
        answer = "I couldn’t find that in the company manual or the internal resources currently published by an administrator. I don’t want to guess about staff, policies, pricing, contacts or reporting responsibilities. Try asking about the company, products, imports, published standards or contact channels—or check with the responsible internal team.";
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
            system: `You are the employee company-manual assistant for UNITEC USA Design. Answer using ONLY the supplied public website sources and admin-published internal company resources. Never use outside knowledge and never invent staff details, headcount, internal policies, prices, stock, promotions, dates, warranties, capabilities or commitments. Do not infer unwritten services or uses from a contact channel or location. If the sources do not answer the question, clearly say the public manual does not contain that information and suggest the appropriate internal team. Answer in the same language as the employee's latest question (English or Spanish). Be concise, warm and practical, normally under 220 words. Use short plain-text paragraphs or simple hyphen bullets. Do not use Markdown formatting markers such as **, ## or bold links. Do not claim to be a human, a lawyer, or an official approval. Distinguish public website terms from internal HR policies. When a question is about a separate product privacy policy, keep that scope clear. Do not provide links in the answer; the interface displays the exact source links separately.`,
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

  saveResource: adminQuery
    .input(z.object({
      id: z.number().int().positive().optional(),
      kind: z.enum(["document", "contact"]),
      title: z.string().trim().min(2).max(180),
      category: z.string().trim().min(2).max(80),
      summary: z.string().trim().min(2).max(500),
      body: z.string().trim().min(2).max(20000),
      phone: z.string().trim().max(60),
      email: z.union([z.literal(""), z.string().trim().email().max(320)]),
      reportsTo: z.string().trim().max(180),
      isPublished: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const values = {
        kind: input.kind,
        title: input.title,
        category: input.category,
        summary: input.summary,
        body: input.body,
        phone: input.kind === "contact" && input.phone ? input.phone : null,
        email: input.kind === "contact" && input.email ? input.email : null,
        reportsTo: input.kind === "contact" && input.reportsTo ? input.reportsTo : null,
        isPublished: input.isPublished,
        createdBy: ctx.user.id,
      };
      if (input.id) {
        await getDb().update(companyResources).set(values).where(eq(companyResources.id, input.id));
        return { id: input.id };
      }
      const [{ id }] = await getDb().insert(companyResources).values(values).$returningId();
      return { id };
    }),

  deleteResource: adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await getDb().delete(companyResources).where(eq(companyResources.id, input.id));
      return { ok: true };
    }),

  clear: authedQuery.mutation(async ({ ctx }) => {
    await getDb().delete(assistantMessages).where(eq(assistantMessages.userId, ctx.user.id));
    return { ok: true };
  }),
});
