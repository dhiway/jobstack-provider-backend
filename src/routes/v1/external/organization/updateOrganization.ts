import { organization } from '@db/schema/auth';
import { db } from '@db/setup';
import {
  UpdateExternalOrganizationParamsSchema,
  UpdateExternalOrganizationSchema,
} from '@validation/schema/external/organization';
import { and, eq, ne } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';
import { resolveOrganizationType } from './utils';

type UpdateExternalOrganizationInput = z.infer<
  typeof UpdateExternalOrganizationSchema
>;
type UpdateExternalOrganizationParamsInput = z.infer<
  typeof UpdateExternalOrganizationParamsSchema
>;

function parseMetadata(metadata: string | null) {
  if (!metadata) return {};
  try {
    const parsed = JSON.parse(metadata);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export async function updateExternalOrganization(
  request: FastifyRequest<{
    Body: UpdateExternalOrganizationInput;
    Params: UpdateExternalOrganizationParamsInput;
  }>,
  reply: FastifyReply
) {
  const parsedParams = UpdateExternalOrganizationParamsSchema.safeParse(
    request.params
  );
  if (!parsedParams.success) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'BAD_REQUEST',
      error: 'Bad Request',
      message: z.flattenError(parsedParams.error).fieldErrors,
    });
  }

  const parsedBody = UpdateExternalOrganizationSchema.safeParse(request.body);
  if (!parsedBody.success) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'BAD_REQUEST',
      error: 'Bad Request',
      message: z.flattenError(parsedBody.error).fieldErrors,
    });
  }

  const { organizationId } = parsedParams.data;
  const body = parsedBody.data;

  const existingOrg = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
  });
  if (!existingOrg) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'ORG_NOT_FOUND',
      error: 'Not Found',
      message: 'Organization does not exist',
    });
  }

  if (body.slug) {
    const slugConflict = await db.query.organization.findFirst({
      where: and(eq(organization.slug, body.slug), ne(organization.id, organizationId)),
    });
    if (slugConflict) {
      return reply.status(409).send({
        statusCode: 409,
        code: 'ORG_SLUG_ALREADY_EXISTS',
        error: 'Conflict',
        message: 'Organization slug is already in use',
      });
    }
  }

  let organizationType: string | undefined;
  if (body.type || body.associationSlug !== undefined) {
    const resolvedOrganizationType = await resolveOrganizationType(
      body.type || 'employer',
      body.associationSlug || undefined
    );

    if (!resolvedOrganizationType) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'ASSOCIATION_NOT_FOUND',
        error: 'Not Found',
        message: `Association with slug "${body.associationSlug}" not found`,
      });
    }

    organizationType = resolvedOrganizationType;
  }

  const updates: Partial<{
    name: string;
    slug: string;
    logo: string | null;
    type: string;
    metadata: string;
  }> = {};

  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.logo !== undefined) updates.logo = body.logo;
  if (organizationType !== undefined) updates.type = organizationType;
  if (body.metadata !== undefined) {
    updates.metadata = JSON.stringify({
      ...parseMetadata(existingOrg.metadata),
      ...body.metadata,
    });
  }

  const [updatedOrg] = await db
    .update(organization)
    .set(updates)
    .where(eq(organization.id, organizationId))
    .returning();

  return reply.send({
    statusCode: 200,
    message: 'Organization updated successfully',
    data: {
      organization: updatedOrg,
    },
  });
}
