/*
  Warnings:

  - You are about to drop the column `interestRate` on the `loans` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "loans" DROP COLUMN "interestRate",
ADD COLUMN     "isPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pauseReason" TEXT,
ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "statusComments" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "accountDetails" TEXT;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
