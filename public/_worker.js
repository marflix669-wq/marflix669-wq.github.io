// Crée une session Stripe Checkout « embedded » (le paiement s'affiche dans le site).
// Variables à définir dans Cloudflare (Settings → Variables and Secrets) :
//   STRIPE_SECRET_KEY       (sk_test_… puis sk_live_…)  — SECRET
//   STRIPE_PUBLISHABLE_KEY  (pk_test_… puis pk_live_…)
// Le prix est fixé ICI, côté serveur : le navigateur ne peut pas le modifier.
const PRODUCTS = {
  enfant: { name: 'Maillot R2A Enfant', amount: 3000, sizes: ['4/6 ans','6/8 ans','8/10 ans','10/12 ans','12/14 ans'] },
  homme:  { name: 'Maillot R2A Homme',  amount: 3000, sizes: ['XS','S','M','L','XL','2XL','3XL','4XL'] },
  femme:  { name: 'Maillot R2A Femme',  amount: 3000, sizes: ['XS','S','M','L','XL'] }
};
const MAX_QTY = 10;

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: {
  'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });

async function checkout(request, env) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PUBLISHABLE_KEY) return json({ error: 'not_configured' }, 503);
  let b;
  try { b = await request.json(); } catch (_) { return json({ error: 'bad_request' }, 400); }
  // Panier : b.items = [{category,size,qty}] (ou ancien format à un seul article)
  const raw = Array.isArray(b && b.items) ? b.items : [b];
  if (!raw.length || raw.length > 8) return json({ error: 'bad_request' }, 400);
  const lines = [];
  let total = 0;
  for (const it of raw) {
    const p = PRODUCTS[String(it && it.category)];
    const size = String(it && it.size || '');
    const qty = Math.floor(Number(it && it.qty));
    if (!p || !p.sizes.includes(size) || !(qty >= 1 && qty <= MAX_QTY)) return json({ error: 'bad_request' }, 400);
    total += qty; lines.push({ cat: String(it.category), p, size, qty });
  }
  if (total > 20) return json({ error: 'bad_request' }, 400);

  const origin = new URL(request.url).origin;
  const build = (uiMode) => {
    const f = new URLSearchParams();
    f.set('mode', 'payment');
    f.set('ui_mode', uiMode);
    f.set('locale', 'fr');
    f.set('return_url', origin + '/merci.html?session_id={CHECKOUT_SESSION_ID}');
    lines.forEach((l, i) => {
      f.set(`line_items[${i}][quantity]`, String(l.qty));
      f.set(`line_items[${i}][price_data][currency]`, 'eur');
      f.set(`line_items[${i}][price_data][unit_amount]`, String(l.p.amount));
      f.set(`line_items[${i}][price_data][product_data][name]`, l.p.name + ' — Taille ' + l.size);
    });
    f.set('shipping_address_collection[allowed_countries][0]', 'FR');
    f.set('phone_number_collection[enabled]', 'true');
    f.set('allow_promotion_codes', 'true');
    f.set('metadata[commande]', lines.map(l => `${l.cat} ${l.size} x${l.qty}`).join(' | '));
    return f;
  };
  const create = async (uiMode, version) => {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': version },
      body: build(uiMode)
    });
    const s = await r.json().catch(() => ({}));
    return r.ok && s.client_secret ? s : null;
  };
  // Version d'API « basil » (ui_mode embedded), puis « clover » (ui_mode embedded_page) en secours.
  const s = (await create('embedded', '2025-08-27.basil')) || (await create('embedded_page', '2025-09-30.clover'));
  if (!s) return json({ error: 'stripe_error' }, 502);
  return json({ clientSecret: s.client_secret, publishableKey: env.STRIPE_PUBLISHABLE_KEY });
}

const jsonS = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
async function sessionStatus(request, env) {
  if (!env.STRIPE_SECRET_KEY) return jsonS({ error: 'not_configured' }, 503);
  const id = new URL(request.url).searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return jsonS({ error: 'bad_request' }, 400);
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions/' + id, {
    headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'Stripe-Version': '2025-08-27.basil' } });
  const s = await r.json().catch(() => ({}));
  if (!r.ok) return jsonS({ error: 'not_found' }, 404);
  return jsonS({ status: s.status, payment_status: s.payment_status, email: (s.customer_details && s.customer_details.email) || '' });
}

// Point d'entrée Cloudflare Pages (mode « advanced ») : tout vit dans le dossier public/.
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/checkout') return request.method === 'POST' ? checkout(request, env) : json({ error: 'method_not_allowed' }, 405);
    if (pathname === '/api/session-status') return request.method === 'GET' ? sessionStatus(request, env) : jsonS({ error: 'method_not_allowed' }, 405);
    if (pathname === '/api/health') return json({ ok: true });
    if (pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);
    return env.ASSETS.fetch(request);
  }
};
