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

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const postTopic = pgEnum("post_topic", [
  "Motivation",
  "Outside work",
  "Wins",
  "Questions",
  "Celebration",
]);
export const assistantRole = pgEnum("assistant_role", ["user", "assistant"]);
export const resourceKind = pgEnum("resource_kind", [
  "document",
  "contact",
  "course",
  "file",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  authId: varchar("authId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }).notNull(),
  avatar: text("avatar"),
  avatarKey: text("avatarKey"),
  role: userRole("role").default("user").notNull(),
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

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 512 }).notNull().unique(),
  ownerId: integer("ownerId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  size: integer("size").notNull(),
  contentType: varchar("contentType", { length: 120 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    authorId: integer("authorId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    topic: postTopic("topic").default("Motivation").notNull(),
    mediaKey: varchar("mediaKey", { length: 512 }),
    mediaType: varchar("mediaType", { length: 120 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("posts_created_idx").on(table.createdAt)],
);

export const likes = pgTable(
  "likes",
  {
    postId: integer("postId")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.userId] })],
);

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("postId")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  authorId: integer("authorId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: varchar("body", { length: 1000 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    userOneId: integer("userOneId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userTwoId: integer("userTwoId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("conversation_pair_idx").on(table.userOneId, table.userTwoId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversationId")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: integer("senderId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    mediaKey: varchar("mediaKey", { length: 512 }),
    mediaType: varchar("mediaType", { length: 120 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("messages_conversation_idx").on(table.conversationId, table.createdAt),
  ],
);

export const assistantMessages = pgTable(
  "assistantMessages",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: assistantRole("role").notNull(),
    body: text("body").notNull(),
    sources: jsonb("sources"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("assistant_user_idx").on(table.userId, table.createdAt)],
);

export const companyResources = pgTable(
  "companyResources",
  {
    id: serial("id").primaryKey(),
    kind: resourceKind("kind").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    summary: varchar("summary", { length: 500 }).notNull(),
    body: text("body").notNull(),
    url: varchar("url", { length: 2048 }),
    phone: varchar("phone", { length: 60 }),
    email: varchar("email", { length: 320 }),
    reportsTo: varchar("reportsTo", { length: 180 }),
    isPublished: boolean("isPublished").default(true).notNull(),
    createdBy: integer("createdBy")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
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
