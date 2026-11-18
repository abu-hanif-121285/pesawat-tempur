import * as THREE from 'three';
import { AircraftId } from '../types/game';

export interface BuiltAircraftMesh {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  thrusterFlames: THREE.Mesh[];
  shieldMesh: THREE.Mesh;
  reticleGroup: THREE.Group;
  muzzleOffsets: THREE.Vector3[];
}

const textureCache: Partial<Record<AircraftId, THREE.CanvasTexture>> = {};

function createCamoTexture(id: AircraftId): THREE.CanvasTexture {
  if (textureCache[id]) return textureCache[id]!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  if (id === 'su27') {
    // Iconic Sukhoi Su-27 Sky-Blue / Cyan / Navy Splinter Camouflage
    ctx.fillStyle = '#5ec4f7';
    ctx.fillRect(0, 0, 512, 512);

    const patches = [
      { color: '#1d6fa5', pts: [[0, 40], [180, 10], [230, 130], [70, 170]] },
      { color: '#bae6fd', pts: [[210, 0], [390, 45], [340, 180], [190, 140]] },
      { color: '#0284c7', pts: [[340, 60], [512, 20], [512, 210], [370, 230]] },
      { color: '#1e3a8a', pts: [[40, 210], [220, 175], [275, 310], [90, 340]] },
      { color: '#7dd3fc', pts: [[260, 200], [450, 190], [490, 350], [300, 370]] },
      { color: '#0369a1', pts: [[0, 340], [190, 320], [240, 512], [0, 512]] },
      { color: '#1d4ed8', pts: [[260, 360], [470, 340], [512, 512], [230, 512]] },
    ];
    for (const p of patches) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(p.pts[0][0], p.pts[0][1]);
      for (let i = 1; i < p.pts.length; i++) ctx.lineTo(p.pts[i][0], p.pts[i][1]);
      ctx.closePath();
      ctx.fill();
    }
  } else if (id === 'f22') {
    // F-22 Raptor Stealth Angular Dark Tactical Grey Camo
    ctx.fillStyle = '#525b66';
    ctx.fillRect(0, 0, 512, 512);
    const stealthPolys = [
      { color: '#374151', pts: [[20, 20], [200, 50], [160, 200], [30, 170]] },
      { color: '#6b7280', pts: [[210, 30], [460, 20], [420, 180], [240, 190]] },
      { color: '#272e38', pts: [[60, 220], [280, 190], [310, 360], [90, 380]] },
      { color: '#4b5563', pts: [[300, 210], [500, 200], [480, 460], [290, 430]] },
      { color: '#333b48', pts: [[0, 380], [250, 370], [220, 512], [0, 512]] },
    ];
    for (const p of stealthPolys) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(p.pts[0][0], p.pts[0][1]);
      for (let i = 1; i < p.pts.length; i++) ctx.lineTo(p.pts[i][0], p.pts[i][1]);
      ctx.closePath();
      ctx.fill();
    }
  } else if (id === 'f16') {
    // F-16 Two-Tone Ghost / Gunship Grey Camo
    ctx.fillStyle = '#7c8594';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#555e6d';
    ctx.beginPath();
    ctx.arc(140, 150, 120, 0, Math.PI * 2);
    ctx.arc(380, 290, 140, 0, Math.PI * 2);
    ctx.arc(170, 420, 110, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'typhoon') {
    // Eurofighter Typhoon Clean Satin Air-Superiority Light Grey
    ctx.fillStyle = '#9aa5b4';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#8692a2';
    ctx.fillRect(0, 180, 512, 140);
  } else {
    // Dassault Rafale Deep Slate Charcoal Grey
    ctx.fillStyle = '#4b525e';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#3b424d';
    ctx.fillRect(40, 60, 200, 390);
    ctx.fillRect(290, 90, 180, 320);
  }

  // Subtle metallic panel lines & rivets for realistic 3D detail
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.32)';
  ctx.lineWidth = 2;
  for (let i = 64; i < 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  textureCache[id] = tex;
  return tex;
}

