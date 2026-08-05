import type { TaskPriority } from "@prisma/client";
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

    const { completed, ...rest } = input.data;

    return taskRepository.update(input.taskId, {
      ...rest,
      ...(completed === undefined
        ? {}
        : { completedAt: completed ? new Date() : null }),
    });
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

async function assertMembershipInWorkspace(membershipId: string, workspaceId: string) {
  const { membershipRepository } = await import(
    "@/server/repositories/workspace.repository"
  );
  const target = await membershipRepository.findById(membershipId);
  if (!target || target.workspaceId !== workspaceId) {
    throw new ValidationError("That person isn't in this workspace.");
  }
}
