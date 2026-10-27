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

## Fase 1 — Backend core
- **IA:** generó `@nido/shared` (estados, pistas, eventos, DTOs), schema + migración, seed con DummyJSON y respaldo local (30 productos reales), módulos `users` y `catalog`, el módulo `gifts` en Clean Architecture (entidad, `match-score`, puertos, 8 casos de uso, repositorio Prisma, gateway simulado, notifier por socket, scheduler de pagos pendientes), 44 tests y `scripts/smoke.mjs` (47 verificaciones de punta a punta).
- **Decisiones/correcciones:**
  - Los tests detectaron un bug: como `PAYMENT_PENDING → PAID` es válido para la resolución, se permitía otro checkout con un pago pendiente (doble cobro). Se restringió el checkout a `CLUES_ANSWERED | PAYMENT_REJECTED`.
  - Los casos de uso no dependen de Nest: se cablean con `useFactory` en `gifts.module.ts` y se prueban con un repositorio en memoria.
  - Quien recibe ve `PAYMENT_PENDING`/`PAYMENT_REJECTED` como `CLUES_ANSWERED`, y no ve remitente, producto ni mensaje hasta destapar.
  - El seed carga el catálogo solo una vez (corre en cada deploy de Render y no debe reiniciar el stock).
  - Al reiniciar el servidor se reprograman los pagos `PENDING`.
  - CORS de Socket.io con un `IoAdapter` que reutiliza `CORS_ORIGIN`; `.env` local con `process.loadEnvFile()` (sin dependencias nuevas).
  - Se agregó `socket.io-client` a `apps/web` (lo necesita la Fase 2) y lo reutiliza el script de humo.
  - Pendiente conocido: dos checkouts *simultáneos* con la misma Idempotency-Key chocan con el índice único y el segundo da 500 (los reintentos secuenciales sí devuelven el mismo pago).