function createExtrudedWing(points: [number, number][], thickness = 0.06): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  // Rotate so X is left-right, Z is front-back, centered vertically in Y
  geo.rotateX(Math.PI / 2);
  geo.translate(0, thickness * 0.5, 0);
  return geo;
}

function createRoundelOrStar(type: 'red_star' | 'roundel_eu' | 'roundel_fr' | 'usaf'): THREE.Mesh {
  const group = new THREE.Mesh();
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  if (type === 'red_star') {
    ctx.translate(64, 64);
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const innerAngle = outerAngle + Math.PI / 5;
      const ox = Math.cos(outerAngle) * 52;
      const oy = Math.sin(outerAngle) * 52;
      const ix = Math.cos(innerAngle) * 21;
      const iy = Math.sin(innerAngle) * 21;
      if (i === 0) ctx.moveTo(ox, oy);
      else ctx.lineTo(ox, oy);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (type === 'roundel_eu' || type === 'roundel_fr') {
    const outer = type === 'roundel_eu' ? '#1d4ed8' : '#ef4444';
    const inner = type === 'roundel_eu' ? '#ef4444' : '#1d4ed8';
    ctx.beginPath();
    ctx.arc(64, 64, 50, 0, Math.PI * 2);
    ctx.fillStyle = outer;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(64, 64, 34, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(64, 64, 18, 0, Math.PI * 2);
    ctx.fillStyle = inner;
    ctx.fill();
  } else {
    // Low-vis tactical star-and-bar
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 5;
    ctx.strokeRect(14, 48, 100, 32);
    ctx.beginPath();
    ctx.arc(64, 64, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#334155';
    ctx.fill();
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.45), mat);
  plane.rotation.x = -Math.PI / 2;
  group.add(plane);
  return group;
}

function createUnderwingMissile(scale = 1): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.5,
    roughness: 0.3,
  });
  const tipMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    metalness: 0.4,
    roughness: 0.3,
  });
  const finMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.7,
    roughness: 0.3,
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.95, 8), bodyMat);
  body.rotation.x = Math.PI / 2;
  g.add(body);

  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 8), tipMat);
  tip.rotation.x = -Math.PI / 2;
  tip.position.z = -0.58;
  g.add(tip);

  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.16), finMat);
  fin.position.z = 0.36;
  g.add(fin);

  g.scale.setScalar(scale);
  return g;
}

/**
 * Builds one of the 5 iconic Fighter Jets oriented facing -Z (away from camera in 3rd-person view).
 */
