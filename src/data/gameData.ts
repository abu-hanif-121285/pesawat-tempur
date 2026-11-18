import {
  AircraftId,
  AircraftSpec,
  EffectiveStats,
  LevelConfig,
  SaveGameData,
  UpgradeLevels,
} from '../types/game';

export const STORAGE_KEY = 'space_fighter_galaxy_war_save_v1';

export const AIRCRAFT_LIST: AircraftSpec[] = [
  {
    id: 'f16',
    name: 'F-16 FIGHTING FALCON',
    role: 'MULTI-ROLE FIGHTER',
    codename: 'VIPER-X16',
    description:
      'Pesawat tempur serbaguna legendaris dengan kanopi gelembung emas, air-intake tunggal di bawah hidung, manuver super lincah, dan kanon plasma reaktif.',
    unlockCost: 0,
    unlockAtLevel: 1,
    baseStats: {
      maxHealth: 130,
      maxShield: 85,
      laserDamage: 18,
      fireRate: 6.2,
      speed: 28,
      agility: 92,
      maxMissiles: 6,
    },
    laserColor: '#38bdf8',
    accentColor: '#0ea5e9',
    badgeColor: 'from-sky-500 to-blue-700',
    specialTrait: 'Agile Frame — Respons belok tinggi & pengisian boost cepat',
  },
  {
    id: 'typhoon',
    name: 'EUROFIGHTER TYPHOON',
    role: 'MULTI-ROLE FIGHTER',
    codename: 'STORM-EF2000',
    description:
      'Pesawat sayap delta dengan canard depan presisi tinggi dan mesin kembar plasma. Unggul dalam kecepatan tembak laser beruntun jarak jauh.',
    unlockCost: 650,
    unlockAtLevel: 3,
    baseStats: {
      maxHealth: 145,
      maxShield: 100,
      laserDamage: 20,
      fireRate: 7.4,
      speed: 30,
      agility: 90,
      maxMissiles: 7,
    },
    laserColor: '#22d3ee',
    accentColor: '#06b6d4',
    badgeColor: 'from-cyan-500 to-blue-600',
    specialTrait: 'Twin-Linked Pulse — Kecepatan tembak laser sangat tinggi',
  },
  {
    id: 'rafale',
    name: 'DASSAULT RAFALE',
    role: 'MULTI-ROLE FIGHTER',
    codename: 'OMNI-RF04',
    description:
      'Pesawat tempur delta-canard siluman berlapis titanium gelap dengan probe sensor depan dan generator pelindung Spectra berkapasitas besar.',
    unlockCost: 1200,
    unlockAtLevel: 5,
    baseStats: {
      maxHealth: 160,
      maxShield: 130,
      laserDamage: 23,
      fireRate: 6.8,
      speed: 31,
      agility: 94,
      maxMissiles: 8,
    },
    laserColor: '#60a5fa',
    accentColor: '#3b82f6',
    badgeColor: 'from-indigo-500 to-sky-600',
    specialTrait: 'Spectra Barrier — Kapasitas & regenerasi Energy Shield ekstra',
  },
  {
    id: 'su27',
    name: 'SUKHOI SU-27',
    role: 'AIR SUPERIORITY',
    codename: 'FLANKER-COSMOS',
    description:
      'Pesawat superioritas ruang angkasa berkamuflase biru splinter khas Flanker dengan sirip ekor kembar, lambung baja berat, dan gudang rudal besar.',
    unlockCost: 1900,
    unlockAtLevel: 7,
    baseStats: {
      maxHealth: 195,
      maxShield: 125,
      laserDamage: 27,
      fireRate: 6.5,
      speed: 32,
      agility: 88,
      maxMissiles: 10,
    },
    laserColor: '#fb923c',
    accentColor: '#38bdf8',
    badgeColor: 'from-sky-400 to-indigo-700',
    specialTrait: 'Heavy Ordnance — Daya tahan tinggi & kapasitas rudal masif',
  },
  {
    id: 'f22',
    name: 'F-22 RAPTOR',
    role: 'STEALTH FIGHTER',
    codename: 'APEX-RAPTOR',
    description:
      'Puncak teknologi pesawat tempur siluman galaksi dengan ekor kembar miring (V-Tail), kanopi emas reflektif, afterburner vektor kembar, dan daya hancur maksimum.',
    unlockCost: 2800,
    unlockAtLevel: 9,
    baseStats: {
      maxHealth: 210,
      maxShield: 155,
      laserDamage: 32,
      fireRate: 8.0,
      speed: 35,
      agility: 98,
      maxMissiles: 12,
    },
    laserColor: '#f43f5e',
    accentColor: '#f59e0b',
    badgeColor: 'from-amber-500 to-rose-600',
    specialTrait: 'Raptor Overdrive — Tembakan Plasma Ganda Bawaan & Kecepatan Puncak',
  },
];

