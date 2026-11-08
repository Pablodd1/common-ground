import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { comments, conversations, files, likes, messages, posts, users } from "@db/schema";
import { authedQuery, createRouter } from "./middleware";
import { getDb } from "./queries/connection";
import { removeObject, signReadUrl } from "./lib/storage";
import { log } from "./lib/logger";
import { ensureHandle, extractMentionHandles, parseTicketCommand, resolveMentions } from "./mentions";
import { notifyUser } from "./lib/notify";

const topicSchema = z.enum(["Motivation", "Outside work", "Wins", "Questions", "Celebration"]);
// Uploads themselves go through POST /api/media (see server/media-upload.ts);
// these fields only reference an already-registered file on posts and messages.
const mediaInput = z.object({
  mediaKey: z.string().max(512).optional(),
  mediaType: z.string().max(120).optional(),
});

function publicPerson(person: typeof users.$inferSelect) {
  return {
    id: person.id,
    name: person.name ?? "Nuevo colega",
    handle: person.handle,
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

/**
 * Fan-out for @mentions inside newly created content. Never throws: a broken
// notification must not roll back the post/comment/message the user wrote.
 */
async function notifyMentions(text: string, authorId: number, where: string): Promise<void> {
  try {
    const handles = extractMentionHandles(text);
    if (!handles.length) return;
    const author = await getDb().query.users.findFirst({ where: eq(users.id, authorId) });
    const resolved = await resolveMentions(handles);
    for (const [, person] of resolved) {
      if (person.id === authorId) continue; // mentioning yourself is a note, not a ping
      await notifyUser({
        userId: person.id,
        kind: "mention",
        title: `${author?.name ?? "Alguien"} te mencionó ${where}`,
        body: text.replace(/@([a-z0-9._-]+)/gi, "@…").slice(0, 300),
        target: "feed",
      });
    }
  } catch (error) {
    log.error("mention fan-out failed", {
      authorId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function assertMediaOwner(key: string | undefined, userId: number) {
  if (!key) return;
  const owned = await getDb().query.files.findFirst({
    where: and(eq(files.key, key), eq(files.ownerId, userId)),
  });
  if (!owned) throw new TRPCError({ code: "FORBIDDEN", message: "Sube el contenido multimedia antes de compartirlo." });
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
    // Handles are minted lazily so every account becomes mentionable.
    const handle = await ensureHandle(ctx.user.id, person.name);
    return {
      ...person,
      handle,
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
      if (input.avatarKey) await assertMediaOwner(input.avatarKey, ctx.user.id);
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
    // Disabled (offboarded) accounts disappear from the directory.
    const people = await getDb().select().from(users)
      .where(isNull(users.disabledAt))
      .orderBy(users.name)
      .limit(100);
    return people.map(publicPerson);
  }),

  feed: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db.select().from(posts).orderBy(desc(posts.createdAt)).limit(50);
    if (!rows.length) return [];
    const authorIds = [...new Set(rows.map((post) => post.authorId))];
    const postIds = rows.map((post) => post.id);
    const authors = await db.select().from(users).where(inArray(users.id, authorIds));
    const commentRows = await db.select().from(comments).where(inArray(comments.postId, postIds)).orderBy(asc(comments.createdAt));
    const commentAuthorIds = [...new Set(commentRows.map((comment) => comment.authorId))];
    const commentAuthors = commentAuthorIds.length
      ? await db.select().from(users).where(inArray(users.id, commentAuthorIds))
      : [];
    // One round-trip for every post's likes (and the viewer's own) instead of
    // two queries per post — the feed made up to 100 sequential-ish calls.
    const likeRows = await db
      .select({ postId: likes.postId, userId: likes.userId })
      .from(likes)
      .where(inArray(likes.postId, postIds));
    const likeStats = new Map<number, { likeCount: number; liked: boolean }>();
    for (const row of likeRows) {
      const stat = likeStats.get(row.postId) ?? { likeCount: 0, liked: false };
      stat.likeCount += 1;
      if (row.userId === ctx.user.id) stat.liked = true;
      likeStats.set(row.postId, stat);
    }
    const allPeople = [...authors, ...commentAuthors];
    const peopleMap = new Map(allPeople.map((person) => [person.id, publicPerson(person)]));

    return rows.map((post) => ({
      ...post,
      author: peopleMap.get(post.authorId)!,
      ...(likeStats.get(post.id) ?? { likeCount: 0, liked: false }),
      comments: commentRows.filter((comment) => comment.postId === post.id).map((comment) => ({
        ...comment,
        author: peopleMap.get(comment.authorId)!,
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
      if (parseTicketCommand(input.body).isTicket) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Usa el botón de ticket (o la acción tickets.create) para reportar un problema; así llega al administrador.",
        });
      }
      await assertMediaOwner(input.mediaKey, ctx.user.id);
      await ensureHandle(ctx.user.id, ctx.user.name);
      const [created] = await getDb().insert(posts).values({
        authorId: ctx.user.id,
        body: input.body,
        topic: input.topic,
        mediaKey: input.mediaKey,
        mediaType: input.mediaType,
      }).returning({ id: posts.id });
      await notifyMentions(input.body, ctx.user.id, "en una publicación");
      return created;
    }),

  deletePost: authedQuery.input(z.object({ postId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await getDb().delete(posts)
        .where(and(eq(posts.id, input.postId), eq(posts.authorId, ctx.user.id)))
        .returning({ id: posts.id, mediaKey: posts.mediaKey });
      if (!deleted.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Solo puedes eliminar tus propias publicaciones." });
      }
      // Orphaned media is left in storage/files on purpose: the same file may
      // still be attached to a message, and garbage-collecting unreferenced
      // uploads is a separate admin concern.
      return { ok: true };
    }),

  deleteFile: authedQuery.input(z.object({ key: z.string().max(512) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const owned = await db.query.files.findFirst({
        where: and(eq(files.key, input.key), eq(files.ownerId, ctx.user.id)),
      });
      if (!owned) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Este archivo no pertenece a tu cuenta." });
      }
      // Refuse while anything still renders it, so feeds and chats never grow
      // broken images/players.
      const referenced = await db.query.posts.findFirst({ where: eq(posts.mediaKey, input.key) })
        ?? await db.query.messages.findFirst({ where: eq(messages.mediaKey, input.key) })
        ?? await db.query.users.findFirst({ where: eq(users.avatarKey, input.key) });
      if (referenced) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este archivo está en uso en una publicación, mensaje o perfil." });
      }
      await db.delete(files).where(eq(files.key, input.key));
      try {
        await removeObject(input.key);
      } catch (error) {
        // Row is gone; the object becomes an orphan for the storage cleanup
        // pass. Not fatal for the user, but it must be visible in the log.
        log.error("storage object delete failed after row delete", {
          key: input.key,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return { ok: true };
    }),

  toggleLike: authedQuery.input(z.object({ postId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db.query.likes.findFirst({
        where: and(eq(likes.postId, input.postId), eq(likes.userId, ctx.user.id)),
      });
      if (existing) {
        await db.delete(likes).where(and(eq(likes.postId, input.postId), eq(likes.userId, ctx.user.id)));
        return { liked: false };
      }
      await db.insert(likes).values({ postId: input.postId, userId: ctx.user.id });
      return { liked: true };
    }),

  addComment: authedQuery.input(z.object({
    postId: z.number().int().positive(),
    body: z.string().trim().min(1).max(1000),
  })).mutation(async ({ ctx, input }) => {
    await getDb().insert(comments).values({ ...input, authorId: ctx.user.id });
    await notifyMentions(input.body, ctx.user.id, "en un comentario");
    return { ok: true };
  }),

  deleteMessage: authedQuery.input(z.object({ messageId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const message = await getDb().query.messages.findFirst({
        where: eq(messages.id, input.messageId),
      });
      if (!message || message.senderId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo puedes eliminar tus propios mensajes." });
      }
      await getDb().delete(messages).where(eq(messages.id, input.messageId));
      return { ok: true };
    }),

  celebrate: authedQuery.input(z.object({
    personId: z.number().int().positive(),
    kind: z.enum(["birthday", "anniversary"]),
  })).mutation(async ({ ctx, input }) => {
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
    // Batched lookups: the partner profiles and the latest message per
    // conversation each come back in one round-trip instead of one per row.
    const otherIds = [...new Set(rows.map((c) => (c.userOneId === ctx.user.id ? c.userTwoId : c.userOneId)))];
    const conversationIds = rows.map((c) => c.id);
    const [others, recentMessages] = await Promise.all([
      db.select().from(users).where(inArray(users.id, otherIds)),
      db.select().from(messages).where(inArray(messages.conversationId, conversationIds))
        .orderBy(desc(messages.createdAt)).limit(500),
    ]);
    const otherMap = new Map(others.map((person) => [person.id, publicPerson(person)]));
    const lastByConversation = new Map<number, typeof recentMessages[number]>();
    for (const message of recentMessages) {
      if (!lastByConversation.has(message.conversationId)) {
        lastByConversation.set(message.conversationId, message);
      }
    }
    return rows.map((conversation) => {
      const otherId = conversation.userOneId === ctx.user.id ? conversation.userTwoId : conversation.userOneId;
      return {
        ...conversation,
        other: otherMap.get(otherId) ?? null,
        lastMessage: lastByConversation.get(conversation.id) ?? null,
      };
    });
  }),

  openConversation: authedQuery.input(z.object({ personId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (input.personId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST" });
      const db = getDb();
      const person = await db.query.users.findFirst({ where: eq(users.id, input.personId) });
      if (!person || person.isDemo) throw new TRPCError({ code: "BAD_REQUEST", message: "Los perfiles de ejemplo no pueden recibir mensajes." });
      const userOneId = Math.min(ctx.user.id, input.personId);
      const userTwoId = Math.max(ctx.user.id, input.personId);
      let conversation = await db.query.conversations.findFirst({
        where: and(eq(conversations.userOneId, userOneId), eq(conversations.userTwoId, userTwoId)),
      });
      if (!conversation) {
        const [created] = await db.insert(conversations).values({ userOneId, userTwoId }).returning({ id: conversations.id });
        conversation = await db.query.conversations.findFirst({ where: eq(conversations.id, created.id) });
      }
      return { id: conversation!.id };
    }),

  messages: authedQuery.input(z.object({ conversationId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await assertParticipant(input.conversationId, ctx.user.id);
      return getDb().select().from(messages)
        .where(eq(messages.conversationId, input.conversationId)).orderBy(asc(messages.createdAt)).limit(200);
    }),

  sendMessage: authedQuery.input(z.object({
    conversationId: z.number().int().positive(),
    body: z.string().trim().max(2000),
    ...mediaInput.shape,
  }).refine((value) => value.body.length > 0 || value.mediaKey, "Escribe algo o agrega contenido multimedia."))
    .mutation(async ({ ctx, input }) => {
      await assertParticipant(input.conversationId, ctx.user.id);
      await assertMediaOwner(input.mediaKey, ctx.user.id);
      const db = getDb();
      await db.insert(messages).values({
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        body: input.body,
        mediaKey: input.mediaKey,
        mediaType: input.mediaType,
      });
      await db.update(conversations).set({ lastMessageAt: new Date() })
        .where(eq(conversations.id, input.conversationId));
      await notifyMentions(input.body, ctx.user.id, "en un mensaje privado");
      return { ok: true };
    }),

  mediaUrl: authedQuery.input(z.object({ key: z.string().max(512) }))
    .query(async ({ input }) => {
      const known = await getDb().query.files.findFirst({ where: eq(files.key, input.key) });
      if (!known) throw new TRPCError({ code: "NOT_FOUND" });
      try {
        const url = await signReadUrl(input.key);
        return { url };
      } catch (error) {
        log.error("sign read url failed", {
          key: input.key,
          error: error instanceof Error ? error.message : String(error),
        });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No pudimos firmar el archivo." });
      }
    }),
});
