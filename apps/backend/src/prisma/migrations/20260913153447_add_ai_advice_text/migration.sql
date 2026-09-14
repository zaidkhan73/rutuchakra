/*
  Warnings:

  - Added the required column `aiAdviceText` to the `Prediction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN     "aiAdviceText" TEXT NOT NULL;
