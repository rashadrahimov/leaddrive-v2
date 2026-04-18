ALTER TABLE "survey_unsubscribes" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "survey_unsubscribes" ALTER COLUMN "email" DROP NOT NULL;
DROP INDEX IF EXISTS "survey_unsubscribes_organizationId_surveyId_email_key";
CREATE INDEX IF NOT EXISTS "survey_unsubs_org_phone_idx" ON "survey_unsubscribes"("organizationId","phone");
