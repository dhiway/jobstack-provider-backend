# JOBSTACK BACKEND

---

## 🚀 Setup

1. **Install PNPM**

   ```bash
   # macOS
   brew add pnpm

   # Linux
   npm install -g pnpm
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Create Env**

**Notes:**

1. Any variables added here should also be added to `docker-compose.yml`.
2. Add these variables to your TypeScript `types/` definitions for type safety.

---

## Application

| Variable          | Description                                                | Example                   |
| ----------------- | ---------------------------------------------------------- | ------------------------- |
| `APP_NAME`        | Application identifier used across logs and configs.       | `my-app`                  |
| `NODE_ENV`        | Environment mode (`development`, `staging`, `production`). | `production`              |
| `BACKEND_PORT`    | Port exposed by the backend application in Docker.         | `3001`                    |
| `SERVER_ENDPOINT` | Public endpoint / domain of the backend server.            | `https://api.example.com` |

---

## Authentication (Better Auth)

| Variable             | Description                                   | Example                    |
| -------------------- | --------------------------------------------- | -------------------------- |
| `BETTER_AUTH_SECRET` | Secret key used for signing sessions/tokens.  | `super-secret-key`         |
| `BETTER_AUTH_URL`    | URL where the Better Auth service is running. | `https://auth.example.com` |

---

## PostgreSQL Database

| Variable            | Description                           | Example                                          |
| ------------------- | ------------------------------------- | ------------------------------------------------ |
| `POSTGRES_USER`     | Username for the PostgreSQL instance. | `postgres`                                       |
| `POSTGRES_PASSWORD` | Password for the PostgreSQL user.     | `securepassword`                                 |
| `POSTGRES_DB`       | Name of the database to connect to.   | `app_db`                                         |
| `DATABASE_PORT`     | PostgreSQL port.                      | `5432`                                           |
| `DATABASE_URL`      | Connection URL for apps/Compose.      | `postgres://user:password@localhost:5432/app_db` |

---

## Redis

| Variable    | Description              | Example                  |
| ----------- | ------------------------ | ------------------------ |
| `REDIS_URL` | Redis connection string. | `redis://localhost:6379` |

---

## SMS Services (MSG91)

| Variable            | Description                       | Example         |
| ------------------- | --------------------------------- | --------------- |
| `MSG91_AUTH_KEY`    | Authentication key for MSG91 API. | `your-auth-key` |
| `MSG91_TEMPLATE_ID` | Template ID for SMS messages.     | `123456`        |

---

## Email Services

| Variable                | Description                                   | Example            |
| ----------------------- | --------------------------------------------- | ------------------ |
| `MAIL_LOG`              | Enable/disable email logs (`true` / `false`). | `false`            |
| `SMTP_AWS_SES`          | Whether to use AWS SES for SMTP.              | `true`             |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key (if using SES).                | `your-secret-key`  |
| `AWS_ACCESS_KEY_ID`     | AWS access key ID.                            | `your-access-key`  |
| `AWS_REGION`            | AWS region for SES.                           | `ap-south-1`       |
| `SMTP_GMAIL`            | Whether to use Gmail SMTP.                    | `true`             |
| `GMAIL_USER`            | Gmail username for SMTP.                      | `user@example.com` |
| `GMAIL_PASS`            | Gmail password/app password.                  | `app-password`     |

---

## Google Cloud Platform (GCP)

| Variable           | Description                          | Example                                    |
| ------------------ | ------------------------------------ | ------------------------------------------ |
| `GCP_PROJECT_ID`   | Project ID of the GCP account.       | `my-gcp-project`                           |
| `STORAGE_BASE_URL` | Base URL for the GCP storage bucket. | `https://storage.googleapis.com/my-bucket` |

---

4. **Run Docker**

   ### Production

   ```bash
   docker compose up --build -d
   ```

   ### Development

   For local testing or development few changes are required in `.env`. instead
   of making changes to `.env`. create a `.env.local`

   ```env
    BETTER_AUTH_URL=http://localhost:3001/api/v1/auth # Local backend endpoint
    NODE_ENV = "development"
   ```

   ```bash
   docker compose --env-file .env.local up --build
   ```

   - `-d` runs containers in detached mode.

   - `--build` ensures the image is built or rebuilt as needed.

   > ✅ **Note:** If you face migration errors locally, purge local Docker
   > volumes **(local only!)** to reset the DB: For Server use the method
   > decribed in at **Drizzle Migration Creation / Error Fix** in next section

   ```bash
   docker compose down --volumes
   ```

---

## 🗂️ Database Schema

- **DB Schemas:**

  - `db/schema` → main DB table definitions
  - `drizzle` → Drizzle migrations & configs

- **Better Auth Schema Generation**

  ```bash
  npx @better-auth/cli generate
  ```

- **Drizzle Studio** Stop local PostgreSQL if running:

  ```bash
  brew services stop postgresql
  pnpm drizzle-kit studio
  ```

