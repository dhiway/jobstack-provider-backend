import { organization } from '@db/schema';
import { db } from '@db/setup';
import { asc, desc, sql } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';

export const ListAssociationsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.union([z.literal('name'), z.literal('createdAt')]).optional(),
  sortOrder: z.union([z.literal('asc'), z.literal('desc')]).optional(),
});
type ListAssociationsQueryInput = z.infer<typeof ListAssociationsQuerySchema>;

export async function listAssociations(
  request: FastifyRequest<{ Querystring: ListAssociationsQueryInput }>,
  reply: FastifyReply
) {
  try {
    const {
      page: pageStr,
      limit: limitStr,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = request.query;

    const page = parseInt(pageStr || '') || 1;
    const limit = parseInt(limitStr || '') || 20;
    const offset = (page - 1) * limit;

    const sortColumn =
      sortBy === 'name' ? organization.name : organization.createdAt;
    const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

    // Base where: organization.type = 'association'
    const baseWhere = sql`${organization.type} = 'association'`;

    // Optional search condition on name or slug
    const searchCondition =
      search && search.trim().length > 0
        ? sql`( ${organization.name} ILIKE ${'%' + search + '%'} OR ${organization.slug} ILIKE ${'%' + search + '%'} )`
        : null;

    // Build where clause: combine baseWhere and optional searchCondition
    const whereClause = searchCondition
      ? sql`( ${baseWhere} AND ${searchCondition} )`
      : baseWhere;

    // Fetch associations (paged)
    const associations = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        createdAt: organization.createdAt,
        metadata: organization.metadata,
      })
      .from(organization)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Total count
    const [{ totalCount }] = await db
      .select({
        totalCount: sql<number>`cast(count(*) as int)`,
      })
      .from(organization)
      .where(whereClause);

    return reply.send({
      statusCode: 200,
      message: 'Associations fetched successfully',
      data: {
        associations,
        pagination: {
          page,
          limit,
          totalCount,
        },
      },
    });
  } catch (err) {
    request.log.error(err, 'listAssociations failed');
    return reply.status(500).send({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      error: 'Internal Server Error',
      message: 'Failed to fetch associations',
    });
  }
}
