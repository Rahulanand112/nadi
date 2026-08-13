import {
  MAX_REMINDER_OFFSET_MINUTES,
  REMINDER_GRACE_MS,
  dayKeyInZone,
  isDue,
  reminderFireTime,
  zonedDayTimeToUtc,
} from "@/lib/reminder";
import { reminderRepository } from "@/server/repositories/reminder.repository";
import { pushService } from "@/server/services/push.service";
import { workspaceRepository } from "@/server/repositories/workspace.repository";
import { ForbiddenError, NotFoundError } from "@/server/errors";

/** How many notifications the bell shows. Older ones stay in the database for
 * analytics later, but nobody scrolls a notification list. */
const LIST_LIMIT = 30;

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** How many reminders one delivery pass will push. A ceiling rather than a
 * true limit: it caps how long a single serverless invocation can run, and
 * anything left over is picked up by the next sweep five minutes later. */
const DELIVERY_BATCH = 50;

export const reminderService = {
  /**
   * Works out which reminders have come due and writes them.
   *
   * Called on a schedule by the Inngest function, and safe to call at any
   * time from anywhere: it derives everything from current state, holds no
   * cursor, and relies on unique constraints rather than its own bookkeeping
   * to avoid duplicates. Running it twice in the same minute produces the same
   * result as running it once, which is the property that makes a background
   * job debuggable — you can always just run it again.
   */
  async sweep(now: Date = new Date()) {
    const [taskRows, habitRows] = await Promise.all([
      collectTaskReminders(now),
      collectHabitReminders(now),
    ]);

    const rows = [...taskRows, ...habitRows];
    const result = await reminderRepository.createMany(rows);

    return {
      considered: rows.length,
      created: result.count,
      at: now.toISOString(),
    };
  },

  /**
   * Pushes reminders that have been created but not yet sent to a device.
   *
   * Split from `sweep` rather than folded into it, because creating a
   * reminder and delivering it fail differently and should recover
   * differently. Postgres being briefly unreachable and Apple's push service
   * being briefly unreachable are unrelated events; bundling them would mean
   * a push outage stops reminders being recorded at all, and the in-app bell
   * would go silent too — losing the reliable channel to protect the
   * unreliable one.
   *
   * Safe to run repeatedly. `pushedAt` is set once, so a reminder already
   * delivered is never picked up again, and a crash mid-pass simply leaves
   * the remainder for the next run.
   */
  async deliverPending(now: Date = new Date()) {
    const since = new Date(now.getTime() - REMINDER_GRACE_MS);
    const pending = await reminderRepository.findPendingPush(since, DELIVERY_BATCH);

    if (pending.length === 0) {
      return { pending: 0, sent: 0, pruned: 0 };
    }

    let sent = 0;
    let pruned = 0;

    for (const reminder of pending) {
      const subscriptions = reminder.membership.user.pushSubscriptions;
      if (subscriptions.length === 0) continue;

      const result = await pushService.sendToSubscriptions(subscriptions, {
        title: reminder.title,
        body: reminder.body,
        // Deep-links into the workspace the reminder belongs to. Without the
        // slug the notification would open the app's root and make the person
        // navigate to whatever they were just told about.
        url: `/w/${reminder.membership.workspace.slug}/dashboard`,
      });

      sent += result.sent;
      pruned += result.pruned;
    }

    // Every reminder in this pass is marked, including ones whose owner has
    // no devices registered. They are not waiting on anything, and leaving
    // them unmarked would make them permanent residents of this query.
    await reminderRepository.markPushed(pending.map((reminder) => reminder.id));

    return { pending: pending.length, sent, pruned };
  },

  async list(input: { workspaceId: string; userId: string }) {
    const membership = await requireMembership(input.workspaceId, input.userId);

    const [reminders, unread] = await Promise.all([
      reminderRepository.listForMembership(membership.id, LIST_LIMIT),
      reminderRepository.countUnread(membership.id),
    ]);

    return { reminders, unread };
  },

  /** A reminder can only be dismissed by the membership it belongs to. Without
   * this check, knowing an id would be enough to dismiss somebody else's
   * notification — including one in a workspace you are not part of. */
  async markRead(input: { reminderId: string; userId: string }) {
    const reminder = await reminderRepository.findById(input.reminderId);
    if (!reminder) throw new NotFoundError("Reminder");

    const membership = await requireMembership(
      reminder.workspaceId,
      input.userId,
    );
    if (membership.id !== reminder.membershipId) {
      throw new ForbiddenError("That reminder isn't yours.");
    }

    return reminderRepository.markRead(reminder.id);
  },

  async markAllRead(input: { workspaceId: string; userId: string }) {
    const membership = await requireMembership(input.workspaceId, input.userId);
    return reminderRepository.markAllRead(membership.id);
  },
};

