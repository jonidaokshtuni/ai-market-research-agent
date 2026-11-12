CREATE TABLE "organization_join_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_join_requests" ADD CONSTRAINT "organization_join_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_join_requests" ADD CONSTRAINT "organization_join_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_join_requests" ADD CONSTRAINT "organization_join_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_join_requests_organization_id_idx" ON "organization_join_requests" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_join_requests_user_id_idx" ON "organization_join_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organization_join_requests_status_idx" ON "organization_join_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_join_requests_pending_unique" ON "organization_join_requests" USING btree ("organization_id","user_id") WHERE "organization_join_requests"."status" = 'pending';