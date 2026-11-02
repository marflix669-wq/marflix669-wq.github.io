// Paiement Stripe intégré : s'ouvre dans une fenêtre du site, sans quitter la page.
(function () {
  const cfg = () => window.R2A_CONFIG || {};
  let stripePromise = null;
  function loadStripe() {
    if (window.Stripe) return Promise.resolve(window.Stripe);
    if (stripePromise) return stripePromise;
    stripePromise = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://js.stripe.com/v3/'; s.async = true;
      s.onload = () => window.Stripe ? res(window.Stripe) : rej(new Error('stripe')); s.onerror = () => { stripePromise = null; rej(new Error('stripe')); };
      document.head.appendChild(s);
    });
    return stripePromise;
  }
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Sélecteur de Points Relais Sendcloud (script chargé à la demande)
  let sendcloudPromise = null;
  function loadSendcloud() {
    if (window.sendcloud && window.sendcloud.servicePoints) return Promise.resolve();
    if (sendcloudPromise) return sendcloudPromise;
    sendcloudPromise = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://embed.sendcloud.sc/spp/1.0.0/api.min.js'; s.async = true;
      s.onload = () => (window.sendcloud && window.sendcloud.servicePoints) ? res() : rej(new Error('sendcloud'));
      s.onerror = () => { sendcloudPromise = null; rej(new Error('sendcloud')); };
      document.head.appendChild(s);
    });
    return sendcloudPromise;
  }
  // Résout avec le Point Relais choisi, ou null si le client ferme la fenêtre ; rejette en cas d'erreur.
  function pickRelay() {
    return loadSendcloud().then(() => new Promise((resolve, reject) => {
      window.sendcloud.servicePoints.open(
        { apiKey: cfg().sendcloudPublicKey, country: 'FR', language: 'fr-fr' },
        (sp, postNumber) => resolve({
          id: sp.id, name: sp.name, street: sp.street, house_number: sp.house_number,
          postal_code: sp.postal_code, city: sp.city, post_number: postNumber || ''
        }),
        (errors) => (errors || []).includes('Closed') ? resolve(null) : reject(new Error('picker'))
      );
    }));
  }
  function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

  window.R2A_openCheckout = async function (o) {
    let embedded = null, relay = null, relayError = false;
    if (cfg().sendcloudPublicKey) {
      try { relay = await pickRelay(); if (!relay) return; } catch (_) { relayError = true; }
    }
    const items = o.items || [{ category: o.category, name: o.name, size: o.size, qty: o.qty }];
    const label = items.length === 1 ? `${items[0].name} — ${items[0].size} × ${items[0].qty}` : `Panier — ${items.reduce((n, i) => n + i.qty, 0)} articles`;
    const modal = el(`<div class="co-modal" role="dialog" aria-modal="true" aria-label="Paiement sécurisé">
      <div class="co-backdrop" data-close></div>
      <div class="co-panel">
        <button class="co-close" type="button" data-close aria-label="Fermer">✕</button>
        <div class="co-head"><div class="kicker">Paiement sécurisé</div><strong>${label}</strong>${relay ? `<span class="muted">Point Relais : ${esc(relay.name)}, ${esc(relay.street)} ${esc(relay.house_number)}, ${esc(relay.postal_code)} ${esc(relay.city)}</span>` : ''}</div>
        <div class="co-body"><div class="co-loading">Chargement du paiement…</div><div id="r2a-checkout-mount"></div></div>
      </div></div>`);
    document.body.appendChild(modal);
    document.documentElement.classList.add('co-open');
    const mount = modal.querySelector('#r2a-checkout-mount'), loading = modal.querySelector('.co-loading');
    const close = () => {
      try { embedded && embedded.destroy(); } catch (_) {}
      modal.remove(); document.documentElement.classList.remove('co-open'); document.removeEventListener('keydown', onKey);
    };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));

    const fail = () => {
      const link = o.fallbackLink;
      loading.innerHTML = `<p>Le paiement intégré n’est pas disponible pour le moment.</p>` +
        (link ? `<a class="btn btn-primary" href="${link}" rel="noopener">Payer sur la page sécurisée Stripe <span class="arrow">→</span></a>`
              : `<a class="btn btn-primary" href="${cfg().instagramUrl || '#'}" target="_blank" rel="noopener noreferrer">Commander via Instagram <span class="arrow">→</span></a>`);
    };

    (async () => {
      try {
        if (relayError) throw new Error('relay');
        const r = await fetch(cfg().checkoutEndpoint || '/api/checkout', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: items.map(i => ({ category: i.category, size: i.size, qty: i.qty })), relay })
        });
        const d = await r.json();
        if (!r.ok || !d.clientSecret) throw new Error('api');
        const Stripe = await loadStripe();
        const stripe = Stripe(d.publishableKey);
        embedded = await stripe.initEmbeddedCheckout({ clientSecret: d.clientSecret });
        loading.remove();
        embedded.mount(mount);
      } catch (_) { fail(); }
    })();
  };
})();
