// End-to-end smoke test of the API: HTTP + Socket.io, with the 3 test cards.
// Usage: API_URL=http://localhost:3001 node scripts/smoke.mjs
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { io } = require('socket.io-client');

const API = process.env.API_URL ?? 'http://localhost:3001';
const CARDS = { approved: '4242 4242 4242 4242', rejected: '4000 0000 0000 0002', pending: '4000 0000 0000 3220' };
let failures = 0;

function check(label, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

async function call(user, method, path, body, headers = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(user ? { 'x-user-id': user } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

function listen(userId) {
  const events = [];
  const socket = io(API, { transports: ['websocket'], auth: { userId } });
  socket.onAny((event, payload) => events.push({ event, payload }));
  const ready = new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
  });
  const waitFor = (event, giftId, timeoutMs = 15000) =>
    new Promise((resolve, reject) => {
      const started = Date.now();
      const tick = () => {
        const found = events.find((e) => e.event === event && e.payload.giftId === giftId);
        if (found) return resolve(found.payload);
        if (Date.now() - started > timeoutMs) return reject(new Error(`timeout waiting ${event}`));
        setTimeout(tick, 100);
      };
      tick();
    });
  return { socket, events, ready, waitFor };
}

const card = (number) => ({ cardNumber: number, expiry: '12/30', cvc: '123' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`API: ${API}\n`);
  check('GET /health', (await call(null, 'GET', '/health')).status === 200);
  const users = await call(null, 'GET', '/users');
  check('GET /users lists Andrés and Laura', users.body.length === 2, users.body.map((u) => u.name).join(', '));
  check('401 without x-user-id', (await call(null, 'GET', '/gifts')).status === 401);
  check('401 with an unknown user', (await call('mallory', 'GET', '/gifts')).status === 401);

  const andres = listen('andres');
  const laura = listen('laura');
  const intruder = io(API, { transports: ['websocket'], auth: { userId: 'mallory' } });
  await Promise.all([andres.ready, laura.ready]);
  check('sockets connect as Andrés and Laura', true);
  await sleep(500);
  check('socket with unknown user is disconnected', !intruder.connected);
  intruder.close();

  // --- Gift 1: clues + rejected, pending and approved cards ---
  const created = await call('andres', 'POST', '/gifts', { recipientId: 'laura', budgetCop: 200000 });
  const giftId = created.body.id;
  check('POST /gifts creates CLUES_REQUESTED', created.status === 201 && created.body.status === 'CLUES_REQUESTED');
  const requested = await laura.waitFor('gift:clues_requested', giftId);
  check('Laura gets gift:clues_requested without sender data', Object.keys(requested).join() === 'giftId');

  const lauraView = (await call('laura', 'GET', `/gifts/${giftId}`)).body;
  check('Laura cannot see sender or budget', lauraView.sender === null && !('budgetCop' in lauraView));
  check('a stranger gets 404', (await call('andres', 'GET', `/gifts/does-not-exist`)).status === 404);
  check('checkout before clues is 409', (await call('andres', 'POST', `/gifts/${giftId}/checkout`, { productId: 1, variantId: 1, ...card(CARDS.approved) }, { 'idempotency-key': randomUUID() })).status === 409);
  check('Andrés cannot answer the clues (403)', (await call('andres', 'POST', `/gifts/${giftId}/clues`, { favoriteCategories: ['moda'], style: 'minimal', size: 'M' })).status === 403);
  check('invalid clues are 400', (await call('laura', 'POST', `/gifts/${giftId}/clues`, { favoriteCategories: ['comida'], style: 'x', size: 'XXL' })).status === 400);

  const clues = { favoriteCategories: ['moda', 'belleza'], style: 'minimal', size: 'M', avoidCategory: 'hogar' };
  const answered = await call('laura', 'POST', `/gifts/${giftId}/clues`, clues);
  check('Laura answers the clues', answered.status === 200 && answered.body.status === 'CLUES_ANSWERED');
  const cluesEvent = await andres.waitFor('gift:clues_answered', giftId);
  check('Andrés gets gift:clues_answered with the clues', cluesEvent.clues?.size === 'M');
  const me = (await call('laura', 'GET', '/users/me')).body;
  check('Laura keeps the clues as taste profile', me.tasteProfile?.style === 'minimal');

  check('Laura cannot browse the catalog (403)', (await call('laura', 'GET', `/products?giftId=${giftId}`)).status === 403);
  const catalog = (await call('andres', 'GET', `/products?giftId=${giftId}`)).body;
  const top = catalog.products[0];
  check(
    'catalog is ranked by Corazonada % and respects the clues',
    catalog.products.length > 0 &&
      catalog.products.every((p) => p.priceCop <= 200000 && p.category !== 'hogar') &&
      catalog.products.every((p, i, all) => i === 0 || all[i - 1].score >= p.score),
    `${catalog.products.length} products, top: "${top.title}" ${top.score}%`,
  );
  const variant = top.variants.find((v) => v.size === (top.category === 'moda' ? 'M' : 'UNICA'));
  const stockBefore = variant.stock;
  const order = { productId: top.id, variantId: variant.id, message: '¡Feliz cumpleaños!' };

  check('a client-sent amount is refused (400)', (await call('andres', 'POST', `/gifts/${giftId}/checkout`, { ...order, ...card(CARDS.approved), amountCop: 1 }, { 'idempotency-key': randomUUID() })).status === 400);
  check('a card failing Luhn is 400', (await call('andres', 'POST', `/gifts/${giftId}/checkout`, { ...order, ...card('4242 4242 4242 4241') }, { 'idempotency-key': randomUUID() })).status === 400);
  check('missing Idempotency-Key is 400', (await call('andres', 'POST', `/gifts/${giftId}/checkout`, { ...order, ...card(CARDS.approved) })).status === 400);

  const rejected = await call('andres', 'POST', `/gifts/${giftId}/checkout`, { ...order, ...card(CARDS.rejected) }, { 'idempotency-key': randomUUID() });
  check('card 0002 is REJECTED', rejected.body.payment?.status === 'REJECTED' && rejected.body.giftStatus === 'PAYMENT_REJECTED', rejected.body.payment?.failureReason);
  const rejectedEvent = await andres.waitFor('gift:payment_updated', giftId);
  check('Andrés gets gift:payment_updated REJECTED', rejectedEvent.paymentStatus === 'REJECTED');
  const lauraAfterReject = (await call('laura', 'GET', `/gifts/${giftId}`)).body;
  check('Laura never sees the rejection', lauraAfterReject.status === 'CLUES_ANSWERED' && !laura.events.some((e) => e.event === 'gift:payment_updated'));

  const pendingKey = randomUUID();
  const pending = await call('andres', 'POST', `/gifts/${giftId}/checkout`, { ...order, ...card(CARDS.pending) }, { 'idempotency-key': pendingKey });
  check('card 3220 is PENDING', pending.body.payment?.status === 'PENDING' && pending.body.giftStatus === 'PAYMENT_PENDING');
  const replay = await call('andres', 'POST', `/gifts/${giftId}/checkout`, { ...order, ...card(CARDS.pending) }, { 'idempotency-key': pendingKey });
  check('same Idempotency-Key returns the same payment', replay.body.payment?.id === pending.body.payment.id);
  check('a new checkout while pending is 409', (await call('andres', 'POST', `/gifts/${giftId}/checkout`, { ...order, ...card(CARDS.approved) }, { 'idempotency-key': randomUUID() })).status === 409);
  check('Laura cannot reveal before it is paid (409)', (await call('laura', 'POST', `/gifts/${giftId}/reveal`)).status === 409);
  console.log('   … waiting for the simulated bank to settle the pending payment');
  const onTheWay = await laura.waitFor('gift:on_the_way', giftId, 20000);
  check('pending settles and Laura gets gift:on_the_way', onTheWay.giftId === giftId);
  const settled = andres.events.filter((e) => e.event === 'gift:payment_updated' && e.payload.giftId === giftId).at(-1).payload;
  check('Andrés gets gift:payment_updated APPROVED', settled.paymentStatus === 'APPROVED' && settled.giftStatus === 'PAID');

  const after = (await call('andres', 'GET', `/products?giftId=${giftId}`)).body.products.find((p) => p.id === top.id);
  const stockAfter = after ? after.variants.find((v) => v.id === variant.id).stock : 0;
  check('approved payment took one unit of stock', stockAfter === stockBefore - 1, `${stockBefore} → ${stockAfter}`);

  const paidView = (await call('laura', 'GET', `/gifts/${giftId}`)).body;
  check('before revealing, Laura still sees no product or sender', paidView.status === 'PAID' && paidView.product === null && paidView.sender === null);
  check('Andrés cannot reveal (403)', (await call('andres', 'POST', `/gifts/${giftId}/reveal`)).status === 403);
  const revealed = await call('laura', 'POST', `/gifts/${giftId}/reveal`);
  check('Laura reveals: sees sender, product and message', revealed.body.sender?.name === 'Andrés' && revealed.body.product?.id === top.id && revealed.body.message === '¡Feliz cumpleaños!');
  check('Andrés gets gift:revealed', (await andres.waitFor('gift:revealed', giftId)).recipientName === 'Laura');
  check('revealing twice is 409', (await call('laura', 'POST', `/gifts/${giftId}/reveal`)).status === 409);
  check('an unknown reaction is 400', (await call('laura', 'POST', `/gifts/${giftId}/thanks`, { reaction: '💩' })).status === 400);
  const thanked = await call('laura', 'POST', `/gifts/${giftId}/thanks`, { reaction: '😍', thankYouNote: '¡Me encantó!' });
  check('Laura thanks', thanked.body.status === 'THANKED');
  const thanksEvent = await andres.waitFor('gift:thanked', giftId);
  check('Andrés gets gift:thanked live', thanksEvent.reaction === '😍' && thanksEvent.thankYouNote === '¡Me encantó!');

  // --- Gift 2: skip clues + approved card on first try (reciprocal gift) ---
  const gift2 = (await call('laura', 'POST', '/gifts', { recipientId: 'andres', budgetCop: 100000 })).body;
  check('Laura cannot skip clues on a gift she receives (403)', (await call('andres', 'POST', `/gifts/${gift2.id}/skip-clues`)).status === 403);
  const skipped = await call('laura', 'POST', `/gifts/${gift2.id}/skip-clues`);
  check('sender skips clues', skipped.body.status === 'CLUES_ANSWERED' && skipped.body.clues === null);
  const catalog2 = (await call('laura', 'GET', `/products?giftId=${gift2.id}`)).body;
  const p2 = catalog2.products[0];
  check('catalog without clues uses base score', catalog2.products.every((p) => p.score === 50 || p.score === 75), `top: "${p2.title}" ${p2.score}%`);
  const pricey = catalog.products.find((p) => p.priceCop > 100000 && p.variants.some((v) => v.stock > 0));
  const overBudget = await call('laura', 'POST', `/gifts/${gift2.id}/checkout`, { productId: pricey.id, variantId: pricey.variants.find((v) => v.stock > 0).id, ...card(CARDS.approved) }, { 'idempotency-key': randomUUID() });
  check('a product over the budget is 422', overBudget.status === 422, overBudget.body.message);
  const approved = await call('laura', 'POST', `/gifts/${gift2.id}/checkout`, { productId: p2.id, variantId: p2.variants.find((v) => v.stock > 0).id, ...card(CARDS.approved) }, { 'idempotency-key': randomUUID() });
  check('card 4242 is APPROVED right away', approved.body.payment?.status === 'APPROVED' && approved.body.giftStatus === 'PAID');
  check('Andrés gets gift:on_the_way', (await andres.waitFor('gift:on_the_way', gift2.id)).giftId === gift2.id);

  const inbox = (await call('andres', 'GET', '/gifts')).body;
  check('GET /gifts splits sent and received', inbox.sent.some((g) => g.id === giftId) && inbox.received.some((g) => g.id === gift2.id));

  andres.socket.close();
  laura.socket.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed 🎁');
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
