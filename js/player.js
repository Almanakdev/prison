// ============================================================
// player.js — third-person controller: WASD, jump, sit, look
// ============================================================
import * as THREE from 'three';

export class Player {
  constructor(inmate, camera, domElement) {
    this.obj = inmate.group;       // THREE.Group
    this.pivots = inmate.pivots;
    this.camera = camera;
    this.dom = domElement;

    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;                  // facing direction
    this.camYaw = 0;               // camera orbit yaw
    this.camPitch = 0.35;
    this.camDist = 6;

    this.speed = 5.2;
    this.onGround = true;
    this.sitting = false;
    this.gravity = -22;
    this.jumpV = 8.5;

    this.keys = {};
    this.bounds = null;
    this.walkPhase = 0;

    this._bind();
  }

  setBounds(b) { this.bounds = b; }
  spawn(v, lookYaw = Math.PI) {
    this.pos.copy(v);
    this.vel.set(0, 0, 0);
    this.yaw = lookYaw;
    this.camYaw = lookYaw;
    this.sitting = false;
    this.obj.position.copy(this.pos);
  }

  _bind() {
    this._kd = (e) => {
      if (e.target.tagName === 'INPUT') return;
      this.keys[e.code] = true;
      if (e.code === 'Space') { e.preventDefault(); this._jump(); }
      if (e.code === 'KeyF') this._toggleSit();
    };
    this._ku = (e) => { this.keys[e.code] = false; };
    window.addEventListener('keydown', this._kd);
    window.addEventListener('keyup', this._ku);

    // pointer drag look
    this.dragging = false;
    this._md = (e) => {
      if (e.button !== 0) return;
      // ignore clicks on HUD buttons/inputs
      if (e.target.closest('.hud') && e.target.tagName !== 'CANVAS') return;
      this.dragging = true; this.lastX = e.clientX; this.lastY = e.clientY;
    };
    this._mm = (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY;
      this.lastX = e.clientX; this.lastY = e.clientY;
      this.camYaw -= dx * 0.005;
      this.camPitch = Math.max(-0.2, Math.min(1.1, this.camPitch + dy * 0.004));
    };
    this._mu = () => { this.dragging = false; };
    this.dom.addEventListener('mousedown', this._md);
    window.addEventListener('mousemove', this._mm);
    window.addEventListener('mouseup', this._mu);

    // wheel zoom
    this._wheel = (e) => {
      this.camDist = Math.max(3, Math.min(11, this.camDist + e.deltaY * 0.01));
    };
    this.dom.addEventListener('wheel', this._wheel, { passive: true });

    // touch (mobile look)
    this._ts = (e) => {
      const t = e.touches[0];
      if (t.clientY < window.innerHeight * 0.6) {
        this.dragging = true; this.lastX = t.clientX; this.lastY = t.clientY;
      }
    };
    this._tm = (e) => {
      if (!this.dragging) return;
      const t = e.touches[0];
      const dx = t.clientX - this.lastX, dy = t.clientY - this.lastY;
      this.lastX = t.clientX; this.lastY = t.clientY;
      this.camYaw -= dx * 0.006; this.camPitch = Math.max(-0.2, Math.min(1.1, this.camPitch + dy * 0.005));
    };
    this._te = () => { this.dragging = false; };
    this.dom.addEventListener('touchstart', this._ts, { passive: true });
    this.dom.addEventListener('touchmove', this._tm, { passive: true });
    this.dom.addEventListener('touchend', this._te);
  }

  dispose() {
    window.removeEventListener('keydown', this._kd);
    window.removeEventListener('keyup', this._ku);
    window.removeEventListener('mousemove', this._mm);
    window.removeEventListener('mouseup', this._mu);
    this.dom.removeEventListener('mousedown', this._md);
    this.dom.removeEventListener('wheel', this._wheel);
    this.dom.removeEventListener('touchstart', this._ts);
    this.dom.removeEventListener('touchmove', this._tm);
    this.dom.removeEventListener('touchend', this._te);
  }

  // external mobile joystick hook
  setMoveVector(x, z) { this._extMove = { x, z }; }

  _jump() {
    if (this.onGround && !this.sitting) { this.vel.y = this.jumpV; this.onGround = false; }
    if (this.sitting) this._toggleSit();
  }
  _toggleSit() {
    if (!this.onGround) return;
    this.sitting = !this.sitting;
  }

