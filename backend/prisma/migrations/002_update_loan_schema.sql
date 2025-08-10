-- Remove interest rate column and add new columns
ALTER TABLE loans DROP COLUMN IF EXISTS "interestRate";
ALTER TABLE loans ADD COLUMN IF NOT EXISTS "statusComments" TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS "updatedBy" TEXT;

-- Add foreign key constraint for updatedBy
ALTER TABLE loans ADD CONSTRAINT "loans_updatedBy_fkey" 
FOREIGN KEY ("updatedBy") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;