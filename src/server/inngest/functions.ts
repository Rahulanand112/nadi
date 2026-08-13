import { inngest } from "./client";
import { reminderService } from "@/server/services/reminder.service";

/**
 * Fires due reminders, then delivers them.
 *
 * Runs on a cron rather than being scheduled per-reminder. The reasoning is in
 * the Reminder model's comment in schema.prisma, but briefly: tasks move, and
 * a job scheduled in advance would be pointing at a deadline that no longer
 * exists. This reads current state every time and cannot go stale.
 *
 * Five minutes is the cadence. It bounds how late a reminder can be, and at
 * this size the sweep is two indexed queries, so running it often is cheap.
 * The cron expression is in UTC — that is fine here because nothing about the
 * sweep is tied to a wall-clock hour; it just asks "what is due now".
 *
 * Two steps rather than one. Inngest retries a failed step individually, so
 * splitting them means a push outage retries only the delivery and leaves the
 * already-recorded reminders alone — rather than re-running the whole
 * function and doing the database work again for no reason. The in-app bell
 * is served by step one, so it keeps working even while step two is failing.
 */
export const sweepReminders = inngest.createFunction(
  { id: "sweep-reminders", name: "Sweep due reminders" },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    const created = await step.run("create-due-reminders", () =>
      reminderService.sweep(),
    );

    const delivered = await step.run("deliver-push-notifications", () =>
      reminderService.deliverPending(),
    );

    return { created, delivered };
  },
);

/**
 * The same sweep, triggered by hand.
 *
 * Waiting five minutes to find out whether a change worked is a miserable way
 * to develop, and "send the test event" in the Inngest dashboard is a lot
 * faster than editing a due date and waiting. Same code path as the cron, so
 * testing this genuinely tests that one.
 */
export const sweepRemindersManually = inngest.createFunction(
  { id: "sweep-reminders-manual", name: "Sweep due reminders (manual)" },
  { event: "reminders/sweep.requested" },
  async ({ step }) => {
    const created = await step.run("create-due-reminders", () =>
      reminderService.sweep(),
    );

    const delivered = await step.run("deliver-push-notifications", () =>
      reminderService.deliverPending(),
    );

    return { created, delivered };
  },
);

export const functions = [sweepReminders, sweepRemindersManually];
