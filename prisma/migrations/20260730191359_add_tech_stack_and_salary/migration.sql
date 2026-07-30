-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "salary" TEXT,
ADD COLUMN     "techStack" TEXT[] DEFAULT ARRAY[]::TEXT[];
