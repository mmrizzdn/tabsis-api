/*
  Warnings:

  - You are about to drop the column `imagekit_thumbnail_id` on the `files` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."files_imagekit_thumbnail_id_key";

-- AlterTable
ALTER TABLE "files" DROP COLUMN "imagekit_thumbnail_id";
