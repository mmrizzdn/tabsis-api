/*
  Warnings:

  - Made the column `phone_number` on table `profiles` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "profiles" ALTER COLUMN "phone_number" SET NOT NULL;
