-- AlterTable
ALTER TABLE "habits" ADD COLUMN     "remindAtMinutes" INTEGER,
ADD COLUMN     "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderOffsetMinutes" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderOffsetMinutes" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "taskId" TEXT,
    "habitId" TEXT,
    "day" DATE,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "fireAt" TIMESTAMP(3) NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reminders_membershipId_readAt_idx" ON "reminders"("membershipId", "readAt");

-- CreateIndex
CREATE INDEX "reminders_fireAt_idx" ON "reminders"("fireAt");

-- CreateIndex
CREATE UNIQUE INDEX "reminders_taskId_key" ON "reminders"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "reminders_habitId_day_key" ON "reminders"("habitId", "day");

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
