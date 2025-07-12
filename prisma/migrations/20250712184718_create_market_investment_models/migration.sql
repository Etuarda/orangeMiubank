/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `buyDate` on the `Investment` table. All the data in the column will be lost.
  - You are about to drop the column `buyPrice` on the `Investment` table. All the data in the column will be lost.
  - You are about to drop the column `sellDate` on the `Investment` table. All the data in the column will be lost.
  - You are about to drop the column `sellPrice` on the `Investment` table. All the data in the column will be lost.
  - You are about to alter the column `quantity` on the `Investment` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,4)`.
  - Added the required column `purchasePrice` to the `Investment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Asset" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "lastUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Investment" DROP COLUMN "buyDate",
DROP COLUMN "buyPrice",
DROP COLUMN "sellDate",
DROP COLUMN "sellPrice",
ADD COLUMN     "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "purchasePrice" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "saleDate" TIMESTAMP(3),
ADD COLUMN     "salePrice" DECIMAL(10,2),
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,4);
