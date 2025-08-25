import z from 'zod/v4';
import { ContactInputSchema } from '@validation/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { db } from '@db/setup';
import { contact } from '@db/schema/commons';
import { and, eq } from 'drizzle-orm';

type AddContactInput = z.infer<typeof ContactInputSchema>;
export async function addContact(
  request: FastifyRequest<{ Body: AddContactInput }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const body = ContactInputSchema.parse(request.body);

  const [existing] = await db
    .select()
    .from(contact)
    .where(and(eq(contact.tag, body.tag), eq(contact.userId, userId)))
    .limit(1);

  if (existing) {
    return reply.status(409).send({
      statusCode: 409,
      code: 'CONTACT_TAG_EXISTS',
      error: 'Conflict',
      message: `Contact tag "${body.tag}" already exists`,
    });
  }

  const [newContact] = await db
    .insert(contact)
    .values({ ...body, userId: userId })
    .returning();

  return reply.status(201).send({
    statusCode: 201,
    message: 'Contact added successfully',
    data: { id: newContact.id },
  });
}
