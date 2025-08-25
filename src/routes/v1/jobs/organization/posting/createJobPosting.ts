import { FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod/v4';
import {
  CreateJobPostSchema,
  JobParamsSchema,
} from '@validation/schema/jobs/request';
import { db } from '@db/setup';
import { member, organization } from '@db/schema/auth';
import { eq, and } from 'drizzle-orm';
import { jobPosting } from '@db/schema/job';

type CreateJobPostInput = z.infer<typeof CreateJobPostSchema>;
type JobQueryInput = z.infer<typeof JobParamsSchema>;
export async function createJobPost(
  request: FastifyRequest<{
    Body: CreateJobPostInput;
    Params: JobQueryInput;
  }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  // Verify membership
  const orgDetails = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(
      and(
        eq(member.userId, userId),
        eq(member.organizationId, request.params.organizationId)
      )
    );

  if (orgDetails.length === 0) {
    return reply.status(403).send({
      statusCode: 403,
      code: 'ORG_MEMBERSHIP_REQUIRED',
      error: 'Forbidden',
      message: 'User does not belong to this organization',
    });
  }

  // Insert job posting
  const newJobPost = await db
    .insert(jobPosting)
    .values({
      title: request.body.title,
      status: request.body.status,
      description: request.body.description || '',
      metadata: request.body.metadata || {},
      location: request.body.location || {},
      contact: request.body.contact || {},
      organizationId: orgDetails[0].id,
      organizationName: orgDetails[0].name,
      createdBy: userId,
    })
    .returning();

  return reply.status(201).send({
    statusCode: 201,
    message: 'Job post created successfully',
    data: {
      jobPost: newJobPost[0],
    },
  });
}
