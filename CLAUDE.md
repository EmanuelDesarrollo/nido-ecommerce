# CLAUDE.md — Nido "Corazonada"

Prueba técnica TANKU Full Stack. **Plazo duro: entrega antes de las 9:00 pm (hoy).**
El detalle completo (idea, modelo de datos, endpoints, eventos, fases) está en `PLAN.md`. Léelo antes de cualquier tarea y síguelo; si algo cambia, actualiza PLAN.md.

## Reglas de trabajo
- Trabaja por fases (ver PLAN.md §12). Al terminar una fase: compila, corre los tests, haz commit y reporta en máximo 3 líneas.
- Prioridad: un flujo de punta a punta funcionando y desplegado > pantallas extra > pulido.
- Si algo se traba más de 15 min, simplifícalo y anótalo en la sección "Lo que no alcancé" del README.
- No agregues dependencias ni features fuera del plan sin preguntar.
- Responde y comenta en español. Código, nombres y commits en inglés.

## Stack
- Monorepo pnpm workspaces: `apps/api` (NestJS + Prisma + Socket.io), `apps/web` (Next.js App Router + Tailwind), `packages/shared` (tipos, enums, eventos; compila con tsc).
- PostgreSQL. Despliegue: api → Render (Web Service gratis + Render Postgres), web → Vercel (mismo repositorio). Configuración en PLAN.md §11.

## Convenciones
- TypeScript estricto en todo. Sin `any`.
- Clean Architecture **solo** en `apps/api/src/gifts` (domain / application / infrastructure / presentation). Los módulos `users` y `catalog` son simples a propósito.
- Las reglas de negocio viven en el dominio (`gift.entity.ts`, `match-score.ts`); los controllers solo orquestan.
- Los tipos, estados y nombres de eventos de socket se importan de `@nido/shared`, nunca como strings sueltos.
- Validación con DTOs + `ValidationPipe` global. El backend nunca confía en precios ni montos enviados por el cliente.
- Frontend mobile first (diseñar a 375px). Componentes con sockets o interacción → `'use client'`. Sin server actions.
- Commits pequeños con conventional commits (`feat:`, `fix:`, `chore:`, `test:`).

### Frontend Next.js
- Usa solo App Router (`app/`), nunca Pages Router.
- Usa layouts y Server Components solo para el shell estático; las pantallas con sockets, usuario actual o interacción son `'use client'` (decisión del plan, tiene prioridad).
- Cada pantalla que carga datos debe tener estados de carga, vacío y error visibles (`loading.tsx`/`error.tsx` o estados en el componente).
- Imágenes de producto con `next/image`; configura `images.remotePatterns` para `cdn.dummyjson.com` e `i.pravatar.cc`.
- Usa el `metadata` export en el layout raíz (título "Nido · Corazonada"), sin `generateMetadata` por página.
- Corre `next build` antes de cada commit del frontend.
- Con `cacheComponents` activo, las vistas cliente que usan `useParams`/`useSearchParams` van dentro de un `<Suspense>` (el `page.tsx` de servidor lo pone), o el build falla.

## Seguridad
- Cero secretos en el repositorio. Usa variables de entorno y mantén actualizados `apps/api/.env.example` y `apps/web/.env.example`.
- CORS restringido a `CORS_ORIGIN`. Usa helmet.
- Identidad: header `x-user-id` validado por `UserGuard`; socket con `auth.userId` validado y room `user:{id}`.

## Comandos (raíz)
- `pnpm dev`: api + web en paralelo
- `pnpm build`: shared → api → web
- `pnpm test`: tests de la api (Jest)
- `pnpm smoke`: flujo completo contra la API (`API_URL=https://… pnpm smoke` para producción)
- `pnpm --filter api prisma migrate dev` / `pnpm --filter api prisma db seed`
- `docker compose up -d`: Postgres local

## Registro de uso de IA
Mantén `AI_LOG.md` con viñetas breves: qué generó la IA en cada fase y qué se corrigió o decidió manualmente. Se usará para la sección "Uso de IA" del README.
