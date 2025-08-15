-- Add password expiry fields to Admin table
ALTER TABLE "admins" ADD COLUMN "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "admins" ADD COLUMN "passwordExpiresAt" TIMESTAMP(3);
ALTER TABLE "admins" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Set passwordExpiresAt to 90 days from passwordChangedAt for existing admins
UPDATE "admins" SET "passwordExpiresAt" = "passwordChangedAt" + INTERVAL '90 days';

-- Create index for password expiry queries
CREATE INDEX "idx_admins_password_expires_at" ON "admins"("passwordExpiresAt");
CREATE INDEX "idx_admins_must_change_password" ON "admins"("mustChangePassword");