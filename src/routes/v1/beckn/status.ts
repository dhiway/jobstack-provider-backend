import { FastifyReply, FastifyRequest } from 'fastify';
import { and, eq } from 'drizzle-orm';
import StatusRequestSchema from '../../../validation/beckn/methods/status';
import { db } from '../../../db/setup';
import { jobApplication, jobPosting } from '../../../db/schema/job';

export async function jobApplicationStatus(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const parsed = StatusRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'INVALID_REQUEST',
      error: 'Bad Request',
      message: parsed.error.message,
    });
  }

  const { context, message } = parsed.data;
  const orderId = message.order.id;
  const transactionId = context.transaction_id;

  const [application] = await db
    .select()
    .from(jobApplication)
    .where(
      and(
        eq(jobApplication.id, orderId),
        eq(jobApplication.transactionId, transactionId)
      )
    )
    .limit(1);

  if (!application) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'APPLICATION_NOT_FOUND',
      error: 'Not Found',
      message: `Job application with ID '${orderId}' not found.`,
    });
  }

  const [posting] = await db
    .select()
    .from(jobPosting)
    .where(eq(jobPosting.id, application.jobId))
    .limit(1);

  if (!posting) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'JOB_NOT_FOUND',
      error: 'Not Found',
      message: `Job posting with ID '${application.jobId}' not found.`,
    });
  }

  const response = {
    message: {
      order: {
        id: application.id,
        provider: {
          id: posting.organizationId,
          descriptor: {
            name: posting.organizationName,
          },
          locations: [posting.location],
        },
        items: [
          {
            id: application.id,
            descriptor: {
              name: application.userName,
            },
            time: {
              range: {
                start: application.appliedAt.toISOString(),
              },
            },
          },
        ],
        fulfillments: [
          {
            id: application.userId,
            state: {
              descriptor: {
                code: application.status,
                name: application.applicationStatus,
              },
            },
          },
        ],
      },
    },
  };

  return reply.send(response);
}
