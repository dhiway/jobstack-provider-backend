import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      name: string;
      role?: string | null | undefined;
      [key: string]: any;
    };
    permissions?: Record<string, string[]>;
  }
}

declare namespace NodeJS {
  interface ProcessEnv {
    APP_NAME: string;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;

    POSTGRES_USER: string;
    POSTGRES_PASSWORD: string;
    POSTGRES_DB: string;
    DATABASE_PORT: string;

    REDIS_URL: string;

    BACKEND_PORT: string;
    SERVER_ENDPOINT: string;

    DATABASE_URL: string;

    MAIL_LOG: 'true' | 'false';

    SMTP_AWS_SES: 'true' | 'false';
    AWS_SECRET_ACCESS_KEY: string;
    AWS_ACCESS_KEY_ID: string;
    AWS_REGION: string;

    SMTP_GMAIL: 'true' | 'false';
    GMAIL_USER: string;
    GMAIL_PASS: string;

    NODE_ENV: 'development' | 'production' | 'test';

    GCP_PROJECT_ID: string;
    STORAGE_BASE_URL: string;

    // SSO Integration
    SSO_ENABLED?: 'true' | 'false';
    SSO_ENDPOINT?: string;
    SSO_ACCESS_TOKEN?: string;
    SSO_TIMEOUT_MS?: string;
  }
}
