import webpush from "web-push";
import { env } from "@/lib/env";
import { pushRepository } from "@/server/repositories/push.repository";
import { ValidationError } from "@/server/errors";

/**
 * Sending web push.
 *
 * The VAPID keypair is what lets a browser vendor's push service (Apple's for
 * Safari, Google's for Chrome) verify that a message really came from Nadi.
 * Configured once at module load rather than per-send, since it never changes
 * within a process.
 */
let configured = false;

function configure() {
  if (configured) return;

  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );
  configured = true;
}

export type PushPayload = {
  title: string;
  body?: string | null;
  url?: string;
};

type Subscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/** Push services return these when a subscription no longer exists — the
 * person uninstalled the app, cleared site data, or the browser rotated the
 * endpoint. They are not transient: retrying will never succeed, so the row
 * is deleted rather than kept and retried forever. */
const GONE_STATUS_CODES = new Set([404, 410]);

export const pushService = {
  async listDeviceCount(userId: string) {
    return pushRepository.countForUser(userId);
  },

  async subscribe(input: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string | null;
  }) {
    if (!input.endpoint.startsWith("https://")) {
      throw new ValidationError("That subscription doesn't look valid.");
    }

    return pushRepository.upsert(input);
  },

  async unsubscribe(input: { endpoint: string }) {
    return pushRepository.deleteByEndpoint(input.endpoint);
  },

  /**
   * Sends one payload to every device a person has registered.
   *
   * Returns counts rather than throwing on partial failure. Someone with a
   * phone and a laptop has two subscriptions, and the laptop's being stale
   * is no reason to withhold the notification from the phone — so each send
   * is judged on its own and dead endpoints are pruned as a side effect.
   */
  async sendToUser(userId: string, payload: PushPayload) {
    const subscriptions = await pushRepository.listForUser(userId);
    if (subscriptions.length === 0) return { sent: 0, pruned: 0 };

    return this.sendToSubscriptions(subscriptions, payload);
  },

  async sendToSubscriptions(subscriptions: Subscription[], payload: PushPayload) {
    configure();

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body ?? undefined,
      data: { url: payload.url ?? "/" },
    });

    const delivered: string[] = [];
    const dead: string[] = [];

    // Settled rather than all: one rejected send must not abandon the others
    // mid-flight.
    const results = await Promise.allSettled(
      subscriptions.map((subscription) =>
        webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
          // Apple drops notifications with no urgency hint more aggressively
          // than Chrome does, and a reminder is time-sensitive by definition.
          { TTL: 60 * 60, urgency: "high" },
        ),
      ),
    );

    results.forEach((result, index) => {
      // allSettled preserves order, so this always resolves -- the guard is
      // for noUncheckedIndexedAccess, which cannot know that.
      const subscription = subscriptions[index];
      if (!subscription) return;

      if (result.status === "fulfilled") {
        delivered.push(subscription.id);
        return;
      }

      const statusCode = (result.reason as { statusCode?: number })?.statusCode;

      if (statusCode && GONE_STATUS_CODES.has(statusCode)) {
        dead.push(subscription.id);
        return;
      }

      // Anything else — a timeout, a 5xx from the vendor — is treated as
      // transient. The subscription stays; the next reminder gets another go.
      console.error("Push delivery failed", {
        subscriptionId: subscription.id,
        statusCode,
      });
    });

    await Promise.all([
      pushRepository.markUsed(delivered),
      pushRepository.deleteMany(dead),
    ]);

    return { sent: delivered.length, pruned: dead.length };
  },
};
