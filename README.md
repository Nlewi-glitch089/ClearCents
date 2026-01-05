# ClearCents

Track smarter. Build better habits.

## Project Overview

ClearCents is a student-focused budgeting and money-tracking web app that helps students understand their spending, build better financial habits, and receive AI-powered, text-only insights.

Who benefits most: students (high-school & college) and coaches/instructors who support them.

## Pages (requirements mapping)

- Home (Page 1): App name, tagline, short description, CTA "Start Tracking", and nav.
- About (Page 2): Problem overview, real-life examples, constraints, existing-solution comparison.
- Why ClearCents? (Page 3): Solution explanation, features, challenges, project plan link.
- Features (Page 4): Core features, AI role, differentiation.
- Product (Page 5): Core tool (add income/expenses, choose category, view totals, save per user, generate AI feedback).
- Rubric Evidence (Page 6, staff only): CCC.1.1, CCC.1.2, CCC.1.3 mapping and links.
- Reflection (Page 7, staff only): What went well, what didn’t, changes, future work.

## Must-have Artifacts

- Wireframes: Link or upload Figma/Canva/Ecalidraw files in the repo (suggest: `assets/wireframes/`).
- Project Plan: Trello board link or a Markdown task board with columns Backlog / In Progress / Blocked / Done. Each card should include title, description, start/end dates, and checklist.
- README: (this file) — includes project overview, problem summary, features, tech stack, run instructions, AI details, rubric evidence mapping, and reflection placeholders.

## AI integration

- Uses OpenAI text API to generate spending insights and habit-building suggestions (text-only responses). Not providing financial advice.
- Inputs: user transaction summary, recent expenses, category totals, and goals.
- Output: short analysis and 2–3 habit suggestions.

## Tech Stack

- Framework: Next.js (App Router) — JavaScript only (no TypeScript)
- Language: JavaScript + JSX
- Styling: CSS Modules + global CSS (no Tailwind, no styled-components)
- Database: Neon (Auth) (note: configure later)
- Auth: Email + Password (role-based auth: student, coach, instructor)

## Staff Accounts (hardcoded for grading/testing)

- rob@launchpadphilly.org -> lpuser1
- sanaa@launchpadphilly.org -> lpuser2
- taheera@launchpadphilly.org -> lpuser3

## Rubric Evidence Mapping

- CCC.1.1 (Problem Understanding): Shown on About page and README "Problem summary" section.
- CCC.1.2 (Solution Planning): Shown on "Why ClearCents?" page and linked wireframes/project plan.
- CCC.1.3 (Working Tool/Features): Shown on Features page and Product page where the tracker and AI feedback are implemented.

## How to run (development)

Prerequisites:

- Node.js 18+ (LTS recommended)
- npm (or yarn)

Commands:

1. Install dependencies:

	npm install

2. Run dev server:

	npm run dev

3. Build for production:

	npm run build
	npm start

The repository includes a minimal Next.js scaffold and `package.json` to get started.

## Database setup (Neon/Postgres)

1. Provision a Neon (or Postgres) database and obtain the connection string (DATABASE_URL).
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL` (and `NEXT_PUBLIC_OPENAI_KEY` if used).

	Example `.env.local`:

	DATABASE_URL=postgresql://user:password@db-host.neon.tech:5432/dbname

3. Run the migration script to create tables and seed staff accounts:

```bash
npm run migrate
```

If you prefer, run the SQL directly in the Neon SQL editor by pasting `db/schema.sql`.

Security note: do not commit `.env.local` to source control. Use Neon secrets or environment variables in production.

## Local development with SQLite fallback

If your production Postgres/Neon database is unavailable, use the local SQLite fallback for development.

1. Create a local `.env.local` (or export `DATABASE_URL`) pointing to the SQLite file:

```bash
echo "DATABASE_URL=\"file:./dev.db\"" > .env.local
```

2. Push the Prisma SQLite schema and generate the client (only needed once or after schema changes):

```bash
npx prisma db push --schema=prisma/schema.sqlite.prisma
npm run prisma:generate
```

3. Seed the local DB (creates test users):

```bash
npm run seed
```

4. Start the dev server with the local DB:

```bash
DATABASE_URL="file:./dev.db" npm run dev
```

5. Test sign-in using a seeded account (example):

```bash
curl -i -X POST http://localhost:3000/api/auth/login \
	-H "Content-Type: application/json" \
	-d '{"email":"rob@launchpadphilly.org","password":"password123"}'
```

If successful you'll receive a `Set-Cookie` header for the session.


## Next steps (what I will set up next)

- Implement Neon Auth + role checks for staff-only pages.
- Add full wireframes and project plan artifacts in `assets/`.
- Replace hardcoded staff accounts with secure seeding or Neon Auth user creation.

## Reflection (placeholder)

- What went well: (fill after development)
- What didn’t go well: (fill after development)
- What changed during project: (fill after development)
- What to build next: (fill after development)

---

