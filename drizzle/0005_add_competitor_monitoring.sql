CREATE TABLE "competitor_monitoring" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competitor_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"frequency" text DEFAULT 'weekly' NOT NULL,
	"next_run_at" timestamp,
	"last_run_at" timestamp,
	"last_attempt_at" timestamp,
	"last_error" text,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competitor_monitoring" ADD CONSTRAINT "competitor_monitoring_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_monitoring" ADD CONSTRAINT "competitor_monitoring_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "competitor_monitoring_competitor_id_unique" ON "competitor_monitoring" USING btree ("competitor_id");--> statement-breakpoint
CREATE INDEX "competitor_monitoring_user_id_idx" ON "competitor_monitoring" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "competitor_monitoring_due_idx" ON "competitor_monitoring" USING btree ("is_enabled","next_run_at");