import { db } from "@/server/db";

export const userRepository = {
  findTimezone(userId: string) {
    return db.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
  },

  setTimezone(userId: string, timezone: string) {
    return db.user.update({
      where: { id: userId },
      data: { timezone },
      select: { id: true, timezone: true },
    });
  },
};
