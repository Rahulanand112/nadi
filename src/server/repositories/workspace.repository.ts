import { db } from "@/server/db";
import type { MembershipRole } from "@prisma/client";

export const workspaceRepository = {
  findBySlug(slug: string) {
    return db.workspace.findUnique({ where: { slug } });
  },

  /**
   * Creates a workspace and its first membership (the creator, as OWNER) in a
   * single transaction. These two rows must never exist independently of one
   * another -- a workspace with no owner, or an owner-role membership
   * pointing at a workspace that doesn't exist, are both invalid states this
   * transaction makes impossible.
   */
  createWithOwner(input: {
    name: string;
    slug: string;
    ownerUserId: string;
    ownerDisplayName: string;
  }) {
    return db.workspace.create({
      data: {
        name: input.name,
        slug: input.slug,
        memberships: {
          create: {
            userId: input.ownerUserId,
            displayName: input.ownerDisplayName,
            role: "OWNER" as MembershipRole,
          },
        },
      },
      include: { memberships: true },
    });
  },

  /** All workspaces a user belongs to, most recently joined first. */
  findForUser(userId: string) {
    return db.membership.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: "desc" },
    });
  },

  findMembership(workspaceId: string, userId: string) {
    return db.membership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  },
};

/** Membership reads and writes. Kept alongside workspaces because a
 * membership has no meaning independent of the workspace it belongs to. */
export const membershipRepository = {
  listForWorkspace(workspaceId: string) {
    return db.membership.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, email: true, image: true } } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
  },

  findById(id: string) {
    return db.membership.findUnique({
      where: { id },
      include: { workspace: true },
    });
  },

  countOwners(workspaceId: string) {
    return db.membership.count({ where: { workspaceId, role: "OWNER" } });
  },

  delete(id: string) {
    return db.membership.delete({ where: { id } });
  },
};
