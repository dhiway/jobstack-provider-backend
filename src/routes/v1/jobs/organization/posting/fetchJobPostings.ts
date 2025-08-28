import { FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod/v4';
import { db } from '@db/setup';
import { member, organization } from '@db/schema/auth';
import { eq, and, asc, desc, sql } from 'drizzle-orm';
import { jobApplication, jobPosting } from '@db/schema/job';
import {
  JobParamsSchema,
  JobQuerySchema,
} from '@validation/schema/jobs/request';

type GetJobPostingsParamsInput = z.infer<typeof JobParamsSchema>;
type GetJobPostingsQueryInput = z.infer<typeof JobQuerySchema>;

export async function getJobPostings(
  request: FastifyRequest<{
    Params: GetJobPostingsParamsInput;
    Querystring: GetJobPostingsQueryInput;
  }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const { organizationId } = request.params;

  const { page: pageStr, limit: limitStr, sortBy, sortOrder } = request.query;

  const page = parseInt(pageStr) || 1;
  const limit = parseInt(limitStr) || 20;
  const offset = (page - 1) * limit;

  const sortColumn =
    sortBy === 'title' ? jobPosting.title : jobPosting.createdAt;
  const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  // Membership check
  const orgDetails = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(
      and(eq(member.userId, userId), eq(member.organizationId, organizationId))
    );

  if (orgDetails.length === 0) {
    return reply.status(403).send({
      statusCode: 403,
      code: 'ORG_MEMBERSHIP_REQUIRED',
      error: 'Forbidden',
      message: 'User does not belong to this organization',
    });
  }

  const jobs = await db
    .select({
      id: jobPosting.id,
      title: jobPosting.title,
      description: jobPosting.description,
      status: jobPosting.status,
      location: jobPosting.location,
      contact: jobPosting.contact,
      metadata: jobPosting.metadata,
      organizationId: jobPosting.organizationId,
      organizationName: jobPosting.organizationName,
      createdBy: jobPosting.createdBy,
      createdAt: jobPosting.createdAt,
      updatedAt: jobPosting.updatedAt,
      applicationsCount: sql<number>`
        COUNT(
          CASE WHEN ${jobApplication.status} != 'draft'
          THEN 1 ELSE NULL END
        )
      `.as('applications_count'),
    })
    .from(jobPosting)
    .leftJoin(jobApplication, eq(jobPosting.id, jobApplication.jobId))
    .where(eq(jobPosting.organizationId, organizationId))
    .groupBy(jobPosting.id)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  const [{ totalCount }] = await db
    .select({
      totalCount: sql<number>`cast(count(*) as int)`,
    })
    .from(jobPosting)
    .where(eq(jobPosting.organizationId, organizationId));

  return reply.send({
    statusCode: 200,
    message: 'Job postings fetched successfully',
    data: {
      jobs,
      pagination: {
        page,
        limit,
        totalCount,
      },
    },
  });
}
