// ============================================================
// character.js — builds a detailed voxel inmate
// Returns a THREE.Group with named limb pivots for animation.
// ============================================================
import * as THREE from 'three';

// ---- option tables (also consumed by the creator UI) ----
export const SKIN_TONES = [
  '#F2C9A0', '#E0AC7E', '#C68A5E', '#A26A43',
  '#7A4A2B', '#5A3520', '#3D2415', '#E8C49B'
];
export const HAIR_COLORS = [
  '#1A1410', '#3A2A1A', '#6B4A2E', '#A86A2E',
  '#C9A24B', '#B0B0B8', '#8C3A3A', '#2E5A8C'
];
export const SUIT_COLORS = [
  '#D9742E', '#E8A33A', '#3C3C44', '#6B7A8C',
  '#5A8C3A', '#8C3A3A', '#E8E4D8', '#2A2A2E'
];
export const HAIR_STYLES = ['BUZZ', 'SHORT', 'MOHAWK', 'BALD', 'LONG', 'CAP'];
export const SUIT_STYLES = ['STRIPES', 'SOLID', 'TANK', 'NUMBERED'];
export const BUILDS = ['SLIM', 'MEDIUM', 'HEAVY'];
export const HEIGHTS = [`5'4"`, `5'7"`, `5'10"`, `6'1"`, `6'4"`];

// default config
export function defaultConfig() {
  return {
    name: 'JOHN DOE',
    skin: SKIN_TONES[1],
    hairStyle: 'SHORT',
    hairColor: HAIR_COLORS[1],
    suitStyle: 'STRIPES',
    suitColor: SUIT_COLORS[0],
    build: 1,        // 0 slim 1 med 2 heavy
    height: 2        // 0..4
  };
}

export function randomConfig() {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const names = ['SCARFACE', 'BIG TONY', 'THE DIGGER', 'LOWBALL', 'WHISPER',
                 'PAPERHANDS', 'RUGGED', 'NO.7', 'COLD CARL', 'TRENCH'];
  return {
    name: pick(names),
    skin: pick(SKIN_TONES),
    hairStyle: pick(HAIR_STYLES),
    hairColor: pick(HAIR_COLORS),
    suitStyle: pick(SUIT_STYLES),
    suitColor: pick(SUIT_COLORS),
    build: Math.floor(Math.random() * 3),
    height: Math.floor(Math.random() * 5)
  };
}

// ---- helpers ----
function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: opts.rough ?? 0.95,
    metalness: opts.metal ?? 0.0,
    flatShading: true,
    ...opts
  });
}

// a single voxel-ish box added to a parent at local pos
function box(parent, w, h, d, x, y, z, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// darken a hex
function shade(hex, amt) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amt);
  return '#' + c.getHexString();
}

