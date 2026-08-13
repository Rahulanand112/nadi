import { db } from "@/server/db";

const withAuthor = {
  membership: { select: { id: true, displayName: true } },
} as const;

export const commentRepository = {
  listForTask(taskId: string) {
    return db.taskComment.findMany({
      where: { taskId },
      include: withAuthor,
      // Oldest first: a comment thread is read top to bottom like a
      // conversation, unlike the reminder feed where the newest matters most.
      orderBy: { createdAt: "asc" },
    });
  },

  create(data: { taskId: string; membershipId: string; body: string }) {
    return db.taskComment.create({ data, include: withAuthor });
  },

  findById(id: string) {
    return db.taskComment.findUnique({
      where: { id },
      select: {
        id: true,
        membershipId: true,
        task: { select: { workspaceId: true } },
      },
    });
  },

  delete(id: string) {
    return db.taskComment.delete({ where: { id } });
  },
};
