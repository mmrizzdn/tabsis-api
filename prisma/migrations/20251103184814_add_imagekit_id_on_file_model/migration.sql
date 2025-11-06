/*
  Warnings:

  - You are about to drop the column `bucket` on the `files` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[imagekit_id]` on the table `files` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[imagekit_thumbnail_id]` on the table `files` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `imagekit_id` to the `files` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "files" DROP COLUMN "bucket",
ADD COLUMN     "imagekit_id" TEXT NOT NULL,
ADD COLUMN     "imagekit_thumbnail_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "files_imagekit_id_key" ON "files"("imagekit_id");

-- CreateIndex
CREATE UNIQUE INDEX "files_imagekit_thumbnail_id_key" ON "files"("imagekit_thumbnail_id");
