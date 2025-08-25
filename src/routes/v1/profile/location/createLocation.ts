import { and, eq } from 'drizzle-orm';
import { location } from '@db/schema/commons';
import { db } from '@db/setup';
import { LocationInputSchema } from '@validation/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod/v4';

type AddLocationInput = z.infer<typeof LocationInputSchema>;

export async function addLocation(
  request: FastifyRequest<{ Body: AddLocationInput }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const body = LocationInputSchema.parse(request.body);

  const [existing] = await db
    .select()
    .from(location)
    .where(and(eq(location.tag, body.tag), eq(location.userId, userId)))
    .limit(1);

  if (existing) {
    return reply.status(409).send({
      statusCode: 409,
      code: 'LOCATION_TAG_EXISTS',
      error: 'Conflict',
      message: `Location tag "${body.tag}" already exists`,
    });
  }

  const [newLocation] = await db
    .insert(location)
    .values({ ...body, userId })
    .returning();

  return reply.status(201).send({
    statusCode: 201,
    message: 'Location added successfully',
    data: { id: newLocation.id },
  });
}
