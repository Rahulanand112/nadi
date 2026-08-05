/**
 * Recurrence maths. Pure, so the same rules produce the same next date on the
 * server (when spawning the next occurrence) and in the browser (when showing
 * "repeats weekly" on the form).
 */

export type Recurrence = "DAILY" | "WEEKDAYS" | "WEEKLY" | "MONTHLY";

export const RECURRENCE_OPTIONS: { value: Recurrence | ""; label: string }[] = [
  { value: "", label: "Doesn't repeat" },
  { value: "DAILY", label: "Every day" },
  { value: "WEEKDAYS", label: "Every weekday" },
  { value: "WEEKLY", label: "Every week" },
  { value: "MONTHLY", label: "Every month" },
];

export function recurrenceLabel(recurrence: Recurrence | null): string | null {
  if (!recurrence) return null;
  return RECURRENCE_OPTIONS.find((option) => option.value === recurrence)?.label ?? null;
}

/**
 * The next occurrence after `from`.
 *
 * Advancing from the *due date* rather than from "now" matters: a weekly task
 * due Monday that you complete on Wednesday should next be due the following
 * Monday, not the following Wednesday. Otherwise a repeating task slowly
 * drifts later every time someone is late with it.
 */
export function nextDueDate(recurrence: Recurrence, from: Date): Date {
  const next = new Date(from);

  switch (recurrence) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      return next;

    case "WEEKDAYS": {
      do {
        next.setDate(next.getDate() + 1);
      } while (next.getDay() === 0 || next.getDay() === 6);
      return next;
    }

    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      return next;

    case "MONTHLY": {
      const dayOfMonth = next.getDate();
      next.setMonth(next.getMonth() + 1);
      // Rolling 31 Jan forward lands on 3 March in a non-leap year, because
      // February has no 31st. Clamp back to the last day of the target month
      // so "monthly on the 31st" stays at month-end instead of skipping.
      if (next.getDate() !== dayOfMonth) {
        next.setDate(0);
      }
      return next;
    }
  }
}
