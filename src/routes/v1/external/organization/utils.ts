import { organization, user } from '@db/schema/auth';
import { db } from '@db/setup';
import { and, eq } from 'drizzle-orm';

export async function resolveOrganizationType(
  type: 'employer' | 'association' | undefined,
  associationSlug?: string | null
) {
  if (type === 'association') {
    return 'association';
  }

  if (!associationSlug) {
    return 'employer';
  }

  const [association] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(
      and(eq(organization.slug, associationSlug), eq(organization.type, 'association'))
    )
    .limit(1);

  if (!association) {
    return null;
  }

  return `associationslug:${associationSlug}`;
}

export async function findOwner(input: {
  userId?: string;
  email?: string;
  phoneNumber?: string;
}) {
  if (input.userId) {
    return db.query.user.findFirst({ where: eq(user.id, input.userId) });
  }

  if (input.email) {
    const ownerByEmail = await db.query.user.findFirst({
      where: eq(user.email, input.email),
    });
    if (ownerByEmail) return ownerByEmail;
  }

  if (input.phoneNumber) {
    return db.query.user.findFirst({
      where: eq(user.phoneNumber, input.phoneNumber),
    });
  }

  return undefined;
}

export function hasOwnerConflict(
  owner: { email?: string; phoneNumber?: string },
  existingUser: { email: string | null; phoneNumber: string | null }
) {
  return Boolean(
    (owner.email && existingUser.email && owner.email !== existingUser.email) ||
      (owner.phoneNumber &&
        existingUser.phoneNumber &&
        owner.phoneNumber !== existingUser.phoneNumber)
  );
}
