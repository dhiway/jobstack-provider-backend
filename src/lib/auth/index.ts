import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import {
  admin,
  apiKey,
  bearer,
  openAPI,
  organization,
} from 'better-auth/plugins';
import { db } from '@db/setup';
import * as schema from '@db/schema/auth';
import { sendMail } from '@lib/mailer';
import redis from '../redis';
import { unifiedOtp } from './plugins/unifiedOtp';
import {
  JobsAC,
  SuperAdmin,
  Admin,
  Recruiter,
  Member,
  Seeker,
  Viewer,
} from './plugins/AccessControl';
import { sendSmsWithMsg91 } from '@lib/messager';
import { emailOtpHtmlTemplate } from '@src/templates/unifiedOtp';

const senderName = process.env.APP_NAME;

if (!senderName) {
  throw Error('Env Variable EMAIL_SENDER (name) not set');
}

const allowed_origins = [];

if (process.env.NODE_ENV !== 'production') {
  allowed_origins.push('http://localhost:3000');
}

export const auth = betterAuth({
  appName: senderName,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: allowed_origins,
  secret: process.env.BETTER_AUTH_SECRET,
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
    useSecureCookies: process.env.NODE_ENV === 'production',
    crossSubDomainCookies: {
      enabled: process.env.NODE_ENV === 'production',
      domain:
        process.env.NODE_ENV === 'production'
          ? process.env.SERVER_ENDPOINT
          : 'localhost:3001',
    },
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
      partitioned: process.env.NODE_ENV === 'production',
    },
    cookies: {
      sessionToken: {
        attributes: {
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          secure: process.env.NODE_ENV === 'production',
        },
      },
    },
  },
  rateLimit: {
    storage: 'secondary-storage',
  },
  secondaryStorage: {
    get: async (key) => {
      const value = await redis.get(key);
      return value ? value : null;
    },
    set: async (key, value, ttl) => {
      if (ttl) await redis.set(key, value, 'EX', ttl);
      else await redis.set(key, value, 'EX', 600);
    },
    delete: async (key) => {
      await redis.del(key);
    },
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      // update the below fields according to your requirement
      await sendMail({
        fromName: senderName,
        fromEmail: '',
        to: user.email,
        subject: '',
        html: ``,
        activationUrl: url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 3 * 60 * 60, // 3 hours
    sendVerificationEmail: async ({ user, url }) => {
      // update the below fields according to your requirement
      await sendMail({
        fromName: senderName,
        fromEmail: '',
        to: user.email,
        subject: '',
        html: ``,
        activationUrl: url,
      });
    },
  },
  resetPassword: {
    enabled: true,
  },

  plugins: [
    organization({
      ac: JobsAC,
      roles: {
        owner: SuperAdmin,
        superAdmin: SuperAdmin,
        admin: Admin,
        recruiter: Recruiter,
        memeber: Member,
        seeker: Seeker,
        viewer: Viewer,
      },
      teams: {
        enabled: true,
      },
      schema: {
        organization: {
          additionalFields: {
            type: {
              type: 'string',
              input: true,
              required: false,
              sortable: true,
              defaultValue: 'employer',
            },
          },
        },
      },
    }),
    openAPI(),
    apiKey({
      rateLimit: {
        timeWindow: 1000 * 60 * 60, //1hr
        maxRequests: 10000,
      },
      requireName: true,
      apiKeyHeaders: 'x-api-key',
      defaultPrefix: 'jobs_',
      enableMetadata: true,
    }),
    bearer(),
    admin({
      defaultRole: 'user',
      adminRoles: ['admin'],
    }),
    unifiedOtp({
      sendPhoneOtp: async ({ phoneNumber, otp }) => {
        await sendSmsWithMsg91({
          phoneNumber,
          message: otp,
        });
      },
      sendEmailOtp: async ({ email, otp, user }) => {
        // update the below fields according to your requirement
        await sendMail({
          fromName: '',
          fromEmail: '',
          to: email,
          subject: '',
          html: emailOtpHtmlTemplate(otp, user),
        });
      },
      adminByDomain: [],
    }),
  ],
});
