import * as THREE from 'three';
import { soundEngine } from '../audio/SoundEngine';
import {
  computeEffectiveAircraftStats,
  getAircraftById,
  LEVELS,
} from '../data/gameData';
import {
  ActiveBuffs,
  AircraftId,
  ControlInputState,
  EffectiveStats,
  EnemyType,
  HudSnapshot,
  LevelConfig,
  MissionEndResult,
  PowerUpType,
  UpgradeLevels,
} from '../types/game';
import { buildFighterAircraft, BuiltAircraftMesh } from './AircraftBuilder';
import {
  BossPartRef,
  buildAsteroidMesh,
  buildBlackHoleAndGate,
  buildCapitalBoss,
  buildEnemyMesh,
  buildGalaxyBackdrop,
  buildPowerUpMesh,
  buildSpaceStation,
} from './EnemyAndWorldBuilder';

interface Projectile {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  damage: number;
  isEnemy: boolean;
  isMissile?: boolean;
  isBomb?: boolean;
  targetsStation?: boolean;
  homingTarget?: EnemyEntity | BossPartWorldTarget | null;
  life: number;
  radius: number;
}

interface BossPartWorldTarget {
  part: BossPartRef;
  getWorldPos: () => THREE.Vector3;
}

interface EnemyEntity {
  id: number;
  type: EnemyType;
  mesh: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  hp: number;
  maxHp: number;
  radius: number;
  fireTimer: number;
  dodgeTimer: number;
  age: number;
  phaseOffset: number;
  scoreValue: number;
  ambushEntering?: boolean;
}

interface HazardRock {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  radius: number;
  hp: number;
  isMeteor: boolean;
}

interface PickupEntity {
  type: PowerUpType;
  mesh: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  radius: number;
  life: number;
}

interface ParticleBurst {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  shrink: boolean;
}

interface DangerZone {
  mesh: THREE.Mesh;
  beamMesh: THREE.Mesh;
  x: number;
  y: number;
  chargeTimer: number;
  activeTimer: number;
  fired: boolean;
}

export type EngineMode = 'showcase' | 'playing' | 'paused' | 'ended';

