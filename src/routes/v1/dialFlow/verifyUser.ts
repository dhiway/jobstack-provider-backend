import { member, user } from '@db/schema/auth';
import { db } from '@db/setup';
import { eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';

export const VerifyUserExistsRequestSchema = z.object({
  name: z.string().optional().default('user'),
  phoneNumber: z.string(),
  role: z.enum(['seeker', 'member', 'viewer', 'admin']).default('seeker'),
  orgId: z.string().length(32).or(z.uuid()).optional(),
});

type VerifyUserExistsRequestInput = z.infer<
  typeof VerifyUserExistsRequestSchema
>;
const verifyUser = async (
  request: FastifyRequest<{ Body: VerifyUserExistsRequestInput }>,
  reply: FastifyReply
) => {
  const { phoneNumber, name, role, orgId } = request.body;

  let userDetails = await db.query.user.findFirst({
    where: eq(user.phoneNumber, phoneNumber),
  });

  if (!userDetails) {
    const createdUser = await db
      .insert(user)
      .values({
        id: crypto.randomUUID(),
        phoneNumber,
        name: name || 'user',
        role: 'seeker',
        phoneNumberVerified: true,
      })
      .returning();

    userDetails = createdUser[0];

    // ✅ only add to member if orgId is present
    if (orgId && z.string().uuid().safeParse(orgId).success) {
      await db.insert(member).values({
        id: crypto.randomUUID(),
        role,
        userId: userDetails.id,
        createdAt: new Date(),
        organizationId: orgId,
      });
    }
  }

  reply.status(200).send({
    statusCode: 200,
    message: 'User Details Fetched',
    data: {
      user: userDetails,
    },
  });
};

export default verifyUser;
