CREATE TYPE "public"."assistant_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."post_topic" AS ENUM('Motivation', 'Outside work', 'Wins', 'Questions', 'Celebration');--> statement-breakpoint
CREATE TYPE "public"."resource_kind" AS ENUM('document', 'contact', 'course', 'file');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "assistantMessages" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"role" "assistant_role" NOT NULL,
	"body" text NOT NULL,
	"sources" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"postId" integer NOT NULL,
	"authorId" integer NOT NULL,
	"body" varchar(1000) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companyResources" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "resource_kind" NOT NULL,
	"title" varchar(180) NOT NULL,
	"category" varchar(80) NOT NULL,
	"summary" varchar(500) NOT NULL,
	"body" text NOT NULL,
	"url" varchar(2048),
	"phone" varchar(60),
	"email" varchar(320),
	"reportsTo" varchar(180),
	"isPublished" boolean DEFAULT true NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userOneId" integer NOT NULL,
	"userTwoId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastMessageAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(512) NOT NULL,
	"ownerId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"size" integer NOT NULL,
	"contentType" varchar(120) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "files_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"postId" integer NOT NULL,
	"userId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "likes_postId_userId_pk" PRIMARY KEY("postId","userId")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversationId" integer NOT NULL,
	"senderId" integer NOT NULL,
	"body" text NOT NULL,
	"mediaKey" varchar(512),
	"mediaType" varchar(120),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"authorId" integer NOT NULL,
	"body" text NOT NULL,
	"topic" "post_topic" DEFAULT 'Motivation' NOT NULL,
	"mediaKey" varchar(512),
	"mediaType" varchar(120),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"authId" varchar(255) NOT NULL,
	"name" varchar(255),
	"email" varchar(320) NOT NULL,
	"avatar" text,
	"avatarKey" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"jobTitle" varchar(120),
	"department" varchar(120),
	"location" varchar(120),
	"bio" text,
	"interests" text,
	"birthday" varchar(10),
	"startDate" varchar(10),
	"shareBirthday" boolean DEFAULT true NOT NULL,
	"shareLocation" boolean DEFAULT true NOT NULL,
	"isDemo" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignInAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_authId_unique" UNIQUE("authId")
);
--> statement-breakpoint
ALTER TABLE "assistantMessages" ADD CONSTRAINT "assistantMessages_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_postId_posts_id_fk" FOREIGN KEY ("postId") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companyResources" ADD CONSTRAINT "companyResources_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userOneId_users_id_fk" FOREIGN KEY ("userOneId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userTwoId_users_id_fk" FOREIGN KEY ("userTwoId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_ownerId_users_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_postId_posts_id_fk" FOREIGN KEY ("postId") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_conversations_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_users_id_fk" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assistant_user_idx" ON "assistantMessages" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "company_resources_idx" ON "companyResources" USING btree ("kind","isPublished");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_pair_idx" ON "conversations" USING btree ("userOneId","userTwoId");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversationId","createdAt");--> statement-breakpoint
CREATE INDEX "posts_created_idx" ON "posts" USING btree ("createdAt");