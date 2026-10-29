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
const SHIPPING_CENTS = 490;   // Mondial Relay : 4,90 €
const FREE_SHIPPING_FROM = 2;  // livraison offerte dès 2 maillots (tous modèles confondus)

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
    // Livraison Mondial Relay : 4,90 € ; offerte dès 2 maillots (calculé ici, côté serveur)
    const free = total >= FREE_SHIPPING_FROM;
    f.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
    f.set('shipping_options[0][shipping_rate_data][display_name]', free ? 'Mondial Relay — livraison offerte' : 'Mondial Relay');
    f.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', String(free ? 0 : SHIPPING_CENTS));
    f.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'eur');
    f.set('custom_fields[0][key]', 'point_relais');
    f.set('custom_fields[0][label][type]', 'custom');
    f.set('custom_fields[0][label][custom]', 'Point Relais souhaité (nom + ville)');
    f.set('custom_fields[0][type]', 'text');
    f.set('custom_fields[0][optional]', 'true');
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


// ---------- E-mail de confirmation (webhook Stripe → Resend) ----------
// Variables Cloudflare : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (whsec_…), RESEND_API_KEY,
//   MAIL_FROM (ex. « R2A <commandes@ton-domaine.fr> »), OWNER_EMAIL (ta copie de chaque commande).
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = (cents) => (cents / 100).toFixed(2).replace('.', ',') + ' €';

async function verifyStripe(body, header, secret) {
  const parts = Object.fromEntries(String(header || '').split(',').map((p) => p.split('=')));
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1 || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(t + '.' + body)));
  const hex = [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (hex.length !== v1.length) return false;
  let d = 0; for (let i = 0; i < hex.length; i++) d |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return d === 0;
}

