import { db } from "@/server/db";

/**
 * Repositories are the only place raw database queries live. Services call
 * repositories; nothing else does. When we swap or shard the database later,
 * this folder is the blast radius.
 */
export const healthRepository = {
  findLatest() {
    return db.healthCheck.findFirst({ orderBy: { createdAt: "desc" } });
  },

  create(message: string) {
    return db.healthCheck.create({ data: { message } });
  },
};
