import {
  jobPosting,
  organization,
  schemaDefinition,
  schemaLink,
} from '@db/schema';
import { db } from '@db/setup';
import { calculateHash } from '@lib/index';
import { eq, and, isNull } from 'drizzle-orm';
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

  // Ensure job posting exists
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

  // Check org existence if orgId provided
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

  // Load schema from url if provided but no body
  const schemaJson: Record<string, any>[] = [];
  if (typeof schema.url === 'string' && typeof schema.body !== 'object') {
    const res = await fetch(schema.url);
    if (res.ok) {
      const json = await res.json();
      if (typeof json.$schema === 'string') {
        schemaJson.push(json);
      }
    }
  }

  const finalBody =
    typeof schema.body === 'object'
      ? schema.body
      : typeof schemaJson[0] === 'object'
        ? schemaJson[0]
        : null;

  const urlHash = schema.url ? calculateHash(schema.url) : null;
  const bodyHash = finalBody ? calculateHash(finalBody) : null;

  // Check if schema already exists
  let existingSchema;
  if (urlHash) {
    [existingSchema] = await db
      .select()
      .from(schemaDefinition)
      .where(
        and(
          eq(schemaDefinition.hash, urlHash),
          orgId
            ? eq(schemaDefinition.orgId, orgId)
            : isNull(schemaDefinition.orgId)
        )
      )
      .limit(1);
  }
  if (!existingSchema && bodyHash) {
    [existingSchema] = await db
      .select()
      .from(schemaDefinition)
      .where(
        and(
          eq(schemaDefinition.hash, bodyHash),
          orgId
            ? eq(schemaDefinition.orgId, orgId)
            : isNull(schemaDefinition.orgId)
        )
      )
      .limit(1);
  }

  let schemaToUse = existingSchema;

  if (!schemaToUse) {
    // Insert new schema
    const [newSchema] = await db
      .insert(schemaDefinition)
      .values({
        orgId: typeof orgId === 'string' ? orgId : null,
        name: schema.name,
        url: schema.url,
        body: finalBody,
        description: schema.description,
        version: schema.version,
        hash: urlHash || bodyHash || null,
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

    schemaToUse = newSchema;
  }

  // Link schema to job posting
  try {
    await db.insert(schemaLink).values({
      jobPostingId: posting.id,
      schemaId: schemaToUse.id,
    });
  } catch (err: any) {
    return reply.status(500).send({
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      error: err.message,
      message: `failed to add schema id: ${schemaToUse.id} to jobPosting: ${posting.id}`,
    });
  }

  reply.code(200).send({
    schema: schemaToUse,
    jobPosting: { id: posting.id },
    global: schemaToUse.orgId ? false : true,
  });
}