export const getAircraftById = (id: AircraftId): AircraftSpec =>
  AIRCRAFT_LIST.find((a) => a.id === id) || AIRCRAFT_LIST[0];

export const UPGRADE_BASE_COSTS: Record<keyof UpgradeLevels, number> = {
  laser: 200,
  thruster: 180,
  hull: 180,
  shield: 190,
  missile: 220,
};

export const getUpgradeCost = (key: keyof UpgradeLevels, currentTier: number): number => {
  return Math.round(UPGRADE_BASE_COSTS[key] * Math.pow(1.55, currentTier - 1));
};

/**
 * Computes effective combat stats combining:
 * 1. Selected Aircraft base stats
 * 2. Automatic Pilot/Campaign Level scaling ("jika naik level maka pesawat juga meningkat kemampuannya")
 * 3. Hangar Workshop upgrades
 */
export function computeEffectiveAircraftStats(
  aircraft: AircraftSpec,
  pilotLevel: number,
  upgrades: UpgradeLevels
): EffectiveStats {
  const lvlFactor = Math.max(0, pilotLevel - 1);
  // Every level up increases overall combat power automatically!
  const autoLevelBonusPct = lvlFactor * 10; // +10% per pilot level

  const maxHealth = Math.round(
    aircraft.baseStats.maxHealth * (1 + lvlFactor * 0.09) + (upgrades.hull - 1) * 28
  );
  const maxShield = Math.round(
    aircraft.baseStats.maxShield * (1 + lvlFactor * 0.09) + (upgrades.shield - 1) * 24
  );
  const laserDamage = Math.round(
    aircraft.baseStats.laserDamage * (1 + lvlFactor * 0.1) + (upgrades.laser - 1) * 6
  );
  const fireRate = Number(
    (
      aircraft.baseStats.fireRate * (1 + lvlFactor * 0.04) +
      (upgrades.laser - 1) * 0.55
    ).toFixed(1)
  );
  const speed = Number(
    (
      aircraft.baseStats.speed * (1 + lvlFactor * 0.035) +
      (upgrades.thruster - 1) * 2.4
    ).toFixed(1)
  );
  const agility = Math.min(
    100,
    Math.round(aircraft.baseStats.agility + lvlFactor * 0.8 + (upgrades.thruster - 1) * 2)
  );
  const maxMissiles =
    aircraft.baseStats.maxMissiles +
    Math.floor(lvlFactor / 3) +
    (upgrades.missile - 1) * 2;

  // Automatic weapon evolution as aircraft levels up!
  let baseBarrelCount = aircraft.id === 'f22' ? 2 : 1;
  if (pilotLevel >= 4 || upgrades.laser >= 3) {
    baseBarrelCount = Math.max(baseBarrelCount, 2);
  }
  if (pilotLevel >= 8 && (aircraft.id === 'f22' || aircraft.id === 'su27' || upgrades.laser >= 5)) {
    baseBarrelCount = 3;
  }

  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const mkTierLabel = `MK-${romanNumerals[Math.min(pilotLevel - 1, romanNumerals.length - 1)]}`;

  return {
    maxHealth,
    maxShield,
    laserDamage,
    fireRate,
    speed,
    agility,
    maxMissiles,
    pilotLevel,
    mkTierLabel,
    autoLevelBonusPct,
    baseBarrelCount,
  };
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    code: 'SECTOR 01',
    title: 'FIRST CONTACT',
    subtitle: 'Kontak Pertama Armada Alien',
    missionText: 'Menghancurkan 10 pesawat alien kecil (Scout & Drone).',
    challengeText: 'Kuasai kendali joystick analog 360° dan tembakan laser presisi.',
    mechanic: 'first_contact',
    targetKills: 10,
    rewardCredits: 300,
    missionBonusScore: 500,
    theme: {
      skyColor: '#030712',
      nebulaPrimary: '#0284c7',
      nebulaSecondary: '#4f46e5',
      planetColor: '#2563eb',
      planetRing: true,
    },
  },
  {
    id: 2,
    code: 'SECTOR 02',
    title: 'ASTEROID FIELD',
    subtitle: 'Sabuk Asteroid Berbahaya',
    missionText: 'Melewati kawasan asteroid dan menghancurkan 15 musuh.',
    challengeText: 'Hindari atau hancurkan bongkahan asteroid raksasa yang bergerak & bertabrakan.',
    mechanic: 'asteroid_field',
    targetKills: 15,
    rewardCredits: 420,
    missionBonusScore: 750,
    theme: {
      skyColor: '#090d16',
      nebulaPrimary: '#d97706',
      nebulaSecondary: '#0ea5e9',
      planetColor: '#b45309',
      planetRing: true,
    },
  },
  {
    id: 3,
    code: 'SECTOR 03',
    title: 'ENEMY SQUADRON',
    subtitle: 'Serangan Tiga Gelombang Skuadron',
    missionText: 'Mengalahkan 3 gelombang formasi pesawat tempur musuh.',
    challengeText: 'Skuadron musuh menyerang terkoordinasi dari atas, kiri, kanan, dan diagonal.',
    mechanic: 'enemy_squadron',
    waveCount: 3,
    targetKills: 18,
    rewardCredits: 550,
    missionBonusScore: 1000,
    theme: {
      skyColor: '#0c0617',
      nebulaPrimary: '#9333ea',
      nebulaSecondary: '#e11d48',
      planetColor: '#7e22ce',
      planetRing: false,
    },
  },
  {
    id: 4,
    code: 'SECTOR 04',
    title: 'METEOR STORM',
    subtitle: 'Badai Meteor Berkecepatan Tinggi',
    missionText: 'Bertahan hidup selama 90 detik di tengah hujan meteor membara.',
    challengeText: 'Meteor berjatuhan dari berbagai sudut dengan kecepatan ekstrem disertai patroli alien.',
    mechanic: 'meteor_storm',
    survivalSeconds: 90,
    rewardCredits: 700,
    missionBonusScore: 1300,
    theme: {
      skyColor: '#160707',
      nebulaPrimary: '#ea580c',
      nebulaSecondary: '#dc2626',
      planetColor: '#c2410c',
      planetRing: false,
    },
  },
  {
    id: 5,
    code: 'SECTOR 05',
    title: 'SPACE AMBUSH',
    subtitle: 'Penyergapan Siluman Luar Angkasa',
    missionText: 'Menghancurkan 20 pesawat penyergap musuh.',
    challengeText: 'Stealth Fighter & Interceptor muncul tiba-tiba dari belakang dan samping pesawat!',
    mechanic: 'space_ambush',
    targetKills: 20,
    rewardCredits: 850,
    missionBonusScore: 1600,
    theme: {
      skyColor: '#041014',
      nebulaPrimary: '#10b981',
      nebulaSecondary: '#6366f1',
      planetColor: '#059669',
      planetRing: true,
    },
  },
  {
    id: 6,
    code: 'SECTOR 06',
    title: 'DEFEND THE STATION',
    subtitle: 'Pertahanan Stasiun Orbital Aegis-7',
    missionText: 'Lindungi Stasiun Luar Angkasa dan hancurkan 22 penyerang.',
    challengeText: 'Bomber musuh menembaki stasiun! Cegah kehancuran stasiun sebelum kesehatannya habis.',
    mechanic: 'defend_station',
    targetKills: 22,
    rewardCredits: 1050,
    missionBonusScore: 2000,
    theme: {
      skyColor: '#040b1a',
      nebulaPrimary: '#38bdf8',
      nebulaSecondary: '#2563eb',
      planetColor: '#0284c7',
      planetRing: true,
    },
  },
  {
    id: 7,
    code: 'SECTOR 07',
    title: 'BLACK HOLE ZONE',
    subtitle: 'Anomali Gravitasi Lubang Hitam',
    missionText: 'Melewati tarikan gravitasi lubang hitam & capai Gerbang Warp Tujuan.',
    challengeText: 'Singularitas menarik pesawat ke pusatnya! Gunakan BOOST & manuver untuk mencapai titik tujuan.',
    mechanic: 'black_hole_zone',
    timeLimitSeconds: 115,
    rewardCredits: 1250,
    missionBonusScore: 2400,
    theme: {
      skyColor: '#090314',
      nebulaPrimary: '#a855f7',
      nebulaSecondary: '#f97316',
      planetColor: '#581c87',
      planetRing: true,
    },
  },
  {
    id: 8,
    code: 'SECTOR 08',
    title: 'ELITE SQUADRON',
    subtitle: 'Duel Udara Skuadron Elit Kerajaan',
    missionText: 'Mengalahkan 5 pesawat Elite Fighter penjaga inti galaksi.',
    challengeText: 'Musuh elit memakai pelindung, laser beruntun, rudal pencari, dan manuver menghindar!',
    mechanic: 'elite_squadron',
    targetKills: 5,
    rewardCredits: 1500,
    missionBonusScore: 3000,
    theme: {
      skyColor: '#120510',
      nebulaPrimary: '#f43f5e',
      nebulaSecondary: '#eab308',
      planetColor: '#be123c',
      planetRing: false,
    },
  },
  {
    id: 9,
    code: 'SECTOR 09',
    title: 'MOTHERSHIP ATTACK',
    subtitle: 'Penyerbuan Kapal Induk Dreadnought',
    missionText: 'Menghancurkan Kapal Induk Alien (Mothership).',
    challengeText: 'Hancurkan Meriam, Generator Pelindung, dan Mesin Kapal Induk sebelum menyerang Inti Utamanya!',
    mechanic: 'mothership_attack',
    rewardCredits: 2000,
    missionBonusScore: 4000,
    theme: {
      skyColor: '#060c18',
      nebulaPrimary: '#14b8a6',
      nebulaSecondary: '#f43f5e',
      planetColor: '#0f766e',
      planetRing: true,
    },
  },
  {
    id: 10,
    code: 'SECTOR 10',
    title: 'GALAXY FINAL BOSS',
    subtitle: 'Pertempuran Akhir Raja Alien',
    missionText: 'Kalahkan Raja Alien & Pesawat Induk Raksasa Kaisar Galaksi.',
    challengeText: '3 Fase Mematikan: (1) Laser Beruntun, (2) Badai Rudal & Drone, (3) Meriam Energi Area Berbahaya. Hancurkan titik lemahnya!',
    mechanic: 'galaxy_final_boss',
    rewardCredits: 3500,
    missionBonusScore: 6000,
    theme: {
      skyColor: '#120309',
      nebulaPrimary: '#ef4444',
      nebulaSecondary: '#a855f7',
      planetColor: '#991b1b',
      planetRing: true,
    },
  },
];

