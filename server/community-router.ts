import { and, count, desc, eq, inArray, max, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { comments, conversations, files, likes, messages, posts, users } from "@db/schema";
import { authedQuery, createRouter } from "./middleware";
import type { User } from "@db/schema";
import { getDb } from "./queries/connection";
import { head, issueSignedToken, presignUrl } from "@vercel/blob";

const topicSchema = z.enum(["Motivation", "Outside work", "Wins", "Questions", "Celebration"]);
const uploadContentType = z.enum([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav",
]);
const MAX_MEDIA_BYTES = 12_000_000;
const mediaInput = z.object({
  mediaKey: z.string().max(512).optional(),
  // Se acepta por compatibilidad con clientes anteriores, pero se ignora: el tipo
  // real se toma del registro verificado en `files`, no de lo que diga el navegador.
  mediaType: z.string().max(120).optional(),
});

function publicPerson(person: typeof users.$inferSelect) {
  return {
    id: person.id,
    name: person.name ?? "Nuevo colega",
    avatar: person.avatar,
    avatarKey: person.avatarKey,
    jobTitle: person.jobTitle,
    department: person.department,
    location: person.shareLocation ? person.location : null,
    bio: person.bio,
    interests: person.interests ? person.interests.split(",").filter(Boolean) : [],
    birthday: person.shareBirthday && person.birthday ? person.birthday.slice(5) : null,
    startDate: person.startDate,
    isDemo: person.isDemo,
  };
}

async function assertMediaOwner(key: string | undefined | null, userId: number) {
  if (!key) return null;
  const owned = await getDb().query.files.findFirst({
    where: and(eq(files.key, key), eq(files.ownerId, userId)),
  });
  if (!owned) throw new TRPCError({ code: "FORBIDDEN", message: "Sube el contenido multimedia antes de compartirlo." });
  return owned;
}

async function assertPostExists(postId: number) {
  const post = await getDb().query.posts.findFirst({ where: eq(posts.id, postId) });
  if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Esta publicación ya no existe." });
  return post;
}

/**
 * Un archivo solo se puede ver si: lo subió quien pregunta, está en una publicación
 * del muro, es la foto de perfil de alguien, o está en un mensaje de una conversación
 * de la que quien pregunta hace parte. Así los adjuntos de mensajes directos no
 * quedan al alcance de cualquier usuario que conozca o adivine la clave.
 */
export async function canViewMedia(key: string, userId: number): Promise<boolean> {
  const db = getDb();
  const file = await db.query.files.findFirst({ where: eq(files.key, key) });
  if (!file) return false;
  if (file.ownerId === userId) return true;
  const [post] = await db.select({ id: posts.id }).from(posts).where(eq(posts.mediaKey, key)).limit(1);
  if (post) return true;
  const [avatar] = await db.select({ id: users.id }).from(users).where(eq(users.avatarKey, key)).limit(1);
  if (avatar) return true;
  const [shared] = await db.select({ id: messages.id }).from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(and(
      eq(messages.mediaKey, key),
      or(eq(conversations.userOneId, userId), eq(conversations.userTwoId, userId)),
    ))
    .limit(1);
  return Boolean(shared);
}

function canModerate(user: User, authorId: number) {
  return user.id === authorId || user.role === "admin";
}

async function assertParticipant(conversationId: number, userId: number) {
  const conversation = await getDb().query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });
  if (!conversation || (conversation.userOneId !== userId && conversation.userTwoId !== userId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No haces parte de esta conversación." });
  }
  return conversation;
}

