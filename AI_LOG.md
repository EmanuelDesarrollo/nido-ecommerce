# Registro de uso de IA

## Fase 0 — Esqueleto
- **IA (Claude Code):** generó el monorepo pnpm (`apps/api` Nest + Prisma, `apps/web` Next + Tailwind, `packages/shared`), `GET /health`, página de estado, docker-compose, `.env.example` y el test del health.
- **Decisiones/correcciones:**
  - Versiones fijadas: NestJS 11 (no 12, que es solo ESM), Prisma 6.19 (el tag `latest` era una RC), TypeScript 5.9.
  - Postgres local en el puerto 5433 (el 5432 ya estaba ocupado).
  - Se quitó `incremental` del tsconfig de la api: con `deleteOutDir` dejaba `dist/` vacío en `nest start --watch`.
  - Orden de build corregido: `prisma generate` antes de `nest build`; la web compila `@nido/shared` antes de `next build` para Vercel.

## Cambio de despliegue: Railway → Render
- **Usuario:** decidió Render porque Railway no admite registros nuevos.
- **IA:** actualizó PLAN.md/CLAUDE.md, quitó `railway.json`, CORS acepta `*` y detectó que pnpm 11 exige Node ≥ 22.13 (se usa `NODE_VERSION=22` en vez de 20).
