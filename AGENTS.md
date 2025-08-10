# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: Next.js App Router routes (e.g., `add/`, `remove/`).
- `src/pages/api`: API routes (e.g., `health.ts`).
- `src/components` and `src/components/ui`: Reusable React UI.
- `src/lib/database`: SQLite config/connection/ops; DB file under `cache/vocabulary.db`.
- `src/{hooks,contexts,utils,types}`: Hooks, context, helpers, and shared types.
- `public/`: Static assets. `docs/`: API and schema docs. `scripts/`: data/schema migrations.

## Build, Test, and Development Commands
- `npm run dev`: Start local dev server (Turbopack) at `http://localhost:3000`.
- `npm run build`: Production build (respects envs used at build time).
- `npm start`: Serve the built app.
- `npm run lint` / `npm run lint:fix`: Lint and auto-fix.
- `npm run type-check`: TypeScript checks with `strict` settings.
- Data migration: `npm run migrate-vocab`, `:dry-run`, `:overwrite`.
- Docker: `npm run docker:build`, `docker:run`, `docker:stop`.

## Coding Style & Naming Conventions
- TypeScript + ESLint (`next/core-web-vitals`, TS). Fix with `lint:fix`.
- Components: PascalCase files (e.g., `WordList.tsx`). Hooks: `useX.ts`.
- API routes and app route segments: lowercase (e.g., `src/pages/api/health.ts`).
- Use path alias `@/*` (e.g., `import { db } from '@/lib/database'`).

## Testing Guidelines
- No unit test runner is configured yet. Prioritize `type-check` and `lint` (CI enforces both).
- If adding tests, prefer Jest + React Testing Library; use `*.test.ts(x)` co-located or under `__tests__/`.
- Focus on `src/lib/database` logic and critical hooks/utilities.

## Commit & Pull Request Guidelines
- Use Conventional Commits (e.g., `feat:`, `fix:`, `perf:`, `refactor:`). Example: `feat(db): add phrase category support`.
- PRs: include summary, linked issues, screenshots for UI, and updates to `docs/` when APIs or schema change.
- CI must pass type-check, lint, and build. Keep diffs focused and small.

## Security & Configuration Tips
- Copy `.env.example` to `.env`; never commit secrets. Required keys: `OPENAI_API_KEY`, `PRESHARED_KEY`.
- Local DB lives in `cache/`; migrations live in `scripts/`. Do not store personal data in version control.
- Health check: `GET /api/health` used by CI/Docker. Ensure it keeps returning `200`.

