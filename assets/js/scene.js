// Scène 3D de l'accueil : logo R2A vectoriel extrudé en or, piste en perspective, poussière dorée.
import * as THREE from '../vendor/three.module.js';
import { LOGO_W, LOGO_H, LOGO_SHAPES } from './logo-shape.js';

const canvas = document.getElementById('heroCanvas');
const hero = document.getElementById('hero');
if (canvas && hero) init();

function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { canvas.remove(); return; }

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 860px)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070707, 0.045);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 140);
  camera.position.set(0, 1.4, 8);

  const GOLD = 0xe3bf73;

  // ---------- Environnement (reflets métalliques) ----------
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x120d05);
  const mkPanel = (w, h, x, y, z, c, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m);
  };
  mkPanel(14, 4, 0, 9, 4, 0xfff0cc, 6);
  mkPanel(5, 12, -9, 2, 3, 0xffe2a0, 3.5);
  mkPanel(5, 12, 9, 2, -2, 0xffffff, 2.5);
  mkPanel(16, 3, 0, -6, 6, 0xc99a45, 2);
  mkPanel(18, 10, 0, 1, 12, 0xffe6b0, 2.0);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.03).texture;

  // ---------- Piste ----------
  const track = new THREE.Group(); scene.add(track);
  const LANES = 7, LANE_W = 1.5, LEN = 120;
  const lineMat = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.7 });
  for (let i = 0; i <= LANES; i++) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.04, LEN), lineMat);
    line.rotation.x = -Math.PI / 2; line.position.set((i - LANES / 2) * LANE_W, 0.01, -LEN / 2 + 10);
    track.add(line);
  }
  const dashes = [];
  const dashMat = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.35 });
  const SPACING = 7, COUNT = 18;
  for (let i = 0; i < COUNT; i++) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(LANES * LANE_W, 0.05), dashMat);
    bar.rotation.x = -Math.PI / 2; bar.position.set(0, 0.012, 10 - i * SPACING);
    track.add(bar); dashes.push(bar);
  }

  // ---------- Logo extrudé (vectoriel, net à toute taille) ----------
  const UNIT = 4.4 / LOGO_W;
  const P = ([x, y]) => new THREE.Vector2((x - LOGO_W / 2) * UNIT, (LOGO_H / 2 - y) * UNIT);
  const shapes = LOGO_SHAPES.map(s => {
    const sh = new THREE.Shape(s.o.map(P));
    s.h.forEach(hole => sh.holes.push(new THREE.Path(hole.map(P))));
    return sh;
  });
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: 0.34, bevelEnabled: true, bevelThickness: 0.045, bevelSize: 0.035, bevelSegments: 5, curveSegments: 24
  });
  geo.center();
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4a23f, metalness: 0.9, roughness: 0.28, envMapIntensity: 1.15, emissive: 0x6b4710, emissiveIntensity: 0.4 });
  const logo = new THREE.Mesh(geo, gold);
  const logoGroup = new THREE.Group(); logoGroup.add(logo); scene.add(logoGroup);

  // Halo doux derrière le logo
  const hc = document.createElement('canvas'); hc.width = hc.height = 512;
  const g2 = hc.getContext('2d'), gr = g2.createRadialGradient(256, 256, 0, 256, 256, 256);
  gr.addColorStop(0, 'rgba(227,191,115,.42)'); gr.addColorStop(.45, 'rgba(227,191,115,.1)'); gr.addColorStop(1, 'rgba(227,191,115,0)');
  g2.fillStyle = gr; g2.fillRect(0, 0, 512, 512);
  const haloTex = new THREE.CanvasTexture(hc); haloTex.colorSpace = THREE.SRGBColorSpace;
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(10, 10),
    new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.z = -1.2; logoGroup.add(halo);

  // Un seul anneau fin
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.01, 12, 220),
    new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.55 }));
  ring.rotation.x = 1.15; ring.position.z = -0.4; logoGroup.add(ring);
  const sat = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 24), new THREE.MeshBasicMaterial({ color: 0xfff1c9 }));
  ring.add(sat);

  // ---------- Particules ----------
  const N = small ? 160 : 340;
  const pos = new Float32Array(N * 3), spd = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 30; pos[i * 3 + 1] = Math.random() * 10; pos[i * 3 + 2] = 6 - Math.random() * 44;
    spd[i] = 0.2 + Math.random() * 0.6;
  }
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dot = document.createElement('canvas'); dot.width = dot.height = 128;
  const dc = dot.getContext('2d'), dg = dc.createRadialGradient(64, 64, 0, 64, 64, 64);
  dg.addColorStop(0, 'rgba(255,244,214,1)'); dg.addColorStop(.25, 'rgba(227,191,115,.75)'); dg.addColorStop(1, 'rgba(227,191,115,0)');
  dc.fillStyle = dg; dc.fillRect(0, 0, 128, 128);
  const dotTex = new THREE.CanvasTexture(dot); dotTex.colorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ map: dotTex, size: 0.15, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

  // Lumières (en complément de l'environnement)
  const key = new THREE.DirectionalLight(0xffe7b8, 1.8); key.position.set(-2, 3, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0xe3bf73, 1.6); rim.position.set(5, 2, -3); scene.add(rim);

  // ---------- Interaction ----------
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  });
  hero.addEventListener('pointerleave', () => { mouse.x = 0; mouse.y = 0; });
  addEventListener('deviceorientation', e => {
    if (e.gamma == null) return;
    mouse.x = Math.max(-1, Math.min(1, e.gamma / 30)); mouse.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
  }, { passive: true });

  let scrollP = 0;
  const onScroll = () => { scrollP = Math.min(1, Math.max(0, scrollY / (hero.offsetHeight * 0.9))); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  let baseY = 1.9;
  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const wide = w / h > 1.15;
    camera.fov = wide ? 45 : 58;
    camera.updateProjectionMatrix();
    if (wide) { logoGroup.position.set(Math.min(3.3, w / h * 1.3), 1.9, 0); logoGroup.scale.setScalar(0.9); }
    else {
      // Mobile : le logo est centré dans la zone libre entre l'en-tête et le texte,
      // un peu au-dessus du milieu, avec une marge avant « Performance • Confort • Style ».
      const copy = hero.querySelector('.hero-copy');
      const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 60;
      const eb = copy && copy.querySelector('.eyebrow');
      const copyTop = eb ? eb.getBoundingClientRect().top - hero.getBoundingClientRect().top : h * 0.5;
      const zone = Math.max(120, copyTop - headerH);
      const z = -1, dist = camera.position.z - z;
      const visW = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
      const sc = 0.5 * visW / 4.4;
      const screenY = headerH + zone * 0.47;
      camera.position.set(0, 1.4, 8); camera.lookAt(0, 2.1, 0); camera.updateMatrixWorld();
      const ndc = new THREE.Vector3(0, 1 - 2 * screenY / h, 0.5).unproject(camera);
      const dir = ndc.sub(camera.position).normalize();
      const k = (z - camera.position.z) / dir.z;
      logoGroup.position.copy(camera.position).addScaledVector(dir, k);
      logoGroup.scale.setScalar(sc);
    }
    baseY = logoGroup.position.y;
  }
  new ResizeObserver(resize).observe(hero); resize();

  let visible = true, last = performance.now(), t = 0, raf = 0;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) { last = performance.now(); loop(); } }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) { last = performance.now(); loop(); } });

  function loop() {
    cancelAnimationFrame(raf);
    if (!visible || document.hidden) return;
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    t += reduce ? 0 : dt;

    for (const d of dashes) { d.position.z += (reduce ? 0 : 5) * dt; if (d.position.z > 10) d.position.z -= COUNT * SPACING; }
    const a = pGeo.attributes.position.array;
    if (!reduce) for (let i = 0; i < N; i++) {
      a[i * 3 + 1] += spd[i] * dt * 0.5; a[i * 3 + 2] += spd[i] * dt * 2;
      if (a[i * 3 + 1] > 10) a[i * 3 + 1] = 0;
      if (a[i * 3 + 2] > 7) a[i * 3 + 2] = -38;
    }
    pGeo.attributes.position.needsUpdate = true;

    ring.rotation.z += dt * 0.25;
    sat.position.set(Math.cos(t * 1.2) * 3.6, Math.sin(t * 1.2) * 3.6, 0);
    mouse.sx += (mouse.x - mouse.sx) * 0.06; mouse.sy += (mouse.y - mouse.sy) * 0.06;
    logoGroup.rotation.y = mouse.sx * 0.55 + Math.sin(t * 0.7) * 0.28;
    logoGroup.rotation.x = -mouse.sy * 0.22 + 0.04;
    logoGroup.position.y = baseY + Math.sin(t * 1.1) * 0.1;

    camera.position.x = mouse.sx * 0.7;
    camera.position.y = 1.4 - mouse.sy * 0.3 + scrollP * 1.4;
    camera.position.z = 8 - scrollP * 3;
    camera.lookAt(mouse.sx * 0.2, 2.1 + scrollP * 0.5, 0);
    canvas.style.opacity = String(1 - scrollP * 0.9);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  loop();
}
