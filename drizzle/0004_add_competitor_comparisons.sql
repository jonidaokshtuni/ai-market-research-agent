CREATE TABLE "competitor_comparisons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competitor_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"previous_snapshot_id" uuid NOT NULL,
	"current_snapshot_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"overall_impact" text NOT NULL,
	"changes" jsonb NOT NULL,
	"limitations" jsonb NOT NULL,
	"sources" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competitor_comparisons" ADD CONSTRAINT "competitor_comparisons_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_comparisons" ADD CONSTRAINT "competitor_comparisons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_comparisons" ADD CONSTRAINT "competitor_comparisons_previous_snapshot_id_competitor_snapshots_id_fk" FOREIGN KEY ("previous_snapshot_id") REFERENCES "public"."competitor_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_comparisons" ADD CONSTRAINT "competitor_comparisons_current_snapshot_id_competitor_snapshots_id_fk" FOREIGN KEY ("current_snapshot_id") REFERENCES "public"."competitor_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "competitor_comparisons_competitor_id_idx" ON "competitor_comparisons" USING btree ("competitor_id");--> statement-breakpoint
CREATE INDEX "competitor_comparisons_user_id_idx" ON "competitor_comparisons" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "competitor_comparisons_created_at_idx" ON "competitor_comparisons" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "competitor_comparisons_previous_snapshot_id_idx" ON "competitor_comparisons" USING btree ("previous_snapshot_id");--> statement-breakpoint
CREATE INDEX "competitor_comparisons_current_snapshot_id_idx" ON "competitor_comparisons" USING btree ("current_snapshot_id");