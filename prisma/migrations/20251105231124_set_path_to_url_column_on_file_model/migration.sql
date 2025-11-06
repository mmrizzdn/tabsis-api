/*
  Warnings:

  - You are about to drop the column `path` on the `files` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail` on the `files` table. All the data in the column will be lost.
  - Added the required column `url` to the `files` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "files" DROP COLUMN "path",
DROP COLUMN "thumbnail",
ADD COLUMN     "thumbnail_url" TEXT,
ADD COLUMN     "url" TEXT NOT NULL;
