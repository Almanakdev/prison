// ============================================================
// main.js — Black Bull Prison orchestrator
// ============================================================
import * as THREE from 'three';
import { buildInmate, buildBull, buildBullQuad, defaultConfig, randomConfig,
         SKIN_TONES, HAIR_COLORS, SUIT_COLORS,
         HAIR_STYLES, SUIT_STYLES, BUILDS, HEIGHTS } from './character.js';
import { buildInterrogation } from './rooms/interrogation.js';
import { buildGreenfield } from './rooms/greenfield.js';
import { Player } from './player.js';
import { ChatSystem } from './chat.js';
import { Wallet } from './wallet.js';

// ---------- global state ----------
const state = {
  config: defaultConfig(),
  room: null,            // 'interrogation' | 'field'
  wallet: new Wallet(),
  prisonbull: 0          // $BBPRISON earned from buckets in the yard
};

// ---------- The Black Bull coin (pump.fun) ----------
const COIN = {
  // the token's Solana contract address:
  ca: 'D3E3UMoFCBAZ59dXUWQbPxFcEpUQWDsy7gtZA2Vjpump',
  // base pump.fun page — when a CA is set, links straight to the coin page
  pumpfun: 'https://pump.fun'
};
function coinBuyUrl() {
  return COIN.ca ? 'https://pump.fun/coin/' + COIN.ca : COIN.pumpfun;
}

const $ = s => document.querySelector(s);
const toast = (msg) => {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.remove('show'), 3200);
};

// =================================================================
// 1. LANDING — rotating voxel BULL HEAD hero (echoes the logo)
// =================================================================
function initHeroCube() {
  const canvas = $('#cubeCanvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  cam.position.set(5, 3.4, 6);
  cam.lookAt(0, 0.2, 0);

  scene.add(new THREE.AmbientLight('#ffffff', 0.55));
  const d = new THREE.DirectionalLight('#fff0d0', 1.6);
  d.position.set(5, 8, 4); d.castShadow = true; scene.add(d);
  const d2 = new THREE.DirectionalLight('#d8b23e', 0.5);
  d2.position.set(-4, 2, 4); scene.add(d2);

  // ---- low-poly black bull (echoes the prison logo) ----
  const cube = new THREE.Group();
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({
    color: new THREE.Color(c), flatShading: true,
    roughness: o.rough ?? 1, metalness: o.metal ?? 0,
    emissive: o.emissive ? new THREE.Color(o.emissive) : 0x000000,
    emissiveIntensity: o.ei ?? 0
  });
  const add = (g, w, h, dp, x, y, z, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dp), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  };

  // muzzle / face box (brown leather)
  add(cube, 2.4, 2.0, 1.8, 0, 0.2, 0, M('#7a5538'));
  add(cube, 2.44, 0.55, 1.84, 0, 1.15, 0, M('#5f4129'));   // darker forehead band
  // dark hide cheeks
  add(cube, 0.5, 2.0, 1.84, -1.2, 0.2, 0, M('#24282f'));
  add(cube, 0.5, 2.0, 1.84,  1.2, 0.2, 0, M('#24282f'));

  // horns — stepped boxes sweeping out and up
  [-1, 1].forEach(s => {
    const horn = M('#6b4a35');
    const tip = M('#8a6244');
    add(cube, 0.55, 0.5, 0.55, s * 1.35, 0.9, 0, horn);
    add(cube, 0.5, 0.45, 0.5, s * 1.95, 1.35, 0, horn);
    add(cube, 0.42, 0.55, 0.42, s * 2.4, 1.95, 0, tip);
    add(cube, 0.34, 0.5, 0.34, s * 2.7, 2.55, 0, tip);
  });

  // eyes (dark slits with a red glint)
  [-0.6, 0.6].forEach(x => {
    add(cube, 0.34, 0.42, 0.12, x, 0.45, 0.92, M('#15110c'));
    add(cube, 0.16, 0.16, 0.1, x, 0.45, 0.99, M('#c0392b', { emissive: '#c0392b', ei: 0.6 }));
  });

  // dark snout block
  add(cube, 1.2, 0.8, 0.4, 0, -0.7, 0.82, M('#1c1f24'));
  add(cube, 0.18, 0.18, 0.15, -0.3, -0.55, 1.0, M('#0e1014'));
  add(cube, 0.18, 0.18, 0.15,  0.3, -0.55, 1.0, M('#0e1014'));

  // gold nose ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.12, 10, 20),
    M('#d8b23e', { metal: 0.6, rough: 0.35 }));
  ring.position.set(0, -1.15, 0.95); ring.castShadow = true; cube.add(ring);

  scene.add(cube);

  function resize() {
    const s = canvas.clientWidth;
    renderer.setSize(s, s, false);
    cam.aspect = 1; cam.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  let raf;
  (function loop() {
    raf = requestAnimationFrame(loop);
    cube.rotation.y += 0.004;
    cube.position.y = Math.sin(performance.now() * 0.001) * 0.15;
    renderer.render(scene, cam);
  })();
  return () => { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); };
}

