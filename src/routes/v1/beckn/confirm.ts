import { jobApplication, jobPosting } from '@db/schema/job';
import { db } from '@src/db/setup';
import { member, organization, user } from '@db/schema/auth';
import ConfirmRequestSchema from '@validation/beckn/methods/confirm';
import { and, eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod/v4';
import { notificationClient } from '@lib/notification/notification_client';

type ConfirmRequestBody = z.infer<typeof ConfirmRequestSchema>;

export async function confirmJobApplication(
  request: FastifyRequest<{ Body: ConfirmRequestBody }>,
  reply: FastifyReply
) {
  const body = ConfirmRequestSchema.parse(request.body);

  const providerId = body.message.order.provider.id;
  const jobId = body.message.order.items[0]?.id;
  const fulfillments = body.message.order.fulfillments;
  const transactionId = body.context.transaction_id;

  if (!providerId || !jobId) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'INVALID_CONFIRM_REQUEST',
      error: 'Bad Request',
      message: 'Missing provider ID, item ID, or fulfillment ID',
    });
  }

  const [posting] = await db
    .select()
    .from(jobPosting)
    .where(
      and(eq(jobPosting.id, jobId), eq(jobPosting.organizationId, providerId))
    )
    .limit(1);

  if (!posting) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'JOB_NOT_FOUND',
      error: 'Not Found',
      message: 'Job posting not found',
    });
  }

  const updated = await db
    .update(jobApplication)
    .set({
      status: 'open',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(jobApplication.transactionId, transactionId),
        eq(jobApplication.status, 'draft'),
        eq(jobApplication.jobId, posting.id)
      )
    )
    .returning();

  if (!updated.length) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'APPLICATION_NOT_FOUND',
      error: 'Not Found',
      message: 'Draft application not found',
    });
  }

  // Send notification to organization members about new application
  try {
    const orgMembers = await db
      .select({
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, posting.organizationId));

    if (orgMembers.length > 0) {
      const applicantName = updated[0].userName;
      
      for (const orgMember of orgMembers) {
        // Send email notification
        if (orgMember.email) {
          await notificationClient.notify({
            channel: 'email',
            template_id: 'basic_email',
            to: orgMember.email,
            priority: 'realtime',
            variables: {
              fromName: posting.organizationName,
              fromEmail: 'support@onest.network',
              replyTo: 'support@onest.network',
              subject: `New Application for ${posting.title}`,
              html: `
                <p>Hi ${orgMember.name},</p>
                <p>A new candidate <strong>${applicantName}</strong> just applied for the <strong>${posting.title}</strong> job.</p>
                <p>Best regards,<br/>Jobstack</p>
              `,
            },
          });
        }

        // Send WhatsApp notification
        if (orgMember.phoneNumber && process.env.SEND_WHATSAPP_NOTIFICATION === 'true') {
          await notificationClient.notify({
            channel: 'whatsapp',
            template_id: 'other',
            to: orgMember.phoneNumber,
            priority: 'realtime',
            variables: {
              contentSid: process.env.TWILIO_CONTENT_SID_NEW_APPLICATION || '',
              contentVariables: {
                '1': posting.title,
              },
            },
          });
        }
      }
      request.log.info(`New application notification sent to ${orgMembers.length} organization members for job ${posting.id}`);
    }
  } catch (error: any) {
    request.log.error(`Failed to send new application notification: ${error.message}`);
    // Don't fail the request if notification fails
  }

  return reply.send({
    context: { transaction_id: transactionId },
    message: {
      order: {
        id: updated[0].id,
        provider: {
          id: providerId,
          descriptor: {
            name: posting.organizationName,
          },
          locations: [posting.location],
        },
        items: [
          {
            id: posting.id,
            descriptor: {
              name: posting.title,
            },
            tag: posting.metadata,
            time: {
              range: {
                start: posting.createdAt.toISOString(),
                end: null,
              },
            },
          },
        ],
        fulfillments,
      },
    },
  });
}
