-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "heardBack" BOOLEAN;
