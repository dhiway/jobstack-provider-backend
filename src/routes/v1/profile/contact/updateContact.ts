import z from 'zod/v4';
import { UpdateContactSchema } from '@validation/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { contact } from '@db/schema/commons';
import { db } from '@db/setup';
import { and, eq } from 'drizzle-orm';

type UpdateContactInput = z.infer<typeof UpdateContactSchema>;

export async function updateContact(
  request: FastifyRequest<{ Body: UpdateContactInput }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const { id, ...data } = UpdateContactSchema.parse(request.body);

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

  await db
    .update(contact)
    .set({
      website: data.website || existing.website,
      tag: data.tag || existing.tag,
      email: data.email || existing.email,
      phoneNumber: data.phoneNumber || existing.phoneNumber,
      updatedAt: new Date(),
    })
    .where(eq(contact.id, id));

  return reply.send({
    statusCode: 200,
    message: 'Contact updated successfully',
  });
}
