// Effets d'interface : header, menu mobile, apparitions, inclinaison 3D des cartes, viewer maillot.
(function () {
  const doc = document;
  doc.documentElement.classList.remove('no-js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  // Header
  const header = doc.querySelector('.site-header');
  const onScroll = () => header && header.classList.toggle('scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Menu mobile
  const burger = doc.getElementById('burger');
  if (burger) {
    burger.addEventListener('click', () => {
      const open = header.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    doc.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => header.classList.remove('menu-open')));
  }

  // Apparitions + inclinaison 3D (relançable sur du contenu injecté)
  const io = ('IntersectionObserver' in window && !reduce) ? new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }) : null;
  function bindFx(root) {
    root = root || doc;
    root.querySelectorAll('.reveal:not(.in)').forEach(el => io ? io.observe(el) : el.classList.add('in'));
    if (!(fine && !reduce)) return;
    root.querySelectorAll('.tilt, .photo-frame').forEach(el => {
      if (el.dataset.tilt) return; el.dataset.tilt = '1';
      const max = el.classList.contains('photo-frame') ? 8 : 10;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.transform = `rotateY(${(px - .5) * max * 2}deg) rotateX(${(.5 - py) * max * 2}deg)`;
        el.style.setProperty('--mx', px * 100 + '%'); el.style.setProperty('--my', py * 100 + '%');
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }
  window.R2A_fx = bindFx;
  bindFx();

  // Viewer 3D du maillot (face / vue d'ensemble ; glisser pour incliner)
  window.R2A_initViewers = function (root) {
    (root || doc).querySelectorAll('[data-viewer]').forEach(v => {
      if (v.dataset.ready) return; v.dataset.ready = '1';
      const stage = v.querySelector('.viewer-stage'), obj = v.querySelector('.viewer-obj');
      const tabs = v.querySelectorAll('[data-view]');
      const MAX_Y = 26, MAX_X = 12;
      let ry = -14, rx = 4, ty = null, tx = null, dragging = false, t = 0;
      const clamp = (n, m) => Math.max(-m, Math.min(m, n));
      const apply = () => { obj.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; };
      const setTab = name => tabs.forEach(b => b.classList.toggle('on', b.dataset.view === name));
      const face = v.querySelector('.viewer-face'), img = v.querySelector('[data-main]');
      tabs.forEach(b => { const im = new Image(); im.src = b.dataset.src; });
      let current = 'front';
      const go = name => {
        if (name === current) return;
        const b = [...tabs].find(x => x.dataset.view === name); if (!b) return;
        current = name; setTab(name);
        const swap = () => { img.src = b.dataset.src; img.alt = b.dataset.alt || ''; };
        if (reduce || !face.animate) { swap(); return; }
        const out = face.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(88deg)' }], { duration: 170, easing: 'ease-in' });
        out.onfinish = () => { swap(); face.animate([{ transform: 'rotateY(-88deg)' }, { transform: 'rotateY(0deg)' }], { duration: 220, easing: 'ease-out' }); };
      };
      setTab('front');
      tabs.forEach(b => b.addEventListener('click', () => go(b.dataset.view)));
      const aim = e => {
        const r = stage.getBoundingClientRect();
        ty = clamp(((e.clientX - r.left) / r.width - .5) * 2 * MAX_Y, MAX_Y);
        tx = clamp((.5 - (e.clientY - r.top) / r.height) * 2 * MAX_X, MAX_X);
      };
      stage.addEventListener('pointerdown', e => { dragging = true; stage.setPointerCapture(e.pointerId); aim(e); });
      stage.addEventListener('pointermove', e => { if (dragging || (fine && !reduce)) aim(e); });
      const end = () => { dragging = false; if (!fine) { ty = null; tx = null; } };
      stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
      stage.addEventListener('pointerleave', () => { ty = null; tx = null; });
      let visible = true;
      new IntersectionObserver(([e]) => visible = e.isIntersecting).observe(stage);
      (function tick() {
        requestAnimationFrame(tick);
        if (!visible) return;
        t += 1;
        const gy = ty !== null ? ty : (reduce ? -14 : -14 + Math.sin(t / 90) * 8);
        const gx = tx !== null ? tx : 4;
        ry += (gy - ry) * 0.1; rx += (gx - rx) * 0.1;
        apply();
      })();
      apply();
    });
  };
  R2A_initViewers();
})();