- **Drizzle Migration Creation / Error Fix**

  1. Fresh Server

  - Make sure the docker container postgres is running.
  - Run `db:generate` script and then run db:migrate to create and apply the
    schema migrations.

  2. Database Volume Exists

  - Delete drizzle folder if migration errors occur. (NOTE: Do not delete if
    these error occur due to value type issues. Instead fix the issues)
  - Run `db:pull` script which will create the following: `drizzle/schema.ts`
    `drizzle/relations.ts` `drizzle/0000_*.sql` `drizzle/meta/0000_*.json`
    `drizzle/meta/_journal.json`
  - Delete both `drizzle/0000_*.sql` `drizzle/meta/0000_*.json`
  - Edit `drizzle/meta/_journal.json` and delete the entries for idx:0

    ```json
    {
      "version": "7",
      "dialect": "postgresql",
      "entries": [
        {
          "idx": 0,
          "version": "7",
          "when": 1754329815357,
          "tag": "0000_*",
          "breakpoints": true
        }
      ]
    }
    ```

    - Run `db:generate` script and then `db:migrate`

---

## ⚡ Drizzle Commands

| Command                | When to Use                                                                 | What It Does                                                                                           |
| ---------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `drizzle-kit generate` | When you **change your schema**                                             | Generates a new SQL migration file based on changes in your Drizzle schema                             |
| `drizzle-kit migrate`  | When you want to **apply generated migrations to the database**             | Executes SQL migrations that were previously generated to bring your DB up to date                     |
| `drizzle-kit pull`     | When you want to **reverse engineer the DB schema into Drizzle format**     | Introspects an existing database and generates Drizzle `schema.ts`, `relations.ts`, and a SQL snapshot |
| `drizzle-kit push`     | When you want to **push schema directly to the DB (without migrations)**    | Pushes your current Drizzle schema directly to the database — **skips** the SQL migration process      |
| `drizzle-kit studio`   | When you want to **visually inspect and browse your database**              | Spins up a local instance of Drizzle Studio for interactive DB browsing via a browser UI               |
| `drizzle-kit check`    | When you want to **verify migration consistency and avoid race conditions** | Scans generated migrations to detect possible race conditions or inconsistencies                       |
| `drizzle-kit up`       | When you want to **upgrade snapshot files after changes**                   | Updates schema snapshots for previously generated migrations — useful after reordering or patching     |

---

## ✅ API Schema & Type Safety

All routes **must** use **Zod** for both request and response schemas. Combine
it with
[`fastify-type-provider-zod`](https://github.com/SerayaEirik/fastify-type-provider-zod)
for:

- Fully typed handlers
- Auto-generated OpenAPI docs

**Example Response Schema**

```ts
import { z } from 'zod';

export const SuccessResponseSchema = z.object({
  statusCode: z.number().default(200),
  message: z.string(),
  data: z.unknown().optional(),
});

// Generic version for type-safe data
export const createSuccessResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T
) =>
  SuccessResponseSchema.extend({
    data: dataSchema,
  });
```

**Example Fastify Route**

```ts
fastify.withTypeProvider<ZodTypeProvider>().route({
  url: '/',
  method: 'GET',
  schema: {
    querystring: ProfilePaginationQuerySchema,
    response: {
      200: createSuccessResponseSchema(z.array(z.object({ id: z.string() }))),
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
    },
  },
  preHandler: authMiddleware,
  handler: listProfiles,
});
```

---

## 📑 API Documentation Endpoints

- **Auth Reference:**

  ```http
  GET backend_endpoint/api/v1/auth/reference
  ```

- **Full API Reference:**

  ```http
  GET backend_endpoint/api/v1/reference
  ```

- **Quick Getting Started:**

  ```http
  GET backend_endpoint/api/v1/docs/getting-started
  ```

---

## 🔑 HTTP Status Code Guide

| Code | Status                | When to Use                     | Response Body Should Include       |
| ---- | --------------------- | ------------------------------- | ---------------------------------- |
| 200  | OK                    | Successful GET requests         | Requested data                     |
| 201  | Created               | Successful resource creation    | Created resource + Location header |
| 202  | Accepted              | Async processing started        | Processing status                  |
| 204  | No Content            | Successful request with no body | Empty body                         |
| 400  | Bad Request           | Client-side validation errors   | Error details                      |
| 401  | Unauthorized          | Missing/invalid authentication  | WWW-Authenticate header            |
| 403  | Forbidden             | Insufficient permissions        | Optional explanation               |
| 404  | Not Found             | Resource doesn't exist          | Optional error details             |
| 500  | Internal Server Error | Server-side failure             | Optional error details             |

---

## ✅ Recommended Practices

- Use **Zod** for all request & response schemas.
- Use `--env-file .env.*` custom env for custom environments.
- Change the env keys before making the project opensource.
