import { z } from 'zod/v4';
import { locationSchema } from '@validation/common';
import { JobPostingSchema } from '@validation/schema/jobs/common';

export const InitJobApplicationResponseSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  data: z.object({
    transactionId: z.string(),
    provider: z.object({
      id: z.string(),
      title: z.string(),
      location: locationSchema.optional(),
    }),
    jobPosting: z.object({
      id: z.string(),
      title: z.string(),
    }),
    jobApplication: z.object({
      id: z.string(),
      userName: z.string(),
      appliedAt: z.date(),
    }),
  }),
});

export const SelectJobApplicationResponseSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  data: z.object({
    provider: z.object({
      id: z.string(),
      title: z.string(),
      location: locationSchema.optional(),
    }),
    jobPosting: JobPostingSchema,
    schema: z.record(z.string(), z.any()),
  }),
});
