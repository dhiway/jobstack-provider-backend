import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod/v4';
import { eq, and } from 'drizzle-orm';
import {
  JobParamsSchema,
  UpdateJobApplicationStatusSchema,
} from '@validation/schema/jobs/request';
import { db } from '@db/setup';
import { member, organization } from '@db/schema/auth';
import { jobApplication, jobPosting } from '@db/schema/job';

type UpdateJobApplicationStatusInput = z.infer<
  typeof UpdateJobApplicationStatusSchema
>;
type JobQueryInput = z.infer<typeof JobParamsSchema>;

export async function updateJobApplicationStatus(
  request: FastifyRequest<{
    Body: UpdateJobApplicationStatusInput;
    Params: JobQueryInput;
  }>,
  reply: FastifyReply
) {
  const { applicationId, applicationStatus, action } =
    UpdateJobApplicationStatusSchema.parse(request.body);
  const { organizationId } = request.params;
  const userId = request.user.id;

  // Verify membership in org
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

  // Find the application + job posting to confirm ownership
  const [application] = await db
    .select({
      id: jobApplication.id,
      jobId: jobApplication.jobId,
    })
    .from(jobApplication)
    .where(eq(jobApplication.id, applicationId))
    .limit(1);

  if (!application) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'APPLICATION_NOT_FOUND',
      error: 'Not Found',
      message: 'Job application not found',
    });
  }

  // Fetch the job posting and confirm it belongs to the org
  const [posting] = await db
    .select({
      id: jobPosting.id,
      organizationId: jobPosting.organizationId,
    })
    .from(jobPosting)
    .where(eq(jobPosting.id, application.jobId))
    .limit(1);

  if (!posting) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'JOB_POSTING_NOT_FOUND',
      error: 'Not Found',
      message: 'Job posting not found for this application',
    });
  }

  if (posting.organizationId !== organizationId) {
    return reply.status(403).send({
      statusCode: 403,
      code: 'ORG_NOT_OWNER',
      error: 'Forbidden',
      message: 'Your organization does not own this job posting',
    });
  }

  const newStatus: 'closed' | 'archived' | 'open' =
    action === 'accept' ? 'closed' : action === 'reject' ? 'archived' : 'open';

  await db
    .update(jobApplication)
    .set({
      status: newStatus,
      applicationStatus,
      updatedAt: new Date(),
    })
    .where(eq(jobApplication.id, applicationId));

  return reply.send({
    statusCode: 200,
    message: `Job application ${action}ed successfully`,
    data: {
      id: applicationId,
      applicationStatus: applicationStatus || '',
      status: newStatus,
    },
  });
}