// =================================================================
// 2. Drifting dust on landing
// =================================================================
function initDust() {
  const dust = $('#dust');
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('span');
    s.style.left = Math.random() * 100 + '%';
    s.style.animationDuration = (8 + Math.random() * 12) + 's';
    s.style.animationDelay = (-Math.random() * 20) + 's';
    s.style.opacity = (0.15 + Math.random() * 0.3);
    const sz = 3 + Math.random() * 5;
    s.style.width = s.style.height = sz + 'px';
    dust.appendChild(s);
  }
}

// =================================================================
// 3. DOOR PREVIEWS (tiny scenes in the gate cards)
// =================================================================
function initDoorPreviews() {
  const make = (canvasSel, bg, build) => {
    const canvas = $(canvasSel);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bg);
    const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    build(scene, cam);
    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(canvas); resize();
    (function loop() {
      requestAnimationFrame(loop);
      renderer.render(scene, cam);
    })();
  };

  // interrogation door: dim room with bulb
  make('#doorInterrogation', '#0a0a0c', (scene, cam) => {
    cam.position.set(3.5, 2.4, 4.5); cam.lookAt(0, 1, 0);
    scene.add(new THREE.AmbientLight('#33343c', 0.6));
    const p = new THREE.PointLight('#ffe6a0', 2, 12); p.position.set(0, 3, 0); scene.add(p);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 8),
      new THREE.MeshStandardMaterial({ color: '#26262b', flatShading: true }));
    floor.position.y = -0.1; scene.add(floor);
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.9),
      new THREE.MeshStandardMaterial({ color: '#6b6d78', metalness: .5, flatShading: true }));
    table.position.y = 1; scene.add(table);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshStandardMaterial({ color: '#ffe6a0', emissive: '#ffe6a0', emissiveIntensity: 1 }));
    bulb.position.set(0, 3, 0); scene.add(bulb);
    let raf; (function l() { raf = requestAnimationFrame(l); p.intensity = 2 + Math.sin(performance.now() * 0.01) * 0.3; })();
  });

  // field door: grass + sky + fence
  make('#doorField', '#bfe2f5', (scene, cam) => {
    cam.position.set(4, 3, 6); cam.lookAt(0, 1, 0);
    scene.add(new THREE.AmbientLight('#ffffff', 0.7));
    const sun = new THREE.DirectionalLight('#fff4d6', 1.8);
    sun.position.set(-5, 8, 4); scene.add(sun);
    for (let x = -4; x < 4; x++)
      for (let z = -4; z < 4; z++) {
        const g = ['#6fae3d', '#7cb342', '#8bc34a'][(x + z + 8) % 3];
        const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 1),
          new THREE.MeshStandardMaterial({ color: g, flatShading: true }));
        m.position.set(x + 0.5, -0.15, z + 0.5); scene.add(m);
      }
    // fence
    for (let i = -4; i <= 4; i += 1) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3, 0.12),
        new THREE.MeshStandardMaterial({ color: '#5b626b', flatShading: true }));
      post.position.set(i, 1.5, -4); scene.add(post);
    }
  });
}

