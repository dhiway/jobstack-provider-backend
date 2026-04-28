import { eq, and, asc, desc, sql } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';
import { jobApplication, jobPosting } from '@db/schema/job';
import { db } from '@db/setup';

const FetchJobApplicationsQuerySchema = z.object({
  jobId: z.uuid(),
  profile_id: z.string().optional(),
  organizationId: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  sortBy: z.enum(['createdAt', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  status: z.enum(['open', 'archived', 'closed']).optional(),
  applicationStatus: z.string().optional(),
});

type FetchJobApplicationsQueryInput = z.infer<typeof FetchJobApplicationsQuerySchema>;

export async function fetchJobApplications(
  request: FastifyRequest<{
    Querystring: FetchJobApplicationsQueryInput;
  }>,
  reply: FastifyReply
) {
  const parsed = FetchJobApplicationsQuerySchema.safeParse(request.query);

  if (!parsed.success) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'BAD_REQUEST',
      error: 'Invalid Query Params',
      message: parsed.error.flatten().fieldErrors,
    });
  }

  const {
    jobId,
    profile_id,
    organizationId,
    page: pageStr,
    limit: limitStr,
    sortBy,
    sortOrder,
    status,
    applicationStatus,
  } = parsed.data;

  const page = parseInt(pageStr) || 1;
  const limit = parseInt(limitStr) || 20;
  const offset = (page - 1) * limit;

  const sortColumn =
    sortBy === 'status' ? jobApplication.status : jobApplication.appliedAt;
  const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const whereConditions = [eq(jobApplication.jobId, jobId)];

  if (profile_id) {
    whereConditions.push(eq(jobApplication.userId, profile_id));
  }

  if (organizationId) {
    whereConditions.push(eq(jobPosting.organizationId, organizationId));
  }

  if (status) {
    whereConditions.push(eq(jobApplication.status, status));
  }

  if (applicationStatus) {
    whereConditions.push(eq(jobApplication.applicationStatus, applicationStatus));
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

  const [{ totalCount }] = await db
    .select({
      totalCount: sql<number>`cast(count(*) as int)`,
    })
    .from(jobApplication)
    .innerJoin(jobPosting, eq(jobApplication.jobId, jobPosting.id))
    .where(and(...whereConditions));

  return reply.send({
    statusCode: 200,
    message: 'Job applications fetched successfully',
    data: {
      applications,
      pagination: {
        page,
        limit,
        totalCount,
      },
    },
  });
}