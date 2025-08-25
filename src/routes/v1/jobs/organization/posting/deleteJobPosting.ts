import { FastifyRequest, FastifyReply } from 'fastify';
import * as z from 'zod/v4';
import {
  DeleteJobPostSchema,
  JobParamsSchema,
} from '@validation/schema/jobs/request';
import { db } from '@db/setup';
import { member, organization } from '@db/schema/auth';
import { eq, and, or } from 'drizzle-orm';
import { jobPosting } from '@db/schema/job';

type DeleteJobPostInput = z.infer<typeof DeleteJobPostSchema>;
type JobQueryInput = z.infer<typeof JobParamsSchema>;

export async function deleteJobPost(
  request: FastifyRequest<{
    Body: DeleteJobPostInput;
    Params: JobQueryInput;
  }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const { organizationId } = request.params;
  const { jobId } = DeleteJobPostSchema.parse(request.body);

  // Verify membership
  const orgDetails = await db
    .select({ id: organization.id })
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

  // Verify job posting ownership
  const [existing] = await db
    .select({ id: jobPosting.id, organizationId: jobPosting.organizationId })
    .from(jobPosting)
    .where(eq(jobPosting.id, jobId));

  if (!existing) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'JOB_POST_NOT_FOUND',
      error: 'Not Found',
      message: 'Job posting not found',
    });
  }

  if (existing.organizationId !== organizationId) {
    return reply.status(403).send({
      statusCode: 403,
      code: 'NOT_OWNER',
      error: 'Forbidden',
      message: 'Your organization does not own this job posting',
    });
  }

  await db
    .delete(jobPosting)
    .where(
      and(
        eq(jobPosting.id, jobId),
        or(eq(jobPosting.status, 'draft'), eq(jobPosting.status, 'archived'))
      )
    )
    .then(() => {
      return reply.send({
        statusCode: 200,
        message: 'Job post deleted successfully',
      });
    })
    .catch((error) => {
      return reply.status(403).send({
        statusCode: 403,
        code: 'NOT_ALLOWED',
        error: 'Forbidden',
        message:
          error.message ||
          'Unable to delete the record. Active records will not be deleted',
      });
    });
}
