import { FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod/v4';
import { eq, and, asc, desc, ne } from 'drizzle-orm';
import { jobApplication, jobPosting } from '@db/schema/job';
import { db } from '@db/setup';
import { member, organization } from '@db/schema/auth';
import {
  JobApplicationsQuerySchema,
  JobParamsSchema,
} from '@validation/schema/jobs/request';

type GetJobApplicationsParamsInput = z.infer<typeof JobParamsSchema>;
type GetJobApplicationsQueryInput = z.infer<typeof JobApplicationsQuerySchema>;

export async function getJobApplications(
  request: FastifyRequest<{
    Params: GetJobApplicationsParamsInput;
    Querystring: GetJobApplicationsQueryInput;
  }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const { organizationId } = request.params;

  const {
    page: pageStr,
    limit: limitStr,
    jobId,
    sortBy,
    sortOrder,
    status,
    applicationStatus,
  } = request.query;

  const page = parseInt(pageStr) || 1;
  const limit = parseInt(limitStr) || 20;
  const offset = (page - 1) * limit;

  const sortColumn =
    sortBy === 'status' ? jobApplication.status : jobApplication.appliedAt;
  const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  // Membership check
  const orgDetails = await db
    .select({
      id: organization.id,
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

  const whereConditions = [
    eq(jobPosting.organizationId, organizationId),
    ne(jobApplication.status, 'draft'),
  ];

  if (jobId) {
    whereConditions.push(eq(jobApplication.jobId, jobId));
  }

  if (status) {
    whereConditions.push(eq(jobApplication.status, status));
  }
  if (applicationStatus) {
    whereConditions.push(
      eq(jobApplication.applicationStatus, applicationStatus)
    );
  }

  const applications = await db
    .select({
      id: jobApplication.id,
      jobId: jobApplication.jobId,
      transactionId: jobApplication.transactionId,
      status: jobApplication.status,
      applicationStatus: jobApplication.applicationStatus,
      userName: jobApplication.userName,
      userId: jobApplication.userId,
      location: jobApplication.location,
      contact: jobApplication.contact,
      metadata: jobApplication.metadata,
      appliedAt: jobApplication.appliedAt,
      updatedAt: jobApplication.updatedAt,
    })
    .from(jobApplication)
    .innerJoin(jobPosting, eq(jobApplication.jobId, jobPosting.id))
    .where(and(...whereConditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return reply.send({
    statusCode: 200,
    message: 'Job applications fetched successfully',
    data: {
      applications,
      pagination: {
        page,
        limit,
      },
    },
  });
}
