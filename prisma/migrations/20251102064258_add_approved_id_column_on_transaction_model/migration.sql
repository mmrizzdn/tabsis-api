-- DropForeignKey
ALTER TABLE "public"."transactions" DROP CONSTRAINT "transactions_approved_by_fkey";

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "approver_id" TEXT;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
