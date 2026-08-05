import { db } from "@/server/db";
import type { MembershipRole } from "@prisma/client";

export const invitationRepository = {
  findByToken(token: string) {
    return db.invitation.findUnique({
      where: { token },
      include: { workspace: true },
    });
  },

  listForWorkspace(workspaceId: string) {
    return db.invitation.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: string) {
    return db.invitation.findUnique({ where: { id } });
  },

  /** Re-inviting the same email replaces the pending invite rather than
   * stacking duplicates -- the old token stops working, which is what an
   * owner clicking "invite" a second time actually expects. */
  upsert(input: {
    workspaceId: string;
    email: string;
    role: MembershipRole;
    token: string;
    invitedBy: string;
    expiresAt: Date;
  }) {
    return db.invitation.upsert({
      where: {
        workspaceId_email: {
          workspaceId: input.workspaceId,
          email: input.email,
        },
      },
      create: input,
      update: {
        token: input.token,
        role: input.role,
        invitedBy: input.invitedBy,
        expiresAt: input.expiresAt,
      },
    });
  },

  delete(id: string) {
    return db.invitation.delete({ where: { id } });
  },

  /**
   * Accepting an invitation creates the membership and consumes the invite in
   * one transaction. If either half failed alone the result would be a person
   * who joined but whose link still works, or a link burned with no membership
   * to show for it.
   */
  acceptInTransaction(input: {
    invitationId: string;
    workspaceId: string;
    userId: string;
    displayName: string;
    role: MembershipRole;
  }) {
    return db.$transaction(async (tx) => {
      const membership = await tx.membership.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          displayName: input.displayName,
          role: input.role,
        },
        include: { workspace: true },
      });

      await tx.invitation.delete({ where: { id: input.invitationId } });

      return membership;
    });
  },
};
