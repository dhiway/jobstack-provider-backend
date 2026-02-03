import { db } from '@db/setup';
import { organization, member } from '@db/schema/auth';
import { eq, sql } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';
import { jobPosting } from '@db/schema';
import { sendWhatsAppMessage } from '@lib/whatsapp-messager';

export const CreateJobPostingRequestSchema = z.object({
  title: z.string(),
  userId: z.string(),
  orgId: z.string().length(32).or(z.uuid()).optional(),
  metadata: z.record(z.string(), z.any()).default({}),
  location: z.record(z.string(), z.any()).default({}),
  type: z.string().optional(),
  phoneNumber: z.string(),
});

type CreateJobPostingRequestInput = z.infer<
  typeof CreateJobPostingRequestSchema
>;

const createJobPosting = async (
  request: FastifyRequest<{ Body: CreateJobPostingRequestInput }>,
  reply: FastifyReply
) => {
  const parsed = CreateJobPostingRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'BAD_REQUEST',
      error: 'Invalid Query Params',
      message: z.flattenError(parsed.error).fieldErrors,
    });
  }

  const { userId, title, metadata, orgId, location, phoneNumber, type } =
    request.body;
  let org = null;

  // 1. Try by orgId if provided
  if (orgId) {
    org = await db.query.organization.findFirst({
      where: eq(organization.id, orgId),
    });
  }

  // 2. If no orgId or not found, try by contactPhone
  if (!org) {
    org = await db.query.organization.findFirst({
      where: sql`(${organization.metadata}::jsonb ->> 'contactPhone') = ${phoneNumber}`,
    });
  }

  // 3. If still not found, create new org
  if (!org) {
    const orgNameFromMetadata =
      metadata?.org_name ??
      metadata?.basicInfo?.jobProviderName;
    const name =
      typeof orgNameFromMetadata === 'string'
        ? orgNameFromMetadata
        : `Org XYZ (${phoneNumber})`;
    const orgs = await db
      .insert(organization)
      .values({
        id: crypto.randomUUID(),
        name: name.trim(),
        slug: crypto.randomUUID().slice(0, 8),
        createdAt: new Date(),
        type: type,
        metadata: JSON.stringify({
          address: 'Online',
          gstNumber: '',
          contactPersonName: phoneNumber,
          contactEmail: '',
          contactPhone: phoneNumber,
          website: '',
          description: 'Created automatically by AI agent by call - Edit later',
        }),
      })
      .returning();

    org = orgs[0];

    await db.insert(member).values({
      id: crypto.randomUUID(),
      role: 'owner',
      userId: userId,
      createdAt: new Date(),
      organizationId: org.id,
    });
  }

  // 4. Create job posting if org found/created
  if (typeof org?.id === 'string') {
    const newJobPosting = await db
      .insert(jobPosting)
      .values({
        organizationId: org.id,
        title,
        metadata,
        createdBy: userId,
        organizationName: org.name,
        location,
        description: '',
        status: 'draft',
        contact: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (process.env.SEND_WHATSAPP_NOTIFICATION === 'true') {
      try {
        await sendWhatsAppMessage(
          phoneNumber,
          process.env.TWILIO_CONTENT_SID_DIALFLOW_PROVIDER!
        );
      } catch (err) {
        console.error('Whatsapp message failed', err);
      }
    }

    return reply.status(200).send({
      statusCode: 200,
      message: 'Job Posting Created',
      data: {
        jobPosting: newJobPosting,
      },
    });
  }

  reply.status(404).send({
    statusCode: 404,
    code: 'ORG_NOT_FOUND',
    error: 'Not Found',
    message: 'organization not found',
  });
};

export default createJobPosting;
