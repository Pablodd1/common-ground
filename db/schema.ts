import {
  bigint,
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  avatarKey: text("avatarKey"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export const files = mysqlTable("files", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 512 }).notNull().unique(),
  ownerId: bigint("ownerId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  size: int("size").notNull(),
  contentType: varchar("contentType", { length: 120 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const posts = mysqlTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    authorId: bigint("authorId", { mode: "number", unsigned: true }).notNull(),
    body: text("body").notNull(),
    topic: mysqlEnum("topic", ["Motivation", "Outside work", "Wins", "Questions", "Celebration"])
      .default("Motivation")
      .notNull(),
    mediaKey: varchar("mediaKey", { length: 512 }),
    mediaType: varchar("mediaType", { length: 120 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("posts_created_idx").on(table.createdAt),
    index("posts_media_idx").on(table.mediaKey),
  ],
);

export const likes = mysqlTable(
  "likes",
  {
    postId: bigint("postId", { mode: "number", unsigned: true }).notNull(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.userId] })],
);

export const comments = mysqlTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    postId: bigint("postId", { mode: "number", unsigned: true }).notNull(),
    authorId: bigint("authorId", { mode: "number", unsigned: true }).notNull(),
    body: varchar("body", { length: 1000 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("comments_post_idx").on(table.postId, table.createdAt)],
);

export const conversations = mysqlTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    userOneId: bigint("userOneId", { mode: "number", unsigned: true }).notNull(),
    userTwoId: bigint("userTwoId", { mode: "number", unsigned: true }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("conversation_pair_idx").on(table.userOneId, table.userTwoId)],
);

export const messages = mysqlTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: bigint("conversationId", { mode: "number", unsigned: true }).notNull(),
    senderId: bigint("senderId", { mode: "number", unsigned: true }).notNull(),
    body: text("body").notNull(),
    mediaKey: varchar("mediaKey", { length: 512 }),
    mediaType: varchar("mediaType", { length: 120 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("messages_conversation_idx").on(table.conversationId, table.createdAt),
    index("messages_media_idx").on(table.mediaKey),
  ],
);

export const assistantMessages = mysqlTable(
  "assistantMessages",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    role: mysqlEnum("role", ["user", "assistant"]).notNull(),
    body: text("body").notNull(),
    sources: json("sources"),
    // Solo en preguntas: si el asistente encontró fuentes para responder.
    answered: boolean("answered"),
    // Solo en respuestas: valoración de quien preguntó.
    feedback: mysqlEnum("feedback", ["helpful", "unhelpful"]),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("assistant_user_idx").on(table.userId, table.createdAt),
    index("assistant_created_idx").on(table.createdAt),
  ],
);

export const companyResources = mysqlTable(
  "companyResources",
  {
    id: serial("id").primaryKey(),
    kind: mysqlEnum("kind", ["document", "contact", "course", "file"]).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    summary: varchar("summary", { length: 500 }).notNull(),
    body: text("body").notNull(),
    url: varchar("url", { length: 2048 }),
    phone: varchar("phone", { length: 60 }),
    email: varchar("email", { length: 320 }),
    reportsTo: varchar("reportsTo", { length: 180 }),
    isPublished: boolean("isPublished").default(true).notNull(),
    createdBy: bigint("createdBy", { mode: "number", unsigned: true }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
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
