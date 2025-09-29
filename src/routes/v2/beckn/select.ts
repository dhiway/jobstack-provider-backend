import { jobPosting, schemaDefinition, schemaLink } from '@db/schema';
import { db } from '@db/setup';
import { and, eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';
import { SelectJobApplicationSchema } from './validation/request';

type SelectJobApplicationBody = z.infer<typeof SelectJobApplicationSchema>;

export async function selectJobApplication(
  request: FastifyRequest<{ Body: SelectJobApplicationBody }>,
  reply: FastifyReply
) {
  const { jobPostingId, providerId } = request.body;
  try {
    const [posting] = await db
      .select()
      .from(jobPosting)
      .where(
        and(
          eq(jobPosting.id, jobPostingId),
          eq(jobPosting.organizationId, providerId)
        )
      )
      .limit(1);

    if (!posting) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'JOB_NOT_FOUND',
        error: 'Not Found',
        message: 'Requested job posting not found or no longer available',
      });
    }

    const [schema] = await db
      .select({
        url: schemaDefinition.url,
        body: schemaDefinition.body,
      })
      .from(schemaDefinition)
      .innerJoin(schemaLink, eq(schemaDefinition.id, schemaLink.schemaId))
      .where(eq(schemaLink.jobPostingId, jobPostingId))
      .limit(1);

    if (!schema) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'SCHEMA_NOT_FOUND',
        error: 'Not Found',
        message:
          'Requested job posting has no schema attached or it is no longer available',
      });
    }

    return reply.status(200).send({
      statusCode: 200,
      message: 'Metadata is valid',
      data: {
        provider: {
          id: posting.organizationId,
          title: posting.organizationName,
          location: posting.location,
        },
        jobPosting: posting,
        schema: schema,
      },
    });
  } catch (err: any) {
    return reply.status(500).send({
      statusCode: 500,
      code: 'BAD_REQUEST',
      error: 'Internal Server Error',
      message: err.message,
    });
  }
}
