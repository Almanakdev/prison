// ============================================================
// main.js — Prison Of Trenches orchestrator
// ============================================================
import * as THREE from 'three';
import { buildInmate, defaultConfig, randomConfig,
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
  wallet: new Wallet()
};

const $ = s => document.querySelector(s);
const toast = (msg) => {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.remove('show'), 3200);
};

// =================================================================
// 1. LANDING — rotating voxel cube hero (echoes the logo)
// =================================================================
function initHeroCube() {
  const canvas = $('#cubeCanvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  cam.position.set(5, 4.2, 5);
  cam.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight('#ffffff', 0.6));
  const d = new THREE.DirectionalLight('#fff0d0', 1.6);
  d.position.set(5, 8, 4); d.castShadow = true; scene.add(d);
  const d2 = new THREE.DirectionalLight('#5a8c3a', 0.4);
  d2.position.set(-4, 2, -3); scene.add(d2);

  const cube = new THREE.Group();
  // dirt block
  const N = 4;
  for (let x = 0; x < N; x++)
    for (let y = 0; y < N; y++)
      for (let z = 0; z < N; z++) {
        if (x > 0 && x < N - 1 && y > 0 && y < N - 1 && z > 0 && z < N - 1) continue;
        const top = y === N - 1;
        const cols = top ? ['#6fae3d', '#7cb342', '#669a36']
                         : ['#8B5E34', '#6B4A2E', '#7a532e', '#5a3e24'];
        const c = cols[(x * 3 + y * 7 + z * 11) % cols.length];
        const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial({ color: new THREE.Color(c), flatShading: true, roughness: 1 }));
        m.position.set(x - N / 2 + 0.5, y - N / 2 + 0.5, z - N / 2 + 0.5);
        m.castShadow = true; m.receiveShadow = true;
        cube.add(m);
      }
  // little caged prisoner in front face
  const cage = new THREE.Group();
  for (let i = 0; i <= 4; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.6, 0.06),
      new THREE.MeshStandardMaterial({ color: '#c9a24b', flatShading: true, metalness: .3 }));
    bar.position.set(-0.8 + i * 0.4, 0, 2.05); cage.add(bar);
  }
  const tiny = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.4),
    new THREE.MeshStandardMaterial({ color: '#E8E4D8', flatShading: true }));
  tiny.position.set(0, -0.2, 1.7); cage.add(tiny);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.5),
    new THREE.MeshStandardMaterial({ color: '#E0AC7E', flatShading: true }));
  head.position.set(0, 0.65, 1.7); cage.add(head);
  cube.add(cage);
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
  scene.background = new THREE.Color('#14110d');
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  cam.position.set(0, 1.6, 5.2);

  scene.add(new THREE.AmbientLight('#ffffff', 0.55));
  const key = new THREE.DirectionalLight('#fff0d0', 1.8);
  key.position.set(4, 8, 6); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); scene.add(key);
  const rim = new THREE.DirectionalLight('#5a8c3a', 0.7);
  rim.position.set(-5, 3, -4); scene.add(rim);

  // pedestal
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.3, 8),
    new THREE.MeshStandardMaterial({ color: '#3a3024', flatShading: true }));
  ped.position.y = -0.15; ped.receiveShadow = true; scene.add(ped);
  const grid = new THREE.GridHelper(20, 20, '#3a3024', '#241d14');
  grid.position.y = 0.001; scene.add(grid);

  let inmate = null, camYaw = 0.4, camPitch = 0.1, dist = 5.2, dragging = false, lx, ly;

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
  nameEl.oninput = () => { state.config.name = nameEl.value.toUpperCase() || 'JOHN DOE'; };

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
    // simple blocky NPC using same builder with a fixed look
    const npc = buildInmate({
      ...defaultConfig(),
      suitStyle: this.room === 'interrogation' ? 'SOLID' : 'NUMBERED',
      suitColor: n.color, skin: '#C68A5E', hairStyle: 'CAP', hairColor: '#2A2A2E'
    });
    npc.group.position.copy(n.pos);
    npc.group.rotation.y = Math.PI;
    this.scene.add(npc.group);
    this.npc = npc;
    // name tag
    this._nameSprite(n.name, n.pos.clone().add(new THREE.Vector3(0, 2.4, 0)));
    this._nameSprite(state.config.name + ' #' + state.wallet.inmateNumber(),
      new THREE.Vector3(0, 0, 0), this.inmate.group);
  }

  _nameSprite(text, pos, parent) {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(16,13,10,0.85)'; ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = '#D9A441'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, 252, 60);
    ctx.fillStyle = '#E8E4D8'; ctx.font = '20px "JetBrains Mono", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text.slice(0, 18), 128, 34);
    const tex = new THREE.CanvasTexture(cv);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    spr.scale.set(1.8, 0.45, 1);
    if (parent) { spr.position.set(0, 2.3, 0); parent.add(spr); }
    else { spr.position.copy(pos); this.scene.add(spr); }
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
    this.renderer.render(this.scene, this.cam);
  }

  dispose() {
    this.running = false;
    window.removeEventListener('resize', this._resize);
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
      interrogation: ['THE INTERROGATION ROOM', 'SMALL ROOM · ON THE RECORD'],
      field: ['THE GREENFIELD', 'OPEN YARD · MORNING LIGHT']
    };
    $('#roomBadge').childNodes[0].nodeValue = map[room][0] + ' ';
    $('#roomSub').textContent = map[room][1];
    refreshWalletUI();
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
