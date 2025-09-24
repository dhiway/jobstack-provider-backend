import { db } from '@db/setup';
import { schemaDefinition, schemaLink, jobPosting } from '@db/schema';
import { calculateHash, ErrorResponse, makeError } from '@lib/index';
import { eq, and, isNull, DrizzleQueryError } from 'drizzle-orm';
import { DatabaseError } from 'pg';
import { CreateJobPostingSchemaResponse } from '@routes/v2/schema/validation/response';
import { ErrorResponseSchema } from '@validation/schema/response';

// Ensure schema exists or create new
export async function getOrCreateSchema(params: {
  orgId?: string | null;
  schemaId?: string;
  url?: string;
  body?: Record<string, any>;
  name?: string;
  description?: string;
  version?: string;
}): Promise<typeof schemaDefinition.$inferSelect | ErrorResponse> {
  const { orgId, schemaId, url, body, name, description, version } = params;

  try {
    // Case 1: schemaId provided → fetch directly
    if (schemaId) {
      const [schema] = await db
        .select()
        .from(schemaDefinition)
        .where(eq(schemaDefinition.id, schemaId))
        .limit(1);

      return (
        schema ??
        makeError(
          'SCHEMA_NOT_FOUND',
          'Schema not found',
          `No schema found with id ${schemaId}`,
          404
        )
      );
    }

    // Case 2 & 3: schema by url or body
    let finalBody = body ?? null;

    if (url && !body) {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          return makeError(
            'SCHEMA_FETCH_FAILED',
            'Failed to fetch schema',
            `Unable to fetch schema from url: ${url}`,
            404
          );
        }
        const json = await res.json();
        if (typeof json === 'object') finalBody = json;
      } catch {
        return makeError(
          'SCHEMA_FETCH_ERROR',
          'Schema fetch error',
          `Fetching schema from ${url} failed`,
          404
        );
      }
    }

    const urlHash = url ? calculateHash(url) : null;
    const bodyHash = finalBody ? calculateHash(finalBody) : null;

    let existingSchema;

    if (bodyHash) {
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

    if (!existingSchema && urlHash) {
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

    if (existingSchema) return existingSchema;

    // Create new schema
    const [newSchema] = await db
      .insert(schemaDefinition)
      .values({
        orgId: orgId ?? null,
        name: name ?? 'new schema',
        url,
        body: finalBody,
        description: description ?? '',
        version: version ?? '1.0.0',
        hash: urlHash || bodyHash || null,
      })
      .returning();

    return (
      newSchema ??
      makeError(
        'SCHEMA_CREATION_FAILED',
        'Schema creation failed',
        'Unable to create schema',
        500
      )
    );
  } catch (err: any) {
    return makeError(
      'INTERNAL_SERVER_ERROR',
      'Database error',
      err.message ?? 'Unexpected error while creating schema',
      500
    );
  }
}

// Ensure jobPosting is linked to schema
export async function ensureSchemaForJobPosting(
  jobPostingId: string,
  schemaParams: {
    schemaId?: string;
    url?: string;
    body?: Record<string, any>;
    name?: string;
    description?: string;
    version?: string;
    orgId?: string | null;
  }
): Promise<CreateJobPostingSchemaResponse | ErrorResponse> {
  try {
    // Verify jobPosting exists
    const [posting] = await db
      .select({ id: jobPosting.id })
      .from(jobPosting)
      .where(eq(jobPosting.id, jobPostingId))
      .limit(1);

    if (!posting) {
      return makeError(
        'JOB_NOT_FOUND',
        'Job posting not found',
        `No job posting found with id ${jobPostingId}`
      );
    }

    // Get or create schema
    const schemaResult = await getOrCreateSchema(schemaParams);
    if (ErrorResponseSchema.safeParse(schemaResult).success) {
      return schemaResult as ErrorResponse;
    }

    const schemaToUse = schemaResult as typeof schemaDefinition.$inferSelect;

    // Try linking schema to jobPosting
    try {
      await db.insert(schemaLink).values({
        jobPostingId: posting.id,
        schemaId: schemaToUse.id,
      });
    } catch (err: any) {
      if (err instanceof DrizzleQueryError) {
        if (err.cause instanceof DatabaseError && err.cause.code === '23505') {
          return makeError(
            'SCHEMA_LINK_EXISTS',
            'Job posting already linked',
            `Job posting ${posting.id} is already linked to a schema`,
            403
          );
        }
      }
      return makeError(
        'INTERNAL_SERVER_ERROR',
        'Database error',
        err.message ?? 'Unexpected error while linking schema',
        500
      );
    }

    return {
      jobPosting: { id: posting.id },
      schema: schemaToUse,
      global: typeof schemaParams.orgId === 'string',
    } as CreateJobPostingSchemaResponse;
  } catch (err: any) {
    return makeError(
      'INTERNAL_SERVER_ERROR',
      'Unexpected error',
      err.message ?? 'Unexpected error while ensuring schema for jobPosting',
      500
    );
  }
}
