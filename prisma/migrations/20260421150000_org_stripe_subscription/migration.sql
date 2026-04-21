-- AlterTable
ALTER TABLE "organizations"
  ADD COLUMN "stripeCustomerId"     TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "subscriptionStatus"   TEXT,
  ADD COLUMN "currentPeriodEnd"     TIMESTAMP(3),
  ADD COLUMN "trialEndsAt"          TIMESTAMP(3);

-- Unique indexes (NULL-safe, so multiple orgs can coexist without a Stripe ID)
CREATE UNIQUE INDEX "organizations_stripeCustomerId_key"
  ON "organizations"("stripeCustomerId");

CREATE UNIQUE INDEX "organizations_stripeSubscriptionId_key"
  ON "organizations"("stripeSubscriptionId");