const createDefaultUpgrades = (): Record<AircraftId, UpgradeLevels> => ({
  f16: { laser: 1, thruster: 1, hull: 1, shield: 1, missile: 1 },
  typhoon: { laser: 1, thruster: 1, hull: 1, shield: 1, missile: 1 },
  rafale: { laser: 1, thruster: 1, hull: 1, shield: 1, missile: 1 },
  su27: { laser: 1, thruster: 1, hull: 1, shield: 1, missile: 1 },
  f22: { laser: 1, thruster: 1, hull: 1, shield: 1, missile: 1 },
});

export const DEFAULT_SAVE_DATA: SaveGameData = {
  unlockedLevel: 1,
  lastPlayedLevel: 1,
  pilotLevel: 1,
  credits: 350,
  selectedAircraft: 'f16',
  unlockedAircraft: ['f16'],
  upgrades: createDefaultUpgrades(),
  levelHighScores: {},
  soundEnabled: true,
  musicVolume: 0.45,
  sfxVolume: 0.75,
};

export function loadSaveData(): SaveGameData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE_DATA, upgrades: createDefaultUpgrades() };
    const parsed = JSON.parse(raw) as Partial<SaveGameData>;
    const defaults = createDefaultUpgrades();
    const mergedUpgrades = { ...defaults, ...(parsed.upgrades || {}) };
    return {
      ...DEFAULT_SAVE_DATA,
      ...parsed,
      upgrades: mergedUpgrades,
      unlockedAircraft:
        Array.isArray(parsed.unlockedAircraft) && parsed.unlockedAircraft.length > 0
          ? parsed.unlockedAircraft
          : ['f16'],
    };
  } catch {
    return { ...DEFAULT_SAVE_DATA, upgrades: createDefaultUpgrades() };
  }
}

export function persistSaveData(data: SaveGameData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors in restricted environments
  }
}
