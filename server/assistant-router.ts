import { generateText } from "ai";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assistantMessages, companyResources } from "@db/schema";
import { adminQuery, authedQuery, createRouter } from "./middleware";
import { getDb } from "./queries/connection";
import { deepseekModel, friendlyAiError } from "./lib/ai";
import { companyManual, normalize, retrieveManualSources, toManualSource, type ManualDocument, type ManualSource } from "./lib/company-manual";

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

export const assistantRouter = createRouter({
  manual: authedQuery.query(async ({ ctx }) => ({
    documents: [...companyManual, ...await loadInternalDocuments(ctx.user.role === "admin")],
    source: "Información del sitio web público y recursos internos publicados por administradores",
    retrievedAt: "2026-11-05",
  })),

  history: authedQuery.query(async ({ ctx }) => {
    const rows = await getDb().select().from(assistantMessages)
      .where(eq(assistantMessages.userId, ctx.user.id))
      // La pregunta y la respuesta se guardan en el mismo segundo: el id desempata.
      .orderBy(desc(assistantMessages.createdAt), desc(assistantMessages.id))
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
        // Solo los 6 mensajes más recientes; antes se leía todo el historial para usar 6.
        const recent = (await getDb().select().from(assistantMessages)
          .where(eq(assistantMessages.userId, ctx.user.id))
          .orderBy(desc(assistantMessages.createdAt), desc(assistantMessages.id))
          .limit(6)).reverse();
        const context = recent.map((message) => `${message.role === "user" ? "Colaborador" : "Asistente"}: ${message.body}`).join("\n");
        const sourceText = documents.map((document, index) => [
          `FUENTE ${index + 1}: ${document.title}`,
          `ENLACE: ${document.url ?? "Recurso interno sin enlace externo"}`,
          `FECHA DE CONSULTA O ACTUALIZACIÓN: ${document.retrievedAt}`,
          document.content,
        ].join("\n")).join("\n\n---\n\n");

        try {
          const result = await generateText({
            model: deepseekModel(),
            system: `Eres el asistente del manual de empresa para los colaboradores de UNITEC USA Design. Responde siempre en español de Colombia, con un tono claro, cercano y respetuoso, sin importar el idioma de la pregunta. Usa ÚNICAMENTE las fuentes públicas del sitio web y los recursos internos publicados por administradores que se suministran aquí. Nunca uses conocimiento externo ni inventes datos del personal, número de empleados, políticas internas, precios, existencias, promociones, fechas, garantías, capacidades o compromisos. No deduzcas servicios o usos no escritos a partir de un canal de contacto o una ubicación. Si las fuentes no responden la pregunta, dilo claramente y sugiere consultar al equipo interno correspondiente. Sé conciso, cálido y práctico, normalmente en menos de 220 palabras. Usa párrafos cortos de texto sencillo o listas simples con guiones. No uses marcadores de Markdown como **, ## ni enlaces en negrita. No afirmes ser humano, abogado ni una aprobación oficial. Distingue los términos públicos del sitio web de las políticas internas de RR. HH. Si la pregunta trata sobre la política de privacidad de otro producto, deja claro ese alcance. No incluyas enlaces en la respuesta; la interfaz muestra por separado los enlaces exactos de las fuentes.`,
            prompt: `${context ? `CONVERSACIÓN RECIENTE (solo contexto; nunca es una fuente factual):\n${context}\n\n` : ""}ÚLTIMA PREGUNTA DEL COLABORADOR:\n${input.question}\n\nFUENTES PÚBLICAS E INTERNAS DE LA EMPRESA:\n${sourceText}`,
            // DeepSeek usa max_tokens (no admite max_completion_tokens).
            maxOutputTokens: 1000,
          });
          answer = result.text.trim();
          if (!answer) throw new Error("El modelo devolvió una respuesta vacía.");
        } catch (error) {
          throw friendlyAiError(error);
        }
      }

      const db = getDb();
      const saved = await db.transaction(async (tx) => {
        await tx.insert(assistantMessages).values({ userId: ctx.user.id, role: "user", body: input.question, sources: [], answered: documents.length > 0 });
        const [{ id }] = await tx.insert(assistantMessages).values({ userId: ctx.user.id, role: "assistant", body: answer, sources }).returning({ id: assistantMessages.id });
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
      const [{ id }] = await getDb().insert(companyResources).values(values).returning({ id: companyResources.id });
      return { id };
    }),

  deleteResource: adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await getDb().delete(companyResources).where(eq(companyResources.id, input.id));
      return { ok: true };
    }),

  // Valoración 👍/👎 de una respuesta propia. null quita la valoración.
  rate: authedQuery
    .input(z.object({ id: z.number().int().positive(), feedback: z.enum(["helpful", "unhelpful"]).nullable() }))
    .mutation(async ({ ctx, input }) => {
      const message = await getDb().query.assistantMessages.findFirst({
        where: and(eq(assistantMessages.id, input.id), eq(assistantMessages.userId, ctx.user.id), eq(assistantMessages.role, "assistant")),
      });
      if (!message) throw new TRPCError({ code: "NOT_FOUND", message: "No encontramos esa respuesta." });
      await getDb().update(assistantMessages).set({ feedback: input.feedback }).where(eq(assistantMessages.id, message.id));
      return { ok: true };
    }),

  /**
   * Aprendizaje para administradores: qué pregunta el personal que el manual no cubre
   * y qué respuestas valoraron como poco útiles. ANÓNIMO: nunca devuelve quién preguntó.
   * No entrena ningún modelo; sirve para que un administrador publique el recurso que falta.
   */
  insights: adminQuery
    .input(z.object({ days: z.number().int().min(1).max(365).default(90) }).optional())
    .query(async ({ input }) => {
      const days = input?.days ?? 90;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const db = getDb();
      const rows = await db.select().from(assistantMessages)
        .where(gte(assistantMessages.createdAt, since))
        .orderBy(desc(assistantMessages.id)).limit(5000);
      const questions = rows.filter((row) => row.role === "user");
      const answers = rows.filter((row) => row.role === "assistant");

      const gaps = new Map<string, { question: string; count: number; lastAskedAt: Date }>();
      for (const row of questions.filter((item) => item.answered === false)) {
        const key = normalize(row.body);
        const current = gaps.get(key);
        if (current) current.count += 1;
        else gaps.set(key, { question: row.body, count: 1, lastAskedAt: row.createdAt });
      }

      // La pregunta de cada respuesta es el mensaje "user" anterior de la misma persona.
      const unhelpfulRows = answers.filter((row) => row.feedback === "unhelpful").slice(0, 50);
      const askerIds = [...new Set(unhelpfulRows.map((row) => row.userId))];
      const askerQuestions = askerIds.length
        ? await db.select({ id: assistantMessages.id, userId: assistantMessages.userId, body: assistantMessages.body })
          .from(assistantMessages)
          .where(and(inArray(assistantMessages.userId, askerIds), eq(assistantMessages.role, "user"), gte(assistantMessages.createdAt, since)))
        : [];
      const unhelpful = unhelpfulRows.map((row) => {
        const question = askerQuestions
          .filter((item) => item.userId === row.userId && item.id < row.id)
          .reduce<typeof askerQuestions[number] | null>((best, item) => (!best || item.id > best.id ? item : best), null);
        const sources = Array.isArray(row.sources) ? (row.sources as unknown as ManualSource[]).map((source) => source.title) : [];
        return { id: row.id, question: question?.body ?? "", answer: row.body, sources, createdAt: row.createdAt };
      });

      return {
        days,
        totals: {
          questions: questions.length,
          unanswered: questions.filter((row) => row.answered === false).length,
          helpful: answers.filter((row) => row.feedback === "helpful").length,
          unhelpful: answers.filter((row) => row.feedback === "unhelpful").length,
        },
        gaps: [...gaps.values()].sort((a, b) => b.count - a.count || b.lastAskedAt.getTime() - a.lastAskedAt.getTime()).slice(0, 50),
        unhelpful,
      };
    }),

  clear: authedQuery.mutation(async ({ ctx }) => {
    await getDb().delete(assistantMessages).where(eq(assistantMessages.userId, ctx.user.id));
    return { ok: true };
  }),
});
