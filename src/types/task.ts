/** The shape the API returns for a task, with people resolved. Defined here
 * rather than importing Prisma types into the UI, so the client never couples
 * to the ORM. */
export type TaskPerson = { id: string; displayName: string } | null;

export type TaskDTO = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueAt: string | null;
  isAllDay: boolean;
  completedAt: string | null;
  recurrence: "DAILY" | "WEEKDAYS" | "WEEKLY" | "MONTHLY" | null;
  assignee: TaskPerson;
  createdBy: { id: string; displayName: string };
};

export type MemberOption = { id: string; displayName: string };
