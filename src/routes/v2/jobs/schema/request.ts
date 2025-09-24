import { ContactInputSchema, LocationInputSchema } from '@validation/common';
import { z } from 'zod/v4';

export const CreateJobPostSchema = z
  .object({
    title: z
      .string()
      .min(5, 'Title must be at least 5 characters')
      .max(100, 'Title cannot exceed 100 characters'),
    status: z.enum(['draft', 'open', 'closed', 'archived']).default('draft'),
    description: z
      .string()
      .min(20, 'Description must be at least 20 characters')
      .max(1000, 'Description cannot exceed 1000 characters')
      .optional(),
    location: LocationInputSchema.optional(),
    contact: ContactInputSchema.optional(),
    metadata: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Optional key-value pairs for additional data'),
    schema: z
      .object({
        schemaId: z.string().optional(),
        url: z.string().optional(),
        body: z.record(z.string(), z.any()).optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        version: z.string().optional(),
        global: z.boolean().default(true),
      })
      .refine((data) => data.schemaId || data.url || data.body, {
        message: "Either 'schemaId', 'url', or 'body' must be provided",
        path: ['schema'],
      }),
  })
  .describe('Job post creation payload');
