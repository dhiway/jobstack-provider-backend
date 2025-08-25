import { FastifyReply, FastifyRequest } from 'fastify';
import { UpdateProfileSchema } from '@validation/common';
import { db } from '@db/setup';
import { profile } from '@db/schema/commons';
import { and, eq } from 'drizzle-orm';
import z from 'zod/v4';

type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export async function updateProfile(
  request: FastifyRequest<{ Body: UpdateProfileInput }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const { profileId, type, metadata } = UpdateProfileSchema.parse(request.body);

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

  await db
    .update(profile)
    .set({
      type: type ?? existing.type,
      metadata: metadata ?? existing.metadata,
      updatedAt: new Date(),
    })
    .where(eq(profile.id, profileId));

  return reply.send({
    statusCode: 200,
    message: 'Profile updated successfully',
  });
}
