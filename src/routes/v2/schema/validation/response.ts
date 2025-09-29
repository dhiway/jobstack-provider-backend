import { z } from 'zod/v4';

export const CreateJobPostingSchemaResponseSchema = z
  .object({
    jobPosting: z.object({
      id: z.string(),
    }),
    schema: z.object({
      id: z.string(),
      name: z.string(),
      orgId: z.string().nullable(),
      url: z.string().nullable(),
      hash: z.string().nullable(),
      body: z.unknown(),
      description: z.string().nullable(),
      version: z.string().nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
    }),
    global: z.boolean(),
  })
  .describe('Zod Schema defining job posting linked schema response');

export type CreateJobPostingSchemaResponse = z.infer<
  typeof CreateJobPostingSchemaResponseSchema
>;
