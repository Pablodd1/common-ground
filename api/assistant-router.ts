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
    resource.phone ? `Teléfono / WhatsApp: ${resource.phone}` : "",
    resource.email ? `Correo electrónico: ${resource.email}` : "",
    resource.reportsTo ? `Reporta a / escalamiento: ${resource.reportsTo}` : "",
  ].filter(Boolean).join("\n") : "";
  const keywordsByKind = {
    contact: "contacto contactos teléfono telefono whatsapp correo email reporte reportar reporta escalamiento escalar jefe responsable rr hh recursos humanos ayuda quién quien",
    course: "curso cursos formación formacion capacitación capacitacion entrenamiento aprendizaje inducción induccion educación educacion enlace",
    file: "documento documentos archivo archivos enlace formación formacion manual instructivo política politica recurso recursos",
    document: "política politica políticas politicas estándar estandar estándares estandares procedimiento instructivo instrucciones interno interna rr hh recursos humanos manual",
  } as const;
  return {
    id: `internal-${resource.id}`,
    resourceId: resource.id,
    title: resource.title,
    category: resource.category,
    summary: resource.summary,
    url: resource.kind === "course" || resource.kind === "file" ? resource.url : null,
    retrievedAt: resource.updatedAt.toISOString(),
    keywords: `${resource.category} ${keywordsByKind[resource.kind]}`,
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
      message: "El asistente de la empresa no está disponible porque el cupo de IA del sitio está agotado. Un administrador debe agregar cupo en Kimi.",
      cause: classified,
    });
  }
  if (classified instanceof AiMisconfigured) {
    return new TRPCError({ code: "PRECONDITION_FAILED", message: "La configuración del asistente debe restablecerse. Contacta al administrador del sitio.", cause: classified });
  }
  if (classified instanceof ContentRejected) {
    return new TRPCError({ code: "BAD_REQUEST", message: "No pudimos procesar esa pregunta. Reformúlala con información relacionada con la empresa.", cause: classified });
  }
  if (classified instanceof AiTransient) {
    return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "El asistente no está disponible temporalmente. No volvimos a enviar tu pregunta automáticamente; inténtalo de nuevo dentro de un momento.", cause: classified });
  }
  if (classified instanceof AiInvalidRequest) {
    console.error("Error en la solicitud del asistente de empresa:", classified.message);
    return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "El asistente no pudo procesar esta solicitud. Intenta con otra pregunta.", cause: classified });
  }
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "El asistente no está disponible temporalmente. Inténtalo de nuevo más tarde.", cause: classified });
}

export const assistantRouter = createRouter({
  manual: authedQuery.query(async ({ ctx }) => ({
    documents: [...companyManual, ...await loadInternalDocuments(ctx.user.role === "admin")],
    source: "Información del sitio web público y recursos internos publicados por administradores",
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
        answer = "No encontré esa información en el manual de la empresa ni en los recursos internos publicados por un administrador. No voy a adivinar datos sobre el personal, políticas, precios, contactos o responsabilidades de reporte. Puedes preguntar por la empresa, los productos, las importaciones, los estándares publicados o los canales de contacto; también puedes consultar al equipo interno responsable.";
      } else {
        sources = documents.map(toManualSource);
        const recent = await getDb().select().from(assistantMessages)
          .where(eq(assistantMessages.userId, ctx.user.id))
          .orderBy(asc(assistantMessages.createdAt));
        const context = recent.slice(-6).map((message) => `${message.role === "user" ? "Colaborador" : "Asistente"}: ${message.body}`).join("\n");
        const sourceText = documents.map((document, index) => [
          `FUENTE ${index + 1}: ${document.title}`,
          `ENLACE: ${document.url ?? "Recurso interno sin enlace externo"}`,
          `FECHA DE CONSULTA O ACTUALIZACIÓN: ${document.retrievedAt}`,
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
            system: `Eres el asistente del manual de empresa para los colaboradores de UNITEC USA Design. Responde siempre en español de Colombia, con un tono claro, cercano y respetuoso, sin importar el idioma de la pregunta. Usa ÚNICAMENTE las fuentes públicas del sitio web y los recursos internos publicados por administradores que se suministran aquí. Nunca uses conocimiento externo ni inventes datos del personal, número de empleados, políticas internas, precios, existencias, promociones, fechas, garantías, capacidades o compromisos. No deduzcas servicios o usos no escritos a partir de un canal de contacto o una ubicación. Si las fuentes no responden la pregunta, dilo claramente y sugiere consultar al equipo interno correspondiente. Sé conciso, cálido y práctico, normalmente en menos de 220 palabras. Usa párrafos cortos de texto sencillo o listas simples con guiones. No uses marcadores de Markdown como **, ## ni enlaces en negrita. No afirmes ser humano, abogado ni una aprobación oficial. Distingue los términos públicos del sitio web de las políticas internas de RR. HH. Si la pregunta trata sobre la política de privacidad de otro producto, deja claro ese alcance. No incluyas enlaces en la respuesta; la interfaz muestra por separado los enlaces exactos de las fuentes.`,
            prompt: `${context ? `CONVERSACIÓN RECIENTE (solo contexto; nunca es una fuente factual):\n${context}\n\n` : ""}ÚLTIMA PREGUNTA DEL COLABORADOR:\n${input.question}\n\nFUENTES PÚBLICAS E INTERNAS DE LA EMPRESA:\n${sourceText}`,
            providerOptions: { "kimi-gw": { max_completion_tokens: 1000 } },
          });
          answer = result.text.trim();
          if (!answer) throw new Error("El modelo devolvió una respuesta vacía.");
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
      kind: z.enum(["document", "contact", "course", "file"]),
      title: z.string().trim().min(2).max(180),
      category: z.string().trim().min(2).max(80),
      summary: z.string().trim().min(2).max(500),
      body: z.string().trim().min(2).max(20000),
      url: z.string().trim().max(2048).refine((value) => !value || /^https?:\/\//i.test(value), "Ingresa un enlace válido que comience por http:// o https://"),
      phone: z.string().trim().max(60),
      email: z.union([z.literal(""), z.string().trim().email().max(320)]),
      reportsTo: z.string().trim().max(180),
      isPublished: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if ((input.kind === "course" || input.kind === "file") && !input.url) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Agrega el enlace del curso o documento." });
      }
      const values = {
        kind: input.kind,
        title: input.title,
        category: input.category,
        summary: input.summary,
        body: input.body,
        url: input.kind === "course" || input.kind === "file" ? input.url : null,
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