// =================================================================
// 4. CHARACTER CREATOR
// =================================================================
let ccCleanup = null;
function openCreator(onConfirm) {
  const sec = $('#creator');
  sec.classList.add('on');

  const canvas = $('#ccCanvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#161b22');
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  cam.position.set(0, 1.6, 5.2);

  scene.add(new THREE.AmbientLight('#ffffff', 0.55));
  const key = new THREE.DirectionalLight('#fff0d0', 1.8);
  key.position.set(4, 8, 6); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); scene.add(key);
  const rim = new THREE.DirectionalLight('#d8b23e', 0.7);
  rim.position.set(-5, 3, -4); scene.add(rim);

  // pedestal
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.3, 8),
    new THREE.MeshStandardMaterial({ color: '#2a2f38', flatShading: true }));
  ped.position.y = -0.15; ped.receiveShadow = true; scene.add(ped);
  const grid = new THREE.GridHelper(20, 20, '#3a414c', '#20262e');
  grid.position.y = 0.001; scene.add(grid);

  let inmate = null, camYaw = 0.4, camPitch = 0.1, dist = 5.2, dragging = false, lx, ly;
  let cleanup = null;

  function rebuild() {
    if (inmate) scene.remove(inmate.group);
    inmate = buildInmate(state.config);
    scene.add(inmate.group);
  }
  rebuild();

  // ---- populate UI controls ----
  buildSwatches('#skinSwatches', SKIN_TONES, state.config.skin, v => { state.config.skin = v; rebuild(); });
  buildSwatches('#hairSwatches', HAIR_COLORS, state.config.hairColor, v => { state.config.hairColor = v; rebuild(); });
  buildSwatches('#suitSwatches', SUIT_COLORS, state.config.suitColor, v => { state.config.suitColor = v; rebuild(); });
  buildPicks('#hairStyles', HAIR_STYLES, state.config.hairStyle, v => { state.config.hairStyle = v; rebuild(); });
  buildPicks('#suitStyles', SUIT_STYLES, state.config.suitStyle, v => { state.config.suitStyle = v; rebuild(); });

  const nameEl = $('#ccName'); nameEl.value = state.config.name;
  nameEl.oninput = () => { state.config.name = nameEl.value.toUpperCase() || 'PAPER HAND'; };

  const buildSlider = $('#buildSlider'); buildSlider.value = state.config.build;
  buildSlider.oninput = () => {
    state.config.build = +buildSlider.value;
    $('#buildVal').textContent = BUILDS[state.config.build]; rebuild();
  };
  $('#buildVal').textContent = BUILDS[state.config.build];

  const heightSlider = $('#heightSlider'); heightSlider.value = state.config.height;
  heightSlider.oninput = () => {
    state.config.height = +heightSlider.value;
    $('#heightVal').textContent = HEIGHTS[state.config.height]; rebuild();
  };
  $('#heightVal').textContent = HEIGHTS[state.config.height];

  $('#ccRandom').onclick = () => {
    state.config = randomConfig();
    rebuild();
    // refresh UI
    syncUI();
  };
  function syncUI() {
    nameEl.value = state.config.name;
    buildSlider.value = state.config.build; $('#buildVal').textContent = BUILDS[state.config.build];
    heightSlider.value = state.config.height; $('#heightVal').textContent = HEIGHTS[state.config.height];
    markSel('#skinSwatches', state.config.skin);
    markSel('#hairSwatches', state.config.hairColor);
    markSel('#suitSwatches', state.config.suitColor);
    markPick('#hairStyles', state.config.hairStyle);
    markPick('#suitStyles', state.config.suitStyle);
  }

  $('#ccConfirm').onclick = () => {
    cleanup();
    sec.classList.remove('on');
    onConfirm(state.config);
  };

  // ---- drag to rotate ----
  const md = e => { dragging = true; lx = e.clientX; ly = e.clientY; };
  const mm = e => {
    if (!dragging) return;
    camYaw -= (e.clientX - lx) * 0.01; camPitch = Math.max(-0.3, Math.min(0.6, camPitch + (e.clientY - ly) * 0.006));
    lx = e.clientX; ly = e.clientY;
  };
  const mu = () => dragging = false;
  const wheel = e => { dist = Math.max(3, Math.min(8, dist + e.deltaY * 0.01)); };
  canvas.addEventListener('mousedown', md);
  window.addEventListener('mousemove', mm);
  window.addEventListener('mouseup', mu);
  canvas.addEventListener('wheel', wheel, { passive: true });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  let raf;
  (function loop() {
    raf = requestAnimationFrame(loop);
    if (!dragging) camYaw += 0.003;
    const cp = Math.cos(camPitch);
    cam.position.set(Math.sin(camYaw) * cp * dist, 1.4 + Math.sin(camPitch) * dist, Math.cos(camYaw) * cp * dist);
    cam.lookAt(0, 1.0, 0);
    // idle breathe
    if (inmate) inmate.pivots.torso.position.y = Math.sin(performance.now() * 0.002) * 0.02;
    renderer.render(scene, cam);
  })();

  cleanup = function () {
    cancelAnimationFrame(raf); ro.disconnect();
    canvas.removeEventListener('mousedown', md);
    window.removeEventListener('mousemove', mm);
    window.removeEventListener('mouseup', mu);
    canvas.removeEventListener('wheel', wheel);
    renderer.dispose();
  };
  ccCleanup = cleanup;
}

