-- O site fala direto com o banco como dono das tabelas, e o dono não é barrado pela RLS.
-- Sem políticas, ninguém mais lê nada: no Supabase, é isso que fecha a Data API.
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profile_titles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "parental_pins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "demo_state" ENABLE ROW LEVEL SECURITY;
