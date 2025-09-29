import { FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod/v4';
import { db } from '@db/setup';
import { member, organization } from '@db/schema/auth';
import { eq, and } from 'drizzle-orm';
import { jobPosting } from '@db/schema/job';
import { ensureSchemaForJobPosting } from '@lib/schema';
import { ErrorResponseSchema } from '@validation/schema/response';
import { CreateJobPostSchema } from '../../schema/request';
import { JobParamsSchema } from '@validation/schema/jobs/request';

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
  const { title, status, description, metadata, location, contact, schema } =
    request.body;

  // Verify membership
  const [orgDetails] = await db
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

  if (!orgDetails) {
    return reply.status(403).send({
      statusCode: 403,
      code: 'ORG_MEMBERSHIP_REQUIRED',
      error: 'Forbidden',
      message: 'User does not belong to this organization',
    });
  }

  // Insert job posting
  const [newJobPost] = await db
    .insert(jobPosting)
    .values({
      title: title,
      status: status,
      description: description || '',
      metadata: metadata || {},
      location: location || {},
      contact: contact || {},
      organizationId: orgDetails.id,
      organizationName: orgDetails.name,
      createdBy: userId,
    })
    .returning();

  const schemaLinkOutput = await ensureSchemaForJobPosting(newJobPost.id, {
    ...schema,
    orgId: schema.global ? orgDetails.id : null,
  });
  const schemaErrorResponse = ErrorResponseSchema.safeParse(schemaLinkOutput);
  if (schemaErrorResponse.success) {
    return reply
      .status(schemaErrorResponse.data.statusCode)
      .send(schemaErrorResponse);
  }

  return reply.status(201).send({
    statusCode: 201,
    message: 'Job post created successfully',
    data: {
      jobPost: newJobPost,
      schema: schemaLinkOutput,
    },
  });
}
