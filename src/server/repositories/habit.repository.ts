import { db } from "@/server/db";

/** Completions are fetched for a bounded window rather than all-time: a habit
 * two years old would otherwise drag thousands of rows into memory to compute
 * a streak that only needs the recent past. */
const COMPLETION_WINDOW_DAYS = 400;

export const habitRepository = {
  listForWorkspace(workspaceId: string, membershipId?: string) {
    const since = new Date();
    since.setDate(since.getDate() - COMPLETION_WINDOW_DAYS);

    return db.habit.findMany({
      where: {
        workspaceId,
        archivedAt: null,
        ...(membershipId ? { membershipId } : {}),
      },
      include: {
        membership: { select: { id: true, displayName: true } },
        completions: {
          where: { day: { gte: since } },
          select: { day: true },
          orderBy: { day: "desc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  findById(id: string) {
    return db.habit.findUnique({ where: { id } });
  },

  create(data: {
    workspaceId: string;
    membershipId: string;
    name: string;
    icon?: string | null;
    targetPerWeek: number;
    remindAtMinutes?: number | null;
    reminderEnabled?: boolean;
    reminderOffsetMinutes?: number;
  }) {
    return db.habit.create({ data });
  },

  update(
    id: string,
    data: {
      name?: string;
      icon?: string | null;
      targetPerWeek?: number;
      archivedAt?: Date | null;
      remindAtMinutes?: number | null;
      reminderEnabled?: boolean;
      reminderOffsetMinutes?: number;
    },
  ) {
    return db.habit.update({ where: { id }, data });
  },

  markDone(habitId: string, day: Date) {
    // Upsert rather than create: ticking an already-ticked day is a no-op
    // instead of a unique-constraint crash.
    return db.habitCompletion.upsert({
      where: { habitId_day: { habitId, day } },
      create: { habitId, day },
      update: {},
    });
  },

  markNotDone(habitId: string, day: Date) {
    return db.habitCompletion.deleteMany({ where: { habitId, day } });
  },
};
