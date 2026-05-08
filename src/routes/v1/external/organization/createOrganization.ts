import { member, organization, user } from '@db/schema/auth';
import { db } from '@db/setup';
import {
  CreateExternalOrganizationSchema,
} from '@validation/schema/external/organization';
import { and, eq, ne } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';
import {
  findOwner,
  hasOwnerConflict,
  resolveOrganizationType,
} from './utils';

type CreateExternalOrganizationInput = z.infer<
  typeof CreateExternalOrganizationSchema
>;

export async function createExternalOrganization(
  request: FastifyRequest<{ Body: CreateExternalOrganizationInput }>,
  reply: FastifyReply
) {
  const parsed = CreateExternalOrganizationSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'BAD_REQUEST',
      error: 'Bad Request',
      message: z.flattenError(parsed.error).fieldErrors,
    });
  }

  const { name, slug, type, associationSlug, logo, metadata, owner } =
    parsed.data;

  const existingOrg = await db.query.organization.findFirst({
    where: eq(organization.slug, slug),
  });
  if (existingOrg) {
    return reply.status(409).send({
      statusCode: 409,
      code: 'ORG_SLUG_ALREADY_EXISTS',
      error: 'Conflict',
      message: 'Organization slug is already in use',
    });
  }

  const organizationType = await resolveOrganizationType(type, associationSlug);
  if (!organizationType) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'ASSOCIATION_NOT_FOUND',
      error: 'Not Found',
      message: `Association with slug "${associationSlug}" not found`,
    });
  }

  let ownerUser = await findOwner(owner);

  if (owner.userId && !ownerUser) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'OWNER_NOT_FOUND',
      error: 'Not Found',
      message: 'Owner userId does not exist',
    });
  }

  if (ownerUser && hasOwnerConflict(owner, ownerUser)) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'OWNER_CONTACT_CONFLICT',
      error: 'Bad Request',
      message: 'Owner email or phoneNumber conflicts with the existing user',
    });
  }

  if (ownerUser) {
    if (owner.email && !ownerUser.email) {
      const userWithEmail = await db.query.user.findFirst({
        where: and(eq(user.email, owner.email), ne(user.id, ownerUser.id)),
      });
      if (userWithEmail) {
        return reply.status(409).send({
          statusCode: 409,
          code: 'EMAIL_ALREADY_IN_USE',
          error: 'Conflict',
          message: 'Owner email is already in use by another user',
        });
      }
    }

    if (owner.phoneNumber && !ownerUser.phoneNumber) {
      const userWithPhone = await db.query.user.findFirst({
        where: and(
          eq(user.phoneNumber, owner.phoneNumber),
          ne(user.id, ownerUser.id)
        ),
      });
      if (userWithPhone) {
        return reply.status(409).send({
          statusCode: 409,
          code: 'PHONE_ALREADY_IN_USE',
          error: 'Conflict',
          message: 'Owner phoneNumber is already in use by another user',
        });
      }
    }
  }

  if (!ownerUser && owner.email && owner.phoneNumber) {
    const ownerByPhone = await db.query.user.findFirst({
      where: eq(user.phoneNumber, owner.phoneNumber),
    });
    if (ownerByPhone && ownerByPhone.email && ownerByPhone.email !== owner.email) {
      return reply.status(400).send({
        statusCode: 400,
        code: 'OWNER_CONTACT_CONFLICT',
        error: 'Bad Request',
        message: 'Owner email or phoneNumber conflicts with the existing user',
      });
    }
  }

  const created = await db.transaction(async (tx) => {
    if (!ownerUser) {
      const [createdUser] = await tx
        .insert(user)
        .values({
          id: crypto.randomUUID(),
          name: owner.name || 'user',
          email: owner.email || null,
          emailVerified: false,
          phoneNumber: owner.phoneNumber || null,
          phoneNumberVerified: false,
          role: 'user',
          image: '',
          banned: false,
          banReason: '',
          banExpires: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      ownerUser = createdUser;
    } else {
      const ownerUpdates: Partial<{
        email: string;
        phoneNumber: string;
        updatedAt: Date;
      }> = { updatedAt: new Date() };

      if (owner.email && !ownerUser.email) {
        ownerUpdates.email = owner.email;
      }

      if (owner.phoneNumber && !ownerUser.phoneNumber) {
        ownerUpdates.phoneNumber = owner.phoneNumber;
      }

      if (Object.keys(ownerUpdates).length > 1) {
        const [updatedOwner] = await tx
          .update(user)
          .set(ownerUpdates)
          .where(eq(user.id, ownerUser.id))
          .returning();
        ownerUser = updatedOwner;
      }
    }

    const [createdOrg] = await tx
      .insert(organization)
      .values({
        id: crypto.randomUUID(),
        name: name.trim(),
        slug,
        logo: logo || null,
        createdAt: new Date(),
        type: organizationType,
        metadata: JSON.stringify(metadata),
      })
      .returning();

    await tx.insert(member).values({
      id: crypto.randomUUID(),
      organizationId: createdOrg.id,
      userId: ownerUser.id,
      role: 'owner',
      teamId: null,
      createdAt: new Date(),
    });

    return { organization: createdOrg, owner: ownerUser };
  });

  return reply.status(201).send({
    statusCode: 201,
    message: 'Organization created successfully',
    data: {
      organization: created.organization,
      owner: {
        id: created.owner.id,
        name: created.owner.name,
        email: created.owner.email,
        phoneNumber: created.owner.phoneNumber,
      },
    },
  });
}
