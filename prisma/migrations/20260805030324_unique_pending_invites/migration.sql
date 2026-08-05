/*
  Warnings:

  - A unique constraint covering the columns `[workspaceId,email]` on the table `invitations` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "invitations_workspaceId_email_key" ON "invitations"("workspaceId", "email");
