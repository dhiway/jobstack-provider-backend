import { z } from 'zod/v4';

const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain lowercase letters, numbers, and hyphens only',
  });

const ownerSchema = z
  .object({
    userId: z.string().optional(),
    name: z.string().min(1).optional(),
    email: z.email().optional(),
    phoneNumber: z.string().min(1).optional(),
  })
  .refine((owner) => owner.userId || owner.email || owner.phoneNumber, {
    message: 'Provide at least one of owner.userId, owner.email, or owner.phoneNumber',
  });

export const CreateExternalOrganizationSchema = z
  .object({
    name: z.string().min(1),
    slug: slugSchema,
    type: z.enum(['employer', 'association']).default('employer'),
    associationSlug: slugSchema.optional(),
    logo: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.any()).default({}),
    owner: ownerSchema,
  })
  .refine((body) => !(body.type === 'association' && body.associationSlug), {
    message: 'associationSlug is only allowed for employer organizations',
    path: ['associationSlug'],
  });

export const UpdateExternalOrganizationParamsSchema = z.object({
  organizationId: z.uuid(),
});

export const UpdateExternalOrganizationSchema = z
  .object({
    name: z.string().min(1).optional(),
    slug: slugSchema.optional(),
    type: z.enum(['employer', 'association']).optional(),
    associationSlug: slugSchema.nullable().optional(),
    logo: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided',
  })
  .refine((body) => !(body.type === 'association' && body.associationSlug), {
    message: 'associationSlug is only allowed for employer organizations',
    path: ['associationSlug'],
  });

export const ExternalOrganizationResponseSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  data: z.object({
    organization: z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string().nullable(),
      logo: z.string().nullable(),
      type: z.string().nullable(),
      metadata: z.string().nullable(),
      createdAt: z.date(),
    }),
    owner: z
      .object({
        id: z.string(),
        name: z.string(),
        email: z.string().nullable(),
        phoneNumber: z.string().nullable(),
      })
      .optional(),
  }),
});
