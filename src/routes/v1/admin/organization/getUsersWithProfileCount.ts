import { member, organization } from '@db/schema/auth';
import { profile } from '@db/schema/commons';
import { db } from '@db/setup';
import { GetUsersByOrgRoleRequestSchema } from '@validation/schema/admin/common';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';

export async function getUsersWithProfile(
  request: FastifyRequest<{
    Querystring: z.infer<typeof GetUsersByOrgRoleRequestSchema>;
  }>,
  reply: FastifyReply
) {
  const {
    organizationId,
    organizationSlug,
    role,
    type,
    page,
    limit,
    includeAdmin,
  } = request.query;

  const pageInt = parseInt(page);
  const limitInt = parseInt(limit);

  if (Number.isNaN(pageInt) || Number.isNaN(limitInt)) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'INVALID_PAGINATION',
      error: 'Bad Request',
      message: 'Page and limit must be valid numbers',
    });
  }

  let orgId = organizationId;
  if (!orgId && organizationSlug) {
    const org = await db
      .select()
      .from(organization)
      .where(
        or(
          eq(organization.slug, organizationSlug),
          eq(organization.slug, organizationSlug)
        )
      );
    if (!org[0]) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'ORG_NOT_FOUND',
        error: 'Not Found',
        message: 'Organization not found',
      });
    }
    orgId = org[0].id;
  }

  const whereClauses = [eq(member.role, role)];
  if (orgId) {
    whereClauses.push(eq(member.organizationId, orgId));
  }
  if (includeAdmin) {
    const adminOrgs = await db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(
        and(
          eq(member.userId, request.user.id),
          inArray(member.role, ['owner', 'admin'])
        )
      );
    if (adminOrgs.length) {
      whereClauses.push(
        inArray(
          member.organizationId,
          adminOrgs.map((o) => o.organizationId)
        )
      );
    }
  }

  const usersQuery = db
    .selectDistinct({
      userId: member.userId,
    })
    .from(member)
    .innerJoin(profile, eq(member.userId, profile.userId))
    .where(and(...whereClauses));

  const usersList =
    type !== 'count'
      ? await usersQuery.offset((pageInt - 1) * limitInt).limit(limitInt)
      : [];

  const totalCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(usersQuery.as('sq'))
    .execute()
    .then((r) => Number(r[0]?.count ?? 0));

  /* Add new thing here - Get profile counts for each user */
  let userProfiles: Record<string, string[]> = {};
  let totalUsers = 0;
  let totalProfiles = 0;

  if (usersList.length > 0) {
    // Get all profiles for the users in our result set
    const userIds = usersList.map((s) => s.userId);
    
    const profilesForUsers = await db
      .select({
        userId: profile.userId,
        profileId: profile.id,
      })
      .from(profile)
      .where(inArray(profile.userId, userIds));

    // Build userProfiles mapping
    for (const user of usersList) {
      userProfiles[user.userId] = [];
    }

    for (const profileData of profilesForUsers) {
      if (userProfiles[profileData.userId]) {
        userProfiles[profileData.userId].push(profileData.profileId);
      }
    }

    totalUsers = usersList.length;
    totalProfiles = profilesForUsers.length;
  }

  return reply.send({
    statusCode: 200,
    message: 'Users with profile retrieved successfully',
    data: {
      orgId,
      totalCount,
      users: type !== 'count' ? usersList.map((s) => s.userId) : undefined,
      totalUsers,
      totalProfiles,
      userProfiles,
    },
  });
}