export class SpaceBattleEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private rafId: number | null = null;
  private lastTime = 0;
  private mode: EngineMode = 'showcase';
  private showcaseModeType: 'menu' | 'hangar' = 'menu';
  private hangarManualYaw = 0;

  // Callbacks to React UI
  private onHudUpdate: (hud: HudSnapshot) => void;
  private onMissionEnd: (result: MissionEndResult) => void;

  // Player & Aircraft state
  private aircraftId: AircraftId = 'f16';
  private pilotLevel = 1;
  private upgrades: UpgradeLevels = { laser: 1, thruster: 1, hull: 1, shield: 1, missile: 1 };
  private stats!: EffectiveStats;
  private playerBuilt: BuiltAircraftMesh | null = null;
  private playerPos = new THREE.Vector3(0, 0, 0);
  private playerVel = new THREE.Vector3(0, 0, 0);

  private health = 100;
  private shield = 80;
  private shieldRegenDelay = 0;
  private boostEnergy = 100;
  private missiles = 6;
  private missileCooldown = 0;
  private shieldCooldown = 0;
  private fireCooldown = 0;

  private buffs: ActiveBuffs = {
    rapidFireTimer: 0,
    doubleLaserTimer: 0,
    tripleShotTimer: 0,
    speedBoostTimer: 0,
    shieldActiveTimer: 0,
  };

  // Controls
  private input: ControlInputState = {
    moveX: 0,
    moveY: 0,
    magnitude: 0,
    angleDeg: 0,
    firing: false,
    boosting: false,
    missileTrigger: false,
    shieldTrigger: false,
  };

  // Level & world entities
  private currentLevel: LevelConfig = LEVELS[0];
  private backdrop: ReturnType<typeof buildGalaxyBackdrop> | null = null;
  private worldGroup = new THREE.Group();

  private projectiles: Projectile[] = [];
  private enemies: EnemyEntity[] = [];
  private rocks: HazardRock[] = [];
  private pickups: PickupEntity[] = [];
  private particles: ParticleBurst[] = [];
  private dangerZones: DangerZone[] = [];

  private nextEntityId = 1;
  private score = 0;
  private creditsEarned = 0;
  private enemiesDestroyed = 0;
  private elapsedSeconds = 0;
  private spawnTimer = 0;
  private rockTimer = 0;

  // Special Level Mechanics State
  private currentWave = 1;
  private waveSpawnedInCurrent = false;
  private stationGroup: THREE.Group | null = null;
  private stationHp = 500;
  private stationMaxHp = 500;

  private blackHoleGroup: THREE.Group | null = null;
  private blackHolePos = new THREE.Vector3(6, 2, -26);
  private warpGateGroup: THREE.Group | null = null;
  private warpProgress = 0; // 0..100 for Level 7
  private blackHolePullWarning = false;

  // Capital Boss (Level 9 Mothership & Level 10 Final Boss)
  private capitalBoss: {
    root: THREE.Group;
    parts: BossPartRef[];
    shieldDome: THREE.Mesh;
    isFinalBoss: boolean;
    pos: THREE.Vector3;
    attackTimer: number;
    missileTimer: number;
    beamTimer: number;
    phase: number;
  } | null = null;

  // Feedback & Camera FX
  private cameraShake = 0;
  private alertBanner: string | null = null;
  private alertTimer = 0;
  private pickupToast: string | null = null;
  private pickupToastTimer = 0;
  private hudEmitAccum = 0;

  // Shared Geometries for performance on smartphones
  private laserGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.85, 6);
  private particleGeo = new THREE.SphereGeometry(0.22, 6, 6);

  constructor(
    container: HTMLElement,
    onHudUpdate: (hud: HudSnapshot) => void,
    onMissionEnd: (result: MissionEndResult) => void
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.onMissionEnd = onMissionEnd;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x030712, 0.0042);

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 400);
    this.camera.position.set(0, 3.4, 12.2);

    this.renderer = new THREE.WebGLRenderer({
      antialias: window.devicePixelRatio <= 2,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.laserGeo.rotateX(Math.PI / 2);

    this.setupLighting();
    this.scene.add(this.worldGroup);

    this.rebuildBackdrop(LEVELS[0].theme);
    this.setAircraftConfig('f16', 1, this.upgrades);

    window.addEventListener('resize', this.handleResize);
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0x94a3b8, 1.35);
    this.scene.add(ambient);

    const sunLight = new THREE.DirectionalLight(0xf8fafc, 2.4);
    sunLight.position.set(18, 32, 24);
    this.scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.35);
    rimLight.position.set(-22, -12, -18);
    this.scene.add(rimLight);
  }

  private handleResize = (): void => {
    if (!this.container) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public setShowcaseStyle(style: 'menu' | 'hangar'): void {
    this.showcaseModeType = style;
  }

  public addHangarYaw(deltaRad: number): void {
    this.hangarManualYaw += deltaRad;
  }

  public setAircraftConfig(
    aircraftId: AircraftId,
    pilotLevel: number,
    upgrades: UpgradeLevels
  ): void {
    this.aircraftId = aircraftId;
    this.pilotLevel = pilotLevel;
    this.upgrades = { ...upgrades };

    const spec = getAircraftById(aircraftId);
    this.stats = computeEffectiveAircraftStats(spec, pilotLevel, upgrades);

    if (this.playerBuilt) {
      this.scene.remove(this.playerBuilt.root);
    }
    this.playerBuilt = buildFighterAircraft(aircraftId, pilotLevel, spec.accentColor);
    this.scene.add(this.playerBuilt.root);
  }

  public enterShowcase(style: 'menu' | 'hangar' = 'menu'): void {
    this.mode = 'showcase';
    this.showcaseModeType = style;
    this.clearBattleEntities();
    this.rebuildBackdrop(LEVELS[0].theme);
    soundEngine.stopEngineHum();
    soundEngine.setMusicMode('menu');
  }

  public startMission(
    levelId: number,
    aircraftId: AircraftId,
    pilotLevel: number,
    upgrades: UpgradeLevels
  ): void {
    const level = LEVELS.find((l) => l.id === levelId) || LEVELS[0];
    this.currentLevel = level;

    this.clearBattleEntities();
    this.rebuildBackdrop(level.theme);
    this.setAircraftConfig(aircraftId, pilotLevel, upgrades);

    // Reset player combat state
    this.playerPos.set(0, 0, 0);
    this.playerVel.set(0, 0, 0);
    if (this.playerBuilt) {
      this.playerBuilt.root.position.copy(this.playerPos);
      this.playerBuilt.root.rotation.set(0, 0, 0);
      this.playerBuilt.bodyGroup.rotation.set(0, 0, 0);
    }

    this.health = this.stats.maxHealth;
    this.shield = this.stats.maxShield;
    this.boostEnergy = 100;
    this.missiles = this.stats.maxMissiles;
    this.missileCooldown = 0;
    this.shieldCooldown = 0;
    this.fireCooldown = 0;
    this.buffs = {
      rapidFireTimer: 0,
      doubleLaserTimer: 0,
      tripleShotTimer: 0,
      speedBoostTimer: 0,
      shieldActiveTimer: 0,
    };

    this.score = 0;
    this.creditsEarned = 0;
    this.enemiesDestroyed = 0;
    this.elapsedSeconds = 0;
    this.spawnTimer = 0.8;
    this.rockTimer = 0.5;
    this.currentWave = 1;
    this.waveSpawnedInCurrent = false;
    this.warpProgress = 0;
    this.blackHolePullWarning = false;
    this.cameraShake = 0;

    this.showAlert(`SECTOR ${level.id}: ${level.title}`, 3.0);

    // Level-specific world objects
    if (level.mechanic === 'defend_station') {
      this.stationMaxHp = 600;
      this.stationHp = 600;
      this.stationGroup = buildSpaceStation();
      this.stationGroup.position.set(-10.5, -3.2, -16);
      this.worldGroup.add(this.stationGroup);
    } else if (level.mechanic === 'black_hole_zone') {
      const { blackHole, warpGate } = buildBlackHoleAndGate();
      this.blackHoleGroup = blackHole;
      this.blackHolePos.set(7.5, 1.5, -28);
      this.blackHoleGroup.position.copy(this.blackHolePos);
      this.worldGroup.add(this.blackHoleGroup);

      this.warpGateGroup = warpGate;
      this.warpGateGroup.position.set(0, 0, -140);
      this.warpGateGroup.visible = false;
      this.worldGroup.add(this.warpGateGroup);
    } else if (level.mechanic === 'mothership_attack') {
      this.spawnCapitalBoss(false);
    } else if (level.mechanic === 'galaxy_final_boss') {
      this.spawnCapitalBoss(true);
    }

    this.mode = 'playing';
    soundEngine.unlock();
    soundEngine.startEngineHum();
    soundEngine.setMusicMode(
      level.mechanic === 'mothership_attack' || level.mechanic === 'galaxy_final_boss'
        ? 'boss'
        : 'battle'
    );

    this.emitHudSnapshot();
  }

  public setPaused(paused: boolean): void {
    if (this.mode === 'playing' && paused) {
      this.mode = 'paused';
      soundEngine.updateEngineHum(0, false);
    } else if (this.mode === 'paused' && !paused) {
      this.mode = 'playing';
      this.lastTime = performance.now();
    }
  }

  public updateControlInput(partial: Partial<ControlInputState>): void {
    Object.assign(this.input, partial);
  }

  public triggerMissileOnce(): void {
    this.input.missileTrigger = true;
  }

  public triggerShieldOnce(): void {
    this.input.shieldTrigger = true;
  }

  private rebuildBackdrop(theme: LevelConfig['theme']): void {
    if (this.backdrop) {
      this.scene.remove(this.backdrop.group);
    }
    this.scene.background = new THREE.Color(theme.skyColor);
    this.scene.fog = new THREE.FogExp2(theme.skyColor, 0.0038);
    this.backdrop = buildGalaxyBackdrop(theme);
    this.scene.add(this.backdrop.group);
  }

  private clearBattleEntities(): void {
    while (this.worldGroup.children.length > 0) {
      this.worldGroup.remove(this.worldGroup.children[0]);
    }
    this.projectiles = [];
    this.enemies = [];
    this.rocks = [];
    this.pickups = [];
    this.particles = [];
    this.dangerZones = [];
    this.stationGroup = null;
    this.blackHoleGroup = null;
    this.warpGateGroup = null;
    this.capitalBoss = null;
  }

  private showAlert(text: string, duration = 2.6): void {
    this.alertBanner = text;
    this.alertTimer = duration;
  }

  private showToast(text: string): void {
    this.pickupToast = text;
    this.pickupToastTimer = 2.0;
  }

  private spawnCapitalBoss(isFinalBoss: boolean): void {
    const built = buildCapitalBoss(isFinalBoss);
    built.root.position.set(0, 2.5, -52);

    if (isFinalBoss) {
      // In Phase 1, only left & right wing weak points are exposed initially!
      built.parts.forEach((p) => {
        if (p.id === 'weak_crown' || p.id === 'weak_heart') {
          p.mesh.visible = false;
        }
      });
    } else {
      // In Level 9 Mothership, Central Core is hidden/invulnerable until turrets, shield & engines are destroyed!
      built.parts.forEach((p) => {
        if (p.isCore) p.mesh.visible = false;
      });
    }

    this.worldGroup.add(built.root);
    this.capitalBoss = {
      root: built.root,
      parts: built.parts,
      shieldDome: built.shieldDome,
      isFinalBoss,
      pos: built.root.position,
      attackTimer: 1.5,
      missileTimer: 3.5,
      beamTimer: 4.5,
      phase: 1,
    };
  }

  private loop = (now: number): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;

    if (this.mode === 'showcase') {
      this.updateShowcase(dt, now * 0.001);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.mode === 'playing') {
      this.updateGameplay(dt);
    }

    this.updateParticles(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private updateShowcase(dt: number, t: number): void {
    this.animateBackdrop(dt, 22);

    if (!this.playerBuilt) return;
    const root = this.playerBuilt.root;
    const body = this.playerBuilt.bodyGroup;

    this.playerBuilt.reticleGroup.visible = false;

    if (this.showcaseModeType === 'hangar') {
      // Turntable 360° inspection view + manual finger/mouse spin!
      root.position.set(0, -0.35 + Math.sin(t * 1.8) * 0.16, 4.8);
      root.rotation.set(0.16, t * 0.65 + this.hangarManualYaw, 0.12);
      body.rotation.set(0, 0, 0);
      this.camera.position.lerp(new THREE.Vector3(0, 1.55, 10.2), dt * 4);
      this.camera.lookAt(0, -0.15, 4.8);
    } else {
      // Dynamic Main Menu heroic flyby banking animation
      root.position.set(Math.sin(t * 0.85) * 2.2, -0.4 + Math.cos(t * 1.1) * 0.55, 4.2);
      root.rotation.set(
        Math.cos(t * 1.1) * 0.08,
        Math.PI * 0.14 + Math.sin(t * 0.55) * 0.28,
        -Math.cos(t * 0.85) * 0.34
      );
      body.rotation.set(0, 0, 0);
      this.camera.position.lerp(new THREE.Vector3(0, 1.8, 10.6), dt * 4);
      this.camera.lookAt(0, 0.1, 2.5);
    }

    this.playerBuilt.thrusterFlames.forEach((f) => {
      f.scale.set(1, 0.95 + Math.sin(t * 28) * 0.18, 1);
    });
    (this.playerBuilt.shieldMesh.material as THREE.MeshBasicMaterial).opacity = 0;
  }

  private animateBackdrop(dt: number, forwardSpeed: number): void {
    if (!this.backdrop) return;
    const starPos = this.backdrop.starPoints.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < starPos.count; i++) {
      let z = starPos.getZ(i) + forwardSpeed * dt;
      if (z > 22) z -= 260;
      starPos.setZ(i, z);
    }
    starPos.needsUpdate = true;

    const linePos = this.backdrop.speedLines.geometry.attributes.position as THREE.BufferAttribute;
    const streakLen = forwardSpeed > 45 ? 13 : 5.5;
    for (let i = 0; i < linePos.count; i += 2) {
      let z = linePos.getZ(i) + forwardSpeed * 2.3 * dt;
      if (z > 18) z -= 180;
      linePos.setZ(i, z);
      linePos.setZ(i + 1, z + streakLen);
    }
    linePos.needsUpdate = true;
    (this.backdrop.speedLines.material as THREE.LineBasicMaterial).opacity =
      forwardSpeed > 45 ? 0.52 : 0.14;

    this.backdrop.planetGroup.rotation.y += dt * 0.04;
  }

  private updateGameplay(dt: number): void {
    this.elapsedSeconds += dt;

    // Timers & Buffs
    if (this.alertTimer > 0) {
      this.alertTimer -= dt;
      if (this.alertTimer <= 0) this.alertBanner = null;
    }
    if (this.pickupToastTimer > 0) {
      this.pickupToastTimer -= dt;
      if (this.pickupToastTimer <= 0) this.pickupToast = null;
    }

    this.buffs.rapidFireTimer = Math.max(0, this.buffs.rapidFireTimer - dt);
    this.buffs.doubleLaserTimer = Math.max(0, this.buffs.doubleLaserTimer - dt);
    this.buffs.tripleShotTimer = Math.max(0, this.buffs.tripleShotTimer - dt);
    this.buffs.speedBoostTimer = Math.max(0, this.buffs.speedBoostTimer - dt);
    this.buffs.shieldActiveTimer = Math.max(0, this.buffs.shieldActiveTimer - dt);

    this.missileCooldown = Math.max(0, this.missileCooldown - dt);
    this.shieldCooldown = Math.max(0, this.shieldCooldown - dt);
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    // Passive shield recharge after out-of-hit delay
    if (this.shieldRegenDelay > 0) {
      this.shieldRegenDelay -= dt;
    } else if (this.shield < this.stats.maxShield) {
      this.shield = Math.min(this.stats.maxShield, this.shield + dt * 6.5);
    }

    // Low HP Cockpit Warning
    if (this.health > 0 && this.health / this.stats.maxHealth <= 0.28) {
      soundEngine.playLowHealthWarning();
    }

    // Boost energy handling
    const wantsBoost = this.input.boosting && this.boostEnergy > 4;
    if (wantsBoost) {
      this.boostEnergy = Math.max(0, this.boostEnergy - dt * 32);
    } else {
      this.boostEnergy = Math.min(100, this.boostEnergy + dt * 18);
    }
    const isBoosting = wantsBoost || this.buffs.speedBoostTimer > 0;

    // Active Shield trigger (Q / Touch SHIELD button)
    if (this.input.shieldTrigger) {
      this.input.shieldTrigger = false;
      if (this.shieldCooldown <= 0) {
        this.buffs.shieldActiveTimer = 4.8;
        this.shield = Math.min(this.stats.maxShield, this.shield + 35);
        this.shieldCooldown = 11.0;
        soundEngine.playShield();
        this.showToast('SHIELD MATRIX AKTIF!');
      }
    }

    // Missile Launch trigger (E / Touch MISSILE button)
    if (this.input.missileTrigger) {
      this.input.missileTrigger = false;
      if (this.missiles > 0 && this.missileCooldown <= 0) {
        this.launchPlayerMissile();
      }
    }

    // Continuous Laser Fire (Space / Hold FIRE button)
    if (this.input.firing && this.fireCooldown <= 0) {
      this.firePlayerLasers();
    }

    // --- 1. PLAYER 360° FLIGHT PHYSICS ---
    this.updatePlayerMovement(dt, isBoosting);

    // --- 2. ENVIRONMENT & LEVEL MECHANICS ---
    const forwardWarpSpeed = isBoosting ? 68 : 28 + Math.max(0, this.input.moveY) * 12;
    this.animateBackdrop(dt, forwardWarpSpeed);
    this.updateLevelMechanics(dt, isBoosting);

    // --- 3. PROJECTILES, ENEMIES, ROCKS, PICKUPS ---
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateRocks(dt);
    this.updatePickups(dt);
    this.updateCapitalBoss(dt);
    this.updateDangerZones(dt);

    // --- 4. THIRD-PERSON CAMERA & SHAKE ---
    this.updateCamera(dt, isBoosting);

    // --- 5. CHECK TIMERS & WIN/LOSE ---
    this.checkWinLoseConditions();

    // Emit HUD snapshot smoothly (~20Hz)
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.05) {
      this.hudEmitAccum = 0;
      this.emitHudSnapshot();
    }
  }

  private updatePlayerMovement(dt: number, isBoosting: boolean): void {
    const speedMult = (isBoosting ? 1.62 : 1.0) * (this.buffs.speedBoostTimer > 0 ? 1.25 : 1.0);
    const maxSpeed = this.stats.speed * speedMult;

    const targetVx = this.input.moveX * maxSpeed;
    const targetVy = this.input.moveY * maxSpeed * 0.85;
    // Pushing joystick UP or Boosting surges forward (-Z), pulling DOWN eases back (+Z)
    const targetVz = (-this.input.moveY * 2.2 - (isBoosting ? 2.4 : 0) - this.playerPos.z) * 4.5;

    this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, targetVx, dt * 9.5);
    this.playerVel.y = THREE.MathUtils.lerp(this.playerVel.y, targetVy, dt * 9.5);
    this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, targetVz, dt * 6.0);

    // Level 7 Black Hole Gravitational Pull!
    this.blackHolePullWarning = false;
    if (this.currentLevel.mechanic === 'black_hole_zone' && this.blackHoleGroup) {
      const dx = this.blackHolePos.x - this.playerPos.x;
      const dy = this.blackHolePos.y - this.playerPos.y;
      const distSq = Math.max(9, dx * dx + dy * dy);
      const dist = Math.sqrt(distSq);
      const pullStrength = 215 / distSq;

      this.playerVel.x += (dx / dist) * pullStrength * 14 * dt;
      this.playerVel.y += (dy / dist) * pullStrength * 14 * dt;

      if (dist < 11.5) {
        this.blackHolePullWarning = true;
      }
      if (dist < 3.6) {
        // Inside lethal event horizon crush zone
        this.damagePlayer(28 * dt);
        this.cameraShake = Math.max(this.cameraShake, 0.25);
      }
    }

    this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x + this.playerVel.x * dt, -17.5, 17.5);
    this.playerPos.y = THREE.MathUtils.clamp(this.playerPos.y + this.playerVel.y * dt, -9.5, 9.8);
    this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z + this.playerVel.z * dt, -4.5, 2.2);

    if (this.playerBuilt) {
      this.playerBuilt.root.position.copy(this.playerPos);

      // Smooth aerodynamic bank roll, climb pitch, and yaw
      const targetRoll = -this.input.moveX * 0.78;
      const targetPitch = this.input.moveY * 0.36;
      const targetYaw = -this.input.moveX * 0.22;

      this.playerBuilt.bodyGroup.rotation.z = THREE.MathUtils.lerp(
        this.playerBuilt.bodyGroup.rotation.z,
        targetRoll,
        dt * 10
      );
      this.playerBuilt.bodyGroup.rotation.x = THREE.MathUtils.lerp(
        this.playerBuilt.bodyGroup.rotation.x,
        targetPitch,
        dt * 10
      );
      this.playerBuilt.bodyGroup.rotation.y = THREE.MathUtils.lerp(
        this.playerBuilt.bodyGroup.rotation.y,
        targetYaw,
        dt * 10
      );

      // Animate jet afterburner cones
      const flameLen = isBoosting
        ? 2.25 + Math.random() * 0.45
        : 0.9 + this.input.magnitude * 0.55 + Math.random() * 0.2;
      this.playerBuilt.thrusterFlames.forEach((f) => {
        f.scale.set(isBoosting ? 1.3 : 1.0, flameLen, isBoosting ? 1.3 : 1.0);
      });

      // 3D Forward Targeting Reticle
      this.playerBuilt.reticleGroup.visible = true;
      this.playerBuilt.reticleGroup.rotation.z += dt * 1.1;

      // Shield bubble visual
      const shieldMat = this.playerBuilt.shieldMesh.material as THREE.MeshBasicMaterial;
      if (this.buffs.shieldActiveTimer > 0) {
        shieldMat.opacity = 0.38 + Math.sin(this.elapsedSeconds * 14) * 0.1;
        this.playerBuilt.shieldMesh.rotation.y += dt * 2.2;
      } else {
        shieldMat.opacity = THREE.MathUtils.lerp(shieldMat.opacity, 0, dt * 8);
      }
    }

    soundEngine.updateEngineHum(this.input.magnitude, isBoosting);
  }

  private updateCamera(dt: number, isBoosting: boolean): void {
    const targetFov = isBoosting ? 71 : 60;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, dt * 6.5);
      this.camera.updateProjectionMatrix();
    }

    const desiredCamPos = new THREE.Vector3(
      this.playerPos.x * 0.56,
      this.playerPos.y * 0.52 + 3.25,
      11.8 + (isBoosting ? 1.2 : 0)
    );

    if (this.cameraShake > 0) {
      desiredCamPos.x += (Math.random() - 0.5) * this.cameraShake * 2.2;
      desiredCamPos.y += (Math.random() - 0.5) * this.cameraShake * 2.2;
      this.cameraShake = Math.max(0, this.cameraShake - dt * 2.4);
    }

    this.camera.position.lerp(desiredCamPos, dt * 8.5);
    this.camera.lookAt(
      this.playerPos.x * 0.38,
      this.playerPos.y * 0.36 + 0.4,
      -26
    );
  }

  private firePlayerLasers(): void {
    const spec = getAircraftById(this.aircraftId);
    const rateMult = this.buffs.rapidFireTimer > 0 ? 1.75 : 1.0;
    this.fireCooldown = 1 / (this.stats.fireRate * rateMult);

    let barrels = this.stats.baseBarrelCount;
    if (this.buffs.doubleLaserTimer > 0) barrels = Math.max(barrels, 2);
    if (this.buffs.tripleShotTimer > 0) barrels = 3;

    soundEngine.playLaser(barrels);

    const offsets =
      barrels === 1
        ? [new THREE.Vector3(0, -0.05, -2.4)]
        : barrels === 2
        ? [new THREE.Vector3(-0.85, -0.05, -1.6), new THREE.Vector3(0.85, -0.05, -1.6)]
        : [
            new THREE.Vector3(0, 0.05, -2.4),
            new THREE.Vector3(-1.1, -0.06, -1.5),
            new THREE.Vector3(1.1, -0.06, -1.5),
          ];

    // Gentle forward auto-convergence toward nearest enemy in front sight cone
    const aimPoint = this.findSoftAimPoint();

    offsets.forEach((off, idx) => {
      const origin = this.playerPos.clone().add(off);
      let dir = new THREE.Vector3(0, 0, -1);
      if (aimPoint) {
        dir = aimPoint.clone().sub(origin).normalize();
      } else if (barrels === 3 && idx > 0) {
        dir.x = idx === 1 ? -0.045 : 0.045;
        dir.normalize();
      }

      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(
          this.buffs.tripleShotTimer > 0
            ? '#e879f9'
            : this.buffs.rapidFireTimer > 0
            ? '#facc15'
            : spec.laserColor
        ),
      });
      const mesh = new THREE.Mesh(this.laserGeo, mat);
      mesh.position.copy(origin);
      mesh.lookAt(origin.clone().add(dir));
      this.worldGroup.add(mesh);

      this.projectiles.push({
        mesh,
        pos: origin,
        vel: dir.multiplyScalar(118),
        damage: this.stats.laserDamage,
        isEnemy: false,
        life: 1.7,
        radius: 0.75,
      });
    });
  }

  private findSoftAimPoint(): THREE.Vector3 | null {
    let bestPos: THREE.Vector3 | null = null;
    let bestScore = Infinity;

    for (const e of this.enemies) {
      if (e.pos.z >= this.playerPos.z - 2) continue;
      const dx = e.pos.x - this.playerPos.x;
      const dy = e.pos.y - this.playerPos.y;
      const lateralDist = Math.hypot(dx, dy);
      if (lateralDist < 5.6 && lateralDist < bestScore) {
        bestScore = lateralDist;
        bestPos = e.pos.clone();
      }
    }

    if (!bestPos && this.capitalBoss) {
      for (const p of this.capitalBoss.parts) {
        if (p.destroyed || !p.mesh.visible) continue;
        const wp = new THREE.Vector3();
        p.mesh.getWorldPosition(wp);
        const lateralDist = Math.hypot(wp.x - this.playerPos.x, wp.y - this.playerPos.y);
        if (lateralDist < 6.8 && lateralDist < bestScore) {
          bestScore = lateralDist;
          bestPos = wp;
        }
      }
    }

    return bestPos;
  }

  private launchPlayerMissile(): void {
    this.missiles -= 1;
    this.missileCooldown = 0.65;
    soundEngine.playMissile();

    // Find best homing lock target (Enemy or Boss Weak Point)
    let lockTarget: EnemyEntity | BossPartWorldTarget | null = null;
    let bestDist = Infinity;

    for (const e of this.enemies) {
      const d = e.pos.distanceTo(this.playerPos);
      if (e.pos.z < this.playerPos.z && d < bestDist) {
        bestDist = d;
        lockTarget = e;
      }
    }

    if (!lockTarget && this.capitalBoss) {
      for (const part of this.capitalBoss.parts) {
        if (part.destroyed || !part.mesh.visible) continue;
        const getWorldPos = () => {
          const v = new THREE.Vector3();
          part.mesh.getWorldPosition(v);
          return v;
        };
        const d = getWorldPos().distanceTo(this.playerPos);
        if (d < bestDist) {
          bestDist = d;
          lockTarget = { part, getWorldPos };
        }
      }
    }

    const origin = this.playerPos.clone().add(new THREE.Vector3(0, -0.35, -1.8));
    const rocketGeo = new THREE.ConeGeometry(0.22, 1.35, 8);
    rocketGeo.rotateX(-Math.PI / 2);
    const rocketMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const mesh = new THREE.Mesh(rocketGeo, rocketMat);
    mesh.position.copy(origin);
    this.worldGroup.add(mesh);

    this.projectiles.push({
      mesh,
      pos: origin,
      vel: new THREE.Vector3(0, 0, -68),
      damage: 135 + this.pilotLevel * 16,
      isEnemy: false,
      isMissile: true,
      homingTarget: lockTarget,
      life: 3.2,
      radius: 1.4,
    });
  }

  private triggerMegaBomb(): void {
    soundEngine.playExplosion('large');
    this.cameraShake = 0.95;
    this.showAlert('MEGA BOMB DETONATION!', 2.0);

    // Shockwave explosion on every active enemy & rock!
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      this.spawnExplosion(e.pos, 0xa855f7, 18);
      e.hp -= 280;
      if (e.hp <= 0) {
        this.destroyEnemyAtIndex(i);
      }
    }
    for (let i = this.rocks.length - 1; i >= 0; i--) {
      this.spawnExplosion(this.rocks[i].pos, 0xf97316, 10);
      this.worldGroup.remove(this.rocks[i].mesh);
      this.rocks.splice(i, 1);
    }
    if (this.capitalBoss) {
      for (const part of this.capitalBoss.parts) {
        if (!part.destroyed && part.mesh.visible) {
          this.damageBossPart(part, 160);
          break;
        }
      }
    }
  }

  private updateLevelMechanics(dt: number, isBoosting: boolean): void {
    const mech = this.currentLevel.mechanic;

    // Rotate Space Station in Level 6
    if (this.stationGroup) {
      this.stationGroup.rotation.y += dt * 0.35;
    }

    // Animate Black Hole & Warp Distance in Level 7
    if (mech === 'black_hole_zone' && this.blackHoleGroup) {
      this.blackHoleGroup.rotation.z += dt * 2.2;
      // Gently drift singularity across the sector to keep navigation dynamic!
      this.blackHolePos.x = Math.sin(this.elapsedSeconds * 0.42) * 9.5;
      this.blackHolePos.y = Math.cos(this.elapsedSeconds * 0.55) * 4.5;
      this.blackHoleGroup.position.copy(this.blackHolePos);

      const speedGain = isBoosting ? 2.45 : 1.35 + Math.max(0, this.input.moveY) * 0.45;
      this.warpProgress = Math.min(100, this.warpProgress + dt * speedGain);

      if (this.warpProgress >= 82 && this.warpGateGroup) {
        this.warpGateGroup.visible = true;
        const approachT = (this.warpProgress - 82) / 18; // 0..1
        this.warpGateGroup.position.set(0, 0, THREE.MathUtils.lerp(-120, 0, approachT));
        this.warpGateGroup.rotation.z += dt * 1.4;
      }
    }

    // Spawning Rocks / Meteors
    if (mech === 'asteroid_field' || mech === 'meteor_storm' || mech === 'black_hole_zone') {
      this.rockTimer -= dt;
      if (this.rockTimer <= 0) {
        if (mech === 'meteor_storm') {
          this.rockTimer = 0.28;
          this.spawnHazardRock(true);
        } else if (mech === 'asteroid_field') {
          this.rockTimer = 0.58;
          this.spawnHazardRock(false);
        } else {
          this.rockTimer = 1.15;
          this.spawnHazardRock(false);
        }
      }
    }

    // Spawning Enemy Fighters per Level Mechanic
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;

    if (mech === 'first_contact') {
      this.spawnTimer = 1.65;
      if (this.enemies.length < 5) {
        this.spawnEnemy(Math.random() > 0.4 ? 'scout' : 'drone');
      }
    } else if (mech === 'asteroid_field') {
      this.spawnTimer = 1.75;
      if (this.enemies.length < 5) {
        this.spawnEnemy(Math.random() > 0.35 ? 'scout' : 'interceptor');
      }
    } else if (mech === 'enemy_squadron') {
      this.spawnTimer = 1.0;
      if (!this.waveSpawnedInCurrent) {
        this.spawnSquadronWave(this.currentWave);
        this.waveSpawnedInCurrent = true;
      } else if (this.enemies.length === 0 && this.currentWave < 3) {
        this.currentWave += 1;
        this.waveSpawnedInCurrent = false;
        this.showAlert(`GELOMBANG SKUADRON ${this.currentWave}/3 DATANG!`, 2.4);
      }
    } else if (mech === 'meteor_storm') {
      this.spawnTimer = 2.6;
      if (this.enemies.length < 4) {
        this.spawnEnemy(Math.random() > 0.5 ? 'drone' : 'interceptor');
      }
    } else if (mech === 'space_ambush') {
      this.spawnTimer = 1.55;
      if (this.enemies.length < 6) {
        this.spawnAmbushEnemy();
      }
    } else if (mech === 'defend_station') {
      this.spawnTimer = 1.65;
      if (this.enemies.length < 6) {
        const roll = Math.random();
        this.spawnEnemy(roll < 0.45 ? 'bomber' : roll < 0.75 ? 'heavy' : 'scout');
      }
    } else if (mech === 'black_hole_zone') {
      this.spawnTimer = 2.5;
      if (this.enemies.length < 4) {
        this.spawnEnemy(Math.random() > 0.5 ? 'stealth' : 'interceptor');
      }
    } else if (mech === 'elite_squadron') {
      this.spawnTimer = 1.8;
      const spawnedOrKilled = this.enemiesDestroyed + this.enemies.length;
      if (this.enemies.length < 2 && spawnedOrKilled < 5) {
        this.spawnEnemy('elite');
      }
    } else if (mech === 'mothership_attack' || mech === 'galaxy_final_boss') {
      this.spawnTimer = 4.2;
      if (this.enemies.length < 3) {
        this.spawnEnemy('drone');
      }
    }
  }

  private spawnEnemy(
    type: EnemyType,
    customPos?: THREE.Vector3,
    customVel?: THREE.Vector3,
    ambushEntering = false
  ): void {
    const mesh = buildEnemyMesh(type);
    const pos =
      customPos ||
      new THREE.Vector3(
        (Math.random() - 0.5) * 28,
        (Math.random() - 0.5) * 15,
        -78 - Math.random() * 18
      );
    mesh.position.copy(pos);
    this.worldGroup.add(mesh);

    const hpTable: Record<EnemyType, number> = {
      drone: 30,
      scout: 48,
      stealth: 68,
      interceptor: 75,
      bomber: 115,
      heavy: 155,
      elite: 340,
      boss: 1500,
    };

    const scoreTable: Record<EnemyType, number> = {
      drone: 100,
      scout: 100,
      stealth: 100,
      interceptor: 100,
      bomber: 100,
      heavy: 100,
      elite: 300,
      boss: 1000,
    };

    this.enemies.push({
      id: this.nextEntityId++,
      type,
      mesh,
      pos,
      vel: customVel || new THREE.Vector3(0, 0, 22),
      hp: hpTable[type],
      maxHp: hpTable[type],
      radius: type === 'heavy' || type === 'bomber' ? 2.0 : type === 'elite' ? 2.1 : 1.45,
      fireTimer: 1.0 + Math.random() * 1.4,
      dodgeTimer: 0,
      age: 0,
      phaseOffset: Math.random() * Math.PI * 2,
      scoreValue: scoreTable[type],
      ambushEntering,
    });
  }

  private spawnSquadronWave(wave: number): void {
    if (wave === 1) {
      // V-Formation from high upper sector
      const xs = [-12, -7, -2.5, 2.5, 7, 12];
      xs.forEach((x, i) => {
        this.spawnEnemy(
          i % 2 === 0 ? 'scout' : 'drone',
          new THREE.Vector3(x, 12 + Math.abs(x) * 0.3, -68 - Math.abs(x) * 1.5),
          new THREE.Vector3(-x * 0.15, -3.5, 24)
        );
      });
    } else if (wave === 2) {
      // Left & Right Pincer Squadron
      for (let i = 0; i < 6; i++) {
        const side = i < 3 ? -1 : 1;
        this.spawnEnemy(
          i % 2 === 0 ? 'interceptor' : 'heavy',
          new THREE.Vector3(side * 26, (i % 3 - 1) * 4.5, -48 - i * 4),
          new THREE.Vector3(-side * 9, 0, 14)
        );
      }
    } else {
      // Multi-angle Diagonal Elite/Bomber Strike Group
      const types: EnemyType[] = ['bomber', 'stealth', 'heavy', 'interceptor', 'stealth', 'bomber'];
      types.forEach((t, i) => {
        const angle = (i / 6) * Math.PI * 2;
        this.spawnEnemy(
          t,
          new THREE.Vector3(Math.cos(angle) * 22, Math.sin(angle) * 12, -62 - i * 3),
          new THREE.Vector3(-Math.cos(angle) * 6, -Math.sin(angle) * 4, 20)
        );
      });
    }
  }

  private spawnAmbushEnemy(): void {
    const fromBehind = Math.random() < 0.55;
    if (fromBehind) {
      // Swoops in from behind the player camera!
      const side = Math.random() > 0.5 ? 1 : -1;
      this.showAlert('AWAS! PENYERGAPAN DARI BELAKANG!', 1.5);
      this.spawnEnemy(
        Math.random() > 0.45 ? 'stealth' : 'interceptor',
        new THREE.Vector3(side * (7 + Math.random() * 7), (Math.random() - 0.5) * 10, 16),
        new THREE.Vector3(-side * 2.5, 0, -48),
        true
      );
    } else {
      // Flank ambush from sharp left/right!
      const side = Math.random() > 0.5 ? 1 : -1;
      this.spawnEnemy(
        Math.random() > 0.5 ? 'stealth' : 'scout',
        new THREE.Vector3(side * 28, (Math.random() - 0.5) * 12, -26 - Math.random() * 12),
        new THREE.Vector3(-side * 16, 0, -4),
        true
      );
    }
  }

  private spawnHazardRock(isMeteor: boolean): void {
    const radius = isMeteor ? 1.1 + Math.random() * 1.1 : 1.4 + Math.random() * 1.8;
    const mesh = buildAsteroidMesh(radius, isMeteor);

    let pos: THREE.Vector3;
    let vel: THREE.Vector3;

    if (isMeteor) {
      // Blazing multi-angle high-speed meteors!
      const fromSide = (Math.random() - 0.5) * 34;
      pos = new THREE.Vector3(fromSide, 16 + Math.random() * 10, -85 - Math.random() * 25);
      const targetX = this.playerPos.x + (Math.random() - 0.5) * 14;
      const targetY = this.playerPos.y + (Math.random() - 0.5) * 10;
      vel = new THREE.Vector3(targetX - pos.x, targetY - pos.y, 88)
        .normalize()
        .multiplyScalar(46 + Math.random() * 26);
    } else {
      pos = new THREE.Vector3(
        (Math.random() - 0.5) * 34,
        (Math.random() - 0.5) * 18,
        -92
      );
      vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6.5,
        (Math.random() - 0.5) * 4.5,
        24 + Math.random() * 14
      );
    }

    mesh.position.copy(pos);
    this.worldGroup.add(mesh);

    this.rocks.push({
      mesh,
      pos,
      vel,
      rotVel: new THREE.Vector3(
        (Math.random() - 0.5) * 2.5,
        (Math.random() - 0.5) * 2.5,
        (Math.random() - 0.5) * 2.5
      ),
      radius,
      hp: isMeteor ? 45 : 55,
      isMeteor,
    });
  }

  private updateEnemies(dt: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.age += dt;
      e.dodgeTimer = Math.max(0, e.dodgeTimer - dt);

      // Combat engagement range Z around -26..-38
      const desiredZ = e.type === 'heavy' || e.type === 'bomber' ? -36 : e.type === 'elite' ? -32 : -28;

      if (e.ambushEntering) {
        e.pos.addScaledVector(e.vel, dt);
        if (e.pos.z <= -28 || Math.abs(e.pos.x) < 12) {
          e.ambushEntering = false;
        }
      } else {
        // Distinct movement pattern per Enemy Type!
        const zPull = (desiredZ - e.pos.z) * 2.2;
        e.vel.z = THREE.MathUtils.lerp(e.vel.z, zPull, dt * 3);

        if (e.type === 'scout') {
          e.vel.x = Math.cos(e.age * 2.6 + e.phaseOffset) * 11;
          e.vel.y = Math.sin(e.age * 3.1 + e.phaseOffset) * 6.5;
        } else if (e.type === 'interceptor') {
          // Actively pursues player's X/Y coordinates!
          e.vel.x = THREE.MathUtils.clamp((this.playerPos.x - e.pos.x) * 1.9, -13, 13);
          e.vel.y = THREE.MathUtils.clamp((this.playerPos.y - e.pos.y) * 1.9, -9, 9);
        } else if (e.type === 'heavy') {
          e.vel.x = Math.sin(e.age * 0.9 + e.phaseOffset) * 5.5;
          e.vel.y = Math.cos(e.age * 0.7 + e.phaseOffset) * 3.0;
        } else if (e.type === 'bomber') {
          e.vel.x = Math.cos(e.age * 1.1 + e.phaseOffset) * 7.5;
          e.vel.y = Math.sin(e.age * 0.8) * 2.5;
        } else if (e.type === 'stealth') {
          e.vel.x = Math.sin(e.age * 2.2 + e.phaseOffset) * 13;
          e.vel.y = Math.cos(e.age * 1.9 + e.phaseOffset) * 8;
          const firstChild = e.mesh.children[0] as THREE.Mesh | undefined;
          if (firstChild && firstChild.material) {
            (firstChild.material as THREE.MeshPhysicalMaterial).opacity =
              0.22 + Math.abs(Math.sin(e.age * 3.4 + e.phaseOffset)) * 0.72;
          }
        } else if (e.type === 'drone') {
          e.vel.x = Math.cos(e.age * 3.8 + e.phaseOffset) * 9.5;
          e.vel.y = Math.sin(e.age * 3.8 + e.phaseOffset) * 9.5;
          e.mesh.rotation.z += dt * 4.5;
        } else if (e.type === 'elite') {
          // Agile figure-8 + sudden barrel-roll evasion when player fires!
          if (this.input.firing && e.dodgeTimer <= 0 && Math.abs(e.pos.x - this.playerPos.x) < 3.5) {
            e.vel.x = (Math.random() > 0.5 ? 1 : -1) * 24;
            e.dodgeTimer = 1.8;
          } else if (e.dodgeTimer <= 1.2) {
            e.vel.x = THREE.MathUtils.lerp(
              e.vel.x,
              Math.sin(e.age * 1.9 + e.phaseOffset) * 14,
              dt * 4
            );
          }
          e.vel.y = Math.cos(e.age * 2.3 + e.phaseOffset) * 7.5;
          e.mesh.rotation.z += dt * (e.dodgeTimer > 1.2 ? 9.5 : 0.8);
        }

        e.pos.addScaledVector(e.vel, dt);
        e.pos.x = THREE.MathUtils.clamp(e.pos.x, -18, 18);
        e.pos.y = THREE.MathUtils.clamp(e.pos.y, -10, 10);
      }

      e.mesh.position.copy(e.pos);
      if (e.type !== 'drone' && e.type !== 'elite') {
        e.mesh.rotation.z = -e.vel.x * 0.035;
      }

      // Enemy Weapons Fire
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.pos.z < -8) {
        this.enemyAttack(e);
      }

      // Player body collision check
      if (e.pos.distanceTo(this.playerPos) < e.radius + 1.45) {
        this.damagePlayer(24);
        this.spawnExplosion(e.pos, 0xf43f5e, 14);
        this.destroyEnemyAtIndex(i);
      }
    }
  }

  private enemyAttack(e: EnemyEntity): void {
    const defendMode = this.currentLevel.mechanic === 'defend_station' && this.stationGroup;
    const targetStation = defendMode && (e.type === 'bomber' || (e.type === 'heavy' && Math.random() < 0.6));

    const targetPos = targetStation && this.stationGroup
      ? this.stationGroup.position.clone()
      : this.playerPos.clone();

    const dir = targetPos.sub(e.pos).normalize();

    if (e.type === 'elite') {
      e.fireTimer = 1.45;
      // 3-way laser burst + periodic missile
      for (const spread of [-0.09, 0, 0.09]) {
        const d = dir.clone();
        d.x += spread;
        d.normalize();
        this.spawnEnemyBolt(e.pos.clone(), d.multiplyScalar(48), 14, 0xf43f5e, false, false);
      }
      if (Math.random() < 0.45) {
        this.spawnEnemyBolt(e.pos.clone(), dir.clone().multiplyScalar(36), 22, 0xfbbf24, false, true);
      }
    } else if (e.type === 'bomber') {
      e.fireTimer = 2.2;
      this.spawnEnemyBolt(
        e.pos.clone(),
        dir.multiplyScalar(targetStation ? 28 : 30),
        22,
        0xfacc15,
        Boolean(targetStation),
        true
      );
    } else if (e.type === 'heavy') {
      e.fireTimer = 1.85;
      for (const ox of [-0.8, 0.8]) {
        const origin = e.pos.clone().add(new THREE.Vector3(ox, 0, 0));
        this.spawnEnemyBolt(origin, dir.clone().multiplyScalar(40), 15, 0xf97316, Boolean(targetStation), false);
      }
    } else {
      e.fireTimer = e.type === 'drone' ? 2.6 : 2.1;
      this.spawnEnemyBolt(e.pos.clone(), dir.multiplyScalar(42), 10, 0xf43f5e, false, false);
    }
  }

  private spawnEnemyBolt(
    origin: THREE.Vector3,
    vel: THREE.Vector3,
    damage: number,
    color: number,
    targetsStation: boolean,
    isBomb: boolean
  ): void {
    const geo = isBomb ? new THREE.SphereGeometry(0.36, 8, 8) : this.laserGeo;
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin);
    if (!isBomb) {
      mesh.lookAt(origin.clone().add(vel));
    }
    this.worldGroup.add(mesh);

    this.projectiles.push({
      mesh,
      pos: origin,
      vel,
      damage,
      isEnemy: true,
      isBomb,
      targetsStation,
      life: 3.6,
      radius: isBomb ? 0.85 : 0.65,
    });
  }

  private updateCapitalBoss(dt: number): void {
    if (!this.capitalBoss) return;
    const boss = this.capitalBoss;

    // Smooth entry & menacing hover
    boss.pos.z = THREE.MathUtils.lerp(boss.pos.z, -42, dt * 1.4);
    boss.pos.x = Math.sin(this.elapsedSeconds * (boss.isFinalBoss ? 0.65 : 0.42)) * 5.8;
    boss.pos.y = 2.2 + Math.cos(this.elapsedSeconds * 0.55) * 1.6;
    boss.root.position.copy(boss.pos);

    boss.parts.forEach((p) => {
      if (!p.destroyed && p.mesh.visible) {
        p.mesh.rotation.y += dt * 2.2;
        p.mesh.rotation.x += dt * 1.4;
      }
    });

    if (!boss.isFinalBoss) {
      // LEVEL 9 MOTHERSHIP LOGIC: Check if all 5 outer subsystems are destroyed
      const outerAlive = boss.parts.filter((p) => !p.isCore && !p.destroyed).length;
      const corePart = boss.parts.find((p) => p.isCore);
      if (outerAlive === 0 && corePart && !corePart.mesh.visible) {
        corePart.mesh.visible = true;
        boss.shieldDome.visible = false;
        this.showAlert('PERISAI HANCUR! SERANG INTI UTAMA KAPAL INDUK!', 3.2);
        soundEngine.playExplosion('large');
        this.cameraShake = 0.7;
      }

      boss.attackTimer -= dt;
      if (boss.attackTimer <= 0) {
        boss.attackTimer = outerAlive > 0 ? 1.55 : 1.15;
        boss.parts.forEach((p) => {
          if (p.destroyed || !p.mesh.visible) return;
          if (p.id.startsWith('turret') || p.isCore) {
            const wp = new THREE.Vector3();
            p.mesh.getWorldPosition(wp);
            const dir = this.playerPos.clone().sub(wp).normalize();
            this.spawnEnemyBolt(wp, dir.multiplyScalar(44), 15, 0x2dd4bf, false, false);
          }
        });
      }
      return;
    }

    // LEVEL 10 GALAXY FINAL BOSS: 3 DISTINCT PHASES!
    const wingAlive = boss.parts.filter(
      (p) => (p.id === 'weak_l' || p.id === 'weak_r') && !p.destroyed
    ).length;
    const crownPart = boss.parts.find((p) => p.id === 'weak_crown')!;
    const heartPart = boss.parts.find((p) => p.id === 'weak_heart')!;

    if (boss.phase === 1 && wingAlive === 0) {
      boss.phase = 2;
      crownPart.mesh.visible = true;
      this.showAlert('FASE 2: BADAI RUDAL & DRONE! HANCURKAN MAHKOTA RAJA!', 3.5);
      soundEngine.playExplosion('large');
      this.cameraShake = 0.8;
    } else if (boss.phase === 2 && crownPart.destroyed) {
      boss.phase = 3;
      heartPart.mesh.visible = true;
      boss.shieldDome.visible = false;
      this.showAlert('FASE 3: SERANGAN ENERGI BESAR! HANCURKAN INTI RAJA ALIEN!', 3.8);
      soundEngine.playExplosion('large');
      this.cameraShake = 0.95;
    }

    // Phase 1+: Rapid sweeping laser barrages
    boss.attackTimer -= dt;
    if (boss.attackTimer <= 0) {
      boss.attackTimer = boss.phase === 1 ? 1.1 : boss.phase === 2 ? 1.25 : 0.95;
      const sweepCount = boss.phase === 3 ? 5 : 3;
      for (let k = 0; k < sweepCount; k++) {
        const spread = (k - (sweepCount - 1) / 2) * 0.14;
        const origin = boss.pos.clone().add(new THREE.Vector3(spread * 18, -0.5, 3));
        const dir = this.playerPos.clone().sub(origin).normalize();
        dir.x += spread;
        dir.normalize();
        this.spawnEnemyBolt(origin, dir.multiplyScalar(48), 14, 0xf43f5e, false, false);
      }
    }

    // Phase 2+: Salvos of Homing Energy Bombs & Drones
    if (boss.phase >= 2) {
      boss.missileTimer -= dt;
      if (boss.missileTimer <= 0) {
        boss.missileTimer = 3.4;
        for (const side of [-1, 1]) {
          const origin = boss.pos.clone().add(new THREE.Vector3(side * 6, 1.5, 2));
          const dir = this.playerPos.clone().sub(origin).normalize();
          this.spawnEnemyBolt(origin, dir.multiplyScalar(38), 20, 0xc084fc, false, true);
        }
        if (this.enemies.length < 4) {
          this.spawnEnemy('drone', boss.pos.clone().add(new THREE.Vector3(0, -2, 3)));
        }
      }
    }

    // Phase 3: Telegraphed Hazardous Mega-Energy Beam Corridors!
    if (boss.phase === 3) {
      boss.beamTimer -= dt;
      if (boss.beamTimer <= 0) {
        boss.beamTimer = 4.2;
        this.spawnBossDangerBeam(this.playerPos.x, this.playerPos.y);
      }
    }
  }

  private spawnBossDangerBeam(targetX: number, targetY: number): void {
    const warnGeo = new THREE.CylinderGeometry(3.2, 3.2, 65, 16, 1, true);
    warnGeo.rotateX(Math.PI / 2);
    const warnMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const warnMesh = new THREE.Mesh(warnGeo, warnMat);
    warnMesh.position.set(targetX, targetY, -20);
    this.worldGroup.add(warnMesh);

    const beamGeo = new THREE.CylinderGeometry(2.8, 2.8, 65, 16);
    beamGeo.rotateX(Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfda4af,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.set(targetX, targetY, -20);
    beamMesh.visible = false;
    this.worldGroup.add(beamMesh);

    this.showAlert('PERINGATAN! HINDARI JALUR MERIAM ENERGI MERAH!', 1.6);

    this.dangerZones.push({
      mesh: warnMesh,
      beamMesh,
      x: targetX,
      y: targetY,
      chargeTimer: 1.55,
      activeTimer: 1.15,
      fired: false,
    });
  }

  private updateDangerZones(dt: number): void {
    for (let i = this.dangerZones.length - 1; i >= 0; i--) {
      const dz = this.dangerZones[i];
      if (!dz.fired) {
        dz.chargeTimer -= dt;
        (dz.mesh.material as THREE.MeshBasicMaterial).opacity =
          0.22 + Math.abs(Math.sin(this.elapsedSeconds * 18)) * 0.35;
        if (dz.chargeTimer <= 0) {
          dz.fired = true;
          dz.beamMesh.visible = true;
          soundEngine.playExplosion('large');
          this.cameraShake = 0.65;
        }
      } else {
        dz.activeTimer -= dt;
        const dist = Math.hypot(this.playerPos.x - dz.x, this.playerPos.y - dz.y);
        if (dist < 3.1) {
          this.damagePlayer(46 * dt);
        }
        if (dz.activeTimer <= 0) {
          this.worldGroup.remove(dz.mesh);
          this.worldGroup.remove(dz.beamMesh);
          this.dangerZones.splice(i, 1);
        }
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.worldGroup.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Homing missile steering
      if (p.isMissile && p.homingTarget) {
        let targetWorld: THREE.Vector3 | null = null;
        if ('pos' in p.homingTarget) {
          if (p.homingTarget.hp > 0) targetWorld = p.homingTarget.pos;
        } else if (!p.homingTarget.part.destroyed && p.homingTarget.part.mesh.visible) {
          targetWorld = p.homingTarget.getWorldPos();
        }
        if (targetWorld) {
          const desired = targetWorld.clone().sub(p.pos).normalize().multiplyScalar(82);
          p.vel.lerp(desired, dt * 8.5);
          p.mesh.lookAt(p.pos.clone().add(p.vel));
        }
        // Exhaust smoke puff
        if (Math.random() < 0.65) {
          this.spawnSingleParticle(p.pos, 0xfdba74, 0.25);
        }
      }

      p.pos.addScaledVector(p.vel, dt);
      p.mesh.position.copy(p.pos);

      if (p.isEnemy) {
        // Check hit on Allied Space Station in Level 6
        if (p.targetsStation && this.stationGroup) {
          if (p.pos.distanceTo(this.stationGroup.position) < 5.2) {
            this.stationHp = Math.max(0, this.stationHp - p.damage);
            this.spawnExplosion(p.pos, 0x38bdf8, 8);
            this.worldGroup.remove(p.mesh);
            this.projectiles.splice(i, 1);
            continue;
          }
        }

        // Check hit on Player Aircraft
        if (p.pos.distanceTo(this.playerPos) < p.radius + 1.15) {
          this.damagePlayer(p.damage);
          this.spawnExplosion(p.pos, 0xf43f5e, 6);
          this.worldGroup.remove(p.mesh);
          this.projectiles.splice(i, 1);
          continue;
        }
      } else {
        // Player Projectile Collision vs Enemies, Rocks & Capital Boss Parts!
        let hitSomething = false;

        for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
          const e = this.enemies[ei];
          if (p.pos.distanceTo(e.pos) < p.radius + e.radius) {
            e.hp -= p.damage;
            this.spawnExplosion(p.pos, p.isMissile ? 0xf97316 : 0x38bdf8, p.isMissile ? 16 : 5);
            if (p.isMissile) soundEngine.playExplosion('medium');
            if (e.hp <= 0) {
              this.destroyEnemyAtIndex(ei);
            }
            hitSomething = true;
            break;
          }
        }

        if (!hitSomething) {
          for (let ri = this.rocks.length - 1; ri >= 0; ri--) {
            const r = this.rocks[ri];
            if (p.pos.distanceTo(r.pos) < p.radius + r.radius) {
              r.hp -= p.damage;
              this.spawnExplosion(p.pos, 0xfdba74, 5);
              if (r.hp <= 0) {
                soundEngine.playExplosion('small');
                this.spawnExplosion(r.pos, 0xf97316, 12);
                this.score += 50;
                if (Math.random() < 0.35) this.spawnPickup(r.pos.clone());
                this.worldGroup.remove(r.mesh);
                this.rocks.splice(ri, 1);
              }
              hitSomething = true;
              break;
            }
          }
        }

        if (!hitSomething && this.capitalBoss) {
          for (const part of this.capitalBoss.parts) {
            if (part.destroyed || !part.mesh.visible) continue;
            const wp = new THREE.Vector3();
            part.mesh.getWorldPosition(wp);
            if (p.pos.distanceTo(wp) < p.radius + (part.isCore ? 2.4 : 1.9)) {
              this.damageBossPart(part, p.damage);
              this.spawnExplosion(p.pos, 0xfbbf24, p.isMissile ? 16 : 6);
              hitSomething = true;
              break;
            }
          }
        }

        if (hitSomething) {
          this.worldGroup.remove(p.mesh);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  private damageBossPart(part: BossPartRef, dmg: number): void {
    part.hp = Math.max(0, part.hp - dmg);
    if (part.hp <= 0 && !part.destroyed) {
      part.destroyed = true;
      part.mesh.visible = false;
      const wp = new THREE.Vector3();
      part.mesh.getWorldPosition(wp);
      this.spawnExplosion(wp, 0xf97316, 28);
      soundEngine.playExplosion('large');
      this.cameraShake = 0.75;
      this.score += part.isCore ? 1000 : 300;
      this.creditsEarned += part.isCore ? 250 : 60;
      this.spawnPickup(wp);
      this.showToast(`${part.label} HANCUR!`);
    }
  }

  private destroyEnemyAtIndex(idx: number): void {
    const e = this.enemies[idx];
    this.worldGroup.remove(e.mesh);
    this.enemies.splice(idx, 1);

    this.enemiesDestroyed += 1;
    this.score += e.scoreValue;
    this.creditsEarned += e.type === 'elite' ? 45 : 15;

    const isBig = e.type === 'heavy' || e.type === 'bomber' || e.type === 'elite';
    soundEngine.playExplosion(isBig ? 'medium' : 'small');
    this.spawnExplosion(e.pos, isBig ? 0xf97316 : 0x38bdf8, isBig ? 18 : 11);
    if (isBig) this.cameraShake = Math.max(this.cameraShake, 0.35);

    if (Math.random() < (e.type === 'elite' ? 0.9 : 0.42)) {
      this.spawnPickup(e.pos.clone());
    }
  }

  private updateRocks(dt: number): void {
    // Rock-to-rock collisions in Level 2 Asteroid Field!
    for (let i = 0; i < this.rocks.length; i++) {
      for (let j = i + 1; j < this.rocks.length; j++) {
        const a = this.rocks[i];
        const b = this.rocks[j];
        const dist = a.pos.distanceTo(b.pos);
        if (dist < a.radius + b.radius) {
          const push = a.pos.clone().sub(b.pos).normalize().multiplyScalar(8);
          a.vel.add(push);
          b.vel.sub(push);
          this.spawnSingleParticle(a.pos.clone().lerp(b.pos, 0.5), 0xfdba74, 0.3);
        }
      }
    }

    for (let i = this.rocks.length - 1; i >= 0; i--) {
      const r = this.rocks[i];
      r.pos.addScaledVector(r.vel, dt);
      r.mesh.position.copy(r.pos);
      r.mesh.rotation.x += r.rotVel.x * dt;
      r.mesh.rotation.y += r.rotVel.y * dt;

      if (r.isMeteor && Math.random() < 0.5) {
        this.spawnSingleParticle(r.pos, 0xea580c, 0.28);
      }

      if (r.pos.distanceTo(this.playerPos) < r.radius + 1.25) {
        this.damagePlayer(r.isMeteor ? 28 : 22);
        soundEngine.playExplosion('medium');
        this.spawnExplosion(r.pos, 0xf97316, 15);
        this.worldGroup.remove(r.mesh);
        this.rocks.splice(i, 1);
        continue;
      }

      if (r.pos.z > 18 || Math.abs(r.pos.y) > 34 || Math.abs(r.pos.x) > 46) {
        this.worldGroup.remove(r.mesh);
        this.rocks.splice(i, 1);
      }
    }
  }

  private spawnPickup(origin: THREE.Vector3): void {
    const pool: PowerUpType[] = [
      'coin',
      'coin',
      'energy',
      'health',
      'shield',
      'rapid_fire',
      'double_laser',
      'triple_shot',
      'missile_pack',
      'speed_boost',
      'mega_bomb',
    ];
    const type = pool[Math.floor(Math.random() * pool.length)];
    const mesh = buildPowerUpMesh(type);
    mesh.position.copy(origin);
    this.worldGroup.add(mesh);

    this.pickups.push({
      type,
      mesh,
      pos: origin,
      vel: new THREE.Vector3(0, 0, 15),
      radius: 1.45,
      life: 10,
    });
  }

  private updatePickups(dt: number): void {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.life -= dt;
      p.mesh.rotation.y += dt * 2.8;

      // Gentle magnetic pull when close to player aircraft!
      const dist = p.pos.distanceTo(this.playerPos);
      if (dist < 7.5) {
        const pull = this.playerPos.clone().sub(p.pos).normalize().multiplyScalar(28);
        p.pos.addScaledVector(pull, dt);
      } else {
        p.pos.addScaledVector(p.vel, dt);
      }
      p.mesh.position.copy(p.pos);

      if (dist < p.radius + 1.55) {
        this.applyPowerUp(p.type);
        this.worldGroup.remove(p.mesh);
        this.pickups.splice(i, 1);
        continue;
      }

      if (p.life <= 0 || p.pos.z > 14) {
        this.worldGroup.remove(p.mesh);
        this.pickups.splice(i, 1);
      }
    }
  }

  private applyPowerUp(type: PowerUpType): void {
    this.score += 50;
    soundEngine.playPowerUp(type === 'coin');

    switch (type) {
      case 'coin':
        this.creditsEarned += 35;
        this.showToast('+35 GALAXY KOIN!');
        break;
      case 'energy':
        this.boostEnergy = 100;
        this.shield = Math.min(this.stats.maxShield, this.shield + 20);
        this.showToast('ENERGI & BOOST PENUH!');
        break;
      case 'health':
        this.health = Math.min(this.stats.maxHealth, this.health + 45);
        this.showToast('+45 REPAIR HULL!');
        break;
      case 'shield':
        this.shield = this.stats.maxShield;
        this.buffs.shieldActiveTimer = 5.0;
        this.showToast('OVERCHARGE SHIELD!');
        break;
      case 'rapid_fire':
        this.buffs.rapidFireTimer = 10.0;
        this.showToast('RAPID FIRE AKTIF!');
        break;
      case 'double_laser':
        this.buffs.doubleLaserTimer = 12.0;
        this.showToast('DOUBLE LASER AKTIF!');
        break;
      case 'triple_shot':
        this.buffs.tripleShotTimer = 10.0;
        this.showToast('TRIPLE SHOT PLASMA!');
        break;
      case 'missile_pack':
        this.missiles = Math.min(this.stats.maxMissiles, this.missiles + 3);
        this.showToast('+3 RUDAL PENCARI!');
        break;
      case 'speed_boost':
        this.buffs.speedBoostTimer = 8.0;
        this.boostEnergy = 100;
        this.showToast('HYPER SPEED BOOST!');
        break;
      case 'mega_bomb':
        this.triggerMegaBomb();
        break;
    }
  }

  private damagePlayer(amount: number): void {
    if (this.buffs.shieldActiveTimer > 0) {
      // Active Forcefield blocks hull damage completely!
      this.cameraShake = Math.max(this.cameraShake, 0.14);
      return;
    }

    this.shieldRegenDelay = 3.6;
    this.cameraShake = Math.max(this.cameraShake, 0.38);

    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, amount);
      this.shield -= absorbed;
      const leftover = amount - absorbed;
      if (leftover > 0) this.health = Math.max(0, this.health - leftover);
    } else {
      this.health = Math.max(0, this.health - amount);
    }
  }

  private spawnExplosion(origin: THREE.Vector3, colorHex: number, count = 12): void {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xffffff : colorHex,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position.copy(origin);
      mesh.scale.setScalar(0.8 + Math.random() * 1.3);
      this.worldGroup.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 24,
        (Math.random() - 0.5) * 24,
        (Math.random() - 0.5) * 24
      );
      const life = 0.35 + Math.random() * 0.45;
      this.particles.push({ mesh, vel, life, maxLife: life, shrink: true });
    }
  }

  private spawnSingleParticle(origin: THREE.Vector3, colorHex: number, life = 0.28): void {
    if (this.particles.length > 180) return;
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.75,
    });
    const mesh = new THREE.Mesh(this.particleGeo, mat);
    mesh.position.copy(origin);
    this.worldGroup.add(mesh);
    this.particles.push({
      mesh,
      vel: new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 8),
      life,
      maxLife: life,
      shrink: true,
    });
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.worldGroup.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.mesh.position.addScaledVector(p.vel, dt);
      const ratio = p.life / p.maxLife;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = ratio;
      if (p.shrink) p.mesh.scale.setScalar(Math.max(0.05, ratio * 1.4));
    }
  }

  private checkWinLoseConditions(): void {
    // 1. Defeat conditions
    if (this.health <= 0) {
      this.finishMission(false, 'Pesawat Tempur Hancur dalam Pertempuran!');
      return;
    }

    if (this.currentLevel.mechanic === 'defend_station' && this.stationHp <= 0) {
      this.finishMission(false, 'Stasiun Luar Angkasa Aegis-7 Hancur!');
      return;
    }

    if (
      this.currentLevel.timeLimitSeconds &&
      this.elapsedSeconds >= this.currentLevel.timeLimitSeconds
    ) {
      this.finishMission(false, 'Batas Waktu Misi Habis Sebelum Mencapai Titik Tujuan!');
      return;
    }

    // 2. Victory conditions per level mechanic
    const mech = this.currentLevel.mechanic;

    if (
      mech === 'first_contact' ||
      mech === 'asteroid_field' ||
      mech === 'space_ambush' ||
      mech === 'defend_station' ||
      mech === 'elite_squadron'
    ) {
      if (this.enemiesDestroyed >= (this.currentLevel.targetKills || 10)) {
        this.finishMission(true, 'Seluruh Target Misi Berhasil Dihancurkan!');
      }
    } else if (mech === 'enemy_squadron') {
      if (this.currentWave >= 3 && this.waveSpawnedInCurrent && this.enemies.length === 0) {
        this.finishMission(true, 'Ketiga Gelombang Skuadron Musuh Berhasil Dikalahkan!');
      }
    } else if (mech === 'meteor_storm') {
      if (this.elapsedSeconds >= (this.currentLevel.survivalSeconds || 90)) {
        this.finishMission(true, 'Berhasil Bertahan Melewati Badai Meteor Ekstrem!');
      }
    } else if (mech === 'black_hole_zone') {
      if (this.warpProgress >= 100) {
        this.finishMission(true, 'Berhasil Lolos dari Lubang Hitam & Mencapai Gerbang Warp!');
      }
    } else if (mech === 'mothership_attack' || mech === 'galaxy_final_boss') {
      if (this.capitalBoss) {
        const core = this.capitalBoss.parts.find((p) => p.isCore);
        if (core && core.destroyed) {
          this.finishMission(
            true,
            mech === 'galaxy_final_boss'
              ? 'RAJA ALIEN DIKALAHKAN! GALAKSI KEMBALI DAMAI!'
              : 'Kapal Induk Dreadnought Alien Berhasil Dihancurkan!'
          );
        }
      }
    }
  }

  private finishMission(victory: boolean, reason: string): void {
    if (this.mode === 'ended') return;
    this.mode = 'ended';
    soundEngine.stopEngineHum();

    if (victory) {
      soundEngine.playVictory();
    } else {
      soundEngine.playGameOver();
    }

    const missionBonus = victory ? this.currentLevel.missionBonusScore : 0;
    const rewardCredits = victory
      ? this.currentLevel.rewardCredits + this.creditsEarned
      : Math.round(this.creditsEarned * 0.5);

    this.emitHudSnapshot();

    this.onMissionEnd({
      victory,
      levelId: this.currentLevel.id,
      levelTitle: this.currentLevel.title,
      reason,
      score: this.score,
      missionBonus,
      totalScore: this.score + missionBonus,
      enemiesDestroyed: this.enemiesDestroyed,
      elapsedSeconds: Math.round(this.elapsedSeconds),
      creditsEarned: rewardCredits,
      previousPilotLevel: this.pilotLevel,
      newPilotLevel: this.pilotLevel,
      newlyUnlockedJetName: null,
    });
  }

  private computeProgressAndRemaining(): {
    progress: number;
    remainingSeconds: number | null;
  } {
    const mech = this.currentLevel.mechanic;
    if (mech === 'meteor_storm') {
      const total = this.currentLevel.survivalSeconds || 90;
      return {
        progress: Math.min(100, Math.round((this.elapsedSeconds / total) * 100)),
        remainingSeconds: Math.max(0, Math.ceil(total - this.elapsedSeconds)),
      };
    }
    if (mech === 'black_hole_zone') {
      const limit = this.currentLevel.timeLimitSeconds || 115;
      return {
        progress: Math.round(this.warpProgress),
        remainingSeconds: Math.max(0, Math.ceil(limit - this.elapsedSeconds)),
      };
    }
    if (mech === 'enemy_squadron') {
      const waveBase = (this.currentWave - 1) * 33.3;
      const aliveRatio = Math.max(0, 1 - this.enemies.length / 6) * 33.3;
      return {
        progress: Math.min(100, Math.round(waveBase + aliveRatio)),
        remainingSeconds: null,
      };
    }
    if (mech === 'mothership_attack' || mech === 'galaxy_final_boss') {
      if (!this.capitalBoss) return { progress: 0, remainingSeconds: null };
      const totalHp = this.capitalBoss.parts.reduce((s, p) => s + p.maxHp, 0);
      const curHp = this.capitalBoss.parts.reduce((s, p) => s + p.hp, 0);
      return {
        progress: Math.min(100, Math.round(((totalHp - curHp) / totalHp) * 100)),
        remainingSeconds: null,
      };
    }

    const target = this.currentLevel.targetKills || 10;
    return {
      progress: Math.min(100, Math.round((this.enemiesDestroyed / target) * 100)),
      remainingSeconds: null,
    };
  }

  private emitHudSnapshot(): void {
    const { progress, remainingSeconds } = this.computeProgressAndRemaining();

    let bossName: string | null = null;
    let bossHp: number | null = null;
    let bossMaxHp: number | null = null;
    let bossPhase: number | null = null;
    let bossSubsystemsRemaining: number | null = null;

    if (this.capitalBoss) {
      bossName = this.capitalBoss.isFinalBoss
        ? 'EMPEROR DREADNOUGHT (RAJA ALIEN)'
        : 'ALIEN MOTHERSHIP';
      bossMaxHp = this.capitalBoss.parts.reduce((s, p) => s + p.maxHp, 0);
      bossHp = Math.round(this.capitalBoss.parts.reduce((s, p) => s + p.hp, 0));
      bossPhase = this.capitalBoss.isFinalBoss ? this.capitalBoss.phase : null;
      bossSubsystemsRemaining = this.capitalBoss.isFinalBoss
        ? null
        : this.capitalBoss.parts.filter((p) => !p.isCore && !p.destroyed).length;
    }

    this.onHudUpdate({
      health: Math.round(this.health),
      maxHealth: this.stats.maxHealth,
      shield: Math.round(this.shield),
      maxShield: this.stats.maxShield,
      boostEnergy: Math.round(this.boostEnergy),
      missiles: this.missiles,
      maxMissiles: this.stats.maxMissiles,
      missileCooldown: Number(this.missileCooldown.toFixed(1)),
      shieldCooldown: Number(this.shieldCooldown.toFixed(1)),
      score: this.score,
      creditsEarned: this.creditsEarned,
      enemiesDestroyed: this.enemiesDestroyed,
      levelId: this.currentLevel.id,
      levelTitle: this.currentLevel.title,
      missionObjective: this.currentLevel.missionText,
      progressPercent: progress,
      elapsedSeconds: Math.floor(this.elapsedSeconds),
      remainingSeconds,
      stationHp: this.stationGroup ? Math.round(this.stationHp) : null,
      stationMaxHp: this.stationGroup ? this.stationMaxHp : null,
      blackHolePullWarning: this.blackHolePullWarning,
      bossName,
      bossHp,
      bossMaxHp,
      bossPhase,
      bossSubsystemsRemaining,
      waveCurrent: this.currentLevel.mechanic === 'enemy_squadron' ? this.currentWave : null,
      waveTotal: this.currentLevel.mechanic === 'enemy_squadron' ? 3 : null,
      alertBanner: this.alertBanner,
      pickupToast: this.pickupToast,
      buffs: { ...this.buffs },
      pilotLevel: this.pilotLevel,
      mkTierLabel: this.stats.mkTierLabel,
    });
  }

  public dispose(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.handleResize);
    soundEngine.stopEngineHum();
    soundEngine.setMusicMode('none');
    this.renderer.dispose();
  }
}
