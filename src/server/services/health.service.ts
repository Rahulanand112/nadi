import { healthRepository } from "@/server/repositories/health.repository";

export type HealthStatus = {
  connected: boolean;
  message: string;
  checkedAt: Date;
};

/**
 * Confirms the application can reach the database and read and write rows.
 * Slice 1 exists to prove this path end to end.
 */
export const healthService = {
  async check(): Promise<HealthStatus> {
    const existing = await healthRepository.findLatest();

    const record =
      existing ?? (await healthRepository.create("Database connected."));

    return {
      connected: true,
      message: record.message,
      checkedAt: record.createdAt,
    };
  },
};