// helpers to build creator UI bits
function buildSwatches(sel, colors, current, onPick) {
  const wrap = $(sel); wrap.innerHTML = '';
  colors.forEach(c => {
    const b = document.createElement('div');
    b.className = 'swatch' + (c === current ? ' sel' : '');
    b.style.background = c; b.dataset.v = c;
    b.onclick = () => { markSel(sel, c); onPick(c); };
    wrap.appendChild(b);
  });
}
function markSel(sel, v) {
  $(sel).querySelectorAll('.swatch').forEach(s =>
    s.classList.toggle('sel', s.dataset.v === v));
}
function buildPicks(sel, items, current, onPick) {
  const wrap = $(sel); wrap.innerHTML = '';
  items.forEach(it => {
    const b = document.createElement('div');
    b.className = 'pick' + (it === current ? ' sel' : '');
    b.textContent = it; b.dataset.v = it;
    b.onclick = () => { markPick(sel, it); onPick(it); };
    wrap.appendChild(b);
  });
}
function markPick(sel, v) {
  $(sel).querySelectorAll('.pick').forEach(s =>
    s.classList.toggle('sel', s.dataset.v === v));
}

// =================================================================
// 5. THE GAME (room renderer + player)
// =================================================================
// things fellow paper hands mutter when you walk up to them
const INMATE_LINES = [
  "I sold at 2x. Two. Ex. I can't sleep, man.",
  "See that green candle on the tower? That one was mine.",
  "They say if you hold long enough the Bull lets you out. I'm trying.",
  "I had a hundred thousand Black Bull. Now I've got a hundred thousand regrets.",
  "Don't look at the chart. Trust me. Don't.",
  "First day? You'll fit right in. We all sold early.",
  "I told the Bull it was a tactical exit. He's still laughing.",
  "Diamond hands got the penthouse. We got the bench.",
  "One more cycle. One more. Then I'm out for real.",
  "Shoot some hoops. It's the only green in here that doesn't hurt."
];
// what the Black Bull growls when it patrols up to you in the yard
const BULL_LINES = [
  "Enjoying the yard? Every green candle out there was yours to keep.",
  "You sold. I remember. The chart remembers. Walk it off.",
  "Keep moving, paper hand. Diamond hands earned the gate. You earned laps.",
  "I don't need a cell to hold you. The regret does that.",
  "Look at the tower. That's the run you folded on. Look at it.",
  "One day you'll hold. Not today. Today you do your time."
];

let game = null;
class Game {
  constructor(room) {
    this.room = room;
    const canvas = $('#gameCanvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 200);

    // build the room
    const builder = room === 'interrogation' ? buildInterrogation : buildGreenfield;
    this.roomData = builder(this.scene);

    // build player inmate
    this.inmate = buildInmate(state.config);
    this.scene.add(this.inmate.group);
    this.player = new Player(this.inmate, this.cam, canvas);
    this.player.setBounds(this.roomData.bounds);
    this.player.spawn(this.roomData.spawn);

    // build NPC inmate-ish figure
    this._buildNPC();

    // scatter ambient fellow inmates (paper hands) around the pen
    this._buildInmates();

    // a Black Bull patrols the yard
    this._buildYardBull();

    // basketball (yard only) + shoot key
    this._buildBall();
    this._onKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'KeyE') { e.preventDefault(); this._shoot(); }
      if (e.code === 'KeyF') this._talk();   // talk to nearest inmate (if any in range)
    };
    window.addEventListener('keydown', this._onKey);

    this._resize = () => {
      this.renderer.setSize(innerWidth, innerHeight);
      this.cam.aspect = innerWidth / innerHeight; this.cam.updateProjectionMatrix();
    };
    window.addEventListener('resize', this._resize);
    this._resize();

