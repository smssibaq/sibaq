export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'NETWORK_ERROR'
  | 'CONFIG_MISSING'
  | 'CONFLICT'
  | 'UNEXPECTED';

export interface UserFacingError {
  message: string;
  code: ErrorCode;
  statusCode?: number;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;

  constructor(message: string, code: ErrorCode = 'UNEXPECTED', statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class DuplicateGoalkeeperError extends AppError {
  constructor(message = 'This team already has a goalkeeper. Only one goalkeeper is allowed per team.') {
    super(message, 'CONFLICT', 409);
    this.name = 'DuplicateGoalkeeperError';
    Object.setPrototypeOf(this, DuplicateGoalkeeperError.prototype);
  }
}

/**
 * Normalizes an unknown error into a sanitized, user-safe error object.
 * Strips raw SQL queries, credentials, and internal stack details.
 */
export function normalizeError(rawError: unknown): UserFacingError {
  if (rawError instanceof AppError) {
    return {
      message: rawError.message,
      code: rawError.code,
      statusCode: rawError.statusCode,
    };
  }

  // Handle Supabase/PostgREST/PostgreSQL error objects
  if (typeof rawError === 'object' && rawError !== null) {
    const err = rawError as Record<string, unknown>;

    // Network / fetch failures
    if (err.name === 'TypeError' && String(err.message).includes('fetch')) {
      return {
        message: 'Unable to reach the server. Please check your internet connection.',
        code: 'NETWORK_ERROR',
        statusCode: 0,
      };
    }

    // PostgREST / Postgres permission denied (RLS violations)
    if (err.code === '42501' || err.code === 'PGRST301') {
      return {
        message: 'You do not have permission to view or modify this resource.',
        code: 'FORBIDDEN',
        statusCode: 403,
      };
    }

    // Auth session expired / JWT invalid
    if (
      err.code === 'PGRST302' ||
      err.status === 401 ||
      String(err.message).toLowerCase().includes('jwt expired') ||
      String(err.message).toLowerCase().includes('not authenticated')
    ) {
      return {
        message: 'Your session has expired. Please sign in again.',
        code: 'UNAUTHENTICATED',
        statusCode: 401,
      };
    }

    // Row not found (single query return 0 rows)
    if (err.code === 'PGRST116' || err.status === 404) {
      return {
        message: 'The requested resource was not found.',
        code: 'NOT_FOUND',
        statusCode: 404,
      };
    }

    // Unique constraint violation / Goalkeeper constraint
    const rawDetails = String(err.details || '');
    const rawMsg = String(err.message || '');
    if (
      err.code === '23505' ||
      rawMsg.includes('unique_goalkeeper_per_team') ||
      rawDetails.includes('unique_goalkeeper_per_team') ||
      rawMsg.toLowerCase().includes('already has a goalkeeper')
    ) {
      if (
        rawMsg.includes('unique_goalkeeper_per_team') ||
        rawDetails.includes('unique_goalkeeper_per_team') ||
        rawMsg.toLowerCase().includes('goalkeeper') ||
        rawDetails.toLowerCase().includes('goalkeeper')
      ) {
        return {
          message: 'This team already has a goalkeeper. Only one goalkeeper is allowed per team.',
          code: 'CONFLICT',
          statusCode: 409,
        };
      }

      return {
        message: 'A record with this information already exists.',
        code: 'CONFLICT',
        statusCode: 409,
      };
    }

    // Standard JavaScript Error object
    if (typeof err.message === 'string') {
      // Sanitize potential sensitive error strings
      const sanitized = sanitizeErrorMessage(err.message);
      return {
        message: sanitized,
        code: 'UNEXPECTED',
        statusCode: typeof err.status === 'number' ? err.status : 500,
      };
    }
  }

  return {
    message: 'An unexpected error occurred. Please try again later.',
    code: 'UNEXPECTED',
    statusCode: 500,
  };
}

/**
 * Strips raw database tables, SQL syntax, or tokens from raw messages.
 */
function sanitizeErrorMessage(msg: string): string {
  if (/select|insert|update|delete|from|table|relation/i.test(msg) && /syntax|error|violates/i.test(msg)) {
    return 'Database operation failed. Please verify your inputs and permissions.';
  }
  if (/apikey|secret|token|bearer/i.test(msg)) {
    return 'Authentication failure encountered.';
  }
  return msg;
}

/**
 * Sanitized development logger
 */
export function logDiagnostic(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[Diagnostic: ${context}]`, error);
  }
}

