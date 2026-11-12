# ClearCents

ClearCents is a financial wellness application designed to help teens and young adults understand their spending, manage income, and work toward savings goals.

## Features

- Dashboard with account balances, recent activity, and spending summaries.
- Income and expense tracking with categories.
- Savings goals and progress tracking.
- Transaction and account management.
- AI-assisted financial insights.
- Account registration and sign-in.

## Technology

- Next.js App Router and React
- JavaScript
- PostgreSQL with Prisma
- OpenAI API for server-side AI features
- CSS and Tailwind CSS

## Requirements

- Node.js 22 or newer
- npm
- PostgreSQL database (local PostgreSQL or a hosted provider such as Neon)
- OpenAI API key for AI insight features

## Run locally

1. Clone the repository and enter the project folder:

   ```bash
   git clone https://github.com/Nlewi-glitch089/ClearCents.git
   cd ClearCents
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the environment template:

   **macOS / Linux / Git Bash**
   ```bash
   cp .env.example .env.local
   ```

   **Windows PowerShell**
   ```powershell
   Copy-Item .env.example .env.local
   ```

4. Fill in the values in `.env.local`:

   | Variable | Purpose |
   | --- | --- |
   | `DATABASE_URL` | PostgreSQL connection string |
   | `OPENAI_API_KEY` | Server-side OpenAI key for AI insight features |
   | `SESSION_SECRET` | Long, random secret used to sign session tokens |
   | `VERCEL_OIDC_TOKEN` | Optional Vercel OIDC token |

5. Generate Prisma Client and apply the checked-in migrations:

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

Do not commit `.env.local` or place private keys in variables prefixed with `NEXT_PUBLIC_`.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm start` | Start the production server |
| `npm test` | Run the Jest test suite |
| `npx prisma generate` | Generate Prisma Client |
| `npx prisma migrate deploy` | Apply committed database migrations |
| `npm run seed` | Run the sample-data seed script |
| `npm run prisma:studio` | Open Prisma Studio |

## Deployment

GitHub currently lists this Vercel homepage for the project:

[Open ClearCents](https://clear-cents.vercel.app)

To deploy your own instance:

1. Import the repository into [Vercel](https://vercel.com/new).
2. Use the Next.js framework preset and keep the repository root as the project root.
3. Add `DATABASE_URL`, `SESSION_SECRET`, and `OPENAI_API_KEY` under Project Settings → Environment Variables.
4. Deploy with `npm run build).
5. Apply the committed Prisma migrations to the production database using `npx prisma migrate deploy` as part of a controlled deployment step. Do not run development migrations against production.
6. Verify sign-in, database-backed transactions and goals, and AI insight behavior in the deployed environment.

The URL above is the repository's configured homepage; confirm the current Vercel Production deployment before sharing it as a working demo.

## Project status

The repository contains the application and its database schema/migrations. Confirm each feature against the current deployed build before presenting it as production-ready.