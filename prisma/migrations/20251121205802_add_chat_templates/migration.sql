/*
  Warnings:

  - You are about to drop the column `slug` on the `chat_templates` table. All the data in the column will be lost.
  - Made the column `name` on table `chat_templates` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "chat_templates_slug_key";

-- AlterTable
ALTER TABLE "chat_templates" DROP COLUMN "slug",
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "name" SET NOT NULL;
