import crypto from 'crypto';
import { z } from 'zod/v4';
import { ErrorResponseSchema } from '@validation/schema/response';

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export function calculateHash(value: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

export function makeError(
  code: string,
  error: string,
  message: string,
  statusCode?: number
): ErrorResponse {
  return { statusCode: statusCode || 400, code, error, message };
}
