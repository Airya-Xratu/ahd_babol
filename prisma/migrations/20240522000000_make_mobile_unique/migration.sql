-- Make nationalCode nullable (was NOT NULL + @unique)
ALTER TABLE "Signature" ALTER COLUMN "nationalCode" DROP NOT NULL;

-- Remove unique constraint on nationalCode
ALTER TABLE "Signature" DROP CONSTRAINT IF EXISTS "Signature_nationalCode_key";

-- Add unique constraint on mobile
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_mobile_key" UNIQUE ("mobile");

-- Remove old nationalCode index
DROP INDEX IF EXISTS "Signature_nationalCode_idx";

-- Add mobile index
CREATE INDEX "Signature_mobile_idx" ON "Signature"("mobile");
