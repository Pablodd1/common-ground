import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// Postgres (Supabase). Las tablas viven en el esquema `public`; la app accede solo
// desde el servidor con DATABASE_URL, y RLS queda activado sin políticas (ver
// migración) para que la API pública de Supabase no exponga estos datos.

export const roleEnum = pgEnum("user_role", ["user", "admin"]);
export const topicEnum = pgEnum("post_topic", ["Motivation", "Outside work", "Wins", "Questions", "Celebration"]);
export const assistantRoleEnum = pgEnum("assistant_role", ["user", "assistant"]);
export const feedbackEnum = pgEnum("assistant_feedback", ["helpful", "unhelpful"]);
export const resourceKindEnum = pgEnum("resource_kind", ["document", "contact", "course", "file"]);

const createdAt = () => timestamp("createdAt", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date());

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // id del usuario en Supabase Auth (auth.users.id).
  authId: varchar("authId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  avatarKey: text("avatarKey"),
  role: roleEnum("role").default("user").notNull(),
  jobTitle: varchar("jobTitle", { length: 120 }),
  department: varchar("department", { length: 120 }),
  location: varchar("location", { length: 120 }),
  bio: text("bio"),
  interests: text("interests"),
  birthday: varchar("birthday", { length: 10 }),
  startDate: varchar("startDate", { length: 10 }),
  shareBirthday: boolean("shareBirthday").default(true).notNull(),
  shareLocation: boolean("shareLocation").default(true).notNull(),
  isDemo: boolean("isDemo").default(false).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  lastSignInAt: timestamp("lastSignInAt", { withTimezone: true }).defaultNow().notNull(),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 512 }).notNull().unique(),
  ownerId: integer("ownerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  size: integer("size").notNull(),
  contentType: varchar("contentType", { length: 120 }).notNull(),
  createdAt: createdAt(),
});

export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    authorId: integer("authorId").notNull(),
    body: text("body").notNull(),
    topic: topicEnum("topic").default("Motivation").notNull(),
    mediaKey: varchar("mediaKey", { length: 512 }),
    mediaType: varchar("mediaType", { length: 120 }),
    createdAt: createdAt(),
  },
  (table) => [
    index("posts_created_idx").on(table.createdAt),
    index("posts_media_idx").on(table.mediaKey),
  ],
);

export const likes = pgTable(
  "likes",
  {
    postId: integer("postId").notNull(),
    userId: integer("userId").notNull(),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.userId] })],
);

export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    postId: integer("postId").notNull(),
    authorId: integer("authorId").notNull(),
    body: varchar("body", { length: 1000 }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("comments_post_idx").on(table.postId, table.createdAt)],
);

export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    userOneId: integer("userOneId").notNull(),
    userTwoId: integer("userTwoId").notNull(),
    createdAt: createdAt(),
    lastMessageAt: timestamp("lastMessageAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("conversation_pair_idx").on(table.userOneId, table.userTwoId)],
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversationId").notNull(),
    senderId: integer("senderId").notNull(),
    body: text("body").notNull(),
    mediaKey: varchar("mediaKey", { length: 512 }),
    mediaType: varchar("mediaType", { length: 120 }),
    createdAt: createdAt(),
  },
  (table) => [
    index("messages_conversation_idx").on(table.conversationId, table.createdAt),
    index("messages_media_idx").on(table.mediaKey),
  ],
);

export const assistantMessages = pgTable(
  "assistantMessages",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    role: assistantRoleEnum("role").notNull(),
    body: text("body").notNull(),
    sources: jsonb("sources"),
    // Solo en preguntas: si el asistente encontró fuentes para responder.
    answered: boolean("answered"),
    // Solo en respuestas: valoración de quien preguntó.
    feedback: feedbackEnum("feedback"),
    createdAt: createdAt(),
  },
  (table) => [
    index("assistant_user_idx").on(table.userId, table.createdAt),
    index("assistant_created_idx").on(table.createdAt),
  ],
);

export const companyResources = pgTable(
  "companyResources",
  {
    id: serial("id").primaryKey(),
    kind: resourceKindEnum("kind").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    summary: varchar("summary", { length: 500 }).notNull(),
    body: text("body").notNull(),
    url: varchar("url", { length: 2048 }),
    phone: varchar("phone", { length: 60 }),
    email: varchar("email", { length: 320 }),
    reportsTo: varchar("reportsTo", { length: 180 }),
    isPublished: boolean("isPublished").default(true).notNull(),
    createdBy: integer("createdBy").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("company_resources_idx").on(table.kind, table.isPublished)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type StoredFile = typeof files.$inferSelect;
