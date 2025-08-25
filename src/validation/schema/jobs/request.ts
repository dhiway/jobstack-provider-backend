import * as z from 'zod/v4';
import { ContactInputSchema, LocationInputSchema } from '@validation/common';

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
  })
  .describe('Job post creation payload');

export const UpdateJobPostSchema = CreateJobPostSchema.extend({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title cannot exceed 100 characters')
    .optional(),
  jobId: z.uuid(),
});

export const DeleteJobPostSchema = z.object({
  jobId: z.uuid(),
});

export const JobParamsSchema = z.object({
  organizationId: z.string(),
});

export const JobQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  sortBy: z.enum(['createdAt', 'title']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const CreateJobApplicationSchema = z.object({
  jobId: z.uuid(),
  status: z.enum(['draft', 'open', 'closed', 'archived']).default('draft'),
  locationId: z.uuid().optional(),
  location: LocationInputSchema.optional(),
  contact: ContactInputSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const JobApplicationsQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  jobId: z.uuid().optional(),
  sortBy: z.enum(['createdAt', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  status: z.enum(['open', 'archived', 'closed']).optional(),
  applicationStatus: z.string().optional(),
});

export const UpdateJobApplicationStatusSchema = z.object({
  applicationId: z.uuid(),
  action: z.enum(['accept', 'reject', 'open']).default('open'),
  applicationStatus: z.string(),
});
