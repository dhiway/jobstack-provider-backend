import z from 'zod/v4';

export const SuccessResponseSchema = z.object({
  statusCode: z.number().default(200),
  message: z.string(),
  data: z.null().optional(),
});

export const ErrorResponseSchema = z.object({
  statusCode: z.number(),
  code: z.string(),
  error: z.string(),
  message: z.string(),
});
