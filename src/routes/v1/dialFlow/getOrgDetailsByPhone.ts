import { eq, sql } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';
import { db } from '@db/setup';
import { organization, member, user } from '@db/schema/auth';

const GetOrgDetailsByPhoneSchema = z.object({
  phoneNumber: z.string(),
});

type GetOrgDetailsByPhoneInput = z.infer<typeof GetOrgDetailsByPhoneSchema>;

export async function getOrgDetailsByPhone(
  request: FastifyRequest<{
    Querystring: GetOrgDetailsByPhoneInput;
  }>,
  reply: FastifyReply
) {
  const parsed = GetOrgDetailsByPhoneSchema.safeParse(request.query);

  if (!parsed.success) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'BAD_REQUEST',
      error: 'Invalid Query Params',
      message: parsed.error.flatten().fieldErrors,
    });
  }

  const { phoneNumber } = parsed.data;

  const orgDetails = await db
    .select()
    .from(organization)
    .where(sql`${organization.metadata}::jsonb ->> 'contactPhone' = ${phoneNumber}`)
    .limit(1);

  if (!orgDetails.length) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'ORG_NOT_FOUND',
      error: 'Not Found',
      message: `Organization with phoneNumber '${phoneNumber}' does not exist`,
    });
  }

  const org = orgDetails[0];

  const membersData = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      image: user.image,
      createdAt: user.createdAt,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, org.id));

  return reply.send({
    statusCode: 200,
    message: 'Org Details Fetched',
    data: {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        metadata:
          typeof org.metadata === 'string'
            ? JSON.parse(org.metadata)
            : (org.metadata ?? {}),
      },
      users: membersData.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        phoneNumber: m.phoneNumber,
        image: m.image,
        createdAt: m.createdAt,
      })),
    },
  });
}