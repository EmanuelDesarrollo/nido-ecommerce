# PLAN — Nido "Corazonada" (Prueba técnica TANKU Full Stack)

> Documento para Claude Code. Léelo completo antes de empezar. Ejecuta por fases, en orden.
> Al terminar cada fase: verifica que compila y corre, haz commit y reporta en 3 líneas.
> Tiempo total disponible: ~3 horas. **Prioridad absoluta: un flujo de punta a punta funcionando y desplegado.**
> Si algo se complica más de 15 min, simplifica y anótalo en `README.md > Lo que no alcancé`.

---

## 1. La idea

**Problema:** el 35% de las compras son regalos y el 22% se devuelven. Quien regala adivina ("¿le gustará?, ¿qué talla usa?"), quien recibe no participa y la relación termina en el checkout.

**Solución: Corazonada, el regalo sorpresa con pistas.**
Quien recibe sí participa, pero **sin saber qué le van a regalar ni quién**.

1. **Andrés** (quien regala) inicia una sorpresa para **Laura** con un presupuesto.
2. Laura recibe en tiempo real: *"Alguien está preparando una sorpresa para ti 🎁. Danos unas pistas"*. Responde un mini juego de 4 preguntas tipo tarjetas (qué le gusta, estilo, talla, qué NO quiere). No ve productos ni sabe quién es.
3. Andrés ve las pistas llegar **en vivo**. El catálogo se filtra y ordena con un puntaje de **"Corazonada %"** (match de gustos + talla disponible + presupuesto).
4. Andrés elige el producto (la talla se precarga con la pista de Laura), escribe un mensaje y paga en el checkout simulado (aprobado / rechazado / pendiente, y ambos ven el estado).
5. Laura recibe "Tu sorpresa va en camino" y luego **la destapa**: animación de unboxing, ve el regalo, quién se lo dio y el mensaje, y reacciona (emoji + agradecimiento). Andrés ve la reacción **en vivo**.
6. **Ciclo de recompra:** las pistas de Laura quedan como su **perfil de gustos** y, tras destapar, se le propone *"Devuélvele el gesto a Andrés"* con un botón que inicia una nueva Corazonada.

**Métricas:**
- Principal: **tasa de devolución** (talla y gustos informados). Meta: bajar del 22% a menos del 12% en regalos Corazonada.
- Secundaria: **conversión de quien regala** (menos abandono por no saber qué comprar) y **recompra a 90 días** (perfil de gustos reutilizable + ciclo "devolver el gesto").
- Medición: A/B entre regalo normal y Corazonada, con eventos `clues_requested`, `clues_answered`, `checkout_approved`, `revealed`, `thanked`, `return_requested` y `reciprocal_gift_created`.

---

## 2. Stack y estructura

Monorepo con **pnpm workspaces** (un solo repositorio de GitHub).

```
/
├── apps/
│   ├── api/        NestJS + TypeScript + Prisma + Socket.io  → Railway
│   └── web/        Next.js (App Router) + TypeScript + Tailwind → Vercel
├── packages/
│   └── shared/     tipos, DTOs, enums de estado y nombres de eventos de socket (compilado con tsc a dist/)
├── pnpm-workspace.yaml
├── package.json
├── PLAN.md
└── README.md
```

