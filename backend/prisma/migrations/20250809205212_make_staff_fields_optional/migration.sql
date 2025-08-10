-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('POSITION', 'DEPARTMENT', 'JOB_TYPE', 'ISSUE_CATEGORY');

-- AlterTable
ALTER TABLE "issues" ADD COLUMN     "categoryId" TEXT;

-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "jobTypeId" TEXT,
ADD COLUMN     "positionId" TEXT,
ALTER COLUMN "dateOfBirth" DROP NOT NULL,
ALTER COLUMN "nationality" DROP NOT NULL,
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "personalEmail" DROP NOT NULL,
ALTER COLUMN "workEmail" DROP NOT NULL,
ALTER COLUMN "jobTitle" DROP NOT NULL,
ALTER COLUMN "department" DROP NOT NULL,
ALTER COLUMN "dateOfJoining" DROP NOT NULL,
ALTER COLUMN "employmentType" DROP NOT NULL,
ALTER COLUMN "workLocation" DROP NOT NULL,
ALTER COLUMN "emergencyContactName" DROP NOT NULL,
ALTER COLUMN "emergencyContactRelationship" DROP NOT NULL,
ALTER COLUMN "emergencyContactPhone" DROP NOT NULL;

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_type_key" ON "categories"("name", "type");

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_jobTypeId_fkey" FOREIGN KEY ("jobTypeId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
