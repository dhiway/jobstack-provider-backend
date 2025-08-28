import { FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod/v4';
import { and, or, ilike, desc, sql } from 'drizzle-orm';
import SearchRequestSchema from '@validation/beckn/methods/search';
import { jobPosting } from '@db/schema/job';
import { db } from '@db/setup';

type BecknSearchBodySchema = z.infer<typeof SearchRequestSchema>;

export async function getJobPostings(
  request: FastifyRequest<{ Body: BecknSearchBodySchema }>,
  reply: FastifyReply
) {
  const body = request.body;
  const { intent } = body.message;

  const page = body.pagination.page || 1;
  const limit = body.pagination.limit || 20;
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
    const locationConditions = locations.map((loc) => {
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
      return and(...conds);
    });
    whereConditions.push(or(...locationConditions));
  }

  // Search by user details in metadata
  const person = intent.fulfillment?.customer?.person;
  if (person) {
    if (person.age) {
      whereConditions.push(
        sql`${jobPosting.metadata} ->> 'age' = ${person.age}`
      );
    }
    if (person.gender) {
      whereConditions.push(
        sql`${jobPosting.metadata} ->> 'gender' ILIKE ${person.gender}`
      );
    }
    if (person.skills && person.skills.length > 0) {
      const skillConditions = person.skills.map(
        (skill) =>
          sql`${jobPosting.metadata} -> 'skills' @> ${JSON.stringify([skill.code])}::jsonb`
      );
      whereConditions.push(or(...skillConditions));
    }
  }

  // Search by tags in metadata
  const tags = intent.item?.tags ?? [];
  tags.forEach((tag) => {
    tag.list?.forEach((listItem) => {
      const code = listItem.descriptor?.code;
      const value = listItem.value;
      if (code === 'industry-type' && value) {
        whereConditions.push(
          sql`${jobPosting.metadata} ->> 'industryType' ILIKE ${`%${value}%`}`
        );
      }
      if (code === 'employment-type' && value) {
        whereConditions.push(
          sql`${jobPosting.metadata} ->> 'employmentType' ILIKE ${`%${value}%`}`
        );
      }
      if (code === 'status' && value) {
        whereConditions.push(sql`${jobPosting.status} = ${value}`);
      }
    });
  });

  if (whereConditions.length === 0) {
    /* return reply.status(400).send({ */
    /*   statusCode: 400, */
    /*   error: 'Bad Request', */
    /*   message: 'No valid search filters provided', */
    /* }); */
  }

  const jobs = await db
    .select({
      id: jobPosting.id,
      title: jobPosting.title,
      organizationId: jobPosting.organizationId,
      organizationName: jobPosting.organizationName,
      location: jobPosting.location,
      metadata: jobPosting.metadata,
      status: jobPosting.status,
      createdAt: jobPosting.createdAt,
      totalCount: sql<number>`count(*) OVER()`.as('total_count'),
    })
    .from(jobPosting)
    .where(and(...whereConditions))
    .orderBy(desc(jobPosting.createdAt))
    .limit(limit)
    .offset(offset);

  if (!jobs.length) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: 'No job postings found',
    });
  }

  // 👉 Group jobs by provider
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

  for (const job of jobs) {
    if (typeof job.metadata === 'object') {
      job.metadata = { ...job.metadata, status: job.status };
    } else {
      job.metadata = { status: job.status };
    }
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

    // Locations
    provider.locations.push(job.location);

    // Item
    provider.items.push({
      id: job.id,
      descriptor: {
        name: job.title,
      },
      price: undefined, // optional, depends on your ItemSchema
      tags: job.metadata,
    });

    // Fulfillment (basic placeholder — adapt if you have actual fulfillment data)
    provider.fulfillments.push({
      id: `fulfillment-${job.id}`,
      stops: [
        {
          type: 'end',
          location: job.location,
        },
      ],
    });
  }

  const providers = Array.from(providersMap.values());
  const totalCount = jobs.length > 0 ? Number(jobs[0].totalCount) : 0;

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
      totalCount,
    },
  };
  return reply.send(response);
}