export function buildFighterAircraft(
  id: AircraftId,
  pilotLevel = 1,
  accentHex = '#38bdf8'
): BuiltAircraftMesh {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const camoTex = createCamoTexture(id);
  const hullMat = new THREE.MeshStandardMaterial({
    map: camoTex,
    metalness: id === 'f22' ? 0.62 : 0.45,
    roughness: id === 'f22' ? 0.32 : 0.42,
  });

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.8,
    roughness: 0.28,
  });

  const radomeMat = new THREE.MeshStandardMaterial({
    color: id === 'su27' ? 0xf8fafc : id === 'typhoon' ? 0xcbd5e1 : 0x334155,
    metalness: 0.35,
    roughness: 0.35,
  });

  // Golden-amber tinted reflective fighter canopy (matches all 5 jets in reference!)
  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: id === 'f22' || id === 'f16' ? 0xf59e0b : 0xd97706,
    emissive: 0x451a03,
    emissiveIntensity: 0.35,
    metalness: 0.85,
    roughness: 0.1,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.9,
  });

  const neonColor = new THREE.Color(accentHex);
  const neonMat = new THREE.MeshBasicMaterial({
    color: neonColor,
  });

  // --- CENTRAL FUSELAGE & NOSE RADOME (-Z is forward) ---
  const fuselageWidth = id === 'f16' ? 0.56 : 0.72;
  const fuselage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.38, 3.1, 12),
    hullMat
  );
  fuselage.rotation.x = Math.PI / 2;
  fuselage.scale.set(fuselageWidth / 0.38, 0.72, 1);
  fuselage.position.set(0, 0, 0.15);
  bodyGroup.add(fuselage);

  // Dorsal spine blending behind cockpit
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 2.2), hullMat);
  spine.position.set(0, 0.16, 0.25);
  bodyGroup.add(spine);

  // Pointed aerodynamic nose cone (-Z tip)
  const noseCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.29, 1.35, id === 'f22' ? 4 : 14),
    radomeMat
  );
  noseCone.rotation.x = -Math.PI / 2;
  if (id === 'f22') noseCone.rotation.z = Math.PI / 4; // Diamond chine stealth nose
  noseCone.scale.set(1.05, 0.78, 1);
  noseCone.position.set(0, -0.02, -2.02);
  bodyGroup.add(noseCone);

  // Dassault Rafale signature nose refueling probe!
  if (id === 'rafale') {
    const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.55, 6), darkMetalMat);
    probe.rotation.x = Math.PI / 2;
    probe.position.set(0.16, 0.08, -2.25);
    bodyGroup.add(probe);
  }

  // --- GOLDEN BUBBLE CANOPY + COCKPIT PILOT ---
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), canopyMat);
  canopy.scale.set(0.78, 0.68, 2.25);
  canopy.position.set(0, 0.24, -0.82);
  bodyGroup.add(canopy);

  // --- AIR INTAKES ---
  if (id === 'f16') {
    // Iconic F-16 single smiling ventral chin scoop intake
    const chinIntake = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 1.15), hullMat);
    chinIntake.position.set(0, -0.24, -0.75);
    bodyGroup.add(chinIntake);
    const intakeMouth = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.1), darkMetalMat);
    intakeMouth.position.set(0, -0.24, -1.33);
    bodyGroup.add(intakeMouth);
  } else if (id === 'typhoon') {
    // Eurofighter Typhoon twin chin rectangular intake
    const chinBox = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.22, 1.25), hullMat);
    chinBox.position.set(0, -0.25, -0.55);
    bodyGroup.add(chinBox);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.08), darkMetalMat);
    mouth.position.set(0, -0.25, -1.18);
    bodyGroup.add(mouth);
  } else {
    // Twin side intakes (F-22, Su-27, Rafale)
    for (const side of [-1, 1]) {
      const intake = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 1.65), hullMat);
      intake.position.set(side * 0.42, -0.08, -0.15);
      intake.rotation.z = side * (id === 'f22' ? -0.22 : 0.08);
      bodyGroup.add(intake);
    }
  }

  // --- MAIN WINGS, CANARDS & STABILIZERS PER JET ---
  let mainWingPtsR: [number, number][] = [];
  if (id === 'f22') {
    // Diamond/trapezoidal Raptor wing
    mainWingPtsR = [
      [0.32, -0.65],
      [2.35, 0.42],
      [2.35, 0.92],
      [0.38, 1.35],
    ];
  } else if (id === 'su27') {
    // Swept Flanker wing with LERX root extension
    mainWingPtsR = [
      [0.28, -1.05],
      [0.65, -0.35],
      [2.45, 0.65],
      [2.45, 1.08],
      [0.36, 1.25],
    ];
  } else if (id === 'typhoon') {
    // Pure sharp Delta wing
    mainWingPtsR = [
      [0.3, -0.55],
      [2.32, 1.15],
      [2.32, 1.48],
      [0.32, 1.48],
    ];
  } else if (id === 'rafale') {
    // Sleek cropped Delta wing
    mainWingPtsR = [
      [0.3, -0.45],
      [2.22, 0.98],
      [2.22, 1.38],
      [0.32, 1.42],
    ];
  } else {
    // F-16 cropped delta wing
    mainWingPtsR = [
      [0.25, -0.48],
      [2.08, 0.48],
      [2.08, 0.92],
      [0.26, 1.02],
    ];
  }

  const mainWingPtsL: [number, number][] = mainWingPtsR.map(([x, z]) => [-x, z]);
  const wingR = new THREE.Mesh(createExtrudedWing(mainWingPtsR, 0.055), hullMat);
  const wingL = new THREE.Mesh(createExtrudedWing(mainWingPtsL, 0.055), hullMat);
  bodyGroup.add(wingR, wingL);

  // Forward Canards for Eurofighter Typhoon & Dassault Rafale!
  if (id === 'typhoon' || id === 'rafale') {
    const canardZ = id === 'typhoon' ? -1.38 : -0.78;
    const canardR = new THREE.Mesh(
      createExtrudedWing(
        [
          [0.24, canardZ - 0.25],
          [0.92, canardZ + 0.18],
          [0.92, canardZ + 0.34],
          [0.24, canardZ + 0.28],
        ],
        0.035
      ),
      hullMat
    );
    const canardL = new THREE.Mesh(
      createExtrudedWing(
        [
          [-0.24, canardZ - 0.25],
          [-0.92, canardZ + 0.18],
          [-0.92, canardZ + 0.34],
          [-0.24, canardZ + 0.28],
        ],
        0.035
      ),
      hullMat
    );
    canardR.position.y = 0.08;
    canardL.position.y = 0.08;
    bodyGroup.add(canardR, canardL);
  }

  // Horizontal Tailplanes for F-22, Su-27, and F-16
  if (id === 'f22' || id === 'su27' || id === 'f16') {
    const tailSpan = id === 'f16' ? 1.18 : 1.42;
    const hStabR = new THREE.Mesh(
      createExtrudedWing(
        [
          [0.28, 1.15],
          [tailSpan, 1.58],
          [tailSpan, 1.92],
          [0.28, 1.88],
        ],
        0.04
      ),
      hullMat
    );
    const hStabL = new THREE.Mesh(
      createExtrudedWing(
        [
          [-0.28, 1.15],
          [-tailSpan, 1.58],
          [-tailSpan, 1.92],
          [-0.28, 1.88],
        ],
        0.04
      ),
      hullMat
    );
    bodyGroup.add(hStabR, hStabL);
  }

  // --- VERTICAL TAIL FINS ---
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(0.85, 0);
  finShape.lineTo(0.45, 0.92);
  finShape.lineTo(0.12, 0.92);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.045, bevelEnabled: false });
  finGeo.rotateY(Math.PI / 2);

  if (id === 'f22' || id === 'su27') {
    // Twin vertical stabilizers (canted outward V-tail on F-22, upright twin tails on Su-27)
    for (const side of [-1, 1]) {
      const vFin = new THREE.Mesh(finGeo, hullMat);
      vFin.position.set(side * 0.42, 0.14, 0.92);
      vFin.rotation.z = side * (id === 'f22' ? -0.46 : -0.08);
      bodyGroup.add(vFin);
    }
  } else {
    // Single central tall vertical fin (F-16, Typhoon, Rafale)
    const vFin = new THREE.Mesh(finGeo, hullMat);
    vFin.scale.set(1, 1.16, 1.1);
    vFin.position.set(-0.02, 0.16, 0.85);
    bodyGroup.add(vFin);
  }

  // --- WING INSIGNIA ROUNDELS / RED STARS ---
  const insigniaType =
    id === 'su27'
      ? 'red_star'
      : id === 'typhoon'
      ? 'roundel_eu'
      : id === 'rafale'
      ? 'roundel_fr'
      : 'usaf';

  for (const side of [-1, 1]) {
    const decal = createRoundelOrStar(insigniaType);
    decal.position.set(side * 1.48, 0.07, id === 'typhoon' || id === 'rafale' ? 0.95 : 0.65);
    bodyGroup.add(decal);
  }

  // --- WINGTIP & UNDERWING ORDNANCE (MISSILES + F-16 DROP TANK) ---
  const tipX = id === 'f16' ? 2.1 : id === 'su27' ? 2.46 : 2.28;
  const tipZ = id === 'typhoon' || id === 'rafale' ? 1.15 : 0.72;
  for (const side of [-1, 1]) {
    if (id !== 'f22') {
      // External wingtip missiles (F-22 carries internal stealth weapons + sleek glowing wingtips)
      const tipMissile = createUnderwingMissile(0.75);
      tipMissile.position.set(side * tipX, 0.02, tipZ);
      bodyGroup.add(tipMissile);
    }

    const underMissile = createUnderwingMissile(0.82);
    underMissile.position.set(side * 1.15, -0.11, 0.55);
    bodyGroup.add(underMissile);
  }

  if (id === 'f16') {
    // Signature F-16 centerline belly fuel pod
    const bellyPod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.07, 1.35, 10),
      hullMat
    );
    bellyPod.rotation.x = Math.PI / 2;
    bellyPod.position.set(0, -0.26, 0.35);
    bodyGroup.add(bellyPod);
  }

  // --- EXHAUST NOZZLES & ANIMATED AFTERBURNER PLUMES ---
  const thrusterFlames: THREE.Mesh[] = [];
  const engineOffsetsX = id === 'f16' ? [0] : id === 'typhoon' || id === 'rafale' ? [-0.2, 0.2] : [-0.3, 0.3];

  const outerFlameMat = new THREE.MeshBasicMaterial({
    color: id === 'f22' ? 0xf97316 : 0x38bdf8,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const innerCoreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  for (const ex of engineOffsetsX) {
    const nozzleGeo =
      id === 'f22'
        ? new THREE.BoxGeometry(0.28, 0.16, 0.36)
        : new THREE.CylinderGeometry(0.16, 0.2, 0.38, 12);
    const nozzle = new THREE.Mesh(nozzleGeo, darkMetalMat);
    if (id !== 'f22') nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(ex, -0.02, 1.82);
    bodyGroup.add(nozzle);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.15, 12), outerFlameMat);
    flame.rotation.x = Math.PI / 2;
    flame.position.set(ex, -0.02, 2.48);

    const core = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.65, 8), innerCoreMat);
    core.position.y = -0.18;
    flame.add(core);

    bodyGroup.add(flame);
    thrusterFlames.push(flame);
  }

  // --- PILOT LEVEL-UP SCI-FI EVOLUTION TRIM ---
  // As the player levels up, glowing sci-fi plasma conduits activate on the aircraft!
  if (pilotLevel >= 2) {
    for (const side of [-1, 1]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.95), neonMat);
      strip.position.set(side * (tipX - 0.05), 0.05, tipZ - 0.1);
      bodyGroup.add(strip);
    }
  }
  if (pilotLevel >= 5) {
    for (const side of [-1, 1]) {
      const dorsalGlow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.6), neonMat);
      dorsalGlow.position.set(side * 0.2, 0.28, 0.25);
      bodyGroup.add(dorsalGlow);
    }
  }

  // --- ENERGY SHIELD FORCEFIELD SPHERE ---
  const shieldGeo = new THREE.IcosahedronGeometry(2.65, 2);
  const shieldMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  root.add(shieldMesh);

  // --- 3D HOLOGRAPHIC TARGETING RETICLE ---
  const reticleGroup = new THREE.Group();
  const outerReticle = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 0.98, 24),
    new THREE.MeshBasicMaterial({
      color: neonColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    })
  );
  const innerDot = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.22, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })
  );
  reticleGroup.add(outerReticle, innerDot);
  reticleGroup.position.set(0, 0, -24);
  root.add(reticleGroup);

  const muzzleOffsets = [
    new THREE.Vector3(0, -0.05, -2.5),
    new THREE.Vector3(-0.85, -0.04, -0.6),
    new THREE.Vector3(0.85, -0.04, -0.6),
  ];

  return {
    root,
    bodyGroup,
    thrusterFlames,
    shieldMesh,
    reticleGroup,
    muzzleOffsets,
  };
}
