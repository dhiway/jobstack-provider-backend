import { FastifyReply, FastifyRequest } from 'fastify';
import { UpdateLocationSchema } from '@validation/common';
import z from 'zod/v4';
import { db } from '@db/setup';
import { location } from '@db/schema/commons';
import { and, eq } from 'drizzle-orm';

type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>;

export async function updateLocation(
  request: FastifyRequest<{ Body: UpdateLocationInput }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const { id, ...data } = UpdateLocationSchema.parse(request.body);

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

  await db
    .update(location)
    .set({
      tag: data.tag || existing.tag,
      gps: data.gps || existing.gps,
      city: data.city || existing.city,
      state: data.city || existing.city,
      country: data.country || existing.country,
      pincode: data.pincode || existing.pincode,
      address: data.address || existing.address,
      updatedAt: new Date(),
    })
    .where(eq(location.id, id));

  return reply.send({
    statusCode: 200,
    message: 'Location updated successfully',
  });
}
