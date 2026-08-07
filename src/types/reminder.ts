/** A notification that has already fired, as the API returns it. */
export type ReminderDTO = {
  id: string;
  title: string;
  body: string | null;
  /** When it was due — not when the row was written. The sweep runs on a
   * cadence, so those differ by a few minutes. */
  fireAt: string;
  readAt: string | null;
  taskId: string | null;
  habitId: string | null;
};

export type ReminderFeed = {
  reminders: ReminderDTO[];
  unread: number;
};
