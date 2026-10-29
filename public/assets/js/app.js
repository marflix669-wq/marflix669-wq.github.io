(function(){
  const DATA = window.R2A_DATA;
        const cart = DATA.load(DATA.STORAGE_KEYS.cart, []);

  function persistCart(){ DATA.save(DATA.STORAGE_KEYS.cart, cart); }
  function money(v){ return `${Number(v).toFixed(2).replace('.',',')} €`; }
  function getShortcode(url){
    if(!url) return '';
    const m = String(url).match(/instagram\.com\/(?:reel|p)\/([^/?#]+)/i);
    return m ? m[1] : '';
  }
  function normalizeProduct(p){
    const copy = Object.assign({}, p);
    copy.image = DATA.asset(copy.image);
    copy.gallery = (copy.gallery || []).map(DATA.asset);
    copy.stock = Math.max(0, Math.floor(Number(copy.stock ?? 20)));
    return copy;
  }
  function getProducts(){ return DATA.load(DATA.STORAGE_KEYS.products, DATA.DEFAULT_PRODUCTS).filter(p => p.visible !== false).map(normalizeProduct); }

  function findProduct(id){ return getProducts().find(x => x.id === id); }
  function addToCart(productId, size, qty){
    const p = findProduct(productId);
    if(!p) return 'Produit introuvable.';
    if(p.stock <= 0) return 'Ce produit est actuellement en rupture de stock.';
    const inCart = cart.filter(i => i.productId === productId).reduce((n, i) => n + Number(i.qty || 0), 0);
    const requested = Math.max(1, Number(qty || 1));
    if(inCart + requested > p.stock){
      const left = Math.max(0, p.stock - inCart);
      return left > 0 ? `Il ne reste que ${left} article${left > 1 ? 's' : ''} disponible${left > 1 ? 's' : ''}.` : 'Tout le stock disponible est déjà dans ton panier.';
    }
    const existing = cart.find(i => i.productId === productId && i.size === size);
    if(existing) existing.qty = Math.min(10, existing.qty + requested); else cart.push({productId, size, qty:Math.min(10, requested)});
    persistCart(); renderCart(); openCart();
    return '';
  }
  function removeFromCart(index){ cart.splice(index,1); persistCart(); renderCart(); }
  function changeQty(index, d){
    const it = cart[index]; if(!it) return;
    const p = findProduct(it.productId);
    const others = cart.filter((x, i) => i !== index && x.productId === it.productId).reduce((n, x) => n + x.qty, 0);
    const max = Math.min(10, p ? p.stock - others : 10);
    it.qty = Math.max(1, Math.min(max, it.qty + d));
    persistCart(); renderCart();
  }
  function cartTotals(){
    let subtotal = 0;
    cart.forEach(item => { const p = findProduct(item.productId); if(p) subtotal += p.price * item.qty; });
    const qty = cart.reduce((n, i) => n + i.qty, 0);
    const cfg = (window.R2A_CONFIG && R2A_CONFIG.shipping) || { fee: 4.9, freeFrom: 2 };
    const shipping = !qty ? 0 : (qty >= cfg.freeFrom ? 0 : cfg.fee);
    return {subtotal, shipping, qty, total: subtotal + shipping};
  }
  function renderCart(){
    const wrap = document.getElementById('cartItems');
    const badge = document.getElementById('cartCount');
    if(!wrap || !badge) return;
    for(let i = cart.length - 1; i >= 0; i--) if(!findProduct(cart[i].productId)) cart.splice(i, 1);
    const count = cart.reduce((n,i)=>n+i.qty,0);
    badge.textContent = count; badge.hidden = count === 0;
    if(cart.length === 0){
      wrap.innerHTML = '<div class="cart-empty">Ton panier est vide.<br><a class="btn btn-outline btn-small" href="' + (document.body.dataset.category ? './index.html' : (location.pathname.indexOf('/maillots/') > -1 ? './index.html' : './maillots/index.html')) + '">Voir les maillots</a></div>';
    }else{
      wrap.innerHTML = cart.map((item, index) => {
        const p = findProduct(item.productId);
        return `<div class="cart-item"><img class="cart-thumb" src="${p.gallery[1] || p.gallery[0]}" alt=""><div class="cart-info"><strong>${p.name}</strong><div class="muted">Taille : ${item.size}</div>
          <div class="cart-line"><div class="qty qty--sm"><button type="button" data-cq="-1" data-i="${index}" aria-label="Moins">−</button><span>${item.qty}</span><button type="button" data-cq="1" data-i="${index}" aria-label="Plus">+</button></div><strong>${money(p.price*item.qty)}</strong></div></div>
          <button class="cart-remove" type="button" data-remove-cart="${index}" aria-label="Retirer du panier">✕</button></div>`;
      }).join('');
    }
    const total = document.getElementById('cartTotal');
    const t = cartTotals();
    if(total) total.textContent = money(t.total);
    const shipEl = document.getElementById('cartShip');
    if(shipEl) shipEl.textContent = !t.qty ? '—' : (t.shipping ? money(t.shipping) : 'Offerte');
    const pay = document.getElementById('checkoutBtn'); if(pay) pay.disabled = cart.length === 0;
    wrap.querySelectorAll('[data-remove-cart]').forEach(btn => btn.onclick = () => removeFromCart(Number(btn.dataset.removeCart)));
    wrap.querySelectorAll('[data-cq]').forEach(btn => btn.onclick = () => changeQty(Number(btn.dataset.i), Number(btn.dataset.cq)));
  }
  function setCart(open){
    const d = document.getElementById('cartDrawer'), o = document.getElementById('cartOverlay');
    if(d){ d.classList.toggle('open', open); d.setAttribute('aria-hidden', open ? 'false' : 'true'); }
    if(o) o.classList.toggle('open', open);
    document.documentElement.classList.toggle('cart-open', open);
  }
  function openCart(){ setCart(true); }
  function closeCart(){ setCart(false); }

  function bindCartButtons(root){
    root.querySelectorAll('[data-add-product]').forEach(btn => {
      btn.onclick = function(){
        const id = btn.dataset.addProduct;
        const sizeSel = document.querySelector(`[data-size-for="${id}"]`);
        const qtySel = document.querySelector(`[data-qty-for="${id}"]`);
        const size = sizeSel ? sizeSel.value : 'Unique';
        const qty = qtySel ? Number(qtySel.value || 1) : 1;
        addToCart(id, size, qty);
      };
    });
  }

  function renderHomeCategories(){
    const target = document.getElementById('categoryGrid');
    if(!target) return;
    const map = [
      {key:'enfant', label:'Enfant', desc:'Toutes les tailles enfant pour bouger avec style.', image:'../assets/images/products/enfant/gallery-02-front.png', href:'./enfant.html'},
      {key:'homme', label:'Homme', desc:'Le maillot performance R2A pour la préparation et le terrain.', image:'../assets/images/products/homme/gallery-02-front.png', href:'./homme.html'},
      {key:'femme', label:'Femme', desc:'Une coupe pensée pour le confort, la légèreté et la mobilité.', image:'../assets/images/products/femme/gallery-02-front.png', href:'./femme.html'}
    ];
    target.innerHTML = map.map((x,i) => `
      <div class="tilt-wrap reveal" style="--d:${i*0.12}s">
      <a class="tilt cat-card" href="${x.href}" aria-label="Voir le maillot ${x.label.toLowerCase()}">
        <span class="price-pill">30 €</span>
        <div class="cat-visual"><img src="${x.image}" alt="Maillot R2A ${x.label}" loading="lazy"></div>
        <div class="cat-body">
          <div class="kicker">Maillots R2A</div>
          <h3>${x.label}</h3>
          <p>${x.desc}</p>
          <span class="btn btn-primary">Voir la page ${x.label.toLowerCase()} <span class="arrow">→</span></span>
        </div>
      </a></div>`).join('');
    if(window.R2A_fx) window.R2A_fx(target);
  }

  function reelMedia(reel, i){
    const title = reel.title || `Vidéo ${i+1}`;
    if(reel.video){
      return `
        <div class="reel-player-shell" data-native-player>
          <video class="reel-native-video" src="${reel.video}" autoplay muted loop playsinline preload="metadata"></video>
          <div class="reel-player-controls">
            <button class="reel-control" type="button" data-video-sound aria-label="Activer ou couper le son">🔇</button>
            <button class="reel-control" type="button" data-video-play aria-label="Lecture ou pause">⏸</button>
            <button class="reel-control" type="button" data-video-fullscreen aria-label="Plein écran">⛶</button>
          </div>
        </div>`;
    }
    const code = getShortcode(reel.url);
    if(!code) return `<div class="reel-empty">Vidéo indisponible.</div>`;
    return `
      <div class="reel-ig-shell">
        <iframe
          class="reel-ig-embed"
          title="${title}"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowfullscreen
          frameborder="0"
          scrolling="no"
          src="https://www.instagram.com/reel/${code}/embed">
        </iframe>
      </div>`;
  }

  function openReelModal(reel, i){
    let modal = document.getElementById('reelModal');
    if(!modal){
      modal = document.createElement('div');
      modal.id = 'reelModal';
      modal.className = 'reel-modal';
      modal.innerHTML = `
        <div class="reel-modal-backdrop" data-close-reel-modal></div>
        <div class="reel-modal-panel">
          <button class="reel-modal-close" type="button" data-close-reel-modal aria-label="Fermer">×</button>
          <div id="reelModalContent"></div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelectorAll('[data-close-reel-modal]').forEach(btn => btn.onclick = () => {
        modal.classList.remove('open');
        const c = document.getElementById('reelModalContent');
        if(c) c.innerHTML = '';
      });
    }
    const content = document.getElementById('reelModalContent');
    if(content) content.innerHTML = reelMedia(reel, i);
    modal.classList.add('open');
    bindVideoControls(modal);
  }

  function bindVideoControls(root){
    root.querySelectorAll('[data-native-player]').forEach(shell => {
      const video = shell.querySelector('video');
      const soundBtn = shell.querySelector('[data-video-sound]');
      const playBtn = shell.querySelector('[data-video-play]');
      const fsBtn = shell.querySelector('[data-video-fullscreen]');
      if(!video) return;

      if(soundBtn) soundBtn.onclick = () => {
        video.muted = !video.muted;
        soundBtn.textContent = video.muted ? '🔇' : '🔊';
      };
      if(playBtn) playBtn.onclick = () => {
        if(video.paused){
          video.play().catch(()=>{});
          playBtn.textContent = '⏸';
        }else{
          video.pause();
          playBtn.textContent = '▶';
        }
      };
      if(fsBtn) fsBtn.onclick = () => {
        const node = shell;
        if(node.requestFullscreen) node.requestFullscreen();
        else if(video.webkitEnterFullscreen) video.webkitEnterFullscreen();
      };
    });
  }

  function renderReels(){
    const target = document.getElementById('reelsGrid');
    if(!target) return;
    const current = DATA.load(DATA.STORAGE_KEYS.reels, DATA.DEFAULT_REELS);
    if(!current.length){
      target.classList.remove('reels-grid');
      target.innerHTML = '<div class="videos-empty tilt-wrap"><div class="video-ghost tilt"><span class="play"></span></div><div class="video-ghost tilt"><span class="play"></span></div><div class="video-ghost tilt"><span class="play"></span></div></div><p class="muted" style="text-align:center;margin-top:28px">Les vidéos arrivent bientôt ici. En attendant, retrouve-les sur Instagram : <a class="gold" href="'+((window.R2A_CONFIG&&R2A_CONFIG.instagramUrl)||'#')+'" target="_blank" rel="noopener noreferrer">@r2a.coaching</a></p>';
      if(window.R2A_fx) window.R2A_fx(target);
      return;
    }
    target.innerHTML = current.map((reel, i) => `
      <article class="reel-card" aria-label="${reel.title || `Vidéo ${i+1}`}">
        ${reelMedia(reel, i)}
        <button class="reel-expand-overlay" type="button" data-expand-reel="${i}" aria-label="Agrandir la vidéo">⛶</button>
      </article>`).join('');

    bindVideoControls(target);
    if(window.R2A_fx) window.R2A_fx(target);
    target.querySelectorAll('[data-expand-reel]').forEach(btn => {
      btn.onclick = () => openReelModal(current[Number(btn.dataset.expandReel)], Number(btn.dataset.expandReel));
    });
  }

  function stripeLink(cat){
    const l = window.R2A_CONFIG && R2A_CONFIG.stripeLinks && R2A_CONFIG.stripeLinks[cat];
    return /^https:\/\/(buy|checkout)\.stripe\.com\//.test(l || '') ? l : '';
  }

  function loadCheckout(){
    if(window.R2A_openCheckout) return Promise.resolve();
    return new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = '/assets/js/checkout.js?v=20261028a'; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
  }
  function bindBuy(root){
    root.querySelectorAll('.product-panel').forEach(panel => {
      const pay = panel.querySelector('[data-pay]'); if(!pay) return;
      const add = panel.querySelector('[data-add]');
      let size = '', qty = 1;
      const err = panel.querySelector('[data-buy-error]'), qEl = panel.querySelector('[data-qty]');
      panel.querySelectorAll('.size-pick').forEach(b => b.addEventListener('click', () => {
        size = b.dataset.size; err.hidden = true;
        panel.querySelectorAll('.size-pick').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on ? 'true' : 'false'); });
      }));
      panel.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {
        qty = Math.max(1, Math.min(10, qty + Number(b.dataset.q))); qEl.textContent = qty;
      }));
      if(add) add.addEventListener('click', () => {
        if(!size){ err.textContent = 'Choisis ta taille avant d’ajouter au panier.'; err.hidden = false; return; }
        const msg = addToCart(add.dataset.id, size, qty);
        if(msg){ err.textContent = msg; err.hidden = false; } else { err.hidden = true; }
      });
      pay.addEventListener('click', async () => {
        if(!size){ err.textContent = 'Choisis ta taille avant de payer.'; err.hidden = false; return; }
        try { await loadCheckout(); } catch(_) { location.href = stripeLink(pay.dataset.cat) || ((window.R2A_CONFIG && R2A_CONFIG.instagramUrl) || '#'); return; }
        window.R2A_openCheckout({ items:[{ category: pay.dataset.cat, name: pay.dataset.name, size, qty }], fallbackLink: stripeLink(pay.dataset.cat) });
      });
    });
  }

  function renderCategoryPage(){
    const target = document.getElementById('productList');
    if(!target) return;
    const pageCategory = document.body.dataset.category;
    const pageProducts = getProducts().filter(p => p.category === pageCategory);
    const others = ['enfant','homme','femme'].filter(c => c !== pageCategory);
    target.innerHTML = pageProducts.map((p, idx) => {
      const g = p.gallery;
      const front = g[1] || g[0];
      return `
      <section class="section--tight">
        <div class="product-layout">
          <div class="viewer reveal" data-viewer>
            <div class="viewer-stage">
              <div class="viewer-floor"></div>
              <div class="viewer-obj">
                <div class="viewer-edge"></div>
                <div class="viewer-face front"><img data-main src="${g[1] || g[0]}" alt="${p.name}" draggable="false"></div>
              </div>
              <div class="viewer-hint">Glisse pour incliner</div>
            </div>
            <div class="viewer-tabs">
              <button type="button" data-view="front" data-src="${g[1] || g[0]}" data-alt="${p.name} — face">Face</button>
              <button type="button" data-view="back" data-src="${g[2] || g[0]}" data-alt="${p.name} — dos">Dos</button>
              <button type="button" data-view="overview" data-src="${g[0]}" data-alt="${p.name} — vue d’ensemble">Vue d’ensemble</button>
            </div>
          </div>
          <div class="product-panel reveal" style="--d:.12s">
            <div class="kicker">R2A • ${p.category}</div>
            <h2>${p.name}</h2>
            <div class="price">${money(p.price)}</div>
            <p class="section-copy">${p.description}</p>
            ${p.stock <= 0
              ? `<div class="stock-alert stock-alert--out">Rupture de stock</div>`
              : p.stock <= 5
                ? `<div class="stock-alert stock-alert--low">🔥 Plus beaucoup de stock disponible — commande vite.</div>`
                : ``}
            <div class="buy-label">Taille</div>
            <div class="sizes" data-sizes role="radiogroup" aria-label="Taille">${p.sizes.map(s => `<button type="button" class="size-chip size-pick" role="radio" aria-checked="false" data-size="${s}">${s}</button>`).join('')}</div>
            <div class="buy-label">Quantité</div>
            <div class="qty" data-qty-box><button type="button" data-q="-1" aria-label="Moins">−</button><span data-qty>1</span><button type="button" data-q="1" aria-label="Plus">+</button></div>
            <div class="buy-error" data-buy-error role="alert" hidden>Choisis ta taille.</div>
            <div class="notice" style="margin:18px 0">Prix unique : 30 €. Livraison Mondial Relay <strong>4,90 €</strong>, <strong>offerte dès 2 maillots</strong>. L’adresse, le Point Relais et le code promo se saisissent dans le paiement sécurisé.</div>
            <div class="row-actions">
              ${p.stock <= 0
                ? `<button class="btn btn-primary" disabled aria-disabled="true">Rupture de stock</button>`
                : `<button type="button" class="btn btn-primary" data-add data-id="${p.id}">Ajouter au panier <span class="arrow">→</span></button><button type="button" class="btn btn-outline" data-pay data-cat="${p.category}" data-name="${p.name}">Payer maintenant</button>`}
            </div>
            <div class="other-cats">
              ${others.map(c => `<a class="btn btn-outline btn-small" href="./${c}.html">Maillot ${c}</a>`).join('')}
            </div>
          </div>
        </div>
      </section>`;
    }).join('') || '<div class="reel-empty">Aucun produit pour cette catégorie.</div>';

    bindBuy(target);
    if(window.R2A_initViewers) window.R2A_initViewers(target);
    // les éléments injectés après coup doivent aussi apparaître
    if(window.R2A_fx) window.R2A_fx(target);
  }

  async function checkoutCart(){
    if(!cart.length) return;
    const items = cart.map(i => { const p = findProduct(i.productId); return p ? {category:p.category, name:p.name, size:i.size, qty:i.qty} : null; }).filter(Boolean);
    closeCart();
    const single = items.length === 1 ? stripeLink(items[0].category) : '';
    try { await loadCheckout(); } catch(_) { location.href = single || ((window.R2A_CONFIG && R2A_CONFIG.instagramUrl) || '#'); return; }
    window.R2A_openCheckout({ items, fallbackLink: single });
  }
  function bindGeneral(){
    const cartBtn = document.getElementById('cartBtn'), closeBtn = document.getElementById('closeCart'), overlay = document.getElementById('cartOverlay'), checkout = document.getElementById('checkoutBtn');
    if(cartBtn) cartBtn.onclick = openCart;
    if(closeBtn) closeBtn.onclick = closeCart;
    if(overlay) overlay.onclick = closeCart;
    if(checkout) checkout.onclick = checkoutCart;
    document.addEventListener('keydown', e => { if(e.key === 'Escape') closeCart(); });
    renderCart();
  }

  document.addEventListener('DOMContentLoaded', function(){
    renderHomeCategories();
    renderReels();
    renderCategoryPage();
    bindGeneral();
  });
})();
