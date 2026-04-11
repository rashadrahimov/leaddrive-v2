-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "organizations" ADD COLUMN "serverType" TEXT NOT NULL DEFAULT 'shared';
ALTER TABLE "organizations" ADD COLUMN "serverIp" TEXT;
ALTER TABLE "organizations" ADD COLUMN "provisionedAt" TIMESTAMP(3);
ALTER TABLE "organizations" ADD COLUMN "provisionedBy" TEXT;
