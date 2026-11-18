import * as THREE from 'three';
import { EnemyType, LevelConfig, PowerUpType } from '../types/game';

export interface BossPartRef {
  id: string;
  label: string;
  mesh: THREE.Group;
  localOffset: THREE.Vector3;
  hp: number;
  maxHp: number;
  destroyed: boolean;
  isCore?: boolean;
}

export function buildEnemyMesh(type: EnemyType): THREE.Group {
  const group = new THREE.Group();

  const hullDark = new THREE.MeshStandardMaterial({
    color: 0x1e1b2e,
    metalness: 0.75,
    roughness: 0.3,
  });

  if (type === 'scout') {
    const crimson = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      metalness: 0.6,
      roughness: 0.35,
    });
    const core = new THREE.MeshBasicMaterial({ color: 0x4ade80 });

    const body = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.1, 6), crimson);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    const wings = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 0.85), hullDark);
    wings.position.z = -0.2;
    group.add(wings);

    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), core);
    cockpit.position.set(0, 0.16, 0.25);
    group.add(cockpit);
  } else if (type === 'heavy') {
    const armor = new THREE.MeshStandardMaterial({
      color: 0x9a3412,
      metalness: 0.7,
      roughness: 0.35,
    });
    const glow = new THREE.MeshBasicMaterial({ color: 0xfb923c });

    for (const side of [-1, 1]) {
      const pod = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 2.9), armor);
      pod.position.x = side * 0.9;
      group.add(pod);

      const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.3, 8), hullDark);
      cannon.rotation.x = Math.PI / 2;
      cannon.position.set(side * 0.9, -0.1, 1.65);
      group.add(cannon);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 1.6), hullDark);
    group.add(bridge);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 12), glow);
    eye.position.set(0, 0.1, 0.75);
    group.add(eye);
  } else if (type === 'interceptor') {
    const purpleMat = new THREE.MeshStandardMaterial({
      color: 0x7e22ce,
      metalness: 0.75,
      roughness: 0.25,
    });
    const neon = new THREE.MeshBasicMaterial({ color: 0xe879f9 });

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.4, 5), purpleMat);
    nose.rotation.x = Math.PI / 2;
    group.add(nose);

    for (const side of [-1, 1]) {
      const scythe = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.5), hullDark);
      scythe.position.set(side * 1.05, 0, 0.35);
      scythe.rotation.y = side * -0.45;
      group.add(scythe);

      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.2), neon);
      tip.position.set(side * 1.7, 0, 0.65);
      group.add(tip);
    }
  } else if (type === 'bomber') {
    const olive = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      metalness: 0.6,
      roughness: 0.4,
    });
    const bombGlow = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    const wingHull = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.42, 1.6), olive);
    group.add(wingHull);

    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.55, 10), hullDark);
    dome.position.y = 0.35;
    group.add(dome);

    for (const bx of [-1.2, 0, 1.2]) {
      const pod = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), bombGlow);
      pod.position.set(bx, -0.32, 0.3);
      group.add(pod);
    }
  } else if (type === 'stealth') {
    const cloakMat = new THREE.MeshPhysicalMaterial({
      color: 0x312e81,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.45,
      metalness: 0.85,
      roughness: 0.15,
      transparent: true,
      opacity: 0.78,
    });

    const delta = new THREE.Mesh(new THREE.ConeGeometry(1.55, 2.3, 3), cloakMat);
    delta.rotation.x = Math.PI / 2;
    delta.scale.set(1.2, 0.25, 1);
    group.add(delta);
  } else if (type === 'drone') {
    const cyan = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const sphere = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), hullDark);
    group.add(sphere);

    const core = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), cyan);
    group.add(core);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.06, 6, 16), cyan);
    group.add(ring);
  } else if (type === 'elite') {
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.88,
      roughness: 0.18,
    });
    const crimson = new THREE.MeshStandardMaterial({
      color: 0xbe123c,
      metalness: 0.7,
      roughness: 0.25,
    });
    const core = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    const body = new THREE.Mesh(new THREE.ConeGeometry(0.62, 3.2, 8), crimson);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    // X-form quad royal wings
    for (const angle of [0.45, -0.45, Math.PI - 0.45, Math.PI + 0.45]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.65), goldMat);
      w.position.set(Math.cos(angle) * 1.1, Math.sin(angle) * 0.6, -0.2);
      w.rotation.z = angle;
      group.add(w);
    }

    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.07, 8, 24), core);
    halo.position.z = -0.5;
    group.add(halo);
  }

  return group;
}

