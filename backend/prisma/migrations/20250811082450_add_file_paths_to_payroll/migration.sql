/*
  Warnings:

  - You are about to drop the column `filePath` on the `payroll_schedules` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "payroll_schedules" DROP COLUMN "filePath",
ADD COLUMN     "csvFilePath" TEXT,
ADD COLUMN     "pdfFilePath" TEXT;
