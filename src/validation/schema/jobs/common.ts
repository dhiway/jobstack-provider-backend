import { ContactInputSchema, LocationInputSchema } from '@validation/common';
import { z } from 'zod/v4';

export const JobStatusEnum = z.enum(['draft', 'open', 'closed', 'archived']);

export const JobPostingSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().optional().nullable(),
  status: JobStatusEnum,
  location: LocationInputSchema.or(z.any()).optional().nullable(),
  contact: ContactInputSchema.or(z.any()).optional().nullable(),
  metadata: z.record(z.string(), z.any()),
  organizationName: z.string(),
  organizationId: z.string(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const JobApplicationSchema = z.object({
  id: z.uuid(),
  jobId: z.uuid(),
  transactionId: z.string().optional(),
  status: JobStatusEnum,
  applicationStatus: z.string().default(''),
  userName: z.string(),
  userId: z.string(),
  location: LocationInputSchema.or(z.any()).optional().nullable(),
  contact: ContactInputSchema.or(z.any()).optional().nullable(),
  metadata: z.record(z.string(), z.any()),
  appliedAt: z.date(),
  updatedAt: z.date(),
});
