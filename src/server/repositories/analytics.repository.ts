import { db } from "@/server/db";

export const analyticsRepository = {
  /** Only the fields the maths needs. Pulling whole task rows for analytics
   * would move a lot of text (titles, descriptions) that no figure uses. */
  taskFactsForWorkspace(workspaceId: string, since: Date) {
    return db.task.findMany({
      where: { workspaceId, createdAt: { gte: since } },
      select: {
        assigneeId: true,
        dueAt: true,
        completedAt: true,
        createdAt: true,
      },
    });
  },

  habitCompletionCounts(workspaceId: string, since: Date) {
    return db.habitCompletion.findMany({
      where: {
        day: { gte: since },
        habit: { workspaceId, archivedAt: null },
      },
      select: {
        day: true,
        habit: { select: { membershipId: true } },
      },
    });
  },
};
