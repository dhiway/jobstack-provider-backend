import { FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod/v4';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@db/setup';
import { organization } from '@db/schema/auth';

export const fetchAssociationOverviewQuerySchema = z.object({
  applicationStatus: z.string().optional(),
});

export const AssociationParamsSchema = z.object({
  slug: z.string().min(1),
});

type AssociationParamsInput = z.infer<typeof AssociationParamsSchema>;
type AssociationQueryInput = z.infer<
  typeof fetchAssociationOverviewQuerySchema
>;

export async function fetchAssociationOverview(
  request: FastifyRequest<{
    Params: AssociationParamsInput;
    Querystring: AssociationQueryInput;
  }>,
  reply: FastifyReply
) {
  try {
    const { slug } = request.params;
    const applicationStatus = request.query.applicationStatus || '      ';
    // Verify association exists and is type = 'association'
    const assocRecord = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      })
      .from(organization)
      .where(
        and(
          eq(organization.slug, slug),
          sql`${organization.type} = 'association'`
        )
      );

    if (assocRecord.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'ASSOCIATION_NOT_FOUND',
        error: 'Not Found',
        message: `Association with slug "${slug}" not found`,
      });
    }

    // Regex pattern to match semicolon-separated tag like:
    // (^|;)associationslug:msme-karnataka($|;)
    const pattern = `(^|;)associationslug:${slug}($|;)`;

    // Count member MSMEs
    const [{ totalMSMEs }] = await db
      .select({
        totalMSMEs: sql<number>`cast(count(*) as int)`,
      })
      .from(organization)
      .where(sql`${organization.type} ~ ${pattern}`);

    // If no members, return zeros
    const memberCount = Number(totalMSMEs) || 0;
    if (memberCount === 0) {
      return reply.send({
        statusCode: 200,
        message: 'Association overview fetched successfully',
        data: {
          name: assocRecord[0].name,
          totalJobs: 0,
          totalOpenings: 0,
          totalMSMEs: 0,
          totalApplications: 0,
        },
      });
    }

    // 3. Total Jobs (all job_posting for orgs whose type contains the tag)
    // Used sub-selects via SQL templating to avoid pulling all org ids into app memory
    const [{ totalJobs }] = await db
      .select({
        totalJobs: sql<number>`
          cast(
            (
              select count(*)
              from job_posting jp
              where jp.organization_id in (
                select id from organization where ${organization.type} ~ ${pattern}
              )
            ) as int
          )
        `,
      })
      .from(organization) // dummy table used to satify drizzle select query. subquery is used for search
      .limit(1);

    // Total Job Openings (status = 'open')
    const [{ totalOpenings }] = await db
      .select({
        totalOpenings: sql<number>`
          cast(
            (
              select count(*)
              from job_posting jp
              where jp.status = 'open'
                and jp.organization_id in (
                  select id from organization where ${organization.type} ~ ${pattern}
                )
            ) as int
          )
        `,
      })
      .from(organization)
      .limit(1);

    // Total Applications received (across jobs of member orgs)
    const [{ totalApplications }] = await db
      .select({
        totalApplications: sql<number>`
          cast(
            (
              select count(*)
              from job_application ja
              where ja.job_id in (
                select id from job_posting jp where jp.organization_id in (
                  select id from organization where ${organization.type} ~ ${pattern}
                )
              )
            ) as int
          )
        `,
      })
      .from(organization)
      .limit(1);

    const [{ totalApplicationsByStatus }] = await db
      .select({
        totalApplicationsByStatus: sql<number>`
        cast(
          (
            select count(*)
            from job_application ja
            where ja.application_status = ${applicationStatus}
            and ja.job_id in (
              select jp.id
              from job_posting jp
              where jp.organization_id in (
                select o.id
                from organization o
                where o.type ~ ${pattern}
              )
            )
          ) as int
        )
      `,
      })
      .from(organization)
      .limit(1);

    return reply.send({
      statusCode: 200,
      message: 'Association overview fetched successfully',
      data: {
        name: assocRecord[0].name,
        totalJobs: Number(totalJobs ?? 0),
        totalOpenings: Number(totalOpenings ?? 0),
        totalMSMEs: Number(totalMSMEs ?? 0),
        totalApplications: Number(totalApplications ?? 0),
        totalApplicationsByStatus: Number(totalApplicationsByStatus ?? 0),
      },
    });
  } catch (err) {
    request.log.error(err, 'getAssociationOverview failed');
    return reply.status(500).send({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      error: 'Internal Server Error',
      message: 'Failed to fetch association overview',
    });
  }
}
