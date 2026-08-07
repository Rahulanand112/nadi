import { inngest } from "./client";
import { reminderService } from "@/server/services/reminder.service";

/**
 * Fires due reminders.
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
 * step.run wraps the work so that if the sweep throws, Inngest retries only
 * this step rather than re-running the whole function, and the failure shows
 * up in the dashboard with its error attached rather than disappearing.
 */
export const sweepReminders = inngest.createFunction(
  { id: "sweep-reminders", name: "Sweep due reminders" },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    return step.run("create-due-reminders", () => reminderService.sweep());
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
    return step.run("create-due-reminders", () => reminderService.sweep());
  },
);

export const functions = [sweepReminders, sweepRemindersManually];