export const communityRouter = createRouter({
  me: authedQuery.query(async ({ ctx }) => {
    const person = await getDb().query.users.findFirst({ where: eq(users.id, ctx.user.id) });
    if (!person) throw new TRPCError({ code: "NOT_FOUND" });
    return {
      ...person,
      interestsList: person.interests ? person.interests.split(",").filter(Boolean) : [],
    };
  }),

  updateProfile: authedQuery
    .input(z.object({
      name: z.string().trim().min(2).max(80),
      jobTitle: z.string().trim().max(120),
      department: z.string().trim().max(120),
      location: z.string().trim().max(120),
      bio: z.string().trim().max(600),
      interests: z.array(z.string().trim().min(1).max(30)).max(8),
      birthday: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
      startDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
      shareBirthday: z.boolean(),
      shareLocation: z.boolean(),
      avatarKey: z.string().max(512).nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const avatar = await assertMediaOwner(input.avatarKey, ctx.user.id);
      if (avatar && !avatar.contentType.startsWith("image/")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "La foto de perfil debe ser una imagen." });
      }
      await getDb().update(users).set({
        name: input.name,
        jobTitle: input.jobTitle || null,
        department: input.department || null,
        location: input.location || null,
        bio: input.bio || null,
        interests: input.interests.join(","),
        birthday: input.birthday || null,
        startDate: input.startDate || null,
        shareBirthday: input.shareBirthday,
        shareLocation: input.shareLocation,
        avatarKey: input.avatarKey,
      }).where(eq(users.id, ctx.user.id));
      return { ok: true };
    }),

  people: authedQuery.query(async () => {
    const people = await getDb().select().from(users).orderBy(users.name).limit(100);
    return people.map(publicPerson);
  }),

  feed: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db.select().from(posts).orderBy(desc(posts.createdAt)).limit(50);
    if (!rows.length) return [];
    const authorIds = [...new Set(rows.map((post) => post.authorId))];
    const postIds = rows.map((post) => post.id);
    const authors = await db.select().from(users).where(inArray(users.id, authorIds));
    const commentRows = await db.select().from(comments).where(inArray(comments.postId, postIds)).orderBy(comments.createdAt, comments.id);
    const commentAuthorIds = [...new Set(commentRows.map((comment) => comment.authorId))];
    const commentAuthors = commentAuthorIds.length
      ? await db.select().from(users).where(inArray(users.id, commentAuthorIds))
      : [];
    const allPeople = [...authors, ...commentAuthors];
    const peopleMap = new Map(allPeople.map((person) => [person.id, publicPerson(person)]));

    // Dos consultas agrupadas en lugar de dos consultas por publicación.
    const likeCounts = await db.select({ postId: likes.postId, value: count() }).from(likes)
      .where(inArray(likes.postId, postIds)).groupBy(likes.postId);
    const myLikes = await db.select({ postId: likes.postId }).from(likes)
      .where(and(inArray(likes.postId, postIds), eq(likes.userId, ctx.user.id)));
    const likeCountMap = new Map(likeCounts.map((row) => [row.postId, row.value]));
    const likedSet = new Set(myLikes.map((row) => row.postId));

    return rows.map((post) => ({
      ...post,
      author: peopleMap.get(post.authorId)!,
      likeCount: likeCountMap.get(post.id) ?? 0,
      liked: likedSet.has(post.id),
      canDelete: canModerate(ctx.user, post.authorId),
      comments: commentRows.filter((comment) => comment.postId === post.id).map((comment) => ({
        ...comment,
        author: peopleMap.get(comment.authorId)!,
        canDelete: canModerate(ctx.user, comment.authorId),
      })),
    }));
  }),

  createPost: authedQuery
    .input(z.object({
      body: z.string().trim().max(2000),
      topic: topicSchema,
      ...mediaInput.shape,
    }).refine((value) => value.body.length > 0 || value.mediaKey, "Escribe algo o agrega contenido multimedia."))
    .mutation(async ({ ctx, input }) => {
      const media = await assertMediaOwner(input.mediaKey, ctx.user.id);
      const [created] = await getDb().insert(posts).values({
        authorId: ctx.user.id,
        body: input.body,
        topic: input.topic,
        mediaKey: media?.key ?? null,
        mediaType: media?.contentType ?? null,
      }).$returningId();
      return created;
    }),

  deletePost: authedQuery.input(z.object({ postId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const post = await assertPostExists(input.postId);
      if (!canModerate(ctx.user, post.authorId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo quien publicó o un administrador puede eliminar esta publicación." });
      }
      await getDb().transaction(async (tx) => {
        await tx.delete(likes).where(eq(likes.postId, post.id));
        await tx.delete(comments).where(eq(comments.postId, post.id));
        await tx.delete(posts).where(eq(posts.id, post.id));
      });
      return { ok: true };
    }),

  deleteComment: authedQuery.input(z.object({ commentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await getDb().query.comments.findFirst({ where: eq(comments.id, input.commentId) });
      if (!comment) throw new TRPCError({ code: "NOT_FOUND", message: "Esta respuesta ya no existe." });
      if (!canModerate(ctx.user, comment.authorId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo quien respondió o un administrador puede eliminar esta respuesta." });
      }
      await getDb().delete(comments).where(eq(comments.id, comment.id));
      return { ok: true };
    }),

  toggleLike: authedQuery.input(z.object({ postId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await assertPostExists(input.postId);
      const db = getDb();
      const existing = await db.query.likes.findFirst({
        where: and(eq(likes.postId, input.postId), eq(likes.userId, ctx.user.id)),
      });
      if (existing) {
        await db.delete(likes).where(and(eq(likes.postId, input.postId), eq(likes.userId, ctx.user.id)));
        return { liked: false };
      }
      // IGNORE: un doble clic simultáneo no debe terminar en un error 500 por la llave primaria.
      await db.insert(likes).ignore().values({ postId: input.postId, userId: ctx.user.id });
      return { liked: true };
    }),

  addComment: authedQuery.input(z.object({
    postId: z.number().int().positive(),
    body: z.string().trim().min(1).max(1000),
  })).mutation(async ({ ctx, input }) => {
    await assertPostExists(input.postId);
    await getDb().insert(comments).values({ ...input, authorId: ctx.user.id });
    return { ok: true };
  }),

  celebrate: authedQuery.input(z.object({
    personId: z.number().int().positive(),
    kind: z.enum(["birthday", "anniversary"]),
  })).mutation(async ({ ctx, input }) => {
    if (input.personId === ctx.user.id) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Deja que tus compañeros te celebren." });
    }
    const person = await getDb().query.users.findFirst({ where: eq(users.id, input.personId) });
    if (!person) throw new TRPCError({ code: "NOT_FOUND" });
    const occasion = input.kind === "birthday" ? "su cumpleaños" : "su aniversario laboral";
    await getDb().insert(posts).values({
      authorId: ctx.user.id,
      topic: "Celebration",
      body: `¡Hoy celebremos a ${person.name ?? "nuestro colega"} por ${occasion}! Deja un mensaje, una foto o una nota de voz para alegrarle el día. 🎉`,
    });
    return { ok: true };
  }),

  conversations: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db.select().from(conversations)
      .where(or(eq(conversations.userOneId, ctx.user.id), eq(conversations.userTwoId, ctx.user.id)))
      .orderBy(desc(conversations.lastMessageAt)).limit(50);
    if (!rows.length) return [];
    const otherIdOf = (conversation: typeof rows[number]) =>
      conversation.userOneId === ctx.user.id ? conversation.userTwoId : conversation.userOneId;
    const others = await db.select().from(users).where(inArray(users.id, [...new Set(rows.map(otherIdOf))]));
    const otherMap = new Map(others.map((person) => [person.id, publicPerson(person)]));
    // Último mensaje de cada conversación con dos consultas en total, no dos por conversación.
    const lastIds = await db.select({ id: max(messages.id) }).from(messages)
      .where(inArray(messages.conversationId, rows.map((conversation) => conversation.id)))
      .groupBy(messages.conversationId);
    const ids = lastIds.map((row) => row.id).filter((id): id is number => id !== null);
    const lastMessages = ids.length ? await db.select().from(messages).where(inArray(messages.id, ids)) : [];
    const lastMap = new Map(lastMessages.map((message) => [message.conversationId, message]));
    return rows.map((conversation) => ({
      ...conversation,
      other: otherMap.get(otherIdOf(conversation)) ?? null,
      lastMessage: lastMap.get(conversation.id) ?? null,
    }));
  }),

  openConversation: authedQuery.input(z.object({ personId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (input.personId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST" });
      const db = getDb();
      const person = await db.query.users.findFirst({ where: eq(users.id, input.personId) });
      if (!person || person.isDemo) throw new TRPCError({ code: "BAD_REQUEST", message: "Los perfiles de ejemplo no pueden recibir mensajes." });
      const userOneId = Math.min(ctx.user.id, input.personId);
      const userTwoId = Math.max(ctx.user.id, input.personId);
      const pair = and(eq(conversations.userOneId, userOneId), eq(conversations.userTwoId, userTwoId));
      let conversation = await db.query.conversations.findFirst({ where: pair });
      if (!conversation) {
        // IGNORE + relectura: si ambas personas abren la conversación al mismo tiempo,
        // el índice único evita duplicados y ninguna de las dos recibe un error.
        await db.insert(conversations).ignore().values({ userOneId, userTwoId });
        conversation = await db.query.conversations.findFirst({ where: pair });
      }
      if (!conversation) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return { id: conversation.id };
    }),

  messages: authedQuery.input(z.object({ conversationId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await assertParticipant(input.conversationId, ctx.user.id);
      // Los 200 MÁS RECIENTES, en orden cronológico. Antes se devolvían los 200 más
      // antiguos, así que en conversaciones largas los mensajes nuevos no aparecían.
      const rows = await getDb().select().from(messages)
        .where(eq(messages.conversationId, input.conversationId))
        .orderBy(desc(messages.createdAt), desc(messages.id)).limit(200);
      return rows.reverse();
    }),

  sendMessage: authedQuery.input(z.object({
    conversationId: z.number().int().positive(),
    body: z.string().trim().max(2000),
    ...mediaInput.shape,
  }).refine((value) => value.body.length > 0 || value.mediaKey, "Escribe algo o agrega contenido multimedia."))
    .mutation(async ({ ctx, input }) => {
      await assertParticipant(input.conversationId, ctx.user.id);
      const media = await assertMediaOwner(input.mediaKey, ctx.user.id);
      const db = getDb();
      await db.insert(messages).values({
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        body: input.body,
        mediaKey: media?.key ?? null,
        mediaType: media?.contentType ?? null,
      });
      await db.update(conversations).set({ lastMessageAt: new Date() })
        .where(eq(conversations.id, input.conversationId));
      return { ok: true };
    }),

  createUploadUrl: authedQuery.input(z.object({
    name: z.string().trim().min(1).max(180),
    contentType: uploadContentType,
    size: z.number().int().min(1).max(MAX_MEDIA_BYTES),
  })).mutation(async ({ ctx, input }) => {
    const safeName = input.name
      // eslint-disable-next-line no-control-regex -- se eliminan a propósito los caracteres de control.
      .replace(/[\\/\u0000-\u001f]/g, "-")
      .replace(/\.\./g, "-")
      .slice(-140);
    const key = `u/${ctx.user.id}/${Date.now()}-${safeName}`;
    const validUntil = Date.now() + 10 * 60 * 1000;
    const signedToken = await issueSignedToken({
      pathname: key,
      operations: ["put"],
      allowedContentTypes: [input.contentType],
      maximumSizeInBytes: MAX_MEDIA_BYTES,
      validUntil,
    });
    const { presignedUrl } = await presignUrl(signedToken, {
      operation: "put",
      pathname: key,
      access: "private",
      allowedContentTypes: [input.contentType],
      maximumSizeInBytes: MAX_MEDIA_BYTES,
      addRandomSuffix: false,
      allowOverwrite: false,
      validUntil,
    });
    return { uploadUrl: presignedUrl, key };
  }),

  completeUpload: authedQuery.input(z.object({
    key: z.string().max(512),
    name: z.string().trim().min(1).max(180),
    contentType: uploadContentType,
    size: z.number().int().min(1).max(MAX_MEDIA_BYTES),
  })).mutation(async ({ ctx, input }) => {
    if (!input.key.startsWith(`u/${ctx.user.id}/`)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Este archivo no pertenece a tu cuenta." });
    }
    const metadata = await head(input.key).catch(() => null);
    if (!metadata) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No encontramos el archivo subido. Intenta subirlo de nuevo." });
    }
    if (metadata.pathname !== input.key || metadata.size !== input.size || metadata.size > MAX_MEDIA_BYTES) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No pudimos verificar el archivo subido." });
    }
    if (metadata.contentType !== input.contentType) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "El tipo de archivo no coincide con el contenido subido." });
    }
    await getDb().insert(files).values({
      key: input.key,
      ownerId: ctx.user.id,
      name: input.name,
      size: metadata.size,
      contentType: input.contentType,
    }).onDuplicateKeyUpdate({ set: { name: input.name, size: metadata.size, contentType: input.contentType } });
    return { key: input.key, contentType: input.contentType };
  }),

  mediaUrl: authedQuery.input(z.object({ key: z.string().max(512) }))
    .query(async ({ ctx, input }) => {
      // NOT_FOUND también cuando no hay permiso, para no confirmar que la clave existe.
      if (!(await canViewMedia(input.key, ctx.user.id))) throw new TRPCError({ code: "NOT_FOUND" });
      const signedToken = await issueSignedToken({
        pathname: input.key,
        operations: ["get"],
        validUntil: Date.now() + 10 * 60 * 1000,
      });
      const { presignedUrl } = await presignUrl(signedToken, {
        operation: "get",
        pathname: input.key,
        access: "private",
        validUntil: Date.now() + 5 * 60 * 1000,
      });
      return { url: presignedUrl };
    }),
});
