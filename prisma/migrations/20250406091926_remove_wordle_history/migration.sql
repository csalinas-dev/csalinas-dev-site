/*
  Warnings:

  - You are about to drop the `WordleHistory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `WordleHistory` DROP FOREIGN KEY `WordleHistory_userId_fkey`;

-- DropTable
DROP TABLE `WordleHistory`;
