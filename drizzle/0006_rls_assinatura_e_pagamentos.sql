-- Mesmo padrão da 0002: RLS ligada e nenhuma política, o que fecha a Data API do Supabase.
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
