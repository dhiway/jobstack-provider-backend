import { db } from '@db/setup';
import { organization, jobPosting } from '@db/schema';
import { eq, sql } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';

const JobStatusEnum = z.enum(['draft', 'open', 'closed', 'archived']);

export const UpdateJobPostingRequestSchema = z.object({
  jobId: z.string(),
  userId: z.string(),
  orgId: z.string().length(32).or(z.uuid()).optional(),
  phoneNumber: z.string(),
  title: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  location: z.record(z.string(), z.any()).optional(),
  status: JobStatusEnum.optional(),
});

type UpdateJobPostingRequestInput = z.infer<
  typeof UpdateJobPostingRequestSchema
>;

const deepMerge = (
  target: Record<string, any>,
  source: Record<string, any>
): Record<string, any> => {
  const result = { ...target };
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else if (source[key] !== undefined && source[key] !== null) {
      result[key] = source[key];
    }
  }
  return result;
};

const updateJobPosting = async (
  request: FastifyRequest<{ Body: UpdateJobPostingRequestInput }>,
  reply: FastifyReply
) => {
  const parsed = UpdateJobPostingRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'BAD_REQUEST',
      error: 'Invalid Query Params',
      message: z.flattenError(parsed.error).fieldErrors,
    });
  }

  const {
    jobId,
    userId,
    phoneNumber,
    orgId,
    title,
    metadata,
    location,
    status,
  } = request.body;

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
      message: 'Not authorized to update this job posting',
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

  const mergedMetadata = metadata
    ? deepMerge((existingJob.metadata as Record<string, any>) || {}, metadata)
    : existingJob.metadata;

  const mergedLocation = location
    ? deepMerge((existingJob.location as Record<string, any>) || {}, location)
    : existingJob.location;

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (title !== undefined && title !== null && title.trim() !== '') {
    updateData.title = title;
  }

  if (mergedMetadata !== undefined) {
    updateData.metadata = mergedMetadata;
  }

  if (mergedLocation !== undefined) {
    updateData.location = mergedLocation;
  }

  if (status !== undefined && status !== null && status.trim() !== '') {
    updateData.status = status;
  }

  const updatedJob = await db
    .update(jobPosting)
    .set(updateData)
    .where(eq(jobPosting.id, jobId))
    .returning();

  return reply.status(200).send({
    statusCode: 200,
    message: 'Job Posting Updated',
    data: {
      jobPosting: updatedJob[0],
    },
  });
};

export default updateJobPosting;