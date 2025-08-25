import { member, organization } from '@db/schema/auth';
import { jobApplication, jobPosting } from '@db/schema/job';
import { db } from '@db/setup';
import { GetUsersStatusRequestSchema } from '@validation/schema/admin/common';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';

export async function getUsersJobApplicationsStatusCount(
  request: FastifyRequest<{
    Querystring: z.infer<typeof GetUsersStatusRequestSchema>;
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
    applicationStatus,
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

  const whereClauses = [eq(member.role, role)];
  if (orgId) {
    whereClauses.push(eq(member.organizationId, orgId));
  } else if (includeAdmin) {
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

  const applicationWhereClauses = applicationStatus
    ? [eq(jobApplication.applicationStatus, applicationStatus)]
    : [eq(jobApplication.status, 'closed')];

  const usersList =
    type !== 'count'
      ? await db
          .selectDistinct({ userId: member.userId })
          .from(member)
          .innerJoin(jobApplication, eq(member.userId, jobApplication.userId))
          .innerJoin(jobPosting, eq(jobApplication.jobId, jobPosting.id))
          .where(and(...whereClauses, ...applicationWhereClauses))
          .offset((pageInt - 1) * limitInt)
          .limit(limitInt)
      : [];

  const totalCount = await db
    .select({
      count: sql<number>`COUNT(DISTINCT ${member.userId})`,
    })
    .from(member)
    .innerJoin(jobApplication, eq(member.userId, jobApplication.userId))
    .innerJoin(jobPosting, eq(jobApplication.jobId, jobPosting.id))
    .where(and(...whereClauses, ...applicationWhereClauses))
    .then((r) => Number(r[0]?.count ?? 0));

  return reply.send({
    statusCode: 200,
    message: 'Users filtered by job application status successfully',
    data: {
      orgId,
      totalCount,
      users: type !== 'count' ? usersList.map((s) => s.userId) : undefined,
    },
  });
}
