import { NextResponse } from "next/server";
import { healthService } from "@/server/services/health.service";
import { AppError, statusForCode } from "@/server/errors";

export const dynamic = "force-dynamic";

/**
 * Thin route handler: no business logic, no database access. It calls a
 * service, maps domain errors to HTTP, and returns JSON. Every route handler
 * in this project follows this shape.
 */
export async function GET() {
  try {
    const status = await healthService.check();
    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: statusForCode[error.code] },
      );
    }

    console.error("Health check failed", error);
    return NextResponse.json(
      { error: "Could not reach the database.", code: "INTERNAL" },
      { status: 503 },
    );
  }
}