// ============================================================
// Build the inmate. Returns { group, pivots, config }
// pivots: leftArm, rightArm, leftLeg, rightLeg, head, torso, root
// ============================================================
export function buildInmate(cfg) {
  cfg = { ...defaultConfig(), ...cfg };
  const root = new THREE.Group();

  const buildScale = [0.86, 1.0, 1.2][cfg.build];     // width multiplier
  const heightScale = 0.9 + cfg.height * 0.05;        // overall height

  const skinMat = mat(cfg.skin);
  const skinDark = mat(shade(cfg.skin, -0.08));
  const suitMat = mat(cfg.suitColor);
  const stripeMat = mat(shade(cfg.suitColor, -0.4));
  const hairMat = mat(cfg.hairColor, { rough: 0.8 });
  const eyeWhite = mat('#F0F0F0', { rough: 0.4 });
  const eyeDark = mat('#15110c');
  const bootMat = mat('#2A2018', { rough: 0.7 });
  const soleMat = mat('#15110c');

  const W = buildScale;

  // ---------- TORSO ----------
  const torso = new THREE.Group();
  root.add(torso);
  const chest = box(torso, 0.62 * W, 0.74, 0.34, 0, 1.15, 0, suitMat);

  // jumpsuit detailing by style
  if (cfg.suitStyle === 'STRIPES') {
    for (let i = 0; i < 4; i++) {
      box(torso, 0.63 * W, 0.07, 0.345, 0, 0.92 + i * 0.16, 0, stripeMat);
    }
  } else if (cfg.suitStyle === 'TANK') {
    // bare shoulders -> skin straps
    box(torso, 0.18, 0.2, 0.345, -0.18 * W, 1.42, 0, skinMat);
    box(torso, 0.18, 0.2, 0.345, 0.18 * W, 1.42, 0, skinMat);
  } else if (cfg.suitStyle === 'NUMBERED') {
    // chest plate number patch
    box(torso, 0.26, 0.18, 0.02, 0, 1.22, 0.18, mat('#E8E4D8'));
    box(torso, 0.05, 0.12, 0.025, -0.05, 1.22, 0.19, mat('#15110c'));
    box(torso, 0.05, 0.12, 0.025, 0.05, 1.22, 0.19, mat('#15110c'));
  }
  // collar
  box(torso, 0.4 * W, 0.08, 0.36, 0, 1.5, 0, stripeMat);
  // belt
  box(torso, 0.64 * W, 0.08, 0.36, 0, 0.82, 0, mat('#2A2018'));
  box(torso, 0.1, 0.1, 0.37, 0, 0.82, 0, mat('#C9A24B', { metal: 0.4, rough: 0.5 }));

  // ---------- HIPS / PELVIS ----------
  const hips = box(torso, 0.6 * W, 0.22, 0.34, 0, 0.66, 0, suitMat);

  // ---------- HEAD ----------
  const head = new THREE.Group();
  head.position.set(0, 1.66, 0);
  torso.add(head);
  const skull = box(head, 0.46, 0.46, 0.44, 0, 0.23, 0, skinMat);
  // ears
  box(head, 0.06, 0.14, 0.12, -0.24, 0.22, 0, skinDark);
  box(head, 0.06, 0.14, 0.12, 0.24, 0.22, 0, skinDark);
  // nose
  box(head, 0.1, 0.1, 0.08, 0, 0.18, 0.24, skinDark);
  // eyes (white + pupil) facing +Z
  box(head, 0.1, 0.1, 0.04, -0.11, 0.27, 0.225, eyeWhite);
  box(head, 0.1, 0.1, 0.04, 0.11, 0.27, 0.225, eyeWhite);
  box(head, 0.05, 0.06, 0.05, -0.11, 0.27, 0.235, eyeDark);
  box(head, 0.05, 0.06, 0.05, 0.11, 0.27, 0.235, eyeDark);
  // brow
  box(head, 0.44, 0.04, 0.04, 0, 0.345, 0.22, hairMat);
  // mouth
  box(head, 0.18, 0.03, 0.04, 0, 0.1, 0.225, skinDark);

  // ---------- HAIR ----------
  buildHair(head, cfg.hairStyle, hairMat, skinMat);

  // ---------- ARMS (with detailed hands) ----------
  const armMat = (cfg.suitStyle === 'TANK') ? skinMat : suitMat;
  const leftArm = buildArm(W, armMat, skinMat, +1);
  const rightArm = buildArm(W, armMat, skinMat, -1);
  leftArm.position.set(0.42 * W, 1.46, 0);
  rightArm.position.set(-0.42 * W, 1.46, 0);
  torso.add(leftArm, rightArm);

  // ---------- LEGS (with detailed feet) ----------
  const leftLeg = buildLeg(W, suitMat, bootMat, soleMat, skinMat, +1);
  const rightLeg = buildLeg(W, suitMat, bootMat, soleMat, skinMat, -1);
  leftLeg.position.set(0.16 * W, 0.62, 0);
  rightLeg.position.set(-0.16 * W, 0.62, 0);
  torso.add(leftLeg, rightLeg);

  // overall scale for height
  root.scale.setScalar(heightScale);

  // shadow flags
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  return {
    group: root,
    config: cfg,
    pivots: { root, torso, head, leftArm, rightArm, leftLeg, rightLeg },
    materials: { skinMat, suitMat, hairMat }
  };
}

