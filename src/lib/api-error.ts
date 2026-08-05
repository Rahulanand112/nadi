import { NextResponse } from "next/server";
import { AppError, statusForCode } from "@/server/errors";

/** Maps a thrown domain error to an HTTP response. Every route handler uses
 * this so error shape is identical across the API. */
export function toErrorResponse(error: unknown, context: string) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: statusForCode[error.code] },
    );
  }

  console.error(`${context} failed`, error);
  return NextResponse.json(
    { error: "Something went wrong.", code: "INTERNAL" },
    { status: 500 },
  );
}
