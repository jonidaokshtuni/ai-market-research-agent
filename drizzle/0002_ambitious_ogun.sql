CREATE TABLE "competitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"industry" text,
	"description" text,
	"products" text,
	"pricing" text,
	"strengths" text,
	"weaknesses" text,
	"market_strength" integer DEFAULT 50 NOT NULL,
	"innovation_score" integer DEFAULT 50 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "competitors_user_id_idx" ON "competitors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "competitors_created_at_idx" ON "competitors" USING btree ("created_at");