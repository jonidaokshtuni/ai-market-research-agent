ALTER TABLE "competitors" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "competitors_organization_id_idx" ON "competitors" USING btree ("organization_id");
--> statement-breakpoint
-- Backfill competitors only when their creator has exactly one workspace.

UPDATE "competitors" AS c
SET "organization_id" = membership."organization_id"
FROM (
    SELECT
        "user_id",
        MIN("organization_id"::text)::uuid AS "organization_id"
    FROM "organization_members"
    GROUP BY "user_id"
    HAVING COUNT(*) = 1
) AS membership
WHERE c."user_id" = membership."user_id"
  AND c."organization_id" IS NULL;
