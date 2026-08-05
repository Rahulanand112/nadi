import { db } from "@/server/db";
import type { Prisma, TaskPriority, RecurrenceFrequency } from "@prisma/client";

const withPeople = {
  assignee: { select: { id: true, displayName: true } },
  createdBy: { select: { id: true, displayName: true } },
} satisfies Prisma.TaskInclude;

export const taskRepository = {
  listForWorkspace(workspaceId: string, filter?: { assigneeId?: string }) {
    return db.task.findMany({
      where: {
        workspaceId,
        ...(filter?.assigneeId ? { assigneeId: filter.assigneeId } : {}),
      },
      include: withPeople,
      // Incomplete first, then soonest deadline. Tasks with no deadline sort
      // last rather than first, which is what "nulls last" buys us.
      orderBy: [{ completedAt: "asc" }, { dueAt: { sort: "asc", nulls: "last" } }],
    });
  },

  findById(id: string) {
    return db.task.findUnique({ where: { id }, include: withPeople });
  },

  create(data: {
    workspaceId: string;
    title: string;
    description?: string | null;
    category?: string | null;
    priority: TaskPriority;
    dueAt?: Date | null;
    isAllDay: boolean;
    assigneeId?: string | null;
    createdById: string;
    recurrence?: RecurrenceFrequency | null;
    seriesId?: string | null;
  }) {
    return db.task.create({ data, include: withPeople });
  },

  update(id: string, data: Prisma.TaskUpdateInput) {
    return db.task.update({ where: { id }, data, include: withPeople });
  },

  delete(id: string) {
    return db.task.delete({ where: { id } });
  },
};
