import { member, organization } from '@db/schema/auth';
import { db } from '@db/setup';
import { GetUsersByOrgRoleRequestSchema } from '@validation/schema/admin/common';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';

export async function getUsersInOrganization(
  request: FastifyRequest<{
    Querystring: z.infer<typeof GetUsersByOrgRoleRequestSchema>;
  }>,
  reply: FastifyReply
) {
  const {
    organizationId,
    organizationSlug,
    role,
    type,
    page,
    limit,
    includeAdmin,
  } = request.query;

  const pageInt = parseInt(page),
    limitInt = parseInt(limit);

  if (Number.isNaN(pageInt) || Number.isNaN(limitInt)) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'Invalid Pagination Params',
      error: 'Bad Request',
      message: 'Either page field or limit field is not a number',
    });
  }

  let orgId = organizationId;
  if (orgId || organizationSlug) {
    const org = await db
      .select()
      .from(organization)
      .where(
        or(
          eq(organization.slug, organizationSlug || ''),
          eq(organization.slug, organizationSlug || '')
        )
      );

    if (!org[0]) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'ORG_NOT_FOUND',
        error: 'Not Found',
        message: 'Organization not found',
      });
    }
    orgId = org[0].id;
  }
  let memberQuery;
  const memberQueries = [eq(member.role, role)];
  if (orgId) {
    memberQueries.push(eq(member.organizationId, orgId));
  }
  if (includeAdmin) {
    // get all orgs where current user is admin/owner
    const adminOrgs = await db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(
        and(
          eq(member.userId, request.user.id),
          inArray(member.role, ['owner', 'admin'])
        )
      );
    memberQueries.push(
      inArray(
        member.organizationId,
        adminOrgs.map((o) => o.organizationId)
      )
    );
  }

  memberQuery = db
    .select()
    .from(member)
    .where(and(...memberQueries));

  const usersList =
    type !== 'count'
      ? await memberQuery
          .offset((pageInt - 1) * limitInt)
          .limit(limitInt)
          .execute()
      : [];

  const totalCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(memberQuery.as('mq'))
    .execute()
    .then((r) => r[0]?.count ?? 0);

  return reply.send({
    statusCode: 200,
    message: 'Users retrieved successfully',
    data: {
      orgId,
      totalCount,
      users: type !== 'count' ? usersList.map((s) => s.userId) : undefined,
    },
  });
}
