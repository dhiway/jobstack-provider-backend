import z from 'zod/v4';
import {
  JobApplicationSchema,
  JobPostingSchema,
  JobStatusEnum,
} from './common';
import { PaginationSchema } from '@validation/common';

//Health
export const HealthCheckResponseSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  docs: z.object({
    api: z.string(),
    auth: z.string(),
    gettingStarted: z.string(),
  }),
  status: z.literal('OK'),
});

// JOBS
export const JobPostingResponseSchema = z.object({
  statusCode: z.number().default(200),
  message: z.string(),
  data: z.object({
    jobPost: JobPostingSchema,
  }),
});

export const FetchJobResponseSchema = z.object({
  statusCode: z.number().default(200),
  message: z.string(),
  data: z.object({
    jobs: JobPostingSchema.extend({
      applicationsCount: z.string(),
    }).array(),
    pagination: PaginationSchema,
  }),
});

export const FetchJobApplicationsResponseSchema = z.object({
  statusCode: z.number().default(200),
  message: z.string(),
  data: z.object({
    applications: JobApplicationSchema.extend({
      location: z.any().optional(),
      contact: z.any().optional(),
    }).array(),
    pagination: PaginationSchema,
  }),
});

export const UpdateJobApplicationStatusResponseSchema = z.object({
  statusCode: z.number().default(200),
  message: z.string(),
  data: z.object({
    id: z.uuid(),
    applicationStatus: z.string().optional(),
    status: JobStatusEnum,
  }),
});

// GCP STORAGE
export const GeneratePresignedUrlResponseSchema = z.object({
  uploadUrl: z.url(),
  accessUrl: z.url(),
  expiresIn: z.number(),
  objectKey: z.string(),
});

export const DeleteObjectResponseSchema = z.object({
  objectKey: z.string(),
});

// ADMIN

export const GetOrganizationDetailsBySlugResponeSchema = z.object({
  statusCode: z.number().default(200),
  message: z.string(),
  data: z.object({
    name: z.string(),
    slug: z.string(),
    logo: z.string().nullable().optional(),
    metadata: z.any().nullable().optional(),
  }),
});

export const CreateApiKeyResponseSchema = z.object({
  statusCode: z.number().default(201),
  message: z.string(),
  data: z.object({
    key: z.string(),
    metadata: z.record(z.string(), z.any()),
    permissions: z.record(z.string(), z.string().array()),
    id: z.string(),
    name: z.string().nullable(),
    start: z.string().nullable(),
    prefix: z.string().nullable(),
    userId: z.string(),
    refillInterval: z.number().nullable(),
    refillAmount: z.number().nullable(),
    lastRefillAt: z.date().nullable(),
    enabled: z.boolean(),
    rateLimitEnabled: z.boolean(),
    rateLimitTimeWindow: z.number().nullable(),
    rateLimitMax: z.number().nullable(),
    requestCount: z.number(),
    remaining: z.number().nullable(),
    lastRequest: z.date().nullable(),
    expiresAt: z.date().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
});

export const UsersByOrgRoleResponseSchema = z.object({
  statusCode: z.number().default(200),
  message: z.string(),
  data: z.object({
    orgId: z.string().optional(),
    totalCount: z
      .object({
        userCount: z.number().or(z.string()),
        applicationCount: z.number().or(z.string()),
      })
      .or(z.number().or(z.string())),
    users: z.array(z.string()).optional(), // userIds
    totalUsers: z.number().optional(),
    totalProfiles: z.number().optional(),
    userProfiles: z.record(z.string(), z.array(z.string())).optional(),
  }),
});
