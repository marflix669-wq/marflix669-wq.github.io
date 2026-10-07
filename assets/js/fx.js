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

  // Viewer 3D du maillot (recto / verso, glisser pour tourner)
  window.R2A_initViewers = function (root) {
    (root || doc).querySelectorAll('[data-viewer]').forEach(v => {
      if (v.dataset.ready) return; v.dataset.ready = '1';
      const stage = v.querySelector('.viewer-stage'), obj = v.querySelector('.viewer-obj');
      const tabs = v.querySelectorAll('[data-view]');
      let ry = -18, rx = 4, target = null, dragging = false, lastX = 0, lastY = 0, vel = 0, idle = 0;
      const apply = () => { obj.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; };
      const setTab = name => tabs.forEach(b => b.classList.toggle('on', b.dataset.view === name));
      const go = name => {
        setTab(name);
        if (name === 'overview') { v.classList.add('overview'); return; }
        v.classList.remove('overview');
        const base = Math.round(ry / 360) * 360;
        target = name === 'front' ? base : base + 180;
        idle = 0;
      };
      tabs.forEach(b => b.addEventListener('click', () => go(b.dataset.view)));
      stage.addEventListener('pointerdown', e => { dragging = true; target = null; lastX = e.clientX; lastY = e.clientY; stage.setPointerCapture(e.pointerId); idle = 0; });
      stage.addEventListener('pointermove', e => {
        if (!dragging) return;
        const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
        ry += dx * 0.6; vel = dx * 0.6; rx = Math.max(-14, Math.min(14, rx - dy * 0.2));
        setTab(Math.cos(ry * Math.PI / 180) > 0 ? 'front' : 'back');
      });
      const end = () => { dragging = false; };
      stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
      let visible = true;
      new IntersectionObserver(([e]) => visible = e.isIntersecting).observe(stage);
      (function tick(now) {
        requestAnimationFrame(tick);
        if (!visible || v.classList.contains('overview')) return;
        if (!dragging) {
          if (target !== null) { ry += (target - ry) * 0.1; if (Math.abs(target - ry) < 0.2) { ry = target; target = null; } }
          else if (Math.abs(vel) > 0.05) { ry += vel; vel *= 0.94; }
          else if (!reduce) { idle += 1; ry += Math.sin(idle / 90) * 0.18; }
          rx += (4 - rx) * 0.04;
        }
        apply();
      })();
      apply();
    });
  };
  R2A_initViewers();
})();