- **Base de datos:** PostgreSQL (Railway) con Prisma 6. En local, Postgres por `docker-compose.yml` en el puerto **5433**.
- **Versiones fijadas:** NestJS 11 (la 12 es solo ESM y complica Jest), Prisma 6.19 (`latest` es una RC de la 8), TypeScript 5.9, Next 16.
- **Shared:** `packages/shared` con `"main": "dist/index.js"`, `"types": "dist/index.d.ts"` y `build: tsc`. Las apps lo consumen con `"@nido/shared": "workspace:*"`. En Next, agregar `transpilePackages: ['@nido/shared']`. **Si el paquete compartido da problemas de build por más de 15 min, duplicar los tipos y anotarlo.**
- **Frontend:** casi todo `'use client'` (hay sockets e interacción). Sin server actions. Mobile first (diseñar a 375px). Tailwind.
- **Variables de entorno:** nunca en el repo. Crear `apps/api/.env.example` y `apps/web/.env.example`.
  - api: `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `PENDING_PAYMENT_DELAY_MS`
  - web: `NEXT_PUBLIC_API_URL`

---

## 3. Arquitectura del backend

Clean Architecture **solo en el módulo core `gifts`**. Los módulos `users` y `catalog` se mantienen simples (controller + service + Prisma), como decisión consciente para ahorrar tiempo.

```
apps/api/src/
├── main.ts                 helmet, CORS (CORS_ORIGIN), ValidationPipe global (whitelist, forbidNonWhitelisted)
├── prisma/                 PrismaService
├── common/                 UserGuard (header x-user-id), filtros de error
├── users/                  GET /users (los 2 precargados), GET /users/me
├── catalog/                GET /products?giftId=… (con Corazonada %)
└── gifts/
    ├── domain/
    │   ├── gift.entity.ts          máquina de estados con transiciones validadas
    │   ├── gift-status.ts
    │   ├── match-score.ts          función pura para el puntaje
    │   └── errors.ts               InvalidTransitionError, etc.
    ├── application/
    │   ├── ports/                  GiftRepository, PaymentGateway, Notifier (interfaces + tokens de DI)
    │   └── use-cases/              CreateGift, AnswerClues, Checkout, ResolvePendingPayment, RevealGift, ThankGift
    ├── infrastructure/
    │   ├── prisma-gift.repository.ts
    │   ├── simulated-payment.gateway.ts
    │   └── socket.notifier.ts      implementa Notifier usando el gateway de Socket.io
    └── presentation/
        ├── gifts.controller.ts
        ├── dto/
        └── events.gateway.ts       Socket.io: rooms `user:{id}`
```

### Identidad (sin login, lo pide la prueba)
- Dos usuarios precargados: **Andrés** y **Laura** (ids fijos en el seed).
- El front tiene una pantalla "Entrar como…" y guarda el id elegido.
- HTTP: header `x-user-id`, validado por `UserGuard` contra la base de datos (401 si no existe).
- Socket: `auth: { userId }` en el handshake; el servidor valida y une al socket a la room `user:{id}`.
- En el README: "en producción sería auth real (JWT/sesión); aquí es un selector por requerimiento de la prueba".

---

## 4. Modelo de datos (Prisma)

```prisma
model User {
  id           String   @id
  name         String
  avatarUrl    String
  tasteProfile Json?            // última versión de sus pistas (perfil de gustos reutilizable)
  sentGifts     Gift[] @relation("sender")
  receivedGifts Gift[] @relation("recipient")
}

model Product {
  id         Int      @id @default(autoincrement())
  externalId Int      @unique   // id de DummyJSON
  title      String
  category   String   // mapeada a: moda, belleza, tecnologia, hogar
  tags       String[]
  priceCop   Int
  imageUrl   String
  variants   ProductVariant[]
}

model ProductVariant {
  id        Int     @id @default(autoincrement())
  productId Int
  product   Product @relation(fields: [productId], references: [id])
  size      String  // "XS".."XL" para moda, "UNICA" para el resto
  stock     Int
}

model Gift {
  id           String     @id @default(cuid())
  senderId     String
  recipientId  String
  sender       User       @relation("sender", fields: [senderId], references: [id])
  recipient    User       @relation("recipient", fields: [recipientId], references: [id])
  budgetCop    Int
  status       GiftStatus
  clues        Json?      // respuestas de quien recibe
  productId    Int?
  variantId    Int?
  message      String?
  reaction     String?    // emoji
  thankYouNote String?
  revealedAt   DateTime?
  payments     Payment[]
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}

model Payment {
  id             String        @id @default(cuid())
  giftId         String
  gift           Gift          @relation(fields: [giftId], references: [id])
  amountCop      Int
  status         PaymentStatus
  cardLast4      String
  idempotencyKey String        @unique
  failureReason  String?
  createdAt      DateTime      @default(now())
}

