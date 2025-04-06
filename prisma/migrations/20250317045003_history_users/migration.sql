-- AlterTable
ALTER TABLE `User` ADD COLUMN `lastPlayedDate` VARCHAR(191) NULL,
    ADD COLUMN `maxStreak` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `password` VARCHAR(191) NULL,
    ADD COLUMN `streak` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `WordleGame` ADD COLUMN `guesses` JSON NULL,
    ADD COLUMN `playable` BOOLEAN NOT NULL DEFAULT true;
