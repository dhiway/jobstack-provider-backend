import { z } from 'zod/v4';

export const CreateSchemaRequestSchema = z.object({
  jobPostingId: z.string(),
  orgId: z.string().optional(),
  schema: z.object({
    url: z.url().optional(),
    body: z.record(z.string(), z.any()).optional(),
    name: z.string().default('new schema'),
    description: z.string().default('').optional(),
    version: z.string().default('1.0.0').optional(),
  }),
});
