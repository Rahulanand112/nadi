import type { TaskPriority, RecurrenceFrequency } from "@prisma/client";
import { nextDueDate } from "@/lib/recurrence";
import {
  DEFAULT_REMINDER_OFFSET_MINUTES,
  isReminderOffset,
} from "@/lib/reminder";
import { taskRepository } from "@/server/repositories/task.repository";
import { workspaceRepository } from "@/server/repositories/workspace.repository";
import { ValidationError, ForbiddenError, NotFoundError } from "@/server/errors";

export type TaskScope = "mine" | "everyone";

export const taskService = {
  async list(input: {
    workspaceId: string;
    userId: string;
    scope: TaskScope;
  }) {
    const membership = await workspaceRepository.findMembership(
      input.workspaceId,
      input.userId,
    );
    if (!membership) {
      throw new ForbiddenError("You are not a member of this workspace.");
    }

    return taskRepository.listForWorkspace(
      input.workspaceId,
      input.scope === "mine" ? { assigneeId: membership.id } : undefined,
    );
  },

  async create(input: {
    workspaceId: string;
    userId: string;
    title: string;
    description?: string | null;
    category?: string | null;
    priority: TaskPriority;
    dueAt?: Date | null;
    isAllDay: boolean;
    assigneeId?: string | null;
    recurrence?: RecurrenceFrequency | null;
    reminderEnabled?: boolean;
    reminderOffsetMinutes?: number;
  }) {
    const membership = await workspaceRepository.findMembership(
      input.workspaceId,
      input.userId,
    );
    if (!membership) {
      throw new ForbiddenError("You are not a member of this workspace.");
    }

    const title = input.title.trim();
    if (!title) {
      throw new ValidationError("A task needs a title.");
    }

    // An assignee must belong to this workspace. Without this check, a
    // crafted request could attach a task to someone in another household.
    if (input.assigneeId) {
      await assertMembershipInWorkspace(input.assigneeId, input.workspaceId);
    }

    // A repeating task with no due date has nothing to advance from, so the
    // recurrence is dropped rather than silently doing nothing later.
    const recurrence = input.dueAt ? (input.recurrence ?? null) : null;

    return taskRepository.create({
      workspaceId: input.workspaceId,
      title,
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      priority: input.priority,
      dueAt: input.dueAt ?? null,
      isAllDay: input.isAllDay,
      assigneeId: input.assigneeId ?? membership.id,
      createdById: membership.id,
      recurrence,
      seriesId: recurrence ? crypto.randomUUID() : null,
      ...normaliseReminder(input, Boolean(input.dueAt)),
    });
  },

  /** Any member of the workspace may edit any task in it. This is a shared
   * household board, not a per-person inbox — locking edits to the assignee
   * would stop a parent rescheduling a child's task, which is the main thing
   * people want to do. */
  async update(input: {
    taskId: string;
    userId: string;
    data: {
      title?: string;
      description?: string | null;
      category?: string | null;
      priority?: TaskPriority;
      dueAt?: Date | null;
      isAllDay?: boolean;
      assigneeId?: string | null;
      completed?: boolean;
      reminderEnabled?: boolean;
      reminderOffsetMinutes?: number;
    };
  }) {
    const task = await taskRepository.findById(input.taskId);
    if (!task) throw new NotFoundError("Task");

    const membership = await workspaceRepository.findMembership(
      task.workspaceId,
      input.userId,
    );
    if (!membership) {
      throw new ForbiddenError("You are not a member of this workspace.");
    }

    if (input.data.assigneeId) {
      await assertMembershipInWorkspace(input.data.assigneeId, task.workspaceId);
    }

    const { completed, reminderOffsetMinutes, ...rest } = input.data;

    if (
      reminderOffsetMinutes !== undefined &&
      !isReminderOffset(reminderOffsetMinutes)
    ) {
      throw new ValidationError("That isn't a reminder option.");
    }

    const updated = await taskRepository.update(input.taskId, {
      ...rest,
      ...(reminderOffsetMinutes === undefined ? {} : { reminderOffsetMinutes }),
      ...(completed === undefined
        ? {}
        : { completedAt: completed ? new Date() : null }),
    });

    // Moving the deadline or changing the offset moves the reminder with it.
    // The already-written reminder has to go, because "one reminder per task"
    // is enforced by the database: leaving the old row in place would mean the
    // sweep could never write one for the new time, and the person would get
    // no reminder at all — the worst outcome of the three.
    const timingChanged =
      ("dueAt" in input.data && input.data.dueAt?.getTime() !== task.dueAt?.getTime()) ||
      (reminderOffsetMinutes !== undefined &&
        reminderOffsetMinutes !== task.reminderOffsetMinutes) ||
      input.data.reminderEnabled === false;

    if (timingChanged) {
      await taskRepository.clearReminder(task.id);
    }

    // Completing a repeating task creates the next occurrence. Spawning on
    // completion rather than pre-generating a year of rows means the database
    // only ever holds things that are actually going to happen.
    if (completed === true && task.recurrence && task.dueAt && !task.completedAt) {
      await taskRepository.create({
        workspaceId: task.workspaceId,
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        dueAt: nextDueDate(task.recurrence, task.dueAt),
        isAllDay: task.isAllDay,
        assigneeId: task.assigneeId,
        createdById: task.createdById,
        recurrence: task.recurrence,
        seriesId: task.seriesId ?? crypto.randomUUID(),
        // The next occurrence inherits the reminder setting. Somebody who
        // wants reminding about the bins every week means every week, not just
        // the first one.
        reminderEnabled: task.reminderEnabled,
        reminderOffsetMinutes: task.reminderOffsetMinutes,
      });
    }

    return updated;
  },

  async remove(input: { taskId: string; userId: string }) {
    const task = await taskRepository.findById(input.taskId);
    if (!task) throw new NotFoundError("Task");

    const membership = await workspaceRepository.findMembership(
      task.workspaceId,
      input.userId,
    );
    if (!membership) {
      throw new ForbiddenError("You are not a member of this workspace.");
    }

    return taskRepository.delete(input.taskId);
  },
};

/**
 * Settles what the reminder columns should be on a new task.
 *
 * A reminder with no deadline is meaningless — there is nothing to count
 * backwards from — so it is switched off rather than stored as a setting that
 * silently never fires. This mirrors how recurrence is handled just above, and
 * for the same reason: a stored intention that can never happen is worse than
 * no intention, because the person believes it is set.
 */
function normaliseReminder(
  input: { reminderEnabled?: boolean; reminderOffsetMinutes?: number },
  hasDueDate: boolean,
) {
  const offset = input.reminderOffsetMinutes ?? DEFAULT_REMINDER_OFFSET_MINUTES;

  if (!isReminderOffset(offset)) {
    throw new ValidationError("That isn't a reminder option.");
  }

  return {
    reminderEnabled: hasDueDate ? Boolean(input.reminderEnabled) : false,
    reminderOffsetMinutes: offset,
  };
}

async function assertMembershipInWorkspace(membershipId: string, workspaceId: string) {
  const { membershipRepository } = await import(
    "@/server/repositories/workspace.repository"
  );
  const target = await membershipRepository.findById(membershipId);
  if (!target || target.workspaceId !== workspaceId) {
    throw new ValidationError("That person isn't in this workspace.");
  }
}
