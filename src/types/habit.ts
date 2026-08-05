export type HabitDTO = {
  id: string;
  name: string;
  icon: string | null;
  targetPerWeek: number;
  membership: { id: string; displayName: string };
  /** Local day keys ("2026-08-05") on which this habit was completed. */
  completedDays: string[];
};
