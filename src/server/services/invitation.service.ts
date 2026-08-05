import { randomBytes } from "node:crypto";
import type { MembershipRole } from "@prisma/client";
import { invitationRepository } from "@/server/repositories/invitation.repository";
import { workspaceRepository, membershipRepository } from "@/server/repositories/workspace.repository";
import { ValidationError, ForbiddenError, NotFoundError } from "@/server/errors";

const INVITE_LIFETIME_DAYS = 7;

/**
 * Invitations are share links, not emails -- the owner generates a URL and
 * passes it along however they like. That makes the token a bearer
 * credential, so it is high-entropy, single use, time limited, and visible to
 * the owner so it can be revoked. See docs/decisions.md (ADR 006).
 */
export const invitationService = {
  async create(input: {
    workspaceId: string;
    email: string;
    role: MembershipRole;
    invitedByUserId: string;
  }) {
    const inviter = await workspaceRepository.findMembership(
      input.workspaceId,
      input.invitedByUserId,
    );

    if (!inviter) {
      throw new ForbiddenError("You are not a member of this workspace.");
    }
    if (inviter.role !== "OWNER") {
      throw new ForbiddenError("Only the workspace owner can invite people.");
    }

    const email = input.email.trim().toLowerCase();
    if (!email.includes("@")) {
      throw new ValidationError("That doesn't look like an email address.");
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_LIFETIME_DAYS);

    return invitationRepository.upsert({
      workspaceId: input.workspaceId,
      email,
      role: input.role,
      token: randomBytes(32).toString("base64url"),
      invitedBy: input.invitedByUserId,
      expiresAt,
    });
  },

  /** Looks up an invite for display on the accept page. Returns the workspace
   * name so the person can see what they're joining before committing. */
  async preview(token: string) {
    const invitation = await invitationRepository.findByToken(token);

    if (!invitation) {
      throw new NotFoundError("Invitation");
    }
    if (invitation.expiresAt < new Date()) {
      throw new ValidationError("This invitation has expired. Ask for a new link.");
    }

    return invitation;
  },

  async accept(input: { token: string; userId: string; displayName: string }) {
    const invitation = await this.preview(input.token);

    const existing = await workspaceRepository.findMembership(
      invitation.workspaceId,
      input.userId,
    );

    if (existing) {
      // Already a member -- consume the invite and return the membership
      // rather than erroring. Clicking an old link should be harmless.
      await invitationRepository.delete(invitation.id);
      return { workspace: invitation.workspace, alreadyMember: true as const };
    }

    const membership = await invitationRepository.acceptInTransaction({
      invitationId: invitation.id,
      workspaceId: invitation.workspaceId,
      userId: input.userId,
      displayName: input.displayName,
      role: invitation.role,
    });

    return { workspace: membership.workspace, alreadyMember: false as const };
  },

  async revoke(input: { invitationId: string; userId: string }) {
    const invitation = await invitationRepository.findById(input.invitationId);
    if (!invitation) {
      throw new NotFoundError("Invitation");
    }

    const actor = await workspaceRepository.findMembership(
      invitation.workspaceId,
      input.userId,
    );

    if (!actor || actor.role !== "OWNER") {
      throw new ForbiddenError("Only the workspace owner can revoke invitations.");
    }

    return invitationRepository.delete(input.invitationId);
  },

  async listPending(input: { workspaceId: string; userId: string }) {
    const actor = await workspaceRepository.findMembership(
      input.workspaceId,
      input.userId,
    );
    if (!actor || actor.role !== "OWNER") {
      throw new ForbiddenError("Only the workspace owner can see pending invitations.");
    }

    const all = await invitationRepository.listForWorkspace(input.workspaceId);
    return all.filter((invite) => invite.expiresAt > new Date());
  },
};

/** Member management: listing who is in a workspace, and removing them. */
export const membershipService = {
  async list(input: { workspaceId: string; userId: string }) {
    const actor = await workspaceRepository.findMembership(
      input.workspaceId,
      input.userId,
    );
    if (!actor) {
      throw new ForbiddenError("You are not a member of this workspace.");
    }
    return membershipRepository.listForWorkspace(input.workspaceId);
  },

  async remove(input: { membershipId: string; actorUserId: string }) {
    const target = await membershipRepository.findById(input.membershipId);
    if (!target) {
      throw new NotFoundError("Member");
    }

    const actor = await workspaceRepository.findMembership(
      target.workspaceId,
      input.actorUserId,
    );

    // A member may remove themselves (leaving); only an owner may remove
    // anyone else.
    const isSelf = target.userId === input.actorUserId;
    if (!actor || (!isSelf && actor.role !== "OWNER")) {
      throw new ForbiddenError("You cannot remove this member.");
    }

    // A workspace must always retain at least one owner, or it becomes
    // permanently unmanageable -- nobody left who can invite or remove.
    if (target.role === "OWNER") {
      const owners = await membershipRepository.countOwners(target.workspaceId);
      if (owners <= 1) {
        throw new ValidationError(
          "This is the workspace's only owner. Make someone else an owner first.",
        );
      }
    }

    return membershipRepository.delete(input.membershipId);
  },
};