/**
 * Builds Level 9 Alien Mothership OR Level 10 Emperor Dreadnought Boss with targetable sub-parts!
 */
export function buildCapitalBoss(isFinalBoss: boolean): {
  root: THREE.Group;
  parts: BossPartRef[];
  shieldDome: THREE.Mesh;
} {
  const root = new THREE.Group();
  const parts: BossPartRef[] = [];

  const hullMat = new THREE.MeshStandardMaterial({
    color: isFinalBoss ? 0x2a0a18 : 0x111827,
    metalness: 0.8,
    roughness: 0.28,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: isFinalBoss ? 0xdc2626 : 0x0d9488,
    metalness: 0.75,
    roughness: 0.22,
  });

  // Colossal Capital Superstructure
  const mainHull = new THREE.Mesh(
    new THREE.BoxGeometry(isFinalBoss ? 14 : 12, 2.6, 5.5),
    hullMat
  );
  root.add(mainHull);

  const upperCitadel = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 4.2, 6),
    trimMat
  );
  upperCitadel.position.set(0, 2.2, -0.4);
  root.add(upperCitadel);

  for (const side of [-1, 1]) {
    const wingBlade = new THREE.Mesh(
      new THREE.BoxGeometry(6.5, 0.8, 3.6),
      trimMat
    );
    wingBlade.position.set(side * 8.2, 0, 0.6);
    wingBlade.rotation.z = side * -0.18;
    wingBlade.rotation.y = side * 0.22;
    root.add(wingBlade);
  }

  const shieldDome = new THREE.Mesh(
    new THREE.SphereGeometry(isFinalBoss ? 9.5 : 8.5, 20, 16),
    new THREE.MeshBasicMaterial({
      color: isFinalBoss ? 0xf43f5e : 0x2dd4bf,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  root.add(shieldDome);

  const makePart = (
    id: string,
    label: string,
    offset: THREE.Vector3,
    color: number,
    hp: number,
    radius = 1.05,
    isCore = false
  ) => {
    const g = new THREE.Group();
    g.position.copy(offset);

    const crystal = new THREE.Mesh(
      isCore
        ? new THREE.OctahedronGeometry(radius * 1.25, 1)
        : new THREE.IcosahedronGeometry(radius, 0),
      new THREE.MeshBasicMaterial({ color })
    );
    g.add(crystal);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.35, 0.1, 8, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    g.add(ring);

    root.add(g);
    parts.push({
      id,
      label,
      mesh: g,
      localOffset: offset.clone(),
      hp,
      maxHp: hp,
      destroyed: false,
      isCore,
    });
  };

  if (!isFinalBoss) {
    // LEVEL 9 MOTHERSHIP: 2 Turrets, 1 Shield Generator, 2 Engines, then Central Core!
    makePart('turret_l', 'Meriam Kiri', new THREE.Vector3(-6.2, -0.4, 2.4), 0xf97316, 260, 0.95);
    makePart('turret_r', 'Meriam Kanan', new THREE.Vector3(6.2, -0.4, 2.4), 0xf97316, 260, 0.95);
    makePart('shield_gen', 'Generator Pelindung', new THREE.Vector3(0, 3.1, 1.2), 0x38bdf8, 320, 1.05);
    makePart('engine_l', 'Mesin Kiri', new THREE.Vector3(-4.0, -1.3, 2.2), 0xa855f7, 250, 0.9);
    makePart('engine_r', 'Mesin Kanan', new THREE.Vector3(4.0, -1.3, 2.2), 0xa855f7, 250, 0.9);
    makePart('core', 'INTI KAPAL INDUK', new THREE.Vector3(0, 0.2, 2.8), 0xef4444, 650, 1.35, true);
  } else {
    // LEVEL 10 GALAXY FINAL BOSS: Weak points unlocked across 3 phases + Emperor Singularity Core!
    makePart('weak_l', 'Titik Lemah Sayap Kiri', new THREE.Vector3(-7.4, 0.2, 2.2), 0xfbbf24, 420, 1.1);
    makePart('weak_r', 'Titik Lemah Sayap Kanan', new THREE.Vector3(7.4, 0.2, 2.2), 0xfbbf24, 420, 1.1);
    makePart('weak_crown', 'Matriks Mahkota Raja', new THREE.Vector3(0, 3.2, 1.5), 0xc084fc, 560, 1.2);
    makePart('weak_heart', 'INTI RAJA ALIEN', new THREE.Vector3(0, 0.1, 3.0), 0xf43f5e, 900, 1.5, true);
  }

  return { root, parts, shieldDome };
}

export function buildAsteroidMesh(radius = 1.6, fieryMeteor = false): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.DodecahedronGeometry(radius, 1);
  // Perturb vertices slightly for organic rocky look
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const n = 0.82 + 0.34 * Math.abs(Math.sin(vx * 3.1 + vy * 2.3 + vz * 4.7));
    pos.setXYZ(i, vx * n, vy * n, vz * n);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: fieryMeteor ? 0x7c2d12 : 0x64748b,
    emissive: fieryMeteor ? 0xea580c : 0x0f172a,
    emissiveIntensity: fieryMeteor ? 0.85 : 0.1,
    roughness: 0.85,
    metalness: 0.2,
  });

  const rock = new THREE.Mesh(geo, mat);
  group.add(rock);

  if (fieryMeteor) {
    const aura = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.22, 10, 10),
      new THREE.MeshBasicMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    group.add(aura);
  }

  return group;
}