    this.clock = new THREE.Clock();
    this.running = true;
    this.loop = this.loop.bind(this);
    this.loop();
  }

  _buildNPC() {
    const n = this.roomData.npc;
    // the Liquidation Room warden is THE BLACK BULL itself; the yard gets a guard
    const npc = this.room === 'interrogation'
      ? buildBull()
      : buildInmate({
          ...defaultConfig(),
          suitStyle: 'NUMBERED',
          suitColor: n.color, skin: '#C68A5E', hairStyle: 'CAP', hairColor: '#2A2A2E'
        });
    npc.group.position.copy(n.pos);
    npc.group.rotation.y = Math.PI;
    this.scene.add(npc.group);
    this.npc = npc;
    // name tag (raised for the taller, horned bull)
    const tagY = this.room === 'interrogation' ? 3.1 : 2.4;
    this._nameSprite(n.name, n.pos.clone().add(new THREE.Vector3(0, tagY, 0)));
    this._nameSprite(state.config.name + ' #' + state.wallet.inmateNumber(),
      new THREE.Vector3(0, 0, 0), this.inmate.group);
  }

  _buildInmates() {
    this.inmates = [];
    // only the open yard gets a crowd; the liquidation room stays you + the Bull
    if (this.room !== 'field') return;

    // wander region, inset from the fence bounds
    const b = this.roomData.bounds, pad = 1.5;
    const region = {
      minX: b.minX + pad, maxX: b.maxX - pad,
      minZ: b.minZ + pad, maxZ: b.maxZ - pad
    };
    const rand = (lo, hi) => lo + Math.random() * (hi - lo);

    // dress them as INMATES (orange/striped jumpsuits), not guard uniforms
    const inmateColors = ['#D9742E', '#E8A33A', '#E8E4D8', '#3C3C44', '#6B7A8C'];
    const inmateStyles = ['STRIPES', 'NUMBERED', 'SOLID'];

    const COUNT = 6;
    for (let i = 0; i < COUNT; i++) {
      const cfg = {
        ...randomConfig(),
        suitStyle: inmateStyles[Math.floor(Math.random() * inmateStyles.length)],
        suitColor: inmateColors[Math.floor(Math.random() * inmateColors.length)]
      };
      const inm = buildInmate(cfg);
      const x = rand(region.minX, region.maxX);
      const z = rand(region.minZ, region.maxZ);
      inm.group.position.set(x, 0, z);
      inm.group.rotation.y = rand(0, Math.PI * 2);
      // ambient figures don't cast shadows (keeps the crowd cheap)
      inm.group.traverse(o => { if (o.isMesh) o.castShadow = false; });
      this.scene.add(inm.group);
      // name tag follows the inmate as it walks
      this._nameSprite(cfg.name, null, inm.group);
      this.inmates.push({
        inm, x, z, region, name: cfg.name,
        tx: rand(region.minX, region.maxX),
        tz: rand(region.minZ, region.maxZ),
        speed: 0.6 + Math.random() * 0.7,
        phase: Math.random() * 6.28,
        walk: 0,
        pause: 0,
        cool: 2 + Math.random() * 4
      });
    }
  }

  _nameSprite(text, pos, parent, localY = 2.3) {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(22,27,34,0.85)'; ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = '#D8B23E'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, 252, 60);
    ctx.fillStyle = '#E8E4D8'; ctx.font = '20px "JetBrains Mono", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text.slice(0, 18), 128, 34);
    const tex = new THREE.CanvasTexture(cv);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    spr.scale.set(1.8, 0.45, 1);
    if (parent) { spr.position.set(0, localY, 0); parent.add(spr); }
    else { spr.position.copy(pos); this.scene.add(spr); }
  }

  // ease a wandering inmate's limbs back to a neutral standing pose
  _idleLimbs(p, dt) {
    const k = Math.min(1, dt * 8);
    p.leftLeg.rotation.x  += (0 - p.leftLeg.rotation.x)  * k;
    p.rightLeg.rotation.x += (0 - p.rightLeg.rotation.x) * k;
    p.leftArm.rotation.x  += (0 - p.leftArm.rotation.x)  * k;
    p.rightArm.rotation.x += (0 - p.rightArm.rotation.x) * k;
  }

  // ---- a Black Bull that patrols the yard ----
  _buildYardBull() {
    this.yardBull = null;
    if (this.room !== 'field' || !this.roomData.bounds) return;
    const b = this.roomData.bounds, pad = 2;
    const region = {
      minX: b.minX + pad, maxX: b.maxX - pad,
      minZ: b.minZ + pad, maxZ: b.maxZ - pad
    };
    const rand = (lo, hi) => lo + Math.random() * (hi - lo);
    const bull = buildBullQuad();   // on all fours, crawling the yard
    const x = -6, z = -6;
    bull.group.position.set(x, 0, z);
    this.scene.add(bull.group);
    this._nameSprite('THE BLACK BULL', null, bull.group, 2.1);
    this.yardBull = {
      bull, x, z, region,
      tx: rand(region.minX, region.maxX),
      tz: rand(region.minZ, region.maxZ),
      speed: 0.9, phase: Math.random() * 6.28, walk: 0, pause: 0, cool: 0
    };
  }

  // ---- TALK TO A NEARBY INMATE (press F) ----
  _talk() {
    // closest talkable in range: any inmate, or the patrolling Black Bull
    let best = null, bestD = 8;   // ~2.8m^2
    const consider = (x, z, ref) => {
      const px = this.player.pos.x - x, pz = this.player.pos.z - z;
      const d2 = px * px + pz * pz;
      if (d2 < bestD) { bestD = d2; best = ref; }
    };
    if (this.inmates) for (const e of this.inmates) consider(e.x, e.z, { kind: 'inmate', e });
    if (this.yardBull) consider(this.yardBull.x, this.yardBull.z, { kind: 'bull' });
    if (!best) return;

    this.player.sitting = false;   // it's a talk, not a sit
    if (best.kind === 'inmate') {
      const e = best.e;
      e.inm.group.rotation.y = Math.atan2(this.player.pos.x - e.x, this.player.pos.z - e.z);
      if (e.cool > 0) return;
      e.pause = 2.5; e.cool = 4;
      chat.npcSay(e.name, INMATE_LINES[Math.floor(Math.random() * INMATE_LINES.length)]);
    } else {
      const yb = this.yardBull;
      yb.bull.group.rotation.y = Math.atan2(this.player.pos.x - yb.x, this.player.pos.z - yb.z);
      if (yb.cool > 0) return;
      yb.pause = 2.5; yb.cool = 5;
      chat.npcSay('THE BLACK BULL', BULL_LINES[Math.floor(Math.random() * BULL_LINES.length)]);
    }
  }

  // ---- BASKETBALL ----
  _buildBall() {
    this.ball = null;
    if (this.room !== 'field' || !this.roomData.hoop) return;
    const R = 0.24;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(R, 16, 12),
      new THREE.MeshStandardMaterial({ color: '#d9742e', roughness: 0.85, flatShading: false })
    );
    // seams
    const seam = new THREE.Mesh(
      new THREE.TorusGeometry(R, 0.015, 6, 20),
      new THREE.MeshStandardMaterial({ color: '#2a1a10' }));
    mesh.add(seam);
    const seam2 = seam.clone(); seam2.rotation.x = Math.PI / 2; mesh.add(seam2);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.ball = {
      mesh, R,
      state: 'held',          // held | flying | dead
      vel: new THREE.Vector3(),
      pos: new THREE.Vector3(),
      timer: 0,
      scored: false,
      buckets: 0,
      prevY: 0
    };
  }

  _shoot() {
    const b = this.ball;
    if (!b || b.state !== 'held') return;
    const hoop = this.roomData.hoop;
    // launch from the ball's current (held) position toward the hoop, in an arc
    const start = b.pos.clone();
    const T = 0.95;                       // time of flight
    const g = -16;
    b.vel.x = (hoop.x - start.x) / T;
    b.vel.z = (hoop.z - start.z) / T;
    b.vel.y = (hoop.y - start.y) / T - 0.5 * g * T;  // arc arrives at the rim center
    b.state = 'flying';
    b.scored = false;
    b.prevY = start.y;
    toast('Shot up…');
  }

  _updateBall(dt) {
    const b = this.ball; if (!b) return;
    const hoop = this.roomData.hoop, hr = this.roomData.hoopR;

    if (b.state === 'held') {
      // float at the player's side, slightly in front
      const yaw = this.player.obj.rotation.y;
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      b.pos.set(
        this.player.pos.x + fx * 0.55 + fz * 0.35,
        this.player.pos.y + 1.0 + Math.sin(performance.now() * 0.004) * 0.04,
        this.player.pos.z + fz * 0.55 - fx * 0.35
      );
    } else if (b.state === 'flying') {
      b.vel.y += -16 * dt;
      b.pos.addScaledVector(b.vel, dt);
      // score: while descending near the rim height, within the ring
      if (!b.scored && b.vel.y < 0 && Math.abs(b.pos.y - hoop.y) < 0.35) {
        const dx = b.pos.x - hoop.x, dz = b.pos.z - hoop.z;
        if (Math.hypot(dx, dz) < hr + 0.18) {
          b.scored = true; b.buckets++;
          b.streak = (b.streak || 0) + 1;
          // 100 $BBPRISON per bucket, +50 for each in the streak (capped x5)
          const mult = Math.min(b.streak, 5);
          const reward = 100 + (mult - 1) * 50;
          state.prisonbull += reward;
          updateEarnUI();
          toast(b.streak > 1
            ? 'SWISH! x' + b.streak + ' streak — +' + reward + ' $BBPRISON'
            : 'SWISH! +' + reward + ' $BBPRISON');
        }
      }
      b.prevY = b.pos.y;
      // ground bounce
      if (b.pos.y <= b.R) {
        b.pos.y = b.R;
        if (Math.abs(b.vel.y) > 1.5) { b.vel.y *= -0.55; b.vel.x *= 0.7; b.vel.z *= 0.7; }
        else {
          if (!b.scored) b.streak = 0;   // missed shot breaks the streak
          b.state = 'dead'; b.timer = 1.1; b.vel.set(0, 0, 0);
        }
      }
    } else if (b.state === 'dead') {
      b.timer -= dt;
      if (b.timer <= 0) b.state = 'held';   // ball returns to the player
    }

    b.mesh.position.copy(b.pos);
    // roll/spin the ball a little while it travels
    if (b.state === 'flying') { b.mesh.rotation.x += dt * 6; b.mesh.rotation.z += dt * 3; }
  }

  loop() {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const dt = this.clock.getDelta();
    const t = this.clock.elapsedTime;
    this.player.update(dt);
    if (this.roomData.animate) this.roomData.animate(t, dt);
    // npc idle breathe + face player
    if (this.npc) {
      this.npc.pivots.torso.position.y = Math.sin(t * 1.5) * 0.02;
      const dx = this.player.pos.x - this.npc.group.position.x;
      const dz = this.player.pos.z - this.npc.group.position.z;
      this.npc.group.rotation.y += (Math.atan2(dx, dz) - this.npc.group.rotation.y) * 0.04;
    }
    // ambient inmates: wander the yard, walk legs, breathe
    if (this.inmates) {
      for (const e of this.inmates) {
        const p = e.inm.pivots;
        const dx = e.tx - e.x, dz = e.tz - e.z;
        const dist = Math.hypot(dx, dz);

        if (e.pause > 0) {
          e.pause -= dt;                         // standing still for a beat
          this._idleLimbs(p, dt);
        } else if (dist < 0.5) {
          // arrived — sometimes pause, then pick a new target
          if (Math.random() < 0.5) e.pause = 1 + Math.random() * 3;
          e.tx = e.region.minX + Math.random() * (e.region.maxX - e.region.minX);
          e.tz = e.region.minZ + Math.random() * (e.region.maxZ - e.region.minZ);
          this._idleLimbs(p, dt);
        } else {
          // walk toward target
          const step = e.speed * dt;
          e.x += (dx / dist) * step;
          e.z += (dz / dist) * step;
          e.inm.group.position.x = e.x;
          e.inm.group.position.z = e.z;
          // turn to face direction of travel
          const targetYaw = Math.atan2(dx, dz);
          let d = targetYaw - e.inm.group.rotation.y;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          e.inm.group.rotation.y += d * Math.min(1, dt * 6);
          // swing legs + arms
          e.walk += dt * 8;
          const sw = Math.sin(e.walk) * 0.7;
          p.leftLeg.rotation.x = sw;  p.rightLeg.rotation.x = -sw;
          p.leftArm.rotation.x = -sw * 0.6; p.rightArm.rotation.x = sw * 0.6;
        }
        // breathe
        p.torso.position.y = Math.sin((t + e.phase) * 1.4) * 0.02;
        if (e.cool > 0) e.cool -= dt;   // talk cooldown ticks down
      }
    }
    // the Black Bull crawls the yard on all fours
    if (this.yardBull) {
      const yb = this.yardBull, g = yb.bull.group, pv = yb.bull.pivots;
      const dx = yb.tx - yb.x, dz = yb.tz - yb.z, dist = Math.hypot(dx, dz);
      const easeLegs = () => {
        pv.legFL.rotation.x *= 0.85; pv.legFR.rotation.x *= 0.85;
        pv.legBL.rotation.x *= 0.85; pv.legBR.rotation.x *= 0.85;
      };
      if (yb.pause > 0) {
        yb.pause -= dt; easeLegs();
      } else if (dist < 0.6) {
        yb.tx = yb.region.minX + Math.random() * (yb.region.maxX - yb.region.minX);
        yb.tz = yb.region.minZ + Math.random() * (yb.region.maxZ - yb.region.minZ);
        if (Math.random() < 0.4) yb.pause = 1 + Math.random() * 2;
        easeLegs();
      } else {
        const step = yb.speed * dt;
        yb.x += (dx / dist) * step; yb.z += (dz / dist) * step;
        g.position.x = yb.x; g.position.z = yb.z;
        const ty = Math.atan2(dx, dz);
        let d = ty - g.rotation.y;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        g.rotation.y += d * Math.min(1, dt * 4);
        // four-legged gait: diagonal pairs swing together
        yb.walk += dt * 5;
        const sw = Math.sin(yb.walk) * 0.45;
        pv.legFL.rotation.x = sw;  pv.legBR.rotation.x = sw;
        pv.legFR.rotation.x = -sw; pv.legBL.rotation.x = -sw;
      }
      // slow head sway
      pv.head.rotation.x = Math.sin((t + yb.phase) * 1.2) * 0.04;
      if (yb.cool > 0) yb.cool -= dt;
    }
    // basketball physics
    this._updateBall(dt);
    this.renderer.render(this.scene, this.cam);
  }

  dispose() {
    this.running = false;
    window.removeEventListener('resize', this._resize);
    window.removeEventListener('keydown', this._onKey);
    this.player.dispose();
    this.renderer.dispose();
    // free scene
    this.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); }
    });
  }
}

