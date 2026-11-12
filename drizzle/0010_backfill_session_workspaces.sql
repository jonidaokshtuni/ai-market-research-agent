-- Assign existing research sessions only when their user
-- has exactly one workspace membership.

UPDATE "sessions" AS s
SET "organization_id" = membership."organization_id"
FROM (
    SELECT
        "user_id",
        MIN("organization_id"::text)::uuid AS "organization_id"
    FROM "organization_members"
    GROUP BY "user_id"
    HAVING COUNT(*) = 1
) AS membership
WHERE s."user_id" = membership."user_id"::text
  AND s."organization_id" IS NULL;