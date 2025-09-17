import { Client } from '@opensearch-project/opensearch';

const client = new Client({
  node: process.env.OPENSEARCH_URL || 'http://opensearch:9200',
  auth: {
    username: 'admin',
    password: process.env.OPENSEARCH_ADMIN_PASSWORD!, // test - change to env variable
  },
});

async function ensureIndices() {
  const indices = ['job_posting', 'job_application'];

  for (const index of indices) {
    const exists = await client.indices.exists({ index });
    if (!exists) {
      await client.indices.create({
        index,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              title: { type: 'text' },
              description: { type: 'text' },
              status: { type: 'keyword' },
              location: { type: 'object', enabled: true },
              contact: { type: 'object', enabled: true },
              metadata: { type: 'object', enabled: true },
              organizationName: { type: 'text' },
              organizationId: { type: 'keyword' },
              createdBy: { type: 'keyword' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        },
      });
    }
  }
}

export async function initOpenSearch() {
  await ensureIndices();
}

export async function indexJobPosting(doc: any) {
  await client.index({
    index: 'job_posting',
    id: doc.id,
    body: doc,
    refresh: true,
  });
}

export async function indexJobApplication(doc: any) {
  await client.index({
    index: 'job_application',
    id: doc.id,
    body: doc,
    refresh: true,
  });
}

export async function searchJobPostings(query: string) {
  const result = await client.search({
    index: 'job_posting',
    body: {
      query: {
        multi_match: {
          query,
          fields: [
            'title^3',
            'status',
            'organizationName',
            'description',
            'metadata.*',
          ],
        },
      },
    },
  });

  return result.body.hits.hits.map((hit: any) => hit._source);
}

export async function searchJobApplications(query: string) {
  const result = await client.search({
    index: 'job_application',
    body: {
      query: {
        multi_match: {
          query,
          fields: ['userName^2', 'status', 'applicationStatus', 'metadata.*'],
        },
      },
    },
  });

  return result.body.hits.hits.map((hit: any) => hit._source);
}

export { client };
