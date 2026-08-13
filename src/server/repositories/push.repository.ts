import { db } from "@/server/db";

export const pushRepository = {
  /**
   * Stores a device's subscription.
   *
   * Upsert on endpoint rather than create, because the endpoint is the
   * device's identity: a browser re-subscribing returns the same one, and
   * inserting instead would leave a trail of duplicate rows all pointing at
   * the same phone — which would then receive one copy of every notification
   * per duplicate.
   */
  upsert(data: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string | null;
  }) {
    return db.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: data,
      // userId is refreshed too: a shared device where one person signs out
      // and another signs in reuses the same browser endpoint, and the
      // subscription must follow whoever is actually signed in now.
      update: {
        userId: data.userId,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent ?? null,
      },
    });
  },

  deleteByEndpoint(endpoint: string) {
    return db.pushSubscription.deleteMany({ where: { endpoint } });
  },

  listForUser(userId: string) {
    return db.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
  },

  countForUser(userId: string) {
    return db.pushSubscription.count({ where: { userId } });
  },

  markUsed(ids: string[]) {
    if (ids.length === 0) return Promise.resolve({ count: 0 });
    return db.pushSubscription.updateMany({
      where: { id: { in: ids } },
      data: { lastUsedAt: new Date() },
    });
  },

  deleteMany(ids: string[]) {
    if (ids.length === 0) return Promise.resolve({ count: 0 });
    return db.pushSubscription.deleteMany({ where: { id: { in: ids } } });
  },
};