/**
 * Task reminders.
 *
 * The window looks back by the grace period and forward by the longest offset
 * anyone can choose, which is the smallest range guaranteed to contain every
 * task whose reminder is due right now. Widening it costs rows; narrowing it
 * would silently drop reminders, which is much worse.
 */
async function collectTaskReminders(now: Date) {
  const dueFrom = new Date(now.getTime() - REMINDER_GRACE_MS);
  const dueTo = new Date(now.getTime() + MAX_REMINDER_OFFSET_MINUTES * MINUTE_MS);

  const tasks = await reminderRepository.findTaskCandidates(dueFrom, dueTo);

  return tasks.flatMap((task) => {
    // Both are guaranteed by the query's where clause; narrowing here is for
    // TypeScript, which cannot see that far.
    if (!task.dueAt || !task.assigneeId) return [];

    const fireAt = reminderFireTime(task.dueAt, task.reminderOffsetMinutes);
    if (!isDue(fireAt, now)) return [];

    return [
      {
        workspaceId: task.workspaceId,
        membershipId: task.assigneeId,
        taskId: task.id as string | null,
        habitId: null as string | null,
        day: null as Date | null,
        title: task.title,
        body: describeLeadTime(task.reminderOffsetMinutes),
        fireAt,
      },
    ];
  });
}

/**
 * Habit reminders.
 *
 * Two things make these harder than tasks. The reminder time is a wall-clock
 * reading, so it has to be resolved against the owner's timezone before it is
 * a real instant. And a habit recurs, so "which day is this reminder for" is
 * part of its identity — that is what the `day` column carries, and what stops
 * the sweep writing a fresh reminder every five minutes.
 */
async function collectHabitReminders(now: Date) {
  const habits = await reminderRepository.findHabitCandidates();
  if (habits.length === 0) return [];

  // Two days back rather than one: near midnight in a positive-offset zone,
  // "today" locally can still be yesterday in UTC.
  const completions = await reminderRepository.findRecentCompletions(
    habits.map((habit) => habit.id),
    new Date(now.getTime() - 2 * DAY_MS),
  );

  const done = new Set(
    completions.map(
      (row) => `${row.habitId}|${row.day.toISOString().slice(0, 10)}`,
    ),
  );

  return habits.flatMap((habit) => {
    if (habit.remindAtMinutes === null) return [];

    const timeZone = habit.membership.user.timezone;

    // Yesterday as well as today, because a reminder set for 00:30 with a
    // 1-hour offset fires on the previous local day.
    const dayKeys = [
      dayKeyInZone(new Date(now.getTime() - DAY_MS), timeZone),
      dayKeyInZone(now, timeZone),
    ];

    for (const dayKey of [...new Set(dayKeys)]) {
      const target = zonedDayTimeToUtc(
        dayKey,
        habit.remindAtMinutes,
        timeZone,
      );
      const fireAt = reminderFireTime(target, habit.reminderOffsetMinutes);

      if (!isDue(fireAt, now)) continue;
      // Already ticked off — reminding now would be nagging about something
      // that is finished.
      if (done.has(`${habit.id}|${dayKey}`)) continue;

      return [
        {
          workspaceId: habit.workspaceId,
          membershipId: habit.membershipId,
          taskId: null as string | null,
          habitId: habit.id as string | null,
          day: new Date(`${dayKey}T00:00:00.000Z`) as Date | null,
          title: habit.icon ? `${habit.icon} ${habit.name}` : habit.name,
          body: describeLeadTime(habit.reminderOffsetMinutes),
          fireAt,
        },
      ];
    }

    return [];
  });
}

function describeLeadTime(offsetMinutes: number): string {
  if (offsetMinutes < 60) return `Due in ${offsetMinutes} minutes`;
  if (offsetMinutes < 1440) {
    const hours = offsetMinutes / 60;
    return `Due in ${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  return "Due tomorrow";
}

async function requireMembership(workspaceId: string, userId: string) {
  const membership = await workspaceRepository.findMembership(
    workspaceId,
    userId,
  );
  if (!membership) {
    throw new ForbiddenError("You are not a member of this workspace.");
  }
  return membership;
}
