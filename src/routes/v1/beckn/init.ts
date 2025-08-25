import { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as z from 'zod/v4';
import InitRequestSchema from '@validation/beckn/methods/init';
import { db } from '@db/setup';
import { jobApplication, jobPosting } from '@db/schema/job';

type InitRequestBody = z.infer<typeof InitRequestSchema>;

export async function initJobPosting(
  request: FastifyRequest<{ Body: InitRequestBody }>,
  reply: FastifyReply
) {
  const body = request.body;

  const providerId = body.message.order.provider.id;
  const itemId = body.message.order.items[0]?.id;
  const fulfillments = body.message.order.fulfillments;
  const transactionId = body.context.transaction_id;

  if (!providerId || !itemId || !transactionId) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'INVALID_INIT_REQUEST',
      error: 'Bad Request',
      message: 'Missing provider ID or item ID or transactionId',
    });
  }

  const [posting] = await db
    .select()
    .from(jobPosting)
    .where(
      and(eq(jobPosting.id, itemId), eq(jobPosting.organizationId, providerId))
    )
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

  if (
    !fulfillments?.length ||
    !fulfillments[0].customer ||
    !fulfillments[0].customer?.person?.name
  ) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'FULFILLMENT_DATA_REQUIRED',
      error: 'Bad Request',
      message: 'Fulfillments with customer info are required',
    });
  }

  const customer = fulfillments[0].customer;

  await db.insert(jobApplication).values({
    jobId: posting.id,
    userId: fulfillments[0].id,
    transactionId: transactionId,
    userName: customer.person.name!,
    metadata: customer.person || {},
    contact: customer.contact || {},
    location: customer.location || {},
    status: 'draft',
  });

  return reply.send({
    context: {
      transaction_id: transactionId,
    },
    message: {
      order: {
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
            time: {
              range: {
                start: posting.createdAt.toISOString(),
                end: null,
              },
            },
          },
        ],
        fulfillments: fulfillments,
      },
    },
  });
}
