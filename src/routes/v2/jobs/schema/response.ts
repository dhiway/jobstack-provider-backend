import { CreateJobPostingSchemaResponseSchema } from '@routes/v2/schema/validation/response';
import { JobPostingSchema } from '@validation/schema/jobs/common';
import { z } from 'zod/v4';

export const JobPostingResponseSchema = z.object({
  statusCode: z.number().default(200),
  message: z.string(),
  data: z.object({
    jobPost: JobPostingSchema,
    schema: CreateJobPostingSchemaResponseSchema,
  }),
});
