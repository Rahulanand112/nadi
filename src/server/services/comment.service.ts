import { commentRepository } from "@/server/repositories/comment.repository";
import { taskRepository } from "@/server/repositories/task.repository";
import { workspaceRepository } from "@/server/repositories/workspace.repository";
import { ValidationError, ForbiddenError, NotFoundError } from "@/server/errors";

const MAX_BODY_LENGTH = 2000;

export const commentService = {
  async list(input: { taskId: string; userId: string }) {
    await requireTaskAccess(input.taskId, input.userId);
    return commentRepository.listForTask(input.taskId);
  },

  /** Anyone in the workspace can comment, matching how anyone can edit or
   * tick off any task here. A shared board where only the assignee may reply
   * would make the most common case — someone else asking "did you get to
   * this?" — impossible. */
  async create(input: { taskId: string; userId: string; body: string }) {
    const { membership } = await requireTaskAccess(input.taskId, input.userId);

    const body = input.body.trim();
    if (!body) throw new ValidationError("A comment needs something in it.");
    if (body.length > MAX_BODY_LENGTH) {
      throw new ValidationError("That comment is too long.");
    }

    return commentRepository.create({
      taskId: input.taskId,
      membershipId: membership.id,
      body,
    });
  },

  /**
   * Deleting is narrower than commenting: your own comments, or anyone's if
   * you own the workspace.
   *
   * The asymmetry is deliberate. Adding to a conversation is collaborative;
   * removing someone else's words is not, and a household member quietly
   * deleting a reply they disliked is a worse failure than one they cannot
   * tidy up. The owner exception exists because somebody has to be able to
   * remove genuinely unwanted content.
   */
  async remove(input: { commentId: string; userId: string }) {
    const comment = await commentRepository.findById(input.commentId);
    if (!comment) throw new NotFoundError("Comment");

    const membership = await workspaceRepository.findMembership(
      comment.task.workspaceId,
      input.userId,
    );
    if (!membership) {
      throw new ForbiddenError("You are not a member of this workspace.");
    }

    const isAuthor = membership.id === comment.membershipId;
    if (!isAuthor && membership.role !== "OWNER") {
      throw new ForbiddenError("You can only delete your own comments.");
    }

    return commentRepository.delete(comment.id);
  },
};

async function requireTaskAccess(taskId: string, userId: string) {
  const task = await taskRepository.findById(taskId);
  if (!task) throw new NotFoundError("Task");

  const membership = await workspaceRepository.findMembership(
    task.workspaceId,
    userId,
  );
  if (!membership) {
    throw new ForbiddenError("You are not a member of this workspace.");
  }

  return { task, membership };
}
