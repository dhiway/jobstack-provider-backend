import { auth } from '@lib/auth';
import { FastifyPluginAsync } from 'fastify';
import { createCordAccountForOrganization } from '@lib/cord/account';
import { db } from '@db/setup';
import { createLoggerFromFastify } from '@lib/cord/logger';

const AuthRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.route({
    method: ['GET', 'POST', 'OPTIONS'],
    url: '/api/v1/auth/*',
    config: { rateLimit: { max: 10, timeWindow: '10 seconds' } },
    handler: async (request, reply) => {
      if (request.method === 'OPTIONS') {
        return reply.status(204).send();
      }

      try {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const headers = new Headers();

        for (const [key, value] of Object.entries(request.headers)) {
          if (value) headers.append(key, String(value));
        }

        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          body: request.body ? JSON.stringify(request.body) : undefined,
        });

        const response = await auth.handler(req);
        
        // Check if this is an organization creation request
        const isOrgCreate = url.pathname.includes('/organization/create') && request.method === 'POST';
        
        // Handle response
        response.headers.forEach((value, key) => {
          reply.header(key, value);
        });

        reply.status(response.status);
        
        // If organization creation was successful, trigger CORD account creation
        if (isOrgCreate && response.status === 200 && process.env.CORD_ENABLED === 'true') {
          // Clone the response to read body multiple times
          const clonedResponse = response.clone();
          const responseBody = await clonedResponse.text();
          
          // Send response immediately (don't wait for CORD)
          reply.send(responseBody);
          
          // Trigger CORD account creation asynchronously
          if (responseBody) {
            try {
              const bodyData = JSON.parse(responseBody);
              
              // Extract organization ID from response
              // Better-auth response structure: { id: "...", name: "...", slug: "...", ... }
              const orgId = bodyData?.id;
              
              if (orgId) {
                request.log.debug({ orgId }, `🔍 [CORD] Detected organization creation for org ${orgId}, checking if CORD account needed...`);
                
                // Check if organization already has a CORD account
                const existingCordAccount = await db.query.organizationCordAccount.findFirst({
                  where: (a, { eq }) => eq(a.orgId, orgId),
                });

                if (!existingCordAccount) {
                  // Get organization details
                  const org = await db.query.organization.findFirst({
                    where: (a, { eq }) => eq(a.id, orgId),
                  });

                  if (org) {
                    const orgSlug = org.slug || org.id.slice(0, 8);
                    const cordLogger = createLoggerFromFastify(request.log);
                    createCordAccountForOrganization(orgId, orgSlug, cordLogger)
                      .then(({ profileId, registryId, address }) => {
                        request.log.info(
                          { orgId, profileId, registryId, address },
                          `✅ [CORD] Account, profile, and registry created for org ${orgId}`
                        );
                      })
                      .catch((err) => {
                        request.log.error(
                          {
                            err,
                            orgId,
                            errorMessage: err?.message,
                            errorStack: err?.stack,
                            errorName: err?.name,
                          },
                          `❌ [CORD] Failed to create account/registry for org ${orgId}`
                        );
                      });
                  } else {
                    request.log.warn({ orgId }, `⚠️  [CORD] Organization ${orgId} not found in database, skipping CORD account creation`);
                  }
                } else {
                  request.log.debug({ orgId }, `ℹ️  [CORD] Organization ${orgId} already has a CORD account`);
                }
              } else {
                request.log.warn(
                  { responseBody: responseBody.substring(0, 500) },
                  `⚠️  [CORD] Could not extract organization ID from response`
                );
              }
            } catch (err: any) {
              request.log.error(
                {
                  err,
                  errorMessage: err?.message,
                  errorStack: err?.stack,
                  responseBody: responseBody?.substring(0, 500),
                },
                `❌ [CORD] Error processing organization creation response`
              );
            }
          }
        } else {
          const responseBody = response.body ? await response.text() : null;
          reply.send(responseBody);
        }
      } catch (err: any) {
        reply.status(500).send({
          error: 'Internal authentication error',
          code: 'AUTH_FAILURE',
          message: err.message,
        });
      }
    },
  });
};

export default AuthRoutes;