function orderEmail(o, origin, forOwner) {
  const rows = o.items.map((i) => `<tr><td style="padding:12px 0;border-bottom:1px solid #2a2a26;color:#f4f2ea;font-size:15px">${esc(i.name)}<div style="color:#8f8b7c;font-size:13px;margin-top:2px">Quantité : ${esc(i.qty)}</div></td><td align="right" style="padding:12px 0;border-bottom:1px solid #2a2a26;color:#f4f2ea;font-size:15px;white-space:nowrap">${eur(i.total)}</td></tr>`).join('');
  const a = o.address;
  const addr = a ? [a.name, a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(' '), a.country].filter(Boolean).map(esc).join('<br>') : '';
  const title = forOwner ? 'Nouvelle commande' : 'Merci pour ta commande !';
  const intro = forOwner
    ? `Commande de <strong>${esc(o.name || o.email)}</strong> (${esc(o.email)}${o.phone ? ' · ' + esc(o.phone) : ''}).`
    : `Salut${o.name ? ' ' + esc(o.name.split(' ')[0]) : ''}, ton paiement est bien confirmé. On prépare ta commande et on te contacte pour la livraison.`;
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#060606;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#060606"><tr><td align="center" style="padding:32px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0b0b0a;border:1px solid #2a2a26;border-radius:16px">
<tr><td align="center" style="padding:34px 24px 8px"><img src="${origin}/assets/images/brand/r2a-gold.png" width="120" alt="R2A" style="display:block;border:0"></td></tr>
<tr><td align="center" style="padding:6px 24px 0;color:#e3bf73;font-size:11px;letter-spacing:3px;text-transform:uppercase">Road 2 your Ambition</td></tr>
<tr><td style="padding:26px 32px 0"><h1 style="margin:0 0 10px;font-size:26px;color:#f4f2ea;font-weight:800">${title}</h1><p style="margin:0;color:#c9c5b5;font-size:15px;line-height:1.6">${intro}</p></td></tr>
<tr><td style="padding:22px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
<tr><td style="padding:12px 0 0;color:#8f8b7c;font-size:14px">Livraison Mondial Relay</td><td align="right" style="padding:12px 0 0;color:#f4f2ea;font-size:14px">${o.shipping ? eur(o.shipping) : 'Offerte'}</td></tr>
<tr><td style="padding:16px 0 0;color:#8f8b7c;font-size:14px">Total payé</td><td align="right" style="padding:16px 0 0;color:#e3bf73;font-size:22px;font-weight:800">${eur(o.total)}</td></tr></table></td></tr>
${addr ? `<tr><td style="padding:24px 32px 0"><div style="color:#8f8b7c;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Livraison Mondial Relay</div><div style="color:#f4f2ea;font-size:14px;line-height:1.6">${addr}${o.relay ? '<br><strong>Point Relais : ' + esc(o.relay) + '</strong>' : ''}</div></td></tr>` : ''}
<tr><td align="center" style="padding:30px 32px 34px"><a href="https://www.instagram.com/r2a.coaching/" style="display:inline-block;background:#e3bf73;color:#120d03;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;padding:13px 26px;border-radius:999px">Nous suivre sur Instagram</a>
<p style="margin:22px 0 0;color:#6f6c60;font-size:12px">R2A — Ton ambition, ton chemin, ta réussite.<br>Une question ? Réponds à cet e-mail ou écris-nous sur Instagram @r2a.coaching.</p></td></tr>
</table></td></tr></table></body></html>`;
  const text = `${title}\n\n${forOwner ? 'Client : ' + (o.name || '') + ' ' + o.email + (o.phone ? ' ' + o.phone : '') : 'Ton paiement est confirmé. On te contacte pour la livraison.'}\n\n` +
    o.items.map((i) => `- ${i.name} x${i.qty} : ${eur(i.total)}`).join('\n') + `\n\nTotal payé : ${eur(o.total)}\n` +
    (a ? '\nLivraison Mondial Relay' + (o.relay ? ' (Point Relais : ' + o.relay + ')' : '') + ' :\n' + [a.name, a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(' '), a.country].filter(Boolean).join('\n') + '\n' : '') + '\nR2A — @r2a.coaching';
  return { html, text, subject: forOwner ? `Nouvelle commande — ${eur(o.total)} — ${o.name || o.email}` : 'Ta commande R2A est confirmée' };
}

async function sendMail(env, to, mail, key, replyTo) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject: mail.subject, html: mail.html, text: mail.text, ...(replyTo ? { reply_to: replyTo } : {}) })
  });
  if (!r.ok) throw new Error('mail_' + r.status);
}

async function stripeWebhook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY) return json({ error: 'not_configured' }, 503);
  const body = await request.text();
  if (!(await verifyStripe(body, request.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET))) return json({ error: 'bad_signature' }, 400);
  let ev; try { ev = JSON.parse(body); } catch (_) { return json({ error: 'bad_request' }, 400); }
  if (ev.type !== 'checkout.session.completed' && ev.type !== 'checkout.session.async_payment_succeeded') return json({ ok: true, ignored: true });
  const id = ev.data && ev.data.object && ev.data.object.id;
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id || '')) return json({ error: 'bad_request' }, 400);
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return json({ ok: true, mail: 'not_configured' });

  const r = await fetch('https://api.stripe.com/v1/checkout/sessions/' + id + '?expand[]=line_items', { headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY } });
  const s = await r.json().catch(() => ({}));
  if (!r.ok) return json({ error: 'stripe_error' }, 502);
  if (s.payment_status !== 'paid') return json({ ok: true, unpaid: true });
  const cd = s.customer_details || {};
  const sh = (s.collected_information && s.collected_information.shipping_details) || s.shipping_details || {};
  const order = {
    email: cd.email || '', name: (sh.name || cd.name || ''), phone: cd.phone || '', address: sh.address ? Object.assign({ name: sh.name || cd.name }, sh.address) : (cd.address || null),
    total: s.amount_total || 0,
    shipping: (s.total_details && s.total_details.amount_shipping) || 0,
    relay: ((s.custom_fields || []).find((c) => c.key === 'point_relais') || { text: {} }).text.value || '',
    items: ((s.line_items && s.line_items.data) || []).map((l) => ({ name: l.description, qty: l.quantity, total: l.amount_total }))
  };
  const origin = new URL(request.url).origin;
  try {
    if (order.email) await sendMail(env, order.email, orderEmail(order, origin, false), 'cust-' + id, env.OWNER_EMAIL);
    if (env.OWNER_EMAIL) await sendMail(env, env.OWNER_EMAIL, orderEmail(order, origin, true), 'own-' + id, order.email);
  } catch (_) { return json({ error: 'mail_failed' }, 500); } // Stripe réessaiera ; l'Idempotency-Key évite les doublons
  return json({ ok: true });
}

// Point d'entrée Cloudflare Pages (mode « advanced ») : tout vit dans le dossier public/.
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/checkout') return request.method === 'POST' ? checkout(request, env) : json({ error: 'method_not_allowed' }, 405);
    if (pathname === '/api/session-status') return request.method === 'GET' ? sessionStatus(request, env) : jsonS({ error: 'method_not_allowed' }, 405);
    if (pathname === '/api/stripe-webhook') return request.method === 'POST' ? stripeWebhook(request, env) : json({ error: 'method_not_allowed' }, 405);
    if (pathname === '/api/health') {
      // Diagnostic sans danger : indique seulement le MODE des clés (jamais leur valeur).
      const mode = (k) => !k ? 'absente' : /^(sk|rk|pk)_live_/.test(k) ? 'PRODUCTION' : /^(sk|rk|pk)_test_/.test(k) ? 'TEST' : 'inconnue';
      return json({ ok: true, cle_secrete: mode(env.STRIPE_SECRET_KEY), cle_publiable: mode(env.STRIPE_PUBLISHABLE_KEY) });
    }
    if (pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);
    return env.ASSETS.fetch(request);
  }
};
