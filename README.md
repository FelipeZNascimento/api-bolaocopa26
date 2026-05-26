# api-bolaocopa26

REST API for the Bolão Copa 2026 app. Built with Node.js, TypeScript, and Express, backed by a MySQL database.

## Requirements

- Node.js (see `.nvmrc` for the exact version)
- MySQL 8+
- [nvm](https://github.com/nvm-sh/nvm) (recommended)

## Setup

```bash
nvm use
npm install
cp .env.example .env.development
# Fill in .env.development with your values
```

## Environment Variables

See [.env.example](.env.example) for all required variables. Key groups:

| Variable                                        | Description                                  |
| ----------------------------------------------- | -------------------------------------------- |
| `NODE_ENV`                                      | `development`, `pprod`, or `production`      |
| `PORT`                                          | Port the API listens on                      |
| `SESSION_SECRET`                                | Secret used to sign session cookies          |
| `BASE_URL`                                      | Public base URL of the API                   |
| `SQL_HOST` / `SQL_DB` / `SQL_USER` / `SQL_PASS` | MySQL connection details                     |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD`     | Nodemailer SMTP credentials                  |
| `EDITION`                                       | Active tournament edition ID                 |
| `EXTERNAL_API_URL`                              | Base URL for the external match data source  |
| `MATCH_SYNC_ENABLED`                            | Enable automatic match sync (`true`/`false`) |
| `MATCH_SYNC_INTERVAL`                           | Sync poll interval in milliseconds           |

## Running

```bash
# Development (watch mode)
npm run dev

# Production (requires a prior build)
npm run build
npm run start:prod
```

## Scripts

| Command                    | Description                                 |
| -------------------------- | ------------------------------------------- |
| `npm run dev`              | Start in watch mode with `.env.development` |
| `npm run build`            | Compile TypeScript to `dist/`               |
| `npm run lint`             | Run ESLint                                  |
| `npm run lint:fix`         | Run ESLint with auto-fix                    |
| `npm run format`           | Format all files with Prettier              |
| `npm run test`             | Run tests in watch mode                     |
| `npm run test:run`         | Run tests once                              |
| `npm run coverage`         | Run tests with coverage report              |
| `npm run cleanup:sessions` | Manually purge expired sessions from the DB |

## Database Migrations / One-off Scripts

These scripts must be run manually after deployment when applicable:

```bash
# Wrap existing SHA1 passwords with bcrypt (run once after deploying bcrypt support)
node --env-file .env dist/database/migrate-passwords.js

# Normalise all stored emails to lower-case (run once)
node --env-file .env dist/database/emails-to-lower-case.js

# Purge expired sessions
node --env-file .env dist/database/cleanup-sessions.js
```

## Project Structure

```
src/
├── admin/        Admin user management
├── bet/          Match and extra bets
├── database/     DB connection, config, and one-off scripts
├── edition/      Tournament edition management
├── logger/       Pino HTTP logger
├── mailer/       Nodemailer + email templates
├── match/        Match data, sync service, external API client
├── middlewares/  Auth guards, cache headers, error handler
├── news/         News scraping and storage
├── ranking/      Points calculation and ranking
├── shared/       Base controller
├── team/         Team data
├── user/         Auth, registration, profile
├── utils/        Shared helpers (errors, cache, env parsing)
└── websocket/    WebSocket service
```

## PM2

See [PM2_COMMANDS.md](PM2_COMMANDS.md) for production process management commands.
