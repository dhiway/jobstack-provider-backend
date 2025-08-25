import Fastify from 'fastify';
import cors from '@fastify/cors';
import {
  createJsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import formDataPlugin from '@fastify/formbody';
import { drizzle } from 'drizzle-orm/node-postgres';
import v1Routes from '@routes/v1';
import fastifySwagger from '@fastify/swagger';
import 'dotenv';
import fastifyRateLimit from '@fastify/rate-limit';
import redis from '@lib/redis';
import AuthRoutes from '@routes/auth';
import HomepageRoute from '@routes/home';

declare module 'fastify' {
  interface FastifyInstance {
    db: ReturnType<typeof drizzle>;
  }
}

async function main() {
  const app = Fastify({ logger: true, trustProxy: true });

  // Zod Validation Compiler Setup
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // CORS Setup
  const allowed_origins = [''];

  if (process.env.NODE_ENV !== 'production') {
    allowed_origins.push('http://localhost:3000');
  }

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowed_origins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Swagger + Scalar Setup
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Jobstack API',
        description: ' Jobstack API Service',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Local development server',
        },
        /* { */
        /*   url: '', */
        /*   description: 'Staging server for testing updates', */
        /* }, */
        /* { */
        /*   url: '', */
        /*   description: 'Live production server', */
        /* }, */
      ],
    },
    transform: createJsonSchemaTransform({
      skipList: ['/api/v1/auth/{*}/*', '/api/v1/auth/{*}', '/api/v1/auth/*'],
    }),
  });

  await app.register(import('@scalar/fastify-api-reference'), {
    routePrefix: '/api/v1/reference',
  });

  // formDataPlugin
  await app.register(formDataPlugin);

  // Rate Limit setup: ban can be added
  app.register(fastifyRateLimit, {
    global: true,
    redis,
    keyGenerator: (req) => req.user?.id ?? req.ip,
    max: 100,
    timeWindow: '1 minute',
    skipOnError: true,
  });

  // Application Routes Setup
  await app.register(HomepageRoute);
  await app.register(v1Routes, { prefix: '/api/v1' });
  await app.register(AuthRoutes);

  await app.listen({
    port: 3001,
    host: '0.0.0.0',
  });

  app.log.info('Server started on port 3001');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
