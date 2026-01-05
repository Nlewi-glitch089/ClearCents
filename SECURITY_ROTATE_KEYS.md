Security — rotate compromised keys

You exposed live credentials in `.env`. Please rotate them immediately. Follow these steps in order.

1) Neon (Postgres) credential rotation
- Open your Neon project dashboard.
- Go to the relevant branch/database, then "Users" or "Connection strings".
- Either rotate the password for `neondb_owner` or create a new dedicated role (recommended).
- Copy the new connection string. It will look like:
  `postgresql://USER:NEW_PASSWORD@<host>/<db>?sslmode=require`
- Update your repo `.env` or better: create `.env.local` with the new `DATABASE_URL`.

2) OpenAI key rotation
- Sign in at https://platform.openai.com/account/api-keys
- Revoke the exposed key and create a new one. Copy the new key.
- Update `OPENAI_KEY` in your `.env.local` (do NOT commit it).

3) Update local environment and restart server
- If you changed `.env`/`.env.local`, restart the dev server:
  ```bash
  npm run dev
  ```
- Regenerate Prisma client and verify DB connection:
  ```bash
  npx prisma generate --schema=prisma/schema.prisma
  npx prisma db pull --schema=prisma/schema.prisma
  npx prisma db push --schema=prisma/schema.prisma   # dev quick push
  ```

4) Validate application behavior
- Test sign-in and transaction creation in the app.
- Run the connectivity script (optional):
  ```bash
  node scripts/check_prisma.js
  ```

5) Remove leaked secrets from VCS history (if they were committed)
- If you committed `.env` with secrets, rotate keys first, then permanently remove from git history. Use one of:
  - `git filter-repo` (recommended): https://github.com/newren/git-filter-repo
  - BFG Repo-Cleaner: https://rtyley.github.io/bfg-repo-cleaner/

6) Prevent future leaks
- Add `.env` to `.gitignore`.
- Use a secrets manager for production (Vercel/Netlify/Heroku/Cloud provider env vars).

If you want, I can create `.env.local` with placeholders and run `npx prisma db push` to create a local dev DB so you can continue working immediately while you rotate live credentials.
