-- Supabase publica el esquema `public` por su API REST con la clave pública del navegador.
-- Activamos RLS SIN políticas: los roles anon/authenticated no pueden leer ni escribir
-- nada, y el servidor (que se conecta con DATABASE_URL como propietario) no se ve afectado.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "likes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assistantMessages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "companyResources" ENABLE ROW LEVEL SECURITY;