// =================================================================
// 6. CHAT + WALLET WIRING
// =================================================================
const chat = new ChatSystem({
  logEl: $('#chatLog'), inputEl: $('#chatInput'),
  sendEl: $('#chatSend'), micEl: $('#chatMic'), toast
});

async function doConnect() {
  const res = await state.wallet.connect();
  if (res.ok) {
    toast('Wallet connected — inmate #' + state.wallet.inmateNumber());
  } else if (res.noWallet) {
    toast(res.error);
  } else {
    toast(res.error || 'Could not connect.');
  }
  refreshWalletUI();
}
function updateEarnUI() {
  const el = $('#earnBal');
  if (el) el.textContent = state.prisonbull.toLocaleString();
}
function refreshWalletUI() {
  const short = state.wallet.short();
  const label = short ? ('● ' + short) : 'CONNECT WALLET';
  $('#walletFoot').textContent = short ? ('WALLET: ' + short) : 'WALLET: NOT CONNECTED';
  const pw = $('#pillWallet'); if (pw) pw.textContent = label;
}
state.wallet.onChange(refreshWalletUI);

// =================================================================
// 7. NAVIGATION / STATE MACHINE
// =================================================================
function showGate() {
  $('#landing').style.display = 'none';
  $('#gate').classList.add('on');
  initDoorPreviews();
}
function backToGate() {
  if (game) { game.dispose(); game = null; }
  $('#game').classList.remove('on');
  $('#gate').classList.add('on');
}
function backToLanding() {
  $('#gate').classList.remove('on');
  $('#landing').style.display = 'flex';
}

