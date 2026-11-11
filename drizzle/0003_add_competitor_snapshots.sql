CREATE TABLE "competitor_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competitor_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"research_task" text NOT NULL,
	"summary" text NOT NULL,
	"findings" jsonb NOT NULL,
	"key_insights" jsonb NOT NULL,
	"limitations" jsonb NOT NULL,
	"sources" jsonb NOT NULL,
	"tools_used" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competitor_snapshots" ADD CONSTRAINT "competitor_snapshots_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_snapshots" ADD CONSTRAINT "competitor_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "competitor_snapshots_competitor_id_idx" ON "competitor_snapshots" USING btree ("competitor_id");--> statement-breakpoint
CREATE INDEX "competitor_snapshots_user_id_idx" ON "competitor_snapshots" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "competitor_snapshots_created_at_idx" ON "competitor_snapshots" USING btree ("created_at");