export function buildSpaceStation(): THREE.Group {
  const station = new THREE.Group();

  const metal = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.75,
    roughness: 0.28,
  });
  const blueGlow = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  const ring = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.55, 12, 36), metal);
  ring.rotation.x = Math.PI / 2.3;
  station.add(ring);

  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.28, 10, 28), blueGlow);
  innerRing.rotation.x = Math.PI / 2.3;
  station.add(innerRing);

  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 7.5, 12), metal);
  station.add(spire);

  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.25, 0.35), metal);
    spoke.rotation.y = (i * Math.PI) / 2;
    station.add(spoke);
  }

  return station;
}

export function buildBlackHoleAndGate(): {
  blackHole: THREE.Group;
  warpGate: THREE.Group;
} {
  const blackHole = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(3.4, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  blackHole.add(core);

  const disk1 = new THREE.Mesh(
    new THREE.TorusGeometry(6.2, 1.1, 10, 48),
    new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  disk1.rotation.x = 1.15;
  blackHole.add(disk1);

  const disk2 = new THREE.Mesh(
    new THREE.TorusGeometry(4.6, 0.65, 10, 48),
    new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  disk2.rotation.x = 1.15;
  blackHole.add(disk2);

  // Quantum Extraction Warp Gate (Destination Goal)
  const warpGate = new THREE.Group();
  const gateRing = new THREE.Mesh(
    new THREE.TorusGeometry(7.5, 0.55, 12, 40),
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.6,
      metalness: 0.8,
      roughness: 0.2,
    })
  );
  warpGate.add(gateRing);

  const portalPlane = new THREE.Mesh(
    new THREE.CircleGeometry(7.1, 32),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  warpGate.add(portalPlane);

  return { blackHole, warpGate };
}

export function buildPowerUpMesh(type: PowerUpType): THREE.Group {
  const g = new THREE.Group();
  const colorMap: Record<PowerUpType, number> = {
    health: 0x22c55e,
    shield: 0x38bdf8,
    rapid_fire: 0xfacc15,
    double_laser: 0x60a5fa,
    triple_shot: 0xe879f9,
    missile_pack: 0xf43f5e,
    speed_boost: 0xf97316,
    mega_bomb: 0xa855f7,
    coin: 0xfbbf24,
    energy: 0x2dd4bf,
  };

  const color = colorMap[type];
  const mat = new THREE.MeshBasicMaterial({ color });

  if (type === 'coin') {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.14, 16), mat);
    disc.rotation.x = Math.PI / 2;
    g.add(disc);
    return g;
  }

  if (type === 'health') {
    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.3, 0.3), mat);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.95, 0.3), mat);
    g.add(bar1, bar2);
  } else {
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 0), mat);
    g.add(gem);
  }

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.06, 8, 20),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
    })
  );
  g.add(ring);

  return g;
}

