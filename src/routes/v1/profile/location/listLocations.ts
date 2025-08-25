import z from 'zod/v4';
import { ProfilePaginationQuerySchema } from '@validation/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { and, asc, desc, eq, ilike } from 'drizzle-orm';
import { location } from '@db/schema/commons';
import { db } from '@db/setup';

type ListLocationQuery = z.infer<typeof ProfilePaginationQuerySchema>;

export async function listLocations(
  request: FastifyRequest<{ Querystring: ListLocationQuery }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const { page, limit, tag, sortOrder, sortBy } =
    ProfilePaginationQuerySchema.parse(request.query);

  const sortColumn =
    sortBy === 'updatedAt' ? location.updatedAt : location.createdAt;
  const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const where = [eq(location.userId, userId)];
  if (tag) where.push(ilike(location.tag, `%${tag}%`));

  const locations = await db
    .select()
    .from(location)
    .where(and(...where))
    .offset((page - 1) * limit)
    .limit(limit)
    .orderBy(orderBy);

  return reply.send({
    statusCode: 200,
    message: 'Locations fetched successfully',
    data: locations,
  });
}
