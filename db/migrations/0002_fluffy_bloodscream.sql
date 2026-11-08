CREATE TYPE "public"."notification_kind" AS ENUM('mention', 'ticket');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"title" varchar(160) NOT NULL,
	"body" varchar(500) NOT NULL,
	"target" varchar(20) DEFAULT 'feed' NOT NULL,
	"ticketId" integer,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"creatorId" integer NOT NULL,
	"subject" varchar(120) NOT NULL,
	"body" text NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"resolvedAt" timestamp,
	"resolvedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "handle" varchar(40);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notifyByEmail" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegramChatId" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegramLinkCode" varchar(12);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegramLinkedAt" timestamp;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_creatorId_users_id_fk" FOREIGN KEY ("creatorId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_resolvedBy_users_id_fk" FOREIGN KEY ("resolvedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "tickets" USING btree ("status","createdAt");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_handle_unique" UNIQUE("handle");