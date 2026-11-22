ALTER TABLE "users" ADD COLUMN "approvedAt" timestamp;UPDATE users SET "approvedAt" = now() WHERE "approvedAt" IS NULL;
