import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';
import { eq, and } from 'drizzle-orm';
import {
  contact,
  location,
  profile,
  profileContact,
  profileLocation,
} from '@db/schema/commons';
import { db } from '@db/setup';
import { CreateUserProfileSchema } from '@validation/common';

type CreateUserProfileInput = z.infer<typeof CreateUserProfileSchema>;

export async function createUserProfile(
  request: FastifyRequest<{ Body: CreateUserProfileInput }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const body = CreateUserProfileSchema.parse(request.body);

  if (
    (!body.contact && !body.contactId && !body.contactTag) ||
    (!body.location && !body.locationId && !body.locationTag)
  ) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'PROFILE_CREATION_FAILED',
      error: 'Bad Request',
      message: 'No location / contact details provided',
    });
  }

  // Create profile
  const [newProfile] = await db
    .insert(profile)
    .values({
      userId,
      type: body.type,
      metadata: body.metadata,
    })
    .returning();

  if (!newProfile) {
    return reply.status(500).send({
      statusCode: 500,
      code: 'PROFILE_CREATION_FAILED',
      error: 'Internal Server Error',
      message: 'Could not create profile',
    });
  }

  // Handle location
  let locationId: string | null = null;

  if (body.locationId) {
    locationId = body.locationId;
  } else if (body.locationTag) {
    const [existing] = await db
      .select()
      .from(location)
      .where(
        and(eq(location.tag, body.locationTag), eq(location.userId, userId))
      )
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'LOCATION_NOT_FOUND',
        error: 'Not Found',
        message: `Location with tag "${body.locationTag}" not found`,
      });
    }
    locationId = existing.id;
  } else if (body.location) {
    // Check duplicate tag
    if (body.location.tag) {
      const [existingTag] = await db
        .select()
        .from(location)
        .where(
          and(eq(location.tag, body.location.tag), eq(location.userId, userId))
        )
        .limit(1);

      if (existingTag) {
        return reply.status(409).send({
          statusCode: 409,
          code: 'LOCATION_TAG_EXISTS',
          error: 'Conflict',
          message: `Location tag "${body.location.tag}" already exists`,
        });
      }
    }

    const [newLoc] = await db
      .insert(location)
      .values({
        userId,
        tag: body.location.tag!,
        address: body.location.address,
        city: body.location.city,
        state: body.location.state,
        country: body.location.country,
        pincode: body.location.pincode,
        gps: body.location.gps,
      })
      .returning();

    locationId = newLoc.id;
  }

  // Link profile to location
  if (locationId) {
    await db.insert(profileLocation).values({
      profileId: newProfile.id,
      locationId,
    });
  }

  // Handle contact
  let contactId: string | null = null;

  if (body.contactId) {
    contactId = body.contactId;
  } else if (body.contactTag) {
    const [existing] = await db
      .select()
      .from(contact)
      .where(and(eq(contact.tag, body.contactTag), eq(contact.userId, userId)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'CONTACT_NOT_FOUND',
        error: 'Not Found',
        message: `Contact with tag "${body.contactTag}" not found`,
      });
    }
    contactId = existing.id;
  } else if (body.contact) {
    if (body.contact.tag) {
      const [existingTag] = await db
        .select()
        .from(contact)
        .where(
          and(eq(contact.tag, body.contact.tag), eq(contact.userId, userId))
        )
        .limit(1);

      if (existingTag) {
        return reply.status(409).send({
          statusCode: 409,
          code: 'CONTACT_TAG_EXISTS',
          error: 'Conflict',
          message: `Contact tag "${body.contact.tag}" already exists`,
        });
      }
    }

    const [newContact] = await db
      .insert(contact)
      .values({
        userId,
        tag: body.contact.tag!,
        email: body.contact.email,
        phoneNumber: body.contact.phoneNumber,
        website: body.contact.website,
      })
      .returning();

    contactId = newContact.id;
  }

  // Link profile to contact
  if (contactId) {
    await db.insert(profileContact).values({
      profileId: newProfile.id,
      contactId,
    });
  }

  // Done!
  return reply.status(201).send({
    statusCode: 201,
    message: 'Profile created successfully',
    data: {
      profileId: newProfile.id,
      locationId,
      contactId,
    },
  });
}
