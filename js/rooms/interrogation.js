// ============================================================
// rooms/interrogation.js — dark small interrogation room
// ============================================================
import * as THREE from 'three';

const T = 'https://cdnjs.cloudflare.com'; // (unused, placeholder)

function vox(scene, w, h, d, x, y, z, color, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: opts.rough ?? 0.95,
      metalness: opts.metal ?? 0,
      flatShading: true,
      emissive: opts.emissive ? new THREE.Color(opts.emissive) : 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0
    })
  );
  m.position.set(x, y, z);
  m.castShadow = opts.noShadow ? false : true;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

export function buildInterrogation(scene) {
  scene.background = new THREE.Color('#08080a');
  scene.fog = new THREE.Fog('#08080a', 6, 22);

  const ROOM = 9;          // half not — full size
  const half = ROOM / 2;
  const bounds = { minX: -half + 0.6, maxX: half - 0.6, minZ: -half + 0.6, maxZ: half - 0.6 };

  // ---- lighting: one harsh bulb + dim ambient ----
  const amb = new THREE.AmbientLight('#22232b', 0.5);
  scene.add(amb);

  const bulb = new THREE.PointLight('#fff2cc', 2.4, 16, 1.6);
  bulb.position.set(0, 4.2, 0);
  bulb.castShadow = true;
  bulb.shadow.mapSize.set(1024, 1024);
  scene.add(bulb);

  // bulb fixture
  vox(scene, 0.12, 0.8, 0.12, 0, 4.8, 0, '#15110c', { noShadow: true });
  const glass = vox(scene, 0.3, 0.3, 0.3, 0, 4.3, 0, '#fff2cc',
    { emissive: '#fff2cc', emissiveIntensity: 1.4, noShadow: true });

  // subtle flicker
  glass.userData.flicker = true;

  // ---- floor (cracked concrete blocks) ----
  for (let x = -half; x < half; x++) {
    for (let z = -half; z < half; z++) {
      const c = (x + z) % 2 === 0 ? '#26262b' : '#202024';
      vox(scene, 1, 0.2, 1, x + 0.5, -0.1, z + 0.5, c, { rough: 1 });
    }
  }

  // ---- walls ----
  const wallC = '#2b2a30';
  for (let i = -half; i < half; i++) {
    // back & front
    for (let y = 0; y < 5; y++) {
      vox(scene, 1, 1, 0.4, i + 0.5, y + 0.5, -half, (i + y) % 2 ? wallC : '#26252b');
      vox(scene, 1, 1, 0.4, i + 0.5, y + 0.5, half, (i + y) % 2 ? wallC : '#26252b');
      vox(scene, 0.4, 1, 1, -half, y + 0.5, i + 0.5, (i + y) % 2 ? wallC : '#26252b');
      vox(scene, 0.4, 1, 1, half, y + 0.5, i + 0.5, (i + y) % 2 ? wallC : '#26252b');
    }
  }
  // ceiling
  for (let x = -half; x < half; x++)
    for (let z = -half; z < half; z++)
      vox(scene, 1, 0.3, 1, x + 0.5, 5.15, z + 0.5, '#1a1a1f', { noShadow: true });

  // ---- the steel table ----
  vox(scene, 1.8, 0.12, 1.0, 0, 1.0, 0, '#6b6d78', { metal: 0.6, rough: 0.4 });
  [[-0.78, -0.4], [0.78, -0.4], [-0.78, 0.4], [0.78, 0.4]].forEach(([x, z]) =>
    vox(scene, 0.1, 1.0, 0.1, x, 0.5, z, '#4a4c54', { metal: 0.5 }));

  // a lamp on the table aimed at the chair
  const spot = new THREE.SpotLight('#ffd98a', 6, 9, Math.PI / 5, 0.4, 1.4);
  spot.position.set(0, 1.6, 0);
  spot.target.position.set(0, 0.5, 2.4);
  spot.castShadow = true;
  scene.add(spot, spot.target);
  vox(scene, 0.3, 0.18, 0.3, 0, 1.18, 0, '#3a3a42', { metal: 0.4 });

  // two chairs
  const chair = (cx, cz, rot) => {
    const g = new THREE.Group();
    const c = '#3a3a42';
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5),
      new THREE.MeshStandardMaterial({ color: c, metalness: .4, roughness: .5, flatShading: true }));
    seat.position.y = 0.55; seat.castShadow = true; g.add(seat);
    const back = seat.clone(); back.geometry = new THREE.BoxGeometry(0.5, 0.5, 0.08);
    back.position.set(0, 0.8, -0.21); g.add(back);
    [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.06),
        new THREE.MeshStandardMaterial({ color: c, metalness: .4, flatShading: true }));
      leg.position.set(x, 0.27, z); leg.castShadow = true; g.add(leg);
    });
    g.position.set(cx, 0, cz); g.rotation.y = rot;
    scene.add(g);
  };
  chair(0, 2.4, Math.PI);   // suspect chair (player spawns near here)
  chair(0, -2.4, 0);        // detective chair

  // one-way mirror on a wall
  vox(scene, 2.4, 1.6, 0.1, 0, 2.4, -half + 0.25, '#181a22',
    { metal: 0.9, rough: 0.15, emissive: '#0a1a2a', emissiveIntensity: 0.3 });
  vox(scene, 2.6, 1.8, 0.12, 0, 2.4, -half + 0.18, '#0a0a0c');

  // file folder + coffee on table
  vox(scene, 0.3, 0.04, 0.42, -0.5, 1.08, 0.1, '#c9a24b', { rough: .9 });
  vox(scene, 0.14, 0.16, 0.14, 0.55, 1.16, -0.1, '#3a2a1a');

  // spawn point + look target
  return {
    bounds,
    spawn: new THREE.Vector3(0, 0, 3.2),
    spawnLook: new THREE.Vector3(0, 1, 0),
    npc: {
      name: 'DETECTIVE GRIM',
      pos: new THREE.Vector3(0, 0, -2.4),
      color: '#6b7a8c'
    },
    animate: (t) => {
      // bulb flicker
      const f = 1 + Math.sin(t * 13) * 0.04 + (Math.random() < 0.02 ? -0.5 : 0);
      bulb.intensity = 2.4 * f;
    }
  };
}
