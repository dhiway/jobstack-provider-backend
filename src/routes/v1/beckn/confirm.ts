import { jobApplication, jobPosting } from '@db/schema/job';
import { db } from '@src/db/setup';
import ConfirmRequestSchema from '@validation/beckn/methods/confirm';
import { and, eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod/v4';

type ConfirmRequestBody = z.infer<typeof ConfirmRequestSchema>;

export async function confirmJobApplication(
  request: FastifyRequest<{ Body: ConfirmRequestBody }>,
  reply: FastifyReply
) {
  const body = ConfirmRequestSchema.parse(request.body);

  const providerId = body.message.order.provider.id;
  const jobId = body.message.order.items[0]?.id;
  const fulfillments = body.message.order.fulfillments;
  const transactionId = body.context.transaction_id;

  if (!providerId || !jobId) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'INVALID_CONFIRM_REQUEST',
      error: 'Bad Request',
      message: 'Missing provider ID, item ID, or fulfillment ID',
    });
  }

  const [posting] = await db
    .select()
    .from(jobPosting)
    .where(
      and(eq(jobPosting.id, jobId), eq(jobPosting.organizationId, providerId))
    )
    .limit(1);

  if (!posting) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'JOB_NOT_FOUND',
      error: 'Not Found',
      message: 'Job posting not found',
    });
  }

  const updated = await db
    .update(jobApplication)
    .set({
      status: 'open',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(jobApplication.transactionId, transactionId),
        eq(jobApplication.status, 'draft'),
        eq(jobApplication.jobId, posting.id)
      )
    )
    .returning();

  if (!updated.length) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'APPLICATION_NOT_FOUND',
      error: 'Not Found',
      message: 'Draft application not found',
    });
  }

  return reply.send({
    context: { transaction_id: transactionId },
    message: {
      order: {
        id: updated[0].id,
        provider: {
          id: providerId,
          descriptor: {
            name: posting.organizationName,
          },
          locations: [posting.location],
        },
        items: [
          {
            id: posting.id,
            descriptor: {
              name: posting.title,
            },
            tag: posting.metadata,
            time: {
              range: {
                start: posting.createdAt.toISOString(),
                end: null,
              },
            },
          },
        ],
        fulfillments,
      },
    },
  });
}
