import { and, asc, desc, eq } from 'drizzle-orm';
import { FastifyRequest, FastifyReply } from 'fastify';
import z from 'zod/v4';
import { profile } from '@db/schema/commons';
import { db } from '@db/setup';
import { ProfilePaginationQuerySchema } from '@validation/common';

type ListProfileQuery = z.infer<typeof ProfilePaginationQuerySchema>;

export async function listProfiles(
  request: FastifyRequest<{ Querystring: ListProfileQuery }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const { page, limit, type, sortBy, sortOrder } =
    ProfilePaginationQuerySchema.parse(request.query);

  const sortColumn =
    sortBy === 'updatedAt' ? profile.updatedAt : profile.createdAt;
  const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const where = [eq(profile.userId, userId)];
  if (type) where.push(eq(profile.type, type));

  const profiles = await db
    .select()
    .from(profile)
    .where(and(...where))
    .offset((page - 1) * limit)
    .limit(limit)
    .orderBy(orderBy);

  return reply.send({
    statusCode: 200,
    message: 'Profiles fetched successfully',
    data: profiles,
  });
}
