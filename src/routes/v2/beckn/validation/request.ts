import { contactSchema, locationSchema } from '@validation/common';
import { z } from 'zod/v4';

export const InitJobApplicationSchema = z.object({
  metadata: z.record(z.string(), z.any()),
  jobPostingId: z.string(),
  transactionId: z.string(),
  userDetails: z.object({
    id: z.string(),
    name: z.string(),
    contact: contactSchema.optional(),
    location: locationSchema.optional(),
  }),
});

export const SelectJobApplicationSchema = z.object({
  jobPostingId: z.string(),
  providerId: z.string(),
});
