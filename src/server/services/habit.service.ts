import { habitRepository } from "@/server/repositories/habit.repository";
import { workspaceRepository, membershipRepository } from "@/server/repositories/workspace.repository";
import { ValidationError, ForbiddenError, NotFoundError } from "@/server/errors";

/** Parses "2026-08-05" into a UTC-midnight Date for the @db.Date column.
 * The client sends its own local day key, so what lands in the database is the
 * day the person actually means. */
function parseDayKey(dayKey: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
    throw new ValidationError("Invalid date.");
  }
  return new Date(`${dayKey}T00:00:00.000Z`);
}

export const habitService = {
  async list(input: { workspaceId: string; userId: string; scope: "mine" | "everyone" }) {
    const membership = await workspaceRepository.findMembership(input.workspaceId, input.userId);
    if (!membership) throw new ForbiddenError("You are not a member of this workspace.");

    return habitRepository.listForWorkspace(
      input.workspaceId,
      input.scope === "mine" ? membership.id : undefined,
    );
  },

  async create(input: {
    workspaceId: string;
    userId: string;
    name: string;
    icon?: string | null;
    targetPerWeek: number;
    membershipId?: string;
  }) {
    const membership = await workspaceRepository.findMembership(input.workspaceId, input.userId);
    if (!membership) throw new ForbiddenError("You are not a member of this workspace.");

    const name = input.name.trim();
    if (!name) throw new ValidationError("A habit needs a name.");
    if (input.targetPerWeek < 1 || input.targetPerWeek > 7) {
      throw new ValidationError("Target must be between 1 and 7 days a week.");
    }

    // Creating a habit for someone else is allowed (a parent setting one up
    // for a child), but only within the same workspace.
    let ownerMembershipId = membership.id;
    if (input.membershipId && input.membershipId !== membership.id) {
      const target = await membershipRepository.findById(input.membershipId);
      if (!target || target.workspaceId !== input.workspaceId) {
        throw new ValidationError("That person isn't in this workspace.");
      }
      ownerMembershipId = target.id;
    }

    return habitRepository.create({
      workspaceId: input.workspaceId,
      membershipId: ownerMembershipId,
      name,
      icon: input.icon?.trim() || null,
      targetPerWeek: input.targetPerWeek,
    });
  },

  async toggleDay(input: { habitId: string; userId: string; dayKey: string; done: boolean }) {
    const habit = await this.assertAccess(input.habitId, input.userId);
    const day = parseDayKey(input.dayKey);

    // Ticking a future day would let someone fake a streak forward. Past days
    // stay editable — people forget to log things.
    const todayKey = new Date().toISOString().slice(0, 10);
    if (input.dayKey > todayKey) {
      throw new ValidationError("You can't tick off a day that hasn't happened yet.");
    }

    return input.done
      ? habitRepository.markDone(habit.id, day)
      : habitRepository.markNotDone(habit.id, day);
  },

  async archive(input: { habitId: string; userId: string }) {
    const habit = await this.assertAccess(input.habitId, input.userId);
    // Archived, not deleted: the completion history stays intact, so a habit
    // resumed later keeps its record rather than starting from nothing.
    return habitRepository.update(habit.id, { archivedAt: new Date() });
  },

  /** Any member of the workspace can tick or archive any habit in it — same
   * reasoning as tasks: this is a shared board, and a parent marking a child's
   * habit done is a normal thing to want. */
  async assertAccess(habitId: string, userId: string) {
    const habit = await habitRepository.findById(habitId);
    if (!habit) throw new NotFoundError("Habit");

    const membership = await workspaceRepository.findMembership(habit.workspaceId, userId);
    if (!membership) throw new ForbiddenError("You are not a member of this workspace.");

    return habit;
  },
};
