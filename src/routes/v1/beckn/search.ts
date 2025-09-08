import { FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod/v4';
import { and, or, ilike, desc, sql } from 'drizzle-orm';
import SearchRequestSchema from '@validation/beckn/methods/search';
import { jobPosting } from '@db/schema/job';
import { db } from '@db/setup';

type BecknSearchBodySchema = z.infer<typeof SearchRequestSchema>;

type JobBase = {
  id: string;
  title: string;
  organizationId: string;
  organizationName: string;
  location: unknown;
  status: 'draft' | 'open' | 'closed' | 'archived';
  createdAt: Date;
};

type JobDetailed = JobBase & { metadata: any };

let jobs;

export async function getJobPostings(
  request: FastifyRequest<{ Body: BecknSearchBodySchema }>,
  reply: FastifyReply
) {
  const body = SearchRequestSchema.parse(request.body);
  const { intent } = body.message;
  const brief = body.options?.brief;

  const page = body.pagination.page || 1;
  const limit = brief
    ? body.pagination.limit
    : Math.min(body.pagination.limit, 30);
  const offset = (page - 1) * limit;

  const whereConditions = [];

  // Search by job title
  const jobTitle = intent.item?.descriptor?.name;
  if (jobTitle) {
    whereConditions.push(ilike(jobPosting.title, `%${jobTitle}%`));
  }

  // Search by provider name
  const providerName = intent.provider?.descriptor?.name;
  if (providerName) {
    whereConditions.push(
      ilike(jobPosting.organizationName, `%${providerName}%`)
    );
  }

  // Search by location
  const locations = intent.provider?.locations;
  if (locations && locations.length > 0) {
    const locationConditions = [];
    for (const loc of locations) {
      const conds = [];
      if (loc.city?.name) {
        conds.push(
          sql`${jobPosting.location} ->> 'city' ILIKE ${`%${loc.city.name}%`}`
        );
      }
      if (loc.state?.name) {
        conds.push(
          sql`${jobPosting.location} ->> 'state' ILIKE ${`%${loc.state.name}%`}`
        );
      }
      if (loc.country?.name) {
        conds.push(
          sql`${jobPosting.location} ->> 'country' ILIKE ${`%${loc.country.name}%`}`
        );
      }
      if (conds.length > 0) {
        locationConditions.push(and(...conds));
      }
    }
    if (locationConditions.length > 0) {
      whereConditions.push(or(...locationConditions));
    }
  }

  // Search by tags in metadata
  const tags = intent.item?.tags ?? [];
  tags.forEach((tag) => {
    tag.list?.forEach((listItem) => {
      const code = listItem.descriptor?.code;
      const value = listItem.value;
      if (code === 'status' && value) {
        whereConditions.push(sql`${jobPosting.status} = ${value}`);
      }
    });
  });

  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(jobPosting)
    .where(and(...whereConditions));

  if (count === 0) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: 'No job postings found',
    });
  }

  if (brief) {
    jobs = await db
      .select({
        id: jobPosting.id,
        title: jobPosting.title,
        organizationId: jobPosting.organizationId,
        organizationName: jobPosting.organizationName,
        location: jobPosting.location,
        status: jobPosting.status,
        createdAt: jobPosting.createdAt,
      })
      .from(jobPosting)
      .where(and(...whereConditions))
      .orderBy(desc(jobPosting.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    jobs = await db
      .select({
        id: jobPosting.id,
        title: jobPosting.title,
        organizationId: jobPosting.organizationId,
        organizationName: jobPosting.organizationName,
        metadata: jobPosting.metadata,
        location: jobPosting.location,
        status: jobPosting.status,
        createdAt: jobPosting.createdAt,
      })
      .from(jobPosting)
      .where(and(...whereConditions))
      .orderBy(desc(jobPosting.createdAt))
      .limit(limit)
      .offset(offset);
  }
  // Group jobs by provider
  const providersMap = new Map<
    string,
    {
      id: string;
      descriptor: { name: string; short_desc?: string; images?: any[] };
      fulfillments: any[];
      locations: any[];
      items: any[];
    }
  >();

  for (const job of jobs as JobDetailed[]) {
    const metadata =
      typeof job.metadata === 'object'
        ? { ...job.metadata, status: job.status }
        : { status: job.status };
    if (!providersMap.has(job.organizationId)) {
      providersMap.set(job.organizationId, {
        id: job.organizationId,
        descriptor: {
          name: job.organizationName,
        },
        fulfillments: [],
        locations: [],
        items: [],
      });
    }

    const provider = providersMap.get(job.organizationId)!;

    // Item
    provider.items.push({
      id: job.id,
      descriptor: {
        name: job.title,
      },
      locations: job.location,
      tags: metadata,
    });
  }

  const providers = Array.from(providersMap.values());

  const response = {
    message: {
      catalog: {
        descriptor: {
          name: 'Job Catalog',
        },
        providers,
      },
    },
    pagination: {
      page,
      limit,
      totalCount: count,
    },
  };
  function clearVariables() {
    providers.length = 0;
    jobs = null;
  }
  return reply.send(response).then(clearVariables, clearVariables);
}