function enterRoom(room) {
  state.room = room;
  // open creator first, then drop into room
  openCreator((cfg) => {
    state.config = cfg;
    $('#gate').classList.remove('on');
    $('#game').classList.add('on');
    // room badge
    const map = {
      interrogation: ['THE LIQUIDATION ROOM', 'SMALL ROOM · ON THE RECORD'],
      field: ['THE GREEN CANDLE YARD', 'OPEN PEN · GREEN CANDLES']
    };
    $('#roomBadge').childNodes[0].nodeValue = map[room][0] + ' ';
    $('#roomSub').textContent = map[room][1];
    refreshWalletUI();
    updateEarnUI();
    chat.setRoom(room, state.config.name);
    // (re)build game
    if (game) game.dispose();
    game = new Game(room);
  });
}

// ---- bind landing / gate buttons ----
$('#enterYard').onclick = showGate;
$('#navRooms').onclick = (e) => { e.preventDefault(); showGate(); };
$('#connectTop').onclick = doConnect;
$('#navWallet').onclick = (e) => { e.preventDefault(); doConnect(); };
$('#gateBack').onclick = backToLanding;
$('#leaveBtn').onclick = backToGate;
$('#pillWallet').onclick = doConnect;

// ---- BUY COIN → pump.fun ----
(function wireBuy() {
  const url = coinBuyUrl();
  const buyBtn = $('#buyCoin'), navBuy = $('#navBuy');
  if (buyBtn) buyBtn.href = url;
  if (navBuy) navBuy.onclick = (e) => {
    e.preventDefault(); window.open(url, '_blank', 'noopener');
  };
})();

document.querySelectorAll('.door').forEach(d =>
  d.addEventListener('click', () => enterRoom(d.dataset.room)));

// chat hotkey
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyT' && $('#game').classList.contains('on') && e.target.tagName !== 'INPUT') {
    e.preventDefault(); $('#chatInput').focus();
  }
  if (e.code === 'Escape' && document.activeElement === $('#chatInput')) {
    $('#chatInput').blur();
  }
});

// animated inmate counter
(function tick() {
  const el = $('#statInmates');
  let n = 12408;
  setInterval(() => { n += Math.floor(Math.random() * 3); el.textContent = n.toLocaleString(); }, 4000);
})();

// =================================================================
// 8. BOOT
// =================================================================
initDust();
initHeroCube();
refreshWalletUI();

// hide loader once fonts/first frame ready
window.addEventListener('load', () => {
  setTimeout(() => {
    $('#loader').classList.add('gone');
    setTimeout(() => $('#loader').remove(), 600);
  }, 700);
});
