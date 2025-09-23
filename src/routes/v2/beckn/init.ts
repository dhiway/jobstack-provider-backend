import { FastifyReply, FastifyRequest } from 'fastify';
import AjvDraft07 from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import {
  jobApplication,
  jobPosting,
  schemaDefinition,
  schemaLink,
} from '@db/schema';
import { db } from '@db/setup';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod/v4';
import { InitJobApplicationSchema } from './validation/request';

type InitJobApplicationBody = z.infer<typeof InitJobApplicationSchema>;

const ajvDraft07 = new AjvDraft07({ allErrors: true, strict: false });
const ajv2020 = new Ajv2020({ allErrors: true, strict: false });

addFormats(ajvDraft07);
addFormats(ajv2020);

function pickAjv(schemaObj: any) {
  const schemaVersion = schemaObj.$schema || '';
  if (schemaVersion.includes('2020-12')) return ajv2020;
  return ajvDraft07;
}

export async function initJobApplication(
  request: FastifyRequest<{ Body: InitJobApplicationBody }>,
  reply: FastifyReply
) {
  const { metadata, jobPostingId, transactionId, userDetails } = request.body;

  try {
    let schemaObj: any;

    const [schema] = await db
      .select({
        url: schemaDefinition.url,
        body: schemaDefinition.body,
      })
      .from(schemaDefinition)
      .innerJoin(schemaLink, eq(schemaDefinition.id, schemaLink.schemaId))
      .where(eq(schemaLink.jobPostingId, jobPostingId))
      .limit(1);

    if (typeof schema.url === 'string' && typeof schema.body !== 'object') {
      const res = await fetch(schema.url);
      if (!res.ok) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'BAD_REQUEST',
          error: 'Unavailable Schema Url',
          message: 'failed to fetch schema from given url',
        });
      }
      schemaObj = await res.json();
    } else {
      schemaObj = schema.body;
    }

    const ajv = pickAjv(schemaObj);

    const validate = ajv.compile(schemaObj);
    const valid = validate(metadata);

    if (!valid) {
      return reply.status(400).send({
        statusCode: 400,
        code: 'BAD_REQUEST',
        error: 'Invalid Metadata',
        message: validate.errors,
      });
    }
    // creation of jobApplication

    const [posting] = await db
      .select()
      .from(jobPosting)
      .where(and(eq(jobPosting.id, jobPostingId)))
      .limit(1);

    if (!posting) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'JOB_NOT_FOUND',
        error: 'Not Found',
        message: 'Job posting not found',
      });
    } else if (posting.status !== 'open') {
      ({
        statusCode: 403,
        code: 'JOB_NOT_OPEN',
        error: 'Forbidden',
        message: 'Job posting is not active',
      });
    }

    const [application] = await db
      .insert(jobApplication)
      .values({
        jobId: posting.id,
        userId: userDetails.id,
        transactionId: transactionId,
        userName: userDetails.name,
        metadata: metadata || {},
        contact: userDetails.contact || {},
        location: userDetails.location || {},
        status: 'draft',
      })
      .returning();

    if (!application) {
      return reply.status(400).send({
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        error: 'Failed to create application',
        message: 'application not created',
      });
    }

    return reply.status(200).send({
      statusCode: 200,
      message: 'Metadata is valid',
      data: {
        transactionId: transactionId,
        provider: {
          id: posting.organizationId,
          title: posting.organizationName,
          location: posting.location,
        },
        jobPosting: {
          id: posting.id,
          title: posting.title,
        },
        jobApplication: {
          id: application.id,
          userName: application.userName,
          appliedAt: application.appliedAt,
        },
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
