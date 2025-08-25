import { z } from 'zod/v4';

export const GetOrganizationDetailsBySlugRequestSchema = z.object({
  orgSlug: z.string(),
});

export const CreateApiKeyRequestSchema = z.object({
  name: z.string(),
  expiresIn: z.number().int().positive(),
  metadata: z.record(z.string(), z.any()).optional(),
  userId: z.string().optional(),
  prefix: z.string().optional(),
  remaining: z.number().int().optional(),
  refillAmount: z.number().int().optional(),
  refillInterval: z.number().int().optional(),
  rateLimitTimeWindow: z.number().int().optional(),
  rateLimitMax: z.number().int().optional(),
  rateLimitEnabled: z.boolean().optional(),
  permissions: z.record(z.string(), z.array(z.string())).optional(),
});

export const GetUsersByOrgRoleRequestSchema = z.object({
  organizationId: z.string().nullable().optional(),
  organizationSlug: z.string().nullable().optional(),
  role: z.string().default('seeker'),
  type: z.enum(['count', 'list', 'both']).default('count'),
  page: z.string().default('1'),
  limit: z.string().default('20'),
  includeAdmin: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional()
    .default(false),
});

export const GetUsersStatusRequestSchema =
  GetUsersByOrgRoleRequestSchema.extend({
    applicationStatus: z.string().nullable().optional().default(null),
  });
