import { member, organization } from '@db/schema/auth';
import { jobApplication } from '@db/schema/job';
import { db } from '@db/setup';
import { GetUsersByOrgRoleRequestSchema } from '@validation/schema/admin/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';

export async function getUsersWithJobApplications(
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

  const pageInt = parseInt(page);
  const limitInt = parseInt(limit);

  if (Number.isNaN(pageInt) || Number.isNaN(limitInt)) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'INVALID_PAGINATION',
      error: 'Bad Request',
      message: 'Page and limit must be valid numbers',
    });
  }

  let orgId = null;

  if (organizationSlug) {
    const org = await db
      .select()
      .from(organization)
      .where(eq(organization.slug, organizationSlug));
    orgId = org[0].id;
  }
  if (!organizationSlug && organizationId) {
    const org = await db
      .select()
      .from(organization)
      .where(eq(organization.id, organizationId));
    orgId = org[0].id;
  }

  if (orgId === null) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'ORG_NOT_FOUND',
      error: 'Not Found',
      message: 'Organization not found',
    });
  }

  const whereClauses = [eq(member.role, role)];
  if (orgId) {
    whereClauses.push(eq(member.organizationId, orgId));
  }
  if (includeAdmin) {
    const adminOrgs = await db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(
        and(
          eq(member.userId, request.user.id),
          inArray(member.role, ['owner', 'admin'])
        )
      );
    if (adminOrgs.length) {
      whereClauses.push(
        inArray(
          member.organizationId,
          adminOrgs.map((o) => o.organizationId)
        )
      );
    }
  }

  const usersQuery = db
    .selectDistinct({
      userId: member.userId,
    })
    .from(member)
    .innerJoin(jobApplication, eq(member.userId, jobApplication.userId))
    .where(and(...whereClauses));

  const usersList =
    type !== 'count'
      ? await usersQuery.offset((pageInt - 1) * limitInt).limit(limitInt)
      : [];

  const [totalCount] = await db
    .select({
      userCount: sql<number>`CAST(COUNT(DISTINCT ${jobApplication.userId}) AS INTEGER)`,
      applicationCount: sql<number>`CAST(COUNT(DISTINCT ${jobApplication.id}) AS INTEGER)`,
    })
    .from(jobApplication)
    .innerJoin(member, eq(jobApplication.userId, member.userId))
    .where(eq(member.organizationId, orgId));

  return reply.send({
    statusCode: 200,
    message: 'Users with job applications retrieved successfully',
    data: {
      orgId,
      totalCount: totalCount,
      users: type !== 'count' ? usersList.map((s) => s.userId) : undefined,
    },
  });
}
