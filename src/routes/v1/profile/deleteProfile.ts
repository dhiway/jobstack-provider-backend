import { db } from '@db/setup';
import { and, eq } from 'drizzle-orm';
import { profile } from '@db/schema/commons';
import { DeleteProfileSchema } from '@validation/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod/v4';

type DeleteProfileInput = z.infer<typeof DeleteProfileSchema>;

export async function deleteProfile(
  request: FastifyRequest<{ Body: DeleteProfileInput }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const { profileId } = DeleteProfileSchema.parse(request.body);

  const [existing] = await db
    .select()
    .from(profile)
    .where(and(eq(profile.id, profileId), eq(profile.userId, userId)))
    .limit(1);

  if (!existing) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'PROFILE_NOT_FOUND',
      error: 'Not Found',
      message: 'Profile not found',
    });
  }

  await db.delete(profile).where(eq(profile.id, profileId));

  return reply.send({
    statusCode: 200,
    message: 'Profile deleted successfully',
  });
}
