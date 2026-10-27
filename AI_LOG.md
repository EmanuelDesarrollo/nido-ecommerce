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

## Fase 2 — Frontend
- **IA:** generó las 7 pantallas del plan (entrar como, bandeja, nueva Corazonada, juego de pistas, regalo con catálogo y detalle, checkout, destape), `SessionProvider`, `SocketProvider` con toasts globales (`sonner`), `useApi` y la animación de unboxing en CSS.
- **Decisiones/correcciones:**
  - El usuario agregó a CLAUDE.md las reglas de frontend (App Router, `next/image` con `remotePatterns`, estados de carga/vacío/error, `next build` antes de cada commit).
  - Con `cacheComponents`, cada `page.tsx` es un Server Component que envuelve la vista cliente en `<Suspense>`; el build falló una vez por `usePathname` en los toasts del layout (se cambió a `window.location` al momento del evento y se envolvió en `Suspense`).
  - ESLint (reglas de React 19) marcó `setState` dentro de efectos: se reescribió con estado derivado (`useApi`), `useSyncExternalStore` (sesión) y `useMemo` (socket), sin desactivar la regla.
  - Sesión en `sessionStorage` para poder usar dos pestañas como Andrés y Laura.
  - Una clave de idempotencia por intento de pago: se regenera solo al reintentar tras un rechazo.
  - No había navegador automatizado en la sesión: se verificó con `tsc`, `eslint`, `next build`, compilación de cada ruta en dev, el optimizador de imágenes y `pnpm smoke`; el recorrido visual con dos ventanas lo hace el usuario.
  - **Usuario:** pidió que en escritorio no se viera como un teléfono. **IA:** layout responsive (mobile first + breakpoints `md`/`lg`): contenedor de hasta 6xl, bandeja en 2 columnas, regalo con panel lateral de pistas y catálogo de 3–4 columnas, detalle como modal centrado, checkout en 2 columnas y formularios centrados a ancho legible.

## Fase 3 — Despliegue final y casos límite
- **IA:** `error.tsx` y `not-found.tsx` globales; un 401 cierra la sesión (usuario borrado o base reiniciada); al reconectar el socket se recargan los datos (eventos perdidos mientras Render dormía o se cayó la red); aviso "Reconectando…" en el encabezado.
- **Verificación:** `pnpm smoke` contra producción (Render) pasó completo, con las 3 tarjetas: rechazada, pendiente que se resuelve sola y aprobada.
- **Usuario:** recorrió el flujo con dos ventanas en local y validó el diseño responsive.
