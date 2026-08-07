export type HabitDTO = {
  id: string;
  name: string;
  icon: string | null;
  targetPerWeek: number;
  /** Minutes from local midnight — 420 is 07:00. Null means no time set,
   * which is also why a habit with no time can carry no reminder. */
  remindAtMinutes: number | null;
  reminderEnabled: boolean;
  reminderOffsetMinutes: number;
  membership: { id: string; displayName: string };
  /** Local day keys ("2026-08-05") on which this habit was completed. */
  completedDays: string[];
};
