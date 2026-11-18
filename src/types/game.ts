export type AircraftId = 'f16' | 'typhoon' | 'rafale' | 'su27' | 'f22';

export interface AircraftSpec {
  id: AircraftId;
  name: string;
  role: string;
  codename: string;
  description: string;
  unlockCost: number;
  unlockAtLevel: number; // Also auto-unlocks when reaching this level!
  baseStats: {
    maxHealth: number;
    maxShield: number;
    laserDamage: number;
    fireRate: number; // shots per second
    speed: number;
    agility: number;
    maxMissiles: number;
  };
  laserColor: string;
  accentColor: string;
  badgeColor: string;
  specialTrait: string;
}

export interface UpgradeLevels {
  laser: number;    // 1..5
  thruster: number; // 1..5
  hull: number;     // 1..5
  shield: number;   // 1..5
  missile: number;  // 1..5
}

export interface EffectiveStats {
  maxHealth: number;
  maxShield: number;
  laserDamage: number;
  fireRate: number;
  speed: number;
  agility: number;
  maxMissiles: number;
  pilotLevel: number;
  mkTierLabel: string;
  autoLevelBonusPct: number;
  baseBarrelCount: number; // 1, 2, or 3 based on pilot level & jet
}

export type EnemyType =
  | 'scout'
  | 'heavy'
  | 'interceptor'
  | 'bomber'
  | 'stealth'
  | 'drone'
  | 'elite'
  | 'boss';

export type PowerUpType =
  | 'health'
  | 'shield'
  | 'rapid_fire'
  | 'double_laser'
  | 'triple_shot'
  | 'missile_pack'
  | 'speed_boost'
  | 'mega_bomb'
  | 'coin'
  | 'energy';

export type LevelMechanicType =
  | 'first_contact'      // Level 1: Destroy 10 scouts/drones
  | 'asteroid_field'     // Level 2: Navigate dense moving asteroids + destroy 15 enemies
  | 'enemy_squadron'     // Level 3: Defeat 3 distinct multi-angle waves
  | 'meteor_storm'       // Level 4: Survive 90 seconds of blazing multi-angle meteors
  | 'space_ambush'       // Level 5: Destroy 20 ambushers arriving from behind & flanks
  | 'defend_station'     // Level 6: Protect Space Station HP while destroying attackers
  | 'black_hole_zone'    // Level 7: Overcome Black Hole gravity pull & reach Warp Gate
  | 'elite_squadron'     // Level 8: Defeat 5 agile missile-firing Elite Fighters
  | 'mothership_attack'  // Level 9: Destroy Turrets, Shield Gen & Engines before Core
  | 'galaxy_final_boss'; // Level 10: 3-Phase Alien Emperor Boss with weak points

export interface LevelConfig {
  id: number;
  code: string;
  title: string;
  subtitle: string;
  missionText: string;
  challengeText: string;
  mechanic: LevelMechanicType;
  targetKills?: number;
  survivalSeconds?: number;
  timeLimitSeconds?: number;
  waveCount?: number;
  rewardCredits: number;
  missionBonusScore: number;
  theme: {
    skyColor: string;
    nebulaPrimary: string;
    nebulaSecondary: string;
    planetColor: string;
    planetRing: boolean;
  };
}

export interface ControlInputState {
  // Normalized -1..1 analog joystick / keyboard vector
  moveX: number;
  moveY: number;
  magnitude: number; // 0..1
  angleDeg: number;  // 0..360
  firing: boolean;
  boosting: boolean;
  missileTrigger: boolean;
  shieldTrigger: boolean;
}

export interface ActiveBuffs {
  rapidFireTimer: number;
  doubleLaserTimer: number;
  tripleShotTimer: number;
  speedBoostTimer: number;
  shieldActiveTimer: number;
}

export interface HudSnapshot {
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  boostEnergy: number;
  missiles: number;
  maxMissiles: number;
  missileCooldown: number;
  shieldCooldown: number;
  score: number;
  creditsEarned: number;
  enemiesDestroyed: number;
  levelId: number;
  levelTitle: string;
  missionObjective: string;
  progressPercent: number;
  elapsedSeconds: number;
  remainingSeconds: number | null;
  // Special mechanic indicators
  stationHp: number | null;
  stationMaxHp: number | null;
  blackHolePullWarning: boolean;
  bossName: string | null;
  bossHp: number | null;
  bossMaxHp: number | null;
  bossPhase: number | null;
  bossSubsystemsRemaining: number | null;
  waveCurrent: number | null;
  waveTotal: number | null;
  alertBanner: string | null;
  pickupToast: string | null;
  buffs: ActiveBuffs;
  pilotLevel: number;
  mkTierLabel: string;
}

export interface MissionEndResult {
  victory: boolean;
  levelId: number;
  levelTitle: string;
  reason: string;
  score: number;
  missionBonus: number;
  totalScore: number;
  enemiesDestroyed: number;
  elapsedSeconds: number;
  creditsEarned: number;
  previousPilotLevel: number;
  newPilotLevel: number;
  newlyUnlockedJetName: string | null;
}

export interface SaveGameData {
  unlockedLevel: number;
  lastPlayedLevel: number;
  pilotLevel: number;
  credits: number;
  selectedAircraft: AircraftId;
  unlockedAircraft: AircraftId[];
  upgrades: Record<AircraftId, UpgradeLevels>;
  levelHighScores: Record<number, number>;
  soundEnabled: boolean;
  musicVolume: number; // 0..1
  sfxVolume: number;   // 0..1
}
