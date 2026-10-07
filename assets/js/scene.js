// Scène 3D de l'accueil : piste d'athlétisme en perspective, logo R2A en relief, particules dorées.
import * as THREE from '../vendor/three.module.js';

const canvas = document.getElementById('heroCanvas');
const hero = document.getElementById('hero');
if (canvas && hero) init();

function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    canvas.remove();
    return; // fond CSS de secours
  }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 860px)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070707, 0.042);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 140);
  camera.position.set(0, 1.5, 7.2);

  const GOLD = 0xe3bf73, GOLD_D = 0x8d6624;

  // ---------- Piste ----------
  const track = new THREE.Group();
  scene.add(track);
  const LANES = 7, LANE_W = 1.5, LEN = 120;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(LANES * LANE_W + 30, LEN),
    new THREE.MeshBasicMaterial({ color: 0x0b0a08 })
  );
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -LEN / 2 + 10);
  track.add(floor);

  const lineMat = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.85 });
  for (let i = 0; i <= LANES; i++) {
    const x = (i - LANES / 2) * LANE_W;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.045, LEN), lineMat);
    line.rotation.x = -Math.PI / 2; line.position.set(x, 0.01, -LEN / 2 + 10);
    track.add(line);
  }
  // Marques qui défilent vers la caméra (effet de course)
  const dashes = [];
  const dashMat = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.5 });
  const SPACING = 6, COUNT = 22;
  for (let i = 0; i < COUNT; i++) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(LANES * LANE_W, 0.07), dashMat);
    bar.rotation.x = -Math.PI / 2;
    bar.position.set(0, 0.012, 10 - i * SPACING);
    track.add(bar); dashes.push(bar);
  }
  // Blocs de départ stylisés
  const blockMat = new THREE.MeshStandardMaterial({ color: 0x1a1710, metalness: 0.9, roughness: 0.35, emissive: GOLD_D, emissiveIntensity: 0.25 });
  const blocks = new THREE.Group();
  for (let i = 0; i < LANES; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.7), blockMat);
    b.position.set((i - (LANES - 1) / 2) * LANE_W, 0.07, 3.6);
    b.rotation.x = -0.12;
    blocks.add(b);
  }
  track.add(blocks);

  // ---------- Logo en relief (couches empilées) ----------
  const logoGroup = new THREE.Group();
  scene.add(logoGroup);
  const tex = new THREE.TextureLoader().load(new URL('../images/brand/r2a-gold.png', import.meta.url).href);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const aspect = 714 / 504, LW = 4.6;
  const layers = 9;
  for (let i = layers - 1; i >= 0; i--) {
    const t = i / (layers - 1);
    const m = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, alphaTest: 0.05, depthWrite: false,
      color: new THREE.Color().lerpColors(new THREE.Color(0xffe9b0), new THREE.Color(0x4a3410), t)
    });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(LW, LW / aspect), m);
    p.position.z = -i * 0.034;
    logoGroup.add(p);
  }
  // Halo
  const haloCanvas = document.createElement('canvas'); haloCanvas.width = haloCanvas.height = 256;
  const hc = haloCanvas.getContext('2d');
  const grad = hc.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(227,191,115,.55)'); grad.addColorStop(.4, 'rgba(227,191,115,.16)'); grad.addColorStop(1, 'rgba(227,191,115,0)');
  hc.fillStyle = grad; hc.fillRect(0, 0, 256, 256);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(11, 11),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(haloCanvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.z = -0.6;
  logoGroup.add(halo);

  // Anneaux orbitaux
  const rings = new THREE.Group();
  logoGroup.add(rings);
  const ringDefs = [[3.4, 0.012, 0.9], [4.1, 0.008, 0.45], [4.9, 0.006, 0.25]];
  const ringObjs = ringDefs.map(([r, w, o], i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, w, 8, 160),
      new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: o }));
    m.rotation.x = 1.1 + i * 0.35; m.rotation.y = i * 0.6;
    m.position.z = -0.5;
    rings.add(m); return m;
  });
  // Petits satellites sur les anneaux
  const sat = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfff1c9 }));
  ringObjs[0].add(sat);

  // ---------- Particules ----------
  const N = small ? 380 : 900;
  const pos = new Float32Array(N * 3), spd = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 34;
    pos[i * 3 + 1] = Math.random() * 12;
    pos[i * 3 + 2] = 6 - Math.random() * 50;
    spd[i] = 0.2 + Math.random() * 0.7;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dot = document.createElement('canvas'); dot.width = dot.height = 64;
  const dc = dot.getContext('2d'); const dg = dc.createRadialGradient(32, 32, 0, 32, 32, 32);
  dg.addColorStop(0, 'rgba(255,240,200,1)'); dg.addColorStop(.3, 'rgba(227,191,115,.7)'); dg.addColorStop(1, 'rgba(227,191,115,0)');
  dc.fillStyle = dg; dc.fillRect(0, 0, 64, 64);
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({
    map: new THREE.CanvasTexture(dot), size: 0.17, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
  }));
  scene.add(points);

  // Lumières (pour les blocs de départ)
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const key = new THREE.PointLight(GOLD, 30, 40); key.position.set(0, 4, 4); scene.add(key);

  // ---------- Interaction ----------
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  });
  hero.addEventListener('pointerleave', () => { mouse.x = 0; mouse.y = 0; });
  // Gyroscope léger sur mobile
  addEventListener('deviceorientation', e => {
    if (e.gamma == null) return;
    mouse.x = Math.max(-1, Math.min(1, e.gamma / 30));
    mouse.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
  }, { passive: true });

  let scrollP = 0;
  const onScroll = () => { scrollP = Math.min(1, Math.max(0, scrollY / (hero.offsetHeight * 0.9))); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  let baseY = 2.3;
  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const wide = w / h > 1.15;
    camera.fov = wide ? 52 : 62;
    camera.updateProjectionMatrix();
    // Logo à droite sur grand écran, centré en haut sur mobile
    if (wide) { logoGroup.position.set(Math.min(3.5, w / h * 1.4), 2.3, 0); logoGroup.scale.setScalar(0.88); }
    else { logoGroup.position.set(0, 4.3, -1); logoGroup.scale.setScalar(0.7); }
    baseY = logoGroup.position.y;
  }
  new ResizeObserver(resize).observe(hero); resize();

  let visible = true, last = performance.now(), t = 0;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) { last = performance.now(); loop(); } }, { threshold: 0 }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) { last = performance.now(); loop(); } });

  let raf = 0;
  function loop() {
    cancelAnimationFrame(raf);
    if (!visible || document.hidden) return;
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    t += reduce ? 0 : dt;

    // Défilement de la piste
    const speed = reduce ? 0 : 5.5;
    for (const d of dashes) {
      d.position.z += speed * dt;
      if (d.position.z > 10) d.position.z -= COUNT * SPACING;
    }
    // Particules
    const a = pGeo.attributes.position.array;
    if (!reduce) for (let i = 0; i < N; i++) {
      a[i * 3 + 1] += spd[i] * dt * 0.6;
      a[i * 3 + 2] += spd[i] * dt * 2.2;
      if (a[i * 3 + 1] > 12) a[i * 3 + 1] = 0;
      if (a[i * 3 + 2] > 7) a[i * 3 + 2] = -44;
    }
    pGeo.attributes.position.needsUpdate = true;

    // Logo + anneaux
    ringObjs.forEach((r, i) => { r.rotation.z += dt * (0.25 + i * 0.12) * (i % 2 ? -1 : 1); });
    sat.position.set(Math.cos(t * 1.3) * 3.4, Math.sin(t * 1.3) * 3.4, 0);
    logoGroup.rotation.y = mouse.sx * 0.5 + Math.sin(t * 0.6) * 0.18;
    logoGroup.rotation.x = -mouse.sy * 0.25;
    logoGroup.position.y = baseY + Math.sin(t * 1.1) * 0.12;

    // Caméra : parallaxe souris + avancée au scroll
    mouse.sx += (mouse.x - mouse.sx) * 0.06;
    mouse.sy += (mouse.y - mouse.sy) * 0.06;
    camera.position.x = mouse.sx * 0.9;
    camera.position.y = 1.5 - mouse.sy * 0.35 + scrollP * 1.6;
    camera.position.z = 7.2 - scrollP * 3.4;
    camera.lookAt(mouse.sx * 0.3, 2.4 + scrollP * 0.6, 0);
    canvas.style.opacity = String(1 - scrollP * 0.85);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  loop();
}
