import { auth } from '@lib/auth';
import { FastifyPluginAsync } from 'fastify';
import { createCordAccountForOrganization } from '@lib/cord/account';
import { db } from '@db/setup';

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
                console.log(`🔍 [CORD] Detected organization creation for org ${orgId}, checking if CORD account needed...`);
                
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
                    createCordAccountForOrganization(orgId, orgSlug)
                      .then(({ profileId, registryId, address }) => {
                        console.log(`✅ [CORD] Account, profile, and registry created for org ${orgId}`);
                        console.log(`   Profile ID: ${profileId}`);
                        console.log(`   Registry ID: ${registryId}`);
                        console.log(`   CORD Address: ${address}`);
                      })
                      .catch((err) => {
                        console.error(`❌ [CORD] Failed to create account/registry for org ${orgId}:`, err);
                        console.error(`   Error details:`, {
                          message: err?.message,
                          stack: err?.stack,
                          name: err?.name,
                        });
                      });
                  } else {
                    console.log(`⚠️  [CORD] Organization ${orgId} not found in database, skipping CORD account creation`);
                  }
                } else {
                  console.log(`ℹ️  [CORD] Organization ${orgId} already has a CORD account`);
                }
              } else {
                console.log(`⚠️  [CORD] Could not extract organization ID from response`);
                console.log(`   Response body:`, responseBody.substring(0, 500));
              }
            } catch (err: any) {
              console.error(`❌ [CORD] Error processing organization creation response:`, err);
              console.error(`   Response body:`, responseBody?.substring(0, 500));
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