enum GiftStatus {
  CLUES_REQUESTED    // creada, esperando pistas
  CLUES_ANSWERED     // pistas listas, quien regala elige producto
  PAYMENT_PENDING
  PAYMENT_REJECTED   // se puede reintentar
  PAID               // "va en camino"; quien recibe puede destapar
  REVEALED
  THANKED
}

enum PaymentStatus { APPROVED REJECTED PENDING }
```

### Transiciones válidas (en `gift.entity.ts`; cualquier otra lanza `InvalidTransitionError` → HTTP 409)
- `CLUES_REQUESTED → CLUES_ANSWERED` (solo quien recibe)
- `CLUES_REQUESTED → CLUES_ANSWERED` vía "seguir sin pistas" (quien regala; `clues = null`, el puntaje usa solo el presupuesto)
- `CLUES_ANSWERED | PAYMENT_REJECTED → PAYMENT_PENDING | PAID | PAYMENT_REJECTED` (checkout, solo quien regala)
- `PAYMENT_PENDING → PAID | PAYMENT_REJECTED` (resolución asíncrona)
- `PAID → REVEALED` (solo quien recibe)
- `REVEALED → THANKED` (solo quien recibe)

---

## 5. Checkout simulado (punto fuerte, hacerlo bien)

`POST /gifts/:id/checkout` con header `Idempotency-Key` (uuid generado en el front al montar el formulario) y body `{ productId, variantId, message, cardNumber, expiry, cvc }`.

1. Validar el DTO (formato de tarjeta con 16 dígitos + Luhn, expiración futura, cvc de 3 dígitos).
2. **Idempotencia:** si ya existe un Payment con esa key, devolver el mismo resultado sin cobrar de nuevo.
3. Verificar que quien llama es el sender y que la transición es válida.
4. **El backend calcula el monto desde la base de datos** (precio del producto) y nunca lo toma del cliente. Rechazar si supera `budgetCop` o si la variante no tiene stock.
5. `SimulatedPaymentGateway` decide por número de tarjeta:
   - `4242 4242 4242 4242` → APPROVED
   - `4000 0000 0000 0002` → REJECTED (`"Fondos insuficientes"`)
   - `4000 0000 0000 3220` → PENDING; tras `PENDING_PAYMENT_DELAY_MS` (default 6000) se resuelve como APPROVED vía `ResolvePendingPayment` (simula un webhook del procesador). Usar `setTimeout` en memoria y documentar que en producción sería un webhook real + cola.
   - Cualquier otra tarjeta válida por Luhn → APPROVED
6. Si queda APPROVED: descontar stock de la variante **en transacción** con el cambio de estado.
7. Emitir eventos de socket a **ambos** usuarios.

**Cómo lo ve cada persona:**
- Quien regala: aprobado → "¡Listo! Va en camino"; rechazado → motivo + botón reintentar; pendiente → spinner "Confirmando con el banco…" que se actualiza solo por socket.
- Quien recibe: solo ve "Tu sorpresa va en camino 🎁" cuando queda PAID. **Nunca ve rechazos ni montos**, para no arruinar la sorpresa.

---

## 6. Corazonada % (función pura, testeable)

`matchScore(product, clues, budgetCop): number` de 0 a 100:
- Si el precio supera el presupuesto → excluido.
- Si la categoría está marcada en "NO quiero" → excluido.
- Si es moda y no hay stock en la talla de la pista → excluido.
- Categoría favorita: +50 (la segunda favorita: +30).
- Coincidencia de estilo con los tags: +25.
- Precio entre el 60% y el 100% del presupuesto: +25.
- Sin pistas → ordenar por precio cercano al presupuesto, con puntaje base de 50.

### Preguntas de las pistas (fijas, en `packages/shared`)
1. ¿Qué te emociona más? (elige hasta 2): Moda · Belleza · Tecnología · Hogar
2. Tu estilo: Clásico · Atrevido · Minimal · Cómodo
3. Tu talla de ropa: XS · S · M · L · XL
4. ¿Algo que definitivamente NO quieras? (una categoría o "Nada, sorpréndeme")

---

## 7. Eventos en tiempo real (`packages/shared/events.ts`)

| Evento | A quién | Cuándo |
|---|---|---|
| `gift:clues_requested` | recipient | se crea la sorpresa (sin datos del sender) |
| `gift:clues_answered` | sender | quien recibe responde (incluye las pistas) |
| `gift:payment_updated` | sender | cada cambio de pago (pending/approved/rejected) |
| `gift:on_the_way` | recipient | queda PAID |
| `gift:revealed` | sender | quien recibe destapa ("Laura está viendo tu regalo 👀") |
| `gift:thanked` | sender | reacción + nota de agradecimiento |

---

## 8. Seed

Script `prisma/seed.ts`:
- Usuarios `andres` y `laura` (avatares de `https://i.pravatar.cc/150?u=…`).
- Traer de DummyJSON (`https://dummyjson.com/products/category/{cat}`) las categorías:
  - moda: `womens-dresses`, `tops`, `mens-shirts`, `womens-shoes`
  - belleza: `beauty`, `fragrances`
  - tecnologia: `smartphones`, `laptops`, `mobile-accessories`
  - hogar: `home-decoration`, `kitchen-accessories`
