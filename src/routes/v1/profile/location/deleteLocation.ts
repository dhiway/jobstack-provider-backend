import { FastifyReply, FastifyRequest } from 'fastify';
import { DeleteLocationSchema } from '@validation/common';
import z from 'zod/v4';
import { db } from '@db/setup';
import { location } from '@db/schema/commons';
import { and, eq } from 'drizzle-orm';

type DeleteLocationInput = z.infer<typeof DeleteLocationSchema>;

export async function deleteLocation(
  request: FastifyRequest<{ Body: DeleteLocationInput }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const { id } = DeleteLocationSchema.parse(request.body);

  const [existing] = await db
    .select()
    .from(location)
    .where(and(eq(location.id, id), eq(location.userId, userId)))
    .limit(1);

  if (!existing) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'LOCATION_NOT_FOUND',
      error: 'Not Found',
      message: 'Location not found',
    });
  }

  await db.delete(location).where(eq(location.id, id));

  return reply.send({
    statusCode: 200,
    message: 'Location deleted successfully',
  });
}
