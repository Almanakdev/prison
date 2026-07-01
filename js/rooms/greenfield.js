// ============================================================
// rooms/greenfield.js — THE GREEN CANDLE YARD (bright morning pen)
// ============================================================
import * as THREE from 'three';

function vox(scene, w, h, d, x, y, z, color, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: opts.rough ?? 0.95,
      metalness: opts.metal ?? 0,
      flatShading: true
    })
  );
  m.position.set(x, y, z);
  m.castShadow = opts.noShadow ? false : true;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

const GRASS = ['#6fae3d', '#7cb342', '#8bc34a', '#669a36'];
const DIRT = ['#8B5E34', '#6B4A2E', '#7a532e'];

export function buildGreenfield(scene) {
  scene.background = new THREE.Color('#bfe2f5');
  scene.fog = new THREE.Fog('#cdeaf7', 28, 70);

  const FIELD = 28;
  const half = FIELD / 2;
  const bounds = { minX: -half + 1.2, maxX: half - 1.2, minZ: -half + 1.2, maxZ: half - 1.2 };

  // ---- morning lighting ----
  const amb = new THREE.AmbientLight('#dff0ff', 0.85);
  scene.add(amb);
  const hemi = new THREE.HemisphereLight('#cfeeff', '#5a8c3a', 0.8);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight('#fff4d6', 2.2);
  sun.position.set(-18, 22, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = 22;
  sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
  sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
  sun.shadow.camera.far = 80;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  // low warm fill from the morning sun direction
  const warm = new THREE.DirectionalLight('#ffdca8', 0.5);
  warm.position.set(-20, 4, 8);
  scene.add(warm);

  // ---- grass field (voxel terrain w/ tiny height variation) ----
  for (let x = -half; x < half; x++) {
    for (let z = -half; z < half; z++) {
      const g = GRASS[(x * 7 + z * 13 + 100) % GRASS.length % GRASS.length];
      const hy = (Math.sin(x * 0.6) + Math.cos(z * 0.5)) * 0.04;
      vox(scene, 1, 0.4, 1, x + 0.5, -0.2 + hy, z + 0.5, g, { rough: 1 });
      // occasional grass tufts
      if (Math.random() < 0.06) {
        vox(scene, 0.12, 0.22, 0.12, x + 0.3 + Math.random() * 0.4, 0.12,
          z + 0.3 + Math.random() * 0.4, '#5a8c2a', { noShadow: true });
      }
    }
  }

  // ---- dirt running track around inner field ----
  for (let i = -half; i < half; i++) {
    const d = DIRT[(i + 50) % DIRT.length];
    vox(scene, 1, 0.42, 1, i + 0.5, -0.19, -half + 1.5, d, { rough: 1 });
    vox(scene, 1, 0.42, 1, i + 0.5, -0.19, half - 1.5, d, { rough: 1 });
  }

  // ---- tall chain-link fence around the yard ----
  const fenceMat = '#9aa3ad';
  const postMat = '#5b626b';
  const FH = 5;
  const buildFenceLine = (fixed, axis) => {
    for (let i = -half; i <= half; i += 2) {
      // posts
      const px = axis === 'x' ? i : fixed;
      const pz = axis === 'x' ? fixed : i;
      vox(scene, 0.18, FH, 0.18, px, FH / 2, pz, postMat, { metal: 0.4 });
    }
    // mesh panel (thin translucent-ish boxes as chain link rails)
    for (let y = 0.6; y < FH; y += 0.9) {
      const w = axis === 'x' ? FIELD : 0.06;
      const d = axis === 'x' ? 0.06 : FIELD;
      const px = axis === 'x' ? 0 : fixed;
      const pz = axis === 'x' ? fixed : 0;
      vox(scene, w, 0.05, d, px, y, pz, fenceMat, { metal: 0.5, noShadow: true });
    }
    // barbed wire top
    const wy = FH + 0.2;
    for (let i = -half; i < half; i += 0.5) {
      const px = axis === 'x' ? i : fixed;
      const pz = axis === 'x' ? fixed : i;
      vox(scene, 0.08, 0.08, 0.08, px, wy + Math.sin(i * 3) * 0.1, pz, '#c0c4c8',
        { metal: 0.6, noShadow: true });
    }
  };
  buildFenceLine(-half, 'x');
  buildFenceLine(half, 'x');
  buildFenceLine(-half, 'z');
  buildFenceLine(half, 'z');

  // ---- the prison block in the background (behind one fence) ----
  const blockMat = '#8a8f96';
  for (let bx = -8; bx <= 8; bx += 4) {
    const bh = 7 + (Math.abs(bx) % 8);
    vox(scene, 3.6, bh, 3.6, bx, bh / 2, -half - 4, blockMat, { rough: 0.9 });
    // barred windows
    for (let wy = 2; wy < bh - 1; wy += 2.2) {
      vox(scene, 0.7, 1.0, 0.1, bx, wy, -half - 4 + 1.85, '#1a1a22');
      vox(scene, 0.1, 1.0, 0.1, bx - 0.2, wy, -half - 4 + 1.9, '#3a3a44');
      vox(scene, 0.1, 1.0, 0.1, bx + 0.2, wy, -half - 4 + 1.9, '#3a3a44');
    }
  }
  // guard tower
  vox(scene, 1.2, 12, 1.2, half + 3, 6, half + 3, '#6b6f76');
  vox(scene, 2.4, 1.8, 2.4, half + 3, 12.6, half + 3, '#3a3a42');
  vox(scene, 2.6, 0.3, 2.6, half + 3, 13.6, half + 3, '#2a2a30', { noShadow: true });
  // tower searchlight
  const tl = new THREE.PointLight('#fff0c0', 0.6, 30);
  tl.position.set(half + 3, 12, half + 3);
  scene.add(tl);

  // ---- the JUMBOTRON: green candle chart they sold before ----
  // two posts + dark screen, mounted high beyond the far fence
  const screenX = 0, screenZ = -half - 2, screenY = 7;
  vox(scene, 0.4, 10, 0.4, -5, 5, screenZ, '#3a3a42', { metal: 0.3 });
  vox(scene, 0.4, 10, 0.4,  5, 5, screenZ, '#3a3a42', { metal: 0.3 });
  vox(scene, 11, 6, 0.4, screenX, screenY, screenZ, '#0c100c'); // screen face
  vox(scene, 11.4, 6.4, 0.2, screenX, screenY, screenZ - 0.25, '#15181c'); // bezel
  // rising green candles drawn as little boxes
  const candleGlow = new THREE.PointLight('#5cc24a', 0.0, 24);
  candleGlow.position.set(screenX, screenY, screenZ + 1.5);
  scene.add(candleGlow);
  const candles = [];
  const baseY = screenY - 2.4;
  for (let i = 0; i < 9; i++) {
    const h = 0.7 + i * 0.42 + Math.sin(i * 1.3) * 0.3;
    const cx = screenX - 4.5 + i * 1.05;
    const green = i % 5 === 3 ? '#c0392b' : '#5cc24a'; // one red dip, rest green
    const body = vox(scene, 0.55, h, 0.12, cx, baseY + h / 2, screenZ + 0.22, green,
      { emissive: green, emissiveIntensity: 0.5, noShadow: true });
    // wick
    vox(scene, 0.08, h * 0.5, 0.12, cx, baseY + h + h * 0.2, screenZ + 0.22, green,
      { emissive: green, emissiveIntensity: 0.4, noShadow: true });
    candles.push(body);
  }
  // "YOU SOLD HERE" arrow marker on the 4th (red) candle
  vox(scene, 0.5, 0.5, 0.12, screenX - 4.5 + 3 * 1.05, baseY + 4.6, screenZ + 0.24, '#e8e4d8',
    { emissive: '#e8e4d8', emissiveIntensity: 0.3, noShadow: true });

  // ---- props: basketball hoop, benches, watchtower shadow ----
  // hoop
  vox(scene, 0.2, 4, 0.2, 8, 2, 6, '#4a4c54', { metal: 0.4 });
  vox(scene, 1.4, 1.0, 0.1, 8, 3.6, 6.4, '#e8e4d8');
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 8, 16),
    new THREE.MeshStandardMaterial({ color: '#d9742e', metalness: .5, flatShading: true }));
  ring.position.set(8, 3.1, 6.9); ring.rotation.x = Math.PI / 2; ring.castShadow = true;
  scene.add(ring);

  // benches
  const bench = (bx, bz) => {
    vox(scene, 2, 0.12, 0.5, bx, 0.5, bz, '#6B4A2E', { rough: .9 });
    vox(scene, 2, 0.5, 0.1, bx, 0.75, bz - 0.2, '#5a3e24');
    [-0.8, 0.8].forEach(o => vox(scene, 0.12, 0.5, 0.4, bx + o, 0.25, bz, '#4a3220'));
  };
  bench(-9, 8);
  bench(9, -8);

  // a few trees beyond the fence
  const tree = (tx, tz) => {
    vox(scene, 0.6, 3, 0.6, tx, 1.5, tz, '#5a3e24', { rough: 1 });
    for (let i = 0; i < 3; i++)
      vox(scene, 2.4 - i * 0.4, 1, 2.4 - i * 0.4, tx, 3 + i * 0.8, tz, GRASS[i % GRASS.length]);
  };
  tree(-half - 5, 8); tree(half + 6, -10); tree(-half - 6, -8);

  // morning clouds (slow drift)
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(3 + Math.random() * 2, 1.4, 2 + Math.random()),
        new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1 }));
      m.position.set(j * 1.6 - 2, Math.random() * 0.5, Math.random() * 1.4);
      c.add(m);
    }
    c.position.set(-30 + Math.random() * 60, 16 + Math.random() * 6, -20 + Math.random() * 10);
    c.userData.speed = 0.4 + Math.random() * 0.5;
    scene.add(c); clouds.push(c);
  }

  return {
    bounds,
    spawn: new THREE.Vector3(0, 0, 4),
    spawnLook: new THREE.Vector3(0, 1, -10),
    // basketball hoop — ring center + radius, used by the shooting mechanic
    hoop: new THREE.Vector3(8, 3.1, 6.9),
    hoopR: 0.34,
    npc: {
      name: 'GUARD MARGIN',
      pos: new THREE.Vector3(3.5, 0, -2),
      color: '#3c5a2a'
    },
    animate: (t, dt) => {
      clouds.forEach(c => {
        c.position.x += c.userData.speed * dt;
        if (c.position.x > 36) c.position.x = -36;
      });
      // jumbotron candle glow softly pulses
      candleGlow.intensity = 0.7 + Math.sin(t * 2) * 0.3;
    }
  };
}
