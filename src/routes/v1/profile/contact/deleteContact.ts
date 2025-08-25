import z from 'zod/v4';
import { DeleteContactSchema } from '@validation/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { contact } from '@db/schema/commons';
import { db } from '@db/setup';
import { and, eq } from 'drizzle-orm';

type DeleteContactInput = z.infer<typeof DeleteContactSchema>;

export async function deleteContact(
  request: FastifyRequest<{ Body: DeleteContactInput }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const { id } = DeleteContactSchema.parse(request.body);

  const [existing] = await db
    .select()
    .from(contact)
    .where(and(eq(contact.id, id), eq(contact.userId, userId)))
    .limit(1);

  if (!existing) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'CONTACT_NOT_FOUND',
      error: 'Not Found',
      message: 'Contact not found',
    });
  }

  await db.delete(contact).where(eq(contact.id, id));

  return reply.send({
    statusCode: 200,
    message: 'Contact deleted successfully',
  });
}
