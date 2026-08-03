-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('OFFICE', 'HYBRID', 'REMOTE');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "workMode" "WorkMode";
