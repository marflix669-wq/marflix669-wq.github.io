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
  function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

  window.R2A_openCheckout = function (o) {
    let embedded = null;
    const modal = el(`<div class="co-modal" role="dialog" aria-modal="true" aria-label="Paiement sécurisé">
      <div class="co-backdrop" data-close></div>
      <div class="co-panel">
        <button class="co-close" type="button" data-close aria-label="Fermer">✕</button>
        <div class="co-head"><div class="kicker">Paiement sécurisé</div><strong>${o.name} — ${o.size} × ${o.qty}</strong></div>
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
        const r = await fetch(cfg().checkoutEndpoint || '/api/checkout', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: o.category, size: o.size, qty: o.qty })
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
