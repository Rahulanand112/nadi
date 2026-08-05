-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKDAYS', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "recurrence" "RecurrenceFrequency",
ADD COLUMN     "seriesId" TEXT;

-- CreateTable
CREATE TABLE "habits" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "targetPerWeek" INTEGER NOT NULL DEFAULT 7,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "habits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_completions" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habit_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "habits_workspaceId_idx" ON "habits"("workspaceId");

-- CreateIndex
CREATE INDEX "habits_membershipId_idx" ON "habits"("membershipId");

-- CreateIndex
CREATE INDEX "habit_completions_habitId_day_idx" ON "habit_completions"("habitId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "habit_completions_habitId_day_key" ON "habit_completions"("habitId", "day");

-- CreateIndex
CREATE INDEX "tasks_seriesId_idx" ON "tasks"("seriesId");

-- AddForeignKey
ALTER TABLE "habits" ADD CONSTRAINT "habits_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habits" ADD CONSTRAINT "habits_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_completions" ADD CONSTRAINT "habit_completions_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
