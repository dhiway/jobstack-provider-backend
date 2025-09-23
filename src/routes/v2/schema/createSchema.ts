import {
  jobPosting,
  organization,
  schemaDefinition,
  schemaLink,
} from '@db/schema';
import { db } from '@db/setup';
import { eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';

export const CreateSchemaRequestSchema = z.object({
  jobPostingId: z.string(),
  orgId: z.string().optional(),
  schema: z.object({
    url: z.url().optional(),
    body: z.record(z.string(), z.any()).optional(),
    name: z.string().default('new schema'),
    description: z.string().default('').optional(),
    version: z.string().default('1.0.0').optional(),
  }),
});

type createSchemaBody = z.infer<typeof CreateSchemaRequestSchema>;
export async function selectJobApplication(
  request: FastifyRequest<{ Body: createSchemaBody }>,
  reply: FastifyReply
) {
  const { jobPostingId, orgId, schema } = request.body;

  if (typeof orgId === 'string') {
    const [org] = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, orgId));
    if (!org) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'ORG_NOT_FOUND',
        error: 'Not Found',
        message: 'organization not found. invalid orgId',
      });
    }
  }

  const schemaJson = [];
  if (typeof schema.url === 'string' && typeof schema.body !== 'object') {
    const res = await fetch(schema.url);
    const json = await res.json();
    if (!res.ok) {
      // add to logger in future
    } else if (typeof json.$schema === 'string') {
      schemaJson.push(json);
    }
  }

  const [newSchema] = await db
    .insert(schemaDefinition)
    .values({
      orgId: typeof orgId === 'string' ? orgId : null,
      name: schema.name,
      url: schema.url,
      body:
        typeof schema.body === 'object'
          ? schema.body
          : typeof schemaJson[0] === 'object'
            ? schemaJson[0]
            : null,
    })
    .returning();

  if (!newSchema) {
    return reply.status(500).send({
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      error: 'Failed to add schema',
      message: 'schema not created',
    });
  }

  const [posting] = await db
    .select({ id: jobPosting.id })
    .from(jobPosting)
    .where(eq(jobPosting.id, jobPostingId))
    .limit(1);

  if (!posting) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'JOB_NOT_FOUND',
      error: 'Not Found',
      message: 'Job posting not found',
    });
  }

  await db
    .insert(schemaLink)
    .values({
      jobPostingId: posting.id,
      schemaId: newSchema.id,
    })
    .catch((err: any) => {
      return reply.status(500).send({
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        error: err.message,
        message: `failed to add schema id: ${newSchema.id} to jobPosting: ${posting.id}`,
      });
    });

  reply.code(200).send({
    schema: newSchema,
    jobPosting: {
      id: posting.id,
    },
    global: newSchema.orgId ? false : true,
  });
}
