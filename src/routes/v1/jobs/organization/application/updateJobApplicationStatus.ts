import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod/v4';
import { eq, and } from 'drizzle-orm';
import {
  JobParamsSchema,
  UpdateJobApplicationStatusSchema,
} from '@validation/schema/jobs/request';
import { db } from '@db/setup';
import { member, organization } from '@db/schema/auth';
import { jobApplication, jobPosting } from '@db/schema/job';
import { notificationClient } from '@lib/notification/notification_client';

type UpdateJobApplicationStatusInput = z.infer<
  typeof UpdateJobApplicationStatusSchema
>;
type JobQueryInput = z.infer<typeof JobParamsSchema>;

export async function updateJobApplicationStatus(
  request: FastifyRequest<{
    Body: UpdateJobApplicationStatusInput;
    Params: JobQueryInput;
  }>,
  reply: FastifyReply
) {
  const { applicationId, applicationStatus, action } =
    UpdateJobApplicationStatusSchema.parse(request.body);
  const { organizationId } = request.params;
  const userId = request.user.id;

  // Verify membership in org
  const orgDetails = await db
    .select({
      id: organization.id,
      name: organization.name,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(
      and(eq(member.userId, userId), eq(member.organizationId, organizationId))
    );

  if (orgDetails.length === 0) {
    return reply.status(403).send({
      statusCode: 403,
      code: 'ORG_MEMBERSHIP_REQUIRED',
      error: 'Forbidden',
      message: 'User does not belong to this organization',
    });
  }

  // Find the application + job posting to confirm ownership
  const [application] = await db
    .select({
      id: jobApplication.id,
      jobId: jobApplication.jobId,
      userId: jobApplication.userId,
      userName: jobApplication.userName,
      status: jobApplication.status,
      applicationStatus: jobApplication.applicationStatus,
      contact: jobApplication.contact,
    })
    .from(jobApplication)
    .where(eq(jobApplication.id, applicationId))
    .limit(1);

  if (!application) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'APPLICATION_NOT_FOUND',
      error: 'Not Found',
      message: 'Job application not found',
    });
  }

  // Fetch the job posting and confirm it belongs to the org
  const [posting] = await db
    .select({
      id: jobPosting.id,
      organizationId: jobPosting.organizationId,
      title: jobPosting.title,
    })
    .from(jobPosting)
    .where(eq(jobPosting.id, application.jobId))
    .limit(1);

  if (!posting) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'JOB_POSTING_NOT_FOUND',
      error: 'Not Found',
      message: 'Job posting not found for this application',
    });
  }

  if (posting.organizationId !== organizationId) {
    return reply.status(403).send({
      statusCode: 403,
      code: 'ORG_NOT_OWNER',
      error: 'Forbidden',
      message: 'Your organization does not own this job posting',
    });
  }

  // Extract applicant contact details from application.contact
  const contact = application.contact as any;
  const applicantEmail = contact?.email || '';
  const applicantPhone = contact?.phone || contact?.phoneNumber || '';
  const applicantName = application.userName;

  const newStatus: 'closed' | 'archived' | 'open' =
    action === 'accept' ? 'closed' : action === 'reject' ? 'archived' : 'open';

  await db
    .update(jobApplication)
    .set({
      status: newStatus,
      applicationStatus,
      updatedAt: new Date(),
    })
    .where(eq(jobApplication.id, applicationId));

  // Trigger notification for status change
  const shouldNotify = ['Shortlisted', 'Rejected'].includes(applicationStatus);
  
  if (shouldNotify) {
    try {
      // Send email notification to applicant
      if (applicantEmail) {
        let emailSubject = '';
        let emailBody = '';

        if (applicationStatus === 'Shortlisted') {
          emailSubject = `Congratulations! You're Shortlisted for ${posting.title}`;
          emailBody = `
            <p>Hi ${applicantName},</p>
            <p>Congratulations! You just got shortlisted for the <strong>${posting.title}</strong> job that you applied for.</p>
            <p>Best regards,<br/>${orgDetails[0].name}</p>
          `;
        } else if (applicationStatus === 'Rejected') {
          emailSubject = `Update on your application for ${posting.title}`;
          emailBody = `
            <p>Hi ${applicantName},</p>
            <p>Thank you for your interest in the <strong>${posting.title}</strong> position at ${orgDetails[0].name}.</p>
            <p>Unfortunately, we have decided to move forward with other candidates at this time.</p>
            <p>Best regards,<br/>${orgDetails[0].name}</p>
          `;
        } else {
          emailSubject = `Application Update: ${applicationStatus}`;
          emailBody = `
            <p>Hi ${applicantName},</p>
            <p>Your application for <strong>${posting.title}</strong> at ${orgDetails[0].name} has been updated to: <strong>${applicationStatus}</strong></p>
            <p>Best regards,<br/>${orgDetails[0].name}</p>
          `;
        }

        await notificationClient.notify({
          channel: 'email',
          template_id: 'basic_email',
          to: applicantEmail,
          priority: 'realtime',
          variables: {
            fromName: orgDetails[0].name,
            fromEmail: 'support@onest.network',
            replyTo: 'support@onest.network',
            subject: emailSubject,
            html: emailBody,
          },
        });
        request.log.info(`Email notification sent to ${applicantEmail} for application ${applicationId}`);
      }

      // Send WhatsApp notification
      if (applicantPhone && process.env.SEND_WHATSAPP_NOTIFICATION === 'true') {
        if (applicationStatus === 'Shortlisted') {
          await notificationClient.notify({
            channel: 'whatsapp',
            template_id: 'other',
            to: applicantPhone,
            priority: 'realtime',
            variables: {
              contentSid: process.env.TWILIO_CONTENT_SID_SHORTLISTED || '',
              contentVariables: {
                '1': posting.title,
              },
            },
          });
          request.log.info(`WhatsApp notification sent to ${applicantPhone} for application ${applicationId}`);
        }
      }
    } catch (error: any) {
      request.log.error(`Failed to send notification for application ${applicationId}: ${error.message}`);
      // Don't fail the request if notification fails
    }
  }

  return reply.send({
    statusCode: 200,
    message: `Job application ${action}ed successfully`,
    data: {
      id: applicationId,
      applicationStatus: applicationStatus || '',
      status: newStatus,
    },
  });
}