// ---- ARM: upper -> forearm -> detailed hand (palm + 4 fingers + thumb) ----
function buildArm(W, sleeveMat, skinMat, side) {
  const arm = new THREE.Group();
  // shoulder sleeve
  box(arm, 0.2, 0.4, 0.24, 0, -0.2, 0, sleeveMat);
  // forearm (rolled sleeve -> skin)
  const fore = new THREE.Group();
  fore.position.set(0, -0.42, 0);
  arm.add(fore);
  box(fore, 0.17, 0.34, 0.2, 0, -0.17, 0, skinMat);
  // wrist
  box(fore, 0.16, 0.06, 0.18, 0, -0.36, 0, skinMat);

  // ---- detailed HAND ----
  const hand = new THREE.Group();
  hand.position.set(0, -0.42, 0);
  fore.add(hand);
  const palm = box(hand, 0.18, 0.14, 0.2, 0, -0.06, 0, skinMat);
  // 4 fingers
  for (let i = 0; i < 4; i++) {
    box(hand, 0.035, 0.16, 0.04, -0.06 + i * 0.04, -0.2, 0.06 - i * 0.0, skinMat);
  }
  // thumb (offset to side, points inward)
  box(hand, 0.05, 0.05, 0.1, side * 0.1, -0.1, 0.02, skinMat);
  box(hand, 0.04, 0.1, 0.04, side * 0.11, -0.16, 0.04, skinMat);

  arm.userData.hand = hand;
  return arm;
}

// ---- LEG: thigh -> shin -> detailed boot (heel + sole + toe + laces) ----
function buildLeg(W, pantMat, bootMat, soleMat, skinMat, side) {
  const leg = new THREE.Group();
  // thigh
  box(leg, 0.24, 0.4, 0.26, 0, -0.2, 0, pantMat);
  // knee/shin
  const shin = new THREE.Group();
  shin.position.set(0, -0.42, 0);
  leg.add(shin);
  box(shin, 0.21, 0.36, 0.23, 0, -0.18, 0, pantMat);
  // cuff
  box(shin, 0.23, 0.05, 0.25, 0, -0.36, 0, shade2(pantMat));

  // ---- detailed BOOT ----
  const foot = new THREE.Group();
  foot.position.set(0, -0.4, 0);
  shin.add(foot);
  // ankle
  box(foot, 0.2, 0.1, 0.22, 0, -0.04, 0, bootMat);
  // main boot body, extends forward (+Z)
  box(foot, 0.22, 0.14, 0.34, 0, -0.13, 0.08, bootMat);
  // toe cap
  box(foot, 0.2, 0.1, 0.12, 0, -0.14, 0.27, shade2(bootMat));
  // sole
  box(foot, 0.24, 0.05, 0.4, 0, -0.21, 0.08, soleMat);
  // heel
  box(foot, 0.2, 0.06, 0.1, 0, -0.18, -0.08, soleMat);
  // laces
  for (let i = 0; i < 3; i++) {
    box(foot, 0.14, 0.02, 0.02, 0, -0.06 - i * 0.04, 0.16, mat('#15110c'));
  }

  leg.userData.foot = foot;
  return leg;
}

function shade2(material) {
  const c = material.color.clone();
  c.offsetHSL(0, 0, -0.12);
  return new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.9 });
}

// ---- HAIR styles ----
function buildHair(head, style, hairMat, skinMat) {
  const top = 0.49;
  switch (style) {
    case 'BALD':
      break;
    case 'BUZZ':
      box(head, 0.48, 0.06, 0.46, 0, top - 0.02, 0, hairMat);
      break;
    case 'SHORT':
      box(head, 0.5, 0.12, 0.48, 0, top, 0, hairMat);
      box(head, 0.5, 0.18, 0.08, 0, 0.34, -0.22, hairMat); // back
      box(head, 0.06, 0.16, 0.46, -0.25, 0.34, 0, hairMat); // sides
      box(head, 0.06, 0.16, 0.46, 0.25, 0.34, 0, hairMat);
      break;
    case 'MOHAWK':
      box(head, 0.12, 0.22, 0.5, 0, top + 0.06, 0, hairMat);
      box(head, 0.5, 0.05, 0.46, 0, top - 0.04, 0, hairMat);
      break;
    case 'LONG':
      box(head, 0.52, 0.14, 0.5, 0, top, 0, hairMat);
      box(head, 0.5, 0.5, 0.1, 0, 0.12, -0.24, hairMat);   // long back
      box(head, 0.08, 0.42, 0.48, -0.26, 0.14, 0, hairMat); // long sides
      box(head, 0.08, 0.42, 0.48, 0.26, 0.14, 0, hairMat);
      break;
    case 'CAP':
      box(head, 0.52, 0.16, 0.5, 0, top, 0, mat('#3C3C44'));
      box(head, 0.5, 0.05, 0.24, 0, 0.42, 0.32, mat('#3C3C44')); // brim
      box(head, 0.18, 0.18, 0.02, 0, top, 0.26, mat('#D9742E')); // patch
      break;
  }
}