  update(dt) {
    dt = Math.min(dt, 0.05);
    const k = this.keys;

    // movement input relative to camera yaw
    let ix = 0, iz = 0;
    if (k['KeyW'] || k['ArrowUp']) iz -= 1;
    if (k['KeyS'] || k['ArrowDown']) iz += 1;
    if (k['KeyA'] || k['ArrowLeft']) ix -= 1;
    if (k['KeyD'] || k['ArrowRight']) ix += 1;
    if (this._extMove) { ix += this._extMove.x; iz += this._extMove.z; }

    const moving = (ix || iz) && !this.sitting;
    if (moving) {
      this.sitting = false;
      const len = Math.hypot(ix, iz) || 1;
      ix /= len; iz /= len;
      // rotate input by camera yaw
      const sin = Math.sin(this.camYaw), cos = Math.cos(this.camYaw);
      const wx = ix * cos - iz * sin;
      const wz = ix * sin + iz * cos;
      this.pos.x += wx * this.speed * dt;
      this.pos.z += wz * this.speed * dt;
      this.yaw = Math.atan2(wx, wz);
      this.walkPhase += dt * 10;
    }

    // gravity / jump
    this.vel.y += this.gravity * dt;
    this.pos.y += this.vel.y * dt;
    if (this.pos.y <= 0) { this.pos.y = 0; this.vel.y = 0; this.onGround = true; }

    // bounds clamp
    if (this.bounds) {
      this.pos.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.pos.x));
      this.pos.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.pos.z));
    }

    // apply transform
    this.obj.position.copy(this.pos);
    // smooth yaw
    const cur = this.obj.rotation.y;
    let diff = this.yaw - cur;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.obj.rotation.y = cur + diff * Math.min(1, dt * 12);

    this._animateLimbs(moving, dt);
    this._updateCamera(dt);
  }

  _animateLimbs(moving, dt) {
    const p = this.pivots;
    if (this.sitting) {
      // sit pose: thighs forward, shins down, slight lean
      this._lerpRot(p.leftLeg, -1.4, dt); this._lerpRot(p.rightLeg, -1.4, dt);
      this._lerpRotX(p.leftArm, 0.3, dt); this._lerpRotX(p.rightArm, 0.3, dt);
      this._lerpY(p.root, -0.45, dt);
      this._lerpRot(p.torso, 0.0, dt);
      return;
    }
    this._lerpY(p.root, 0, dt);

    if (!this.onGround) {
      // jump pose: legs tucked, arms up
      this._lerpRot(p.leftLeg, -0.5, dt); this._lerpRot(p.rightLeg, -0.3, dt);
      this._lerpRot(p.leftArm, -0.9, dt); this._lerpRot(p.rightArm, -0.9, dt);
      return;
    }

    if (moving) {
      const sw = Math.sin(this.walkPhase) * 0.8;
      p.leftLeg.rotation.x = sw;
      p.rightLeg.rotation.x = -sw;
      p.leftArm.rotation.x = -sw * 0.8;
      p.rightArm.rotation.x = sw * 0.8;
      // tiny bob
      p.torso.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.04;
    } else {
      // idle: ease to neutral + breathe
      this._lerpRot(p.leftLeg, 0, dt); this._lerpRot(p.rightLeg, 0, dt);
      this._lerpRot(p.leftArm, 0, dt); this._lerpRot(p.rightArm, 0, dt);
      p.torso.position.y = Math.sin(performance.now() * 0.002) * 0.015;
    }
  }

  _lerpRot(o, target, dt) { o.rotation.x += (target - o.rotation.x) * Math.min(1, dt * 10); }
  _lerpRotX(o, target, dt) { o.rotation.x += (target - o.rotation.x) * Math.min(1, dt * 10); }
  _lerpY(o, target, dt) { o.position.y += (target - o.position.y) * Math.min(1, dt * 8); }

  _updateCamera(dt) {
    const target = new THREE.Vector3(this.pos.x, this.pos.y + 1.4, this.pos.z);
    const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
    const offset = new THREE.Vector3(
      Math.sin(this.camYaw) * cp * this.camDist,
      sp * this.camDist + 0.6,
      Math.cos(this.camYaw) * cp * this.camDist
    );
    const desired = target.clone().add(offset);
    this.camera.position.lerp(desired, Math.min(1, dt * 9));
    this.camera.lookAt(target);
  }
}
