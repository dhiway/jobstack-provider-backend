import { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as z from 'zod/v4';
import SelectRequestSchema from '@validation/beckn/methods/select';
import { db } from '@db/setup';
import { jobPosting } from '@db/schema/job';

type SelectRequestBody = z.infer<typeof SelectRequestSchema>;

export async function selectJobPosting(
  request: FastifyRequest<{ Body: SelectRequestBody }>,
  reply: FastifyReply
) {
  const body = SelectRequestSchema.parse(request.body);

  const providerId = body.message.order.provider.id;
  const itemId = body.message.order.items[0]?.id;

  if (!providerId || !itemId) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'INVALID_SELECT_REQUEST',
      error: 'Bad Request',
      message: 'Missing provider ID or item ID',
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
      message: 'Requested job posting not found or no longer available',
    });
  }
  // Construct OnSelect-compliant response
  const response = {
    message: {
      order: {
        provider: {
          id: posting.organizationId,
          descriptor: {
            name: posting.organizationName,
          },
          fulfillments: [
            {
              id: `fulfillment-${posting.id}`,
              stops: [
                {
                  type: 'end',
                  location: posting.location,
                },
              ],
            },
          ],
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
                end: posting.updatedAt.toISOString(),
              },
            },
            tags: posting.metadata,
          },
        ],
        fulfillments: [
          {
            id: `fulfillment-${posting.id}`,
            stops: [
              {
                type: 'end',
                location: posting.location,
              },
            ],
          },
        ],
      },
    },
  };

  return reply.send(response);
}
