import { organization } from '@db/schema/auth';
import { db } from '@db/setup';
import { GetOrganizationDetailsBySlugRequestSchema } from '@validation/schema/admin/common';
import { eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';

type GetOrganizationDetailsBySlugRequestInput = z.infer<
  typeof GetOrganizationDetailsBySlugRequestSchema
>;

export async function getOrganizationDetailsBySlug(
  request: FastifyRequest<{
    Querystring: GetOrganizationDetailsBySlugRequestInput;
  }>,
  reply: FastifyReply
) {
  const { orgSlug } = request.query;

  const orgDetails = await db
    .select()
    .from(organization)
    .where(eq(organization.slug, orgSlug))
    .limit(1);

  if (!orgDetails || orgDetails.length === 0) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'ORG_NOT_FOUND',
      error: 'Not Found',
      message: `Organization does not exist`,
    });
  }

  reply.status(200).send({
    statusCode: 200,
    message: 'Org Details Fetched',
    data: {
      name: orgDetails[0].name,
      slug: orgDetails[0].slug,
      logo: orgDetails[0].logo,
      metadata: orgDetails[0].metadata,
    },
  });
}
