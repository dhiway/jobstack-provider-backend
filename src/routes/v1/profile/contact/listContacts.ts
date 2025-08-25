import z from 'zod/v4';
import { ProfilePaginationQuerySchema } from '@validation/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { contact } from '@db/schema/commons';
import { and, asc, desc, eq, ilike } from 'drizzle-orm';
import { db } from '@db/setup';

type ListContactQuery = z.infer<typeof ProfilePaginationQuerySchema>;

export async function listContacts(
  request: FastifyRequest<{ Querystring: ListContactQuery }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const { page, limit, tag, sortBy, sortOrder } =
    ProfilePaginationQuerySchema.parse(request.query);

  const sortColumn =
    sortBy === 'updatedAt' ? contact.updatedAt : contact.createdAt;
  const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const where = [eq(contact.userId, userId)];
  if (tag) where.push(ilike(contact.tag, `%${tag}%`));

  const contacts = await db
    .select()
    .from(contact)
    .where(and(...where))
    .offset((page - 1) * limit)
    .limit(limit)
    .orderBy(orderBy);

  return reply.send({
    statusCode: 200,
    message: 'Contacts fetched successfully',
    data: contacts,
  });
}
