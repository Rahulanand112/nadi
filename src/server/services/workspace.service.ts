import { workspaceRepository } from "@/server/repositories/workspace.repository";
import { ValidationError, ForbiddenError, NotFoundError } from "@/server/errors";

/** Turns "Sharma Family" into "sharma-family", then makes it unique. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const workspaceService = {
  /**
   * Creates a new workspace with the given user as its OWNER. Called at the
   * end of sign-up: every account exists inside a workspace from the moment
   * it's created, so there is never a state where a user is authenticated but
   * has nowhere to belong.
   */
  async createForNewUser(input: {
    workspaceName: string;
    ownerUserId: string;
    ownerDisplayName: string;
  }) {
    const name = input.workspaceName.trim();
    if (name.length < 2) {
      throw new ValidationError("Workspace name must be at least 2 characters.");
    }

    const base = slugify(name) || "workspace";
    let slug = base;
    let attempt = 1;

    // Collisions are expected and cheap to resolve -- "family" then
    // "family-2", "family-3". A handful of retries is more than enough; if
    // it ever isn't, that's a sign to add a random suffix instead.
    while (await workspaceRepository.findBySlug(slug)) {
      attempt += 1;
      slug = `${base}-${attempt}`;
      if (attempt > 20) {
        throw new ValidationError("Could not generate a unique workspace URL. Try a different name.");
      }
    }

    return workspaceRepository.createWithOwner({
      name,
      slug,
      ownerUserId: input.ownerUserId,
      ownerDisplayName: input.ownerDisplayName,
    });
  },

  listForUser(userId: string) {
    return workspaceRepository.findForUser(userId);
  },

  /** Throws if the user is not a member of the workspace. Call this before
   * any workspace-scoped read or write -- it's the one place that enforces
   * "you only see what belongs to your own household/team". */
  async assertMember(workspaceId: string, userId: string) {
    const membership = await workspaceRepository.findMembership(workspaceId, userId);
    if (!membership) {
      throw new ForbiddenError("You are not a member of this workspace.");
    }
    return membership;
  },
};

/** Resolves a workspace by its URL slug and confirms the user belongs to it.
 * Every page and route under /w/[slug] calls this first -- it is the single
 * checkpoint that stops someone loading another household's data by guessing
 * a URL. */
export async function requireWorkspaceAccess(slug: string, userId: string) {
  const workspace = await workspaceRepository.findBySlug(slug);
  if (!workspace) {
    throw new NotFoundError("Workspace");
  }

  const membership = await workspaceRepository.findMembership(workspace.id, userId);
  if (!membership) {
    throw new ForbiddenError("You are not a member of this workspace.");
  }

  return { workspace, membership };
}
