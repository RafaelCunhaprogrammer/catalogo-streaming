CREATE TABLE "profile_titles" (
	"profile_id" text NOT NULL,
	"media_type" text NOT NULL,
	"tmdb_id" integer NOT NULL,
	"favorite" boolean DEFAULT false NOT NULL,
	"favorite_at" timestamp,
	"status" text DEFAULT 'nenhum' NOT NULL,
	"status_at" timestamp,
	"season" integer,
	"episode" integer,
	"snapshot" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profile_titles_profile_id_media_type_tmdb_id_pk" PRIMARY KEY("profile_id","media_type","tmdb_id")
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "favorite_genres" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "genres_prompt_done" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_titles" ADD CONSTRAINT "profile_titles_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_titles_status_idx" ON "profile_titles" USING btree ("profile_id","status","status_at");--> statement-breakpoint
CREATE INDEX "profile_titles_favorite_idx" ON "profile_titles" USING btree ("profile_id","favorite","favorite_at");