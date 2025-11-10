import { FastifyRequest, FastifyReply } from 'fastify';
import * as z from 'zod/v4';
import {
  UpdateJobPostSchema,
  JobParamsSchema,
} from '@validation/schema/jobs/request';
import { db } from '@db/setup';
import { member, organization } from '@db/schema/auth';
import { eq, and } from 'drizzle-orm';
import { jobPosting } from '@db/schema/job';
import { syncJobPostingToChain } from '@lib/cord/jobEntry';

type UpdateJobPostInput = z.infer<typeof UpdateJobPostSchema>;
type JobQueryInput = z.infer<typeof JobParamsSchema>;

export async function updateJobPost(
  request: FastifyRequest<{
    Body: UpdateJobPostInput;
    Params: JobQueryInput;
  }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const { organizationId } = request.params;
  const { jobId, ...updateData } = UpdateJobPostSchema.parse(request.body);

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
    .select()
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

  // Update
  const updated = await db
    .update(jobPosting)
    .set({
      title: updateData.title || existing.title,
      status: updateData.status || existing.status,
      description: updateData.description || existing.description,
      metadata: updateData.metadata ?? existing.metadata,
      location: updateData.location || existing.location,
      contact: updateData.contact || existing.contact,
      updatedAt: new Date(),
    })
    .where(eq(jobPosting.id, jobId))
    .returning();

  // ✅ Sync entry state to CORD chain (non-blocking)
  if (process.env.CORD_ENABLED === 'true') {
    syncJobPostingToChain(jobId)
      .then(() => {
        console.log(`✅ [CORD] Entry updated for job posting ${jobId}`);
      })
      .catch((err) => {
        console.error(`❌ [CORD] Failed to update entry for job posting ${jobId}:`, err);
        // Don't fail the request - non-blocking
      });
  }

  return reply.send({
    statusCode: 200,
    message: 'Job post updated successfully',
    data: {
      jobPost: updated[0],
    },
  });
}