export function buildGalaxyBackdrop(theme: LevelConfig['theme']): {
  group: THREE.Group;
  starPoints: THREE.Points;
  speedLines: THREE.LineSegments;
  planetGroup: THREE.Group;
} {
  const group = new THREE.Group();

  // 1. Dense 3D Starfield
  const starCount = 1400;
  const starPos = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const c1 = new THREE.Color(theme.nebulaPrimary);
  const c2 = new THREE.Color('#ffffff');

  for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 240;
    starPos[i * 3 + 1] = (Math.random() - 0.5) * 160;
    starPos[i * 3 + 2] = -Math.random() * 260 + 20;

    const mix = Math.random() > 0.75 ? c1 : c2;
    starColors[i * 3] = mix.r;
    starColors[i * 3 + 1] = mix.g;
    starColors[i * 3 + 2] = mix.b;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  const starMat = new THREE.PointsMaterial({
    size: 0.55,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
  });
  const starPoints = new THREE.Points(starGeo, starMat);
  group.add(starPoints);

  // 2. Speed-streak lines (visible & elongated when accelerating / boosting!)
  const lineCount = 120;
  const linePos = new Float32Array(lineCount * 6);
  for (let i = 0; i < lineCount; i++) {
    const lx = (Math.random() - 0.5) * 90;
    const ly = (Math.random() - 0.5) * 60;
    const lz = -Math.random() * 180;
    linePos[i * 6] = lx;
    linePos[i * 6 + 1] = ly;
    linePos[i * 6 + 2] = lz;
    linePos[i * 6 + 3] = lx;
    linePos[i * 6 + 4] = ly;
    linePos[i * 6 + 5] = lz + 6.5;
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
  });
  const speedLines = new THREE.LineSegments(lineGeo, lineMat);
  group.add(speedLines);

  // 3. Distant 3D Planet + Rings + Moon
  const planetGroup = new THREE.Group();
  planetGroup.position.set(-34, 18, -155);

  const planetMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(theme.planetColor),
    roughness: 0.65,
    metalness: 0.15,
  });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(18, 32, 24), planetMat);
  planetGroup.add(planet);

  if (theme.planetRing) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(23, 34, 48),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(theme.nebulaPrimary),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.38,
      })
    );
    ring.rotation.x = 1.25;
    ring.rotation.y = 0.3;
    planetGroup.add(ring);
  }

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 })
  );
  moon.position.set(28, -9, 12);
  planetGroup.add(moon);

  group.add(planetGroup);

  // 4. Soft Volumetric-style Nebula Glow Sprites
  const nebCanvas = document.createElement('canvas');
  nebCanvas.width = 128;
  nebCanvas.height = 128;
  const nctx = nebCanvas.getContext('2d')!;
  const grad = nctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.45)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.16)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  nctx.fillStyle = grad;
  nctx.fillRect(0, 0, 128, 128);
  const nebTex = new THREE.CanvasTexture(nebCanvas);

  const colors = [theme.nebulaPrimary, theme.nebulaSecondary, theme.nebulaPrimary];
  colors.forEach((hex, idx) => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: nebTex,
        color: new THREE.Color(hex),
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    sprite.position.set((idx - 1) * 55, idx === 1 ? -18 : 22, -180 - idx * 15);
    sprite.scale.set(135, 95, 1);
    group.add(sprite);
  });

  return { group, starPoints, speedLines, planetGroup };
}
