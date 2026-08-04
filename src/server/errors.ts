/**
 * Domain errors.
 *
 * Services throw these. The app layer catches them and maps them to HTTP
 * responses or UI states. This keeps HTTP concepts out of the business logic --
 * a service should not know what a 404 is, only that something was not found.
 */
export type AppErrorCode =
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "CONFLICT"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this resource") {
    super("FORBIDDEN", message);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION", message, details);
    this.name = "ValidationError";
  }
}

/** Maps a domain error code to an HTTP status. Used only by the app layer. */
export const statusForCode: Record<AppErrorCode, number> = {
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  VALIDATION: 422,
  CONFLICT: 409,
  INTERNAL: 500,
};
