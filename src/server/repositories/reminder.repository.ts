import { db } from "@/server/db";

/**
 * All database access for reminders.
 *
 * The two "candidate" queries below are deliberately loose: they narrow to a
 * bounded set of rows that *could* be due, and leave the actual due/not-due
 * decision to the service, which uses the pure functions in src/lib/reminder.
 *
 * The alternative would be expressing "dueAt minus this row's own offset is in
 * the past" in SQL. Prisma cannot do arithmetic between a column and a filter
 * value, so it would mean raw SQL — putting the scheduling rule in a place
 * where it cannot be read alongside the rest of the logic, and where the
 * browser cannot share it. Fetching a bounded window and filtering in memory
 * keeps one copy of the rule.
 */
export const reminderRepository = {
  /**
   * Tasks whose reminder might have come due.
   *
   * Bounded by the deadline window rather than by the reminder time: any task
   * whose reminder is due now must have a deadline somewhere between "a bit
   * ago" and "the longest offset from now". `reminder: { is: null }` is what
   * stops a task being picked up again after its reminder exists.
   */
  findTaskCandidates(dueFrom: Date, dueTo: Date) {
    return db.task.findMany({
      where: {
        reminderEnabled: true,
        completedAt: null,
        assigneeId: { not: null },
        dueAt: { gte: dueFrom, lte: dueTo },
        reminder: { is: null },
      },
      select: {
        id: true,
        workspaceId: true,
        title: true,
        dueAt: true,
        assigneeId: true,
        reminderOffsetMinutes: true,
      },
    });
  },

  /**
   * Every habit with a reminder switched on.
   *
   * Not filtered by time, because a habit's reminder time is a wall-clock
   * reading that only becomes an instant once the owner's timezone is applied
   * — which cannot be done in SQL. The set is small (one row per habit, not
   * per day), so pulling all of them is cheap.
   */
  findHabitCandidates() {
    return db.habit.findMany({
      where: {
        reminderEnabled: true,
        archivedAt: null,
        remindAtMinutes: { not: null },
      },
      select: {
        id: true,
        workspaceId: true,
        membershipId: true,
        name: true,
        icon: true,
        remindAtMinutes: true,
        reminderOffsetMinutes: true,
        membership: {
          select: { user: { select: { timezone: true } } },
        },
      },
    });
  },

  /** Completions for the given habits in a short recent window, used to skip
   * reminding somebody about something they have already done today. */
  findRecentCompletions(habitIds: string[], since: Date) {
    if (habitIds.length === 0) return Promise.resolve([]);

    return db.habitCompletion.findMany({
      where: { habitId: { in: habitIds }, day: { gte: since } },
      select: { habitId: true, day: true },
    });
  },

  /** skipDuplicates makes this safe to run concurrently: if two sweeps overlap,
   * the second one's duplicate rows are dropped by the unique constraints
   * rather than crashing the job. */
  createMany(
    rows: {
      workspaceId: string;
      membershipId: string;
      taskId?: string | null;
      habitId?: string | null;
      day?: Date | null;
      title: string;
      body?: string | null;
      fireAt: Date;
    }[],
  ) {
    if (rows.length === 0) return Promise.resolve({ count: 0 });
    return db.reminder.createMany({ data: rows, skipDuplicates: true });
  },

  listForMembership(membershipId: string, limit: number) {
    return db.reminder.findMany({
      where: { membershipId },
      orderBy: { fireAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        body: true,
        fireAt: true,
        readAt: true,
        taskId: true,
        habitId: true,
      },
    });
  },

  countUnread(membershipId: string) {
    return db.reminder.count({ where: { membershipId, readAt: null } });
  },

  findById(id: string) {
    return db.reminder.findUnique({
      where: { id },
      select: { id: true, membershipId: true, workspaceId: true },
    });
  },

  markRead(id: string) {
    return db.reminder.update({
      where: { id },
      data: { readAt: new Date() },
    });
  },

  markAllRead(membershipId: string) {
    return db.reminder.updateMany({
      where: { membershipId, readAt: null },
      data: { readAt: new Date() },
    });
  },
};
