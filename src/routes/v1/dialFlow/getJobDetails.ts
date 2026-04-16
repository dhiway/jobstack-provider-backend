import { db } from '@db/setup';
import { organization, jobPosting, jobStatusEnum } from '@db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';

const JobStatusEnum = z.enum(['draft', 'open', 'closed', 'archived']);

export const GetJobDetailsRequestSchema = z.object({
  userId: z.string(),
  orgId: z.string().length(32).or(z.uuid()).optional(),
  phoneNumber: z.string(),
  jobId: z.string().optional(),
  status: JobStatusEnum.optional(),
});

type GetJobDetailsRequestInput = z.infer<
  typeof GetJobDetailsRequestSchema
>;

const getJobDetails = async (
  request: FastifyRequest<{ Querystring: GetJobDetailsRequestInput }>,
  reply: FastifyReply
) => {
  const parsed = GetJobDetailsRequestSchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'BAD_REQUEST',
      error: 'Invalid Query Params',
      message: z.flattenError(parsed.error).fieldErrors,
    });
  }

  const { userId, phoneNumber, orgId, jobId, status } = request.query;

  let org = null;

  if (orgId) {
    org = await db.query.organization.findFirst({
      where: eq(organization.id, orgId),
    });
  }

  if (!org) {
    org = await db.query.organization.findFirst({
      where: sql`(${organization.metadata}::jsonb ->> 'contactPhone') = ${phoneNumber}`,
    });
  }

  if (!org) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'ORG_NOT_FOUND',
      error: 'Not Found',
      message: 'Organization not found',
    });
  }

  if (jobId) {
    const existingJob = await db.query.jobPosting.findFirst({
      where: eq(jobPosting.id, jobId),
    });

    if (!existingJob) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'JOB_POST_NOT_FOUND',
        error: 'Not Found',
        message: 'Job posting not found',
      });
    }

    if (existingJob.organizationId !== org.id) {
      return reply.status(403).send({
        statusCode: 403,
        code: 'NOT_OWNER',
        error: 'Forbidden',
        message: 'Not authorized to access this job posting',
      });
    }

    if (existingJob.createdBy !== userId) {
      return reply.status(403).send({
        statusCode: 403,
        code: 'USER_MISMATCH',
        error: 'Forbidden',
        message: 'User ID does not match the job posting creator',
      });
    }

    if (status && existingJob.status !== status) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'JOB_STATUS_MISMATCH',
        error: 'Not Found',
        message: 'Job posting does not have the requested status',
      });
    }

    return reply.status(200).send({
      statusCode: 200,
      message: 'Job Details',
      data: {
        jobs: [existingJob],
        count: 1,
      },
    });
  }

  const conditions: any[] = [
    eq(jobPosting.createdBy, userId),
    eq(jobPosting.organizationId, org.id),
  ];

  if (status) {
    conditions.push(eq(jobPosting.status, status));
  }

  const jobs = await db
    .select()
    .from(jobPosting)
    .where(and(...conditions));

  return reply.status(200).send({
    statusCode: 200,
    message: 'Job Listings',
    data: {
      jobs,
      count: jobs.length,
    },
  });
};

export default getJobDetails;