- Precio: `priceCop = Math.round(price * 4000 / 1000) * 1000`.
- Variantes: moda → tallas XS–XL con stock aleatorio entre 0 y 5 (dejar algunas en 0 para demostrar el filtro por talla); el resto → `UNICA` con stock de 10.
- **Si la petición a DummyJSON falla**, usar un JSON local de respaldo (`prisma/fallback-products.json`, unos 30 productos) para que el despliegue no dependa de la API externa.
- El seed debe ser idempotente (upsert).

---

## 9. Frontend (mobile first)

| Ruta | Quién | Contenido |
|---|---|---|
| `/` | todos | "Entrar como" con tarjetas de Andrés y Laura |
| `/home` | todos | Bandeja: sorpresas enviadas y recibidas con su estado, notificaciones en vivo (toast) |
| `/gift/new` | sender | elegir destinatario + presupuesto (chips: 100k, 200k, 300k COP) → "Pedir pistas" |
| `/clues/[id]` | recipient | juego de 4 tarjetas, una por pantalla, barra de progreso. Texto: "Alguien te prepara una sorpresa" |
| `/gift/[id]` | sender | estado en vivo; pistas apareciendo en tiempo real; grilla de productos con badge "Corazonada 87%"; detalle con talla precargada; mensaje → checkout |
| `/gift/[id]/checkout` | sender | resumen + formulario de tarjeta + **3 botones "usar tarjeta de prueba"** (aprobada / rechazada / pendiente) para la demo |
| `/reveal/[id]` | recipient | caja que se abre al tocar (animación CSS), revela producto, quién lo envió y el mensaje; reacción con emoji + nota de agradecimiento; luego "Devuélvele el gesto" → `/gift/new?to=andres` |

- Un `SocketProvider` (contexto) que conecta con el userId actual y expone los eventos; toasts globales con `sonner` o similar.
- Estética cálida (no transaccional): colores coral/crema, bordes redondeados, emojis con moderación.
- **Para la demo:** dos ventanas lado a lado (una normal y una incógnita), una como Andrés y otra como Laura.

---

## 10. Pruebas (Jest, solo lógica crítica)

- `gift.entity.spec.ts`: transiciones válidas e inválidas, permisos por rol (sender/recipient).
- `match-score.spec.ts`: exclusiones (presupuesto, talla sin stock, categoría vetada) y orden.
- `checkout.use-case.spec.ts` con repositorio y gateway en memoria: aprobado descuenta stock; rechazado permite reintentar; idempotencia (misma key = un solo pago); el monto viene de la base de datos; si supera el presupuesto, error.
- `simulated-payment.gateway.spec.ts`: las 3 tarjetas.

---

## 11. Despliegue (un solo repositorio, sin GitHub Actions obligatorias)

Vercel y Railway se conectan **al mismo repositorio** y despliegan solos al hacer push a `main`. GitHub Actions es opcional (solo para correr tests en PR).

**Railway (api + Postgres):**
- New Project → Deploy from GitHub repo → agregar el plugin PostgreSQL.
- Root directory: `/` (raíz del monorepo, para que pnpm vea el workspace).
- Build: `pnpm install --frozen-lockfile && pnpm build:api` (shared → `prisma generate` → `nest build`; Prisma debe generarse **antes** de compilar). Ya configurado en `railway.json` (build, start, healthcheck y watch paths).
- Start: `pnpm --filter api prisma migrate deploy && pnpm --filter api prisma db seed && node apps/api/dist/main.js`
- Variables: `DATABASE_URL` (referencia al plugin), `CORS_ORIGIN=https://<app>.vercel.app`, `PORT` (lo inyecta Railway; leer `process.env.PORT`).
- Watch paths: `apps/api/**`, `packages/shared/**`.
- Generar el dominio público en Settings → Networking.

**Vercel (web):**
- Import del mismo repositorio → Root Directory: `apps/web` (Vercel detecta pnpm workspaces).
- Variable: `NEXT_PUBLIC_API_URL=https://<api>.up.railway.app`.
- El script `build` de `apps/web` compila `@nido/shared` antes de `next build` (Vercel no lo haría solo).

**Fallas típicas a revisar:** CORS con el dominio exacto de Vercel (sin `/` final), Socket.io en el cliente con `transports: ['websocket']`, y que Prisma genere el cliente en el build.

---

## 12. Fases (con presupuesto de tiempo)

### Fase 0 — Esqueleto y despliegue vacío (≈30 min) ⚠️ crítica
- Monorepo pnpm, `apps/api` (Nest) con `GET /health`, `apps/web` (Next + Tailwind) con una página que llame a `/health` y muestre "conectado".
- `packages/shared` compilando y consumido por ambos.
- Prisma + docker-compose de Postgres en local.
- `.env.example`, `.gitignore`, scripts en la raíz: `dev`, `build`, `test`.
- **Detenerse aquí para que el usuario despliegue en Railway y Vercel y confirme que la web habla con la API en producción.**

### Fase 1 — Backend core (≈60 min)
- Schema + migración + seed.
- UserGuard, módulos users y catalog.
- Módulo gifts completo: entidad, casos de uso, repositorio Prisma, gateway de pago simulado, notifier, controller, events gateway.
- Endpoints: `POST /gifts`, `GET /gifts` (enviados y recibidos del usuario actual), `GET /gifts/:id` (respuesta filtrada según rol: quien recibe no ve el sender ni el producto antes de destapar), `POST /gifts/:id/clues`, `POST /gifts/:id/skip-clues`, `GET /products?giftId=`, `POST /gifts/:id/checkout`, `POST /gifts/:id/reveal`, `POST /gifts/:id/thanks`.
- Tests de la sección 10.

### Fase 2 — Frontend del flujo (≈60 min)
- Pantallas de la sección 9 en orden de flujo, con SocketProvider y toasts.
- Probar el flujo completo con dos ventanas en local.

### Fase 3 — Despliegue final y casos límite (≈20 min)
- Push, verificar el flujo en producción con las 3 tarjetas.
- Estados vacíos, carga y error en cada pantalla.

### Fase 4 — README (lo hace el usuario con ayuda, de 8 a 9 pm)
Secciones: Demo (URLs), La idea y la métrica (propuesta en una página), Arquitectura y decisiones técnicas, Modelo de datos, Cómo correr en local, Tarjetas de prueba, Tests, Lo que no alcancé y cómo lo haría, Uso de IA.

**"Lo que no alcancé" (precargar):** IA real para recomendar (embeddings o un LLM sobre el perfil de gustos + catálogo) en lugar de reglas; vaca grupal (varios pagan una Corazonada, con barra de progreso en vivo); recordatorios de fechas especiales usando perfiles de gustos; webhooks reales + cola (BullMQ) para pagos pendientes; auth real; métricas de eventos con un pipeline de analítica.
