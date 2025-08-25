import { organization } from "@db/schema/auth";
import { db } from "@db/setup";
import { sql } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod/v4";
const GetOrganizationDetailsByAgentIdSchema = z.object({
  agentId: z.string(),
});

type GetOrganizationDetailsByAgentIdRequestInput = z.infer<
  typeof GetOrganizationDetailsByAgentIdSchema
>;

export async function getOrganizationDetailsByAgentId(
  request: FastifyRequest<{
    Querystring: GetOrganizationDetailsByAgentIdRequestInput;
  }>,
  reply: FastifyReply
) {
  const parsed = GetOrganizationDetailsByAgentIdSchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.status(400).send({
      statusCode: 400,
      code: "BAD_REQUEST",
      error: "Invalid Query Params",
      message: parsed.error.flatten().fieldErrors,
    });
  }

  const { agentId } = parsed.data;

  const orgDetails = await db
    .select()
    .from(organization)
    .where(sql`metadata::jsonb ->> 'agentId' = ${agentId}`)
    .limit(1);

  if (!orgDetails.length) {
    return reply.status(404).send({
      statusCode: 404,
      code: "ORG_NOT_FOUND",
      error: "Not Found",
      message: `Organization with agentId '${agentId}' does not exist`,
    });
  }

  const org = orgDetails[0];

  reply.status(200).send({
    statusCode: 200,
    message: "Org Details Fetched",
    data: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      metadata:
        typeof org.metadata === "string"
          ? JSON.parse(org.metadata)
          : (org.metadata ?? {}),
    },
  });
}
