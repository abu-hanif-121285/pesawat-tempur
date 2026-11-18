import React, { useState } from 'react';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Coins,
  Cpu,
  Gamepad2,
  HelpCircle,
  Lock,
  Play,
  RotateCcw,
  Shield,
  Sliders,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  AIRCRAFT_LIST,
  computeEffectiveAircraftStats,
  getAircraftById,
  getUpgradeCost,
  LEVELS,
} from '../data/gameData';
import {
  AircraftId,
  MissionEndResult,
  SaveGameData,
  UpgradeLevels,
} from '../types/game';

interface MainMenuProps {
  save: SaveGameData;
  onStartNewOrCurrent: () => void;
  onContinueGame: () => void;
  onOpenLevels: () => void;
  onOpenHangar: () => void;
  onOpenHowToPlay: () => void;
  onToggleSound: () => void;
  onChangeVolume: (music: number, sfx: number) => void;
}

export const MainMenuScreen: React.FC<MainMenuProps> = ({
  save,
  onStartNewOrCurrent,
  onContinueGame,
  onOpenLevels,
  onOpenHangar,
  onOpenHowToPlay,
  onToggleSound,
  onChangeVolume,
}) => {
  const [showAudioPanel, setShowAudioPanel] = useState(false);
  const currentJet = getAircraftById(save.selectedAircraft);
  const eff = computeEffectiveAircraftStats(
    currentJet,
    save.pilotLevel,
    save.upgrades[save.selectedAircraft]
  );
  const hasProgress = save.unlockedLevel > 1 || Object.keys(save.levelHighScores).length > 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Bar: Credits, Pilot Rank & Sound Controls */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 rounded-full border border-sky-500/40 bg-slate-950/75 px-4 py-1.5 backdrop-blur-md">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span className="font-display text-xs font-bold text-white">
            PILOT LV.{save.pilotLevel} ({eff.mkTierLabel})
          </span>
          <span className="text-xs font-semibold text-emerald-300">
            +{eff.autoLevelBonusPct}% STAT PESAWAT
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-amber-400/45 bg-slate-950/80 px-3.5 py-1.5 font-display text-xs font-bold text-amber-300 backdrop-blur-md">
            <Coins className="h-4 w-4 text-amber-400" />
            {save.credits.toLocaleString()} CR
          </div>

          <button
            type="button"
            onClick={() => setShowAudioPanel((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-sky-400/45 bg-slate-950/80 px-3 py-1.5 text-xs font-bold text-sky-200 hover:bg-sky-500/20 backdrop-blur-md"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">VOLUME</span>
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-display text-xs font-bold backdrop-blur-md transition ${
              save.soundEnabled
                ? 'border-emerald-400/50 bg-emerald-950/60 text-emerald-300'
                : 'border-rose-400/50 bg-rose-950/60 text-rose-300'
            }`}
          >
            {save.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span>{save.soundEnabled ? 'SOUND ON' : 'SOUND OFF'}</span>
          </button>
        </div>
      </div>

      {/* Optional Volume Sliders Popover */}
      {showAudioPanel && (
        <div className="pointer-events-auto self-end rounded-2xl border border-sky-400/45 bg-slate-950/90 p-4 backdrop-blur-xl shadow-2xl w-64">
          <p className="mb-2 font-display text-xs font-bold text-sky-300">PENGATURAN AUDIO</p>
          <label className="block text-xs text-slate-300 mb-2">
            Musik Latar: {Math.round(save.musicVolume * 100)}%
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={save.musicVolume}
              onChange={(e) => onChangeVolume(Number(e.target.value), save.sfxVolume)}
              className="mt-1 w-full accent-sky-400"
            />
          </label>
          <label className="block text-xs text-slate-300">
            Efek Suara (SFX): {Math.round(save.sfxVolume * 100)}%
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={save.sfxVolume}
              onChange={(e) => onChangeVolume(save.musicVolume, Number(e.target.value))}
              className="mt-1 w-full accent-amber-400"
            />
          </label>
        </div>
      )}

      {/* Center-Left Hero Title + Active 3D Fighter Showcase Badge */}
      <div className="my-auto flex flex-col lg:flex-row items-center lg:items-end justify-between gap-6">
        <div className="text-center lg:text-left max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/15 px-3.5 py-1 text-xs font-bold tracking-widest text-sky-300 mb-3">
            3D ARCADE SPACE & JET COMBAT
          </div>
          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-200 to-cyan-400 drop-shadow-[0_0_28px_rgba(56,189,248,0.55)]">
            SPACE FIGHTER
          </h1>
          <h2 className="font-display text-xl sm:text-3xl font-extrabold tracking-[0.22em] text-amber-400 mt-1 drop-shadow-[0_0_18px_rgba(251,191,36,0.45)]">
            GALAXY WAR
          </h2>
          <p className="mt-2.5 text-sm sm:text-base text-slate-300 max-w-md mx-auto lg:mx-0">
            Kendalikan armada jet tempur futuristik 3D, hancurkan invasi armada alien di 10 sektor galaksi, dan tingkatkan kemampuan pesawatmu setiap naik level!
          </p>

          {/* Active Aircraft Showcase Tag */}
          <div className="mt-4 inline-flex items-center gap-3 rounded-xl border border-sky-500/40 bg-slate-950/75 px-4 py-2 backdrop-blur-md">
            <div>
              <div className="font-display text-xs sm:text-sm font-extrabold text-white">
                {currentJet.name}
              </div>
              <div className="text-[11px] font-bold tracking-widest text-sky-400">
                {currentJet.role} • {eff.mkTierLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenHangar}
              className="pointer-events-auto rounded-lg bg-sky-500/25 border border-sky-400/60 px-2.5 py-1 font-display text-[10px] font-bold text-sky-200 hover:bg-sky-500/40 transition"
            >
              GANTI PESAWAT
            </button>
          </div>
        </div>

        {/* Main Action Menu Buttons */}
        <div className="pointer-events-auto w-full max-w-xs sm:max-w-sm flex flex-col gap-2.5">
          {hasProgress && (
            <button
              type="button"
              onClick={onContinueGame}
              className="group flex items-center justify-between rounded-xl border-2 border-emerald-400/80 bg-gradient-to-r from-emerald-600/90 to-teal-700/90 px-5 py-3.5 font-display text-sm font-extrabold tracking-wider text-white shadow-[0_0_25px_rgba(16,185,129,0.45)] hover:brightness-110 active:scale-[0.99] transition"
            >
              <span className="flex items-center gap-2.5">
                <Play className="h-5 w-5 fill-current" />
                LANJUTKAN (LEVEL {save.lastPlayedLevel})
              </span>
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          )}

          <button
            type="button"
            onClick={onStartNewOrCurrent}
            className="hud-glow group flex items-center justify-between rounded-xl border-2 border-sky-300 bg-gradient-to-r from-sky-500 to-blue-700 px-5 py-3.5 font-display text-sm sm:text-base font-extrabold tracking-wider text-white hover:brightness-110 active:scale-[0.99] transition"
          >
            <span className="flex items-center gap-2.5">
              <Gamepad2 className="h-5 w-5" />
              START GAME
            </span>
            <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onOpenLevels}
              className="flex items-center justify-center gap-2 rounded-xl border border-sky-400/50 bg-slate-900/85 px-4 py-3 font-display text-xs font-bold text-sky-200 hover:bg-sky-500/20 backdrop-blur-md transition"
            >
              <Trophy className="h-4 w-4 text-amber-400" />
              LEVEL SELECT
            </button>

            <button
              type="button"
              onClick={onOpenHangar}
              className="flex items-center justify-center gap-2 rounded-xl border border-amber-400/55 bg-slate-900/85 px-4 py-3 font-display text-xs font-bold text-amber-200 hover:bg-amber-500/20 backdrop-blur-md transition"
            >
              <Wrench className="h-4 w-4 text-amber-400" />
              HANGAR / UPGRADE
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenHowToPlay}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-600/70 bg-slate-950/80 px-4 py-2.5 font-display text-xs font-bold text-slate-200 hover:border-sky-400/60 hover:text-white backdrop-blur-md transition"
          >
            <HelpCircle className="h-4 w-4 text-sky-400" />
            HOW TO PLAY (CARA BERMAIN)
          </button>
        </div>
      </div>

      {/* Footer Credit */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-center text-xs text-slate-400 border-t border-slate-800/70 pt-2.5">
        <span className="font-semibold text-sky-300/90">
          Created by <strong className="font-display text-white">Wiyanto Abu Hanif</strong>
        </span>
        <span className="text-[11px] text-slate-400">
          Smartphone Multitouch 360° Joystick & PC Keyboard Ready
        </span>
      </div>
    </div>
  );
};

interface LevelSelectProps {
  save: SaveGameData;
  onSelectLevel: (levelId: number) => void;
  onBack: () => void;
}

export const LevelSelectScreen: React.FC<LevelSelectProps> = ({
  save,
  onSelectLevel,
  onBack,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-slate-950/85 backdrop-blur-lg p-4 sm:p-7">
      <div className="flex items-center justify-between pb-4 border-b border-sky-500/30">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-sky-400/50 bg-slate-900 px-3.5 py-2 font-display text-xs font-bold text-sky-200 hover:bg-sky-500/20"
        >
          <ChevronLeft className="h-4 w-4" /> KEMBALI
        </button>
        <div className="text-center">
          <h2 className="font-display text-lg sm:text-2xl font-extrabold text-white">
            PILIH MISI SEKTOR GALAKSI
          </h2>
          <p className="text-xs text-sky-300">
            10 Level dengan Mekanisme & Tantangan Berbeda
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-slate-900 px-3.5 py-1.5 font-display text-xs font-bold text-amber-300">
          <Coins className="h-4 w-4" /> {save.credits.toLocaleString()} CR
        </div>
      </div>

      <div className="custom-scroll mt-4 grid flex-1 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 overflow-y-auto pr-1">
        {LEVELS.map((lvl) => {
          const unlocked = lvl.id <= save.unlockedLevel;
          const best = save.levelHighScores[lvl.id] || 0;

          return (
            <div
              key={lvl.id}
              className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
                unlocked
                  ? 'border-sky-500/45 bg-slate-900/85 hover:border-sky-300 shadow-lg'
                  : 'border-slate-800 bg-slate-950/70 opacity-65'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded bg-sky-500/20 border border-sky-400/40 px-2 py-0.5 font-display text-[10px] font-bold text-sky-300">
                    LEVEL {lvl.id}
                  </span>
                  {best > 0 && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
                      <Trophy className="h-3.5 w-3.5" /> {best.toLocaleString()} PTS
                    </span>
                  )}
                </div>

                <h3 className="mt-2 font-display text-base font-extrabold text-white">
                  {lvl.title}
                </h3>
                <p className="text-xs font-semibold text-cyan-300">{lvl.subtitle}</p>
                <p className="mt-2 text-xs text-slate-200">
                  <strong className="text-sky-300">Misi:</strong> {lvl.missionText}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  <strong className="text-amber-300">Tantangan:</strong> {lvl.challengeText}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800">
                <span className="text-xs font-bold text-amber-300">
                  Reward: +{lvl.rewardCredits} CR
                </span>
                {unlocked ? (
                  <button
                    type="button"
                    onClick={() => onSelectLevel(lvl.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 font-display text-xs font-extrabold text-white hover:brightness-110 active:scale-95"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" /> MULAI MISI
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-500 font-display">
                    <Lock className="h-3.5 w-3.5" /> TERKUNCI
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface HangarScreenProps {
  save: SaveGameData;
  onSelectAircraft: (id: AircraftId) => void;
  onUnlockAircraft: (id: AircraftId) => void;
  onUpgradeStat: (id: AircraftId, statKey: keyof UpgradeLevels) => void;
  onRotateJet: (deltaRad: number) => void;
  onStartMission: () => void;
  onBack: () => void;
}

export const HangarScreen: React.FC<HangarScreenProps> = ({
  save,
  onSelectAircraft,
  onUnlockAircraft,
  onUpgradeStat,
  onRotateJet,
  onStartMission,
  onBack,
}) => {
  const [dragX, setDragX] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<AircraftId>(save.selectedAircraft);

  const jet = getAircraftById(previewId);
  const isOwned =
    save.unlockedAircraft.includes(previewId) || save.pilotLevel >= jet.unlockAtLevel;
  const jetUpgrades = save.upgrades[previewId];
  const eff = computeEffectiveAircraftStats(jet, save.pilotLevel, jetUpgrades);

  const handleInspect = (id: AircraftId) => {
    setPreviewId(id);
    onSelectAircraft(id);
  };

  const upgradeRows: {
    key: keyof UpgradeLevels;
    label: string;
    desc: string;
  }[] = [
    { key: 'laser', label: 'Plasma Cannon', desc: 'Damage & kecepatan tembak laser' },
    { key: 'thruster', label: 'Vector Thrusters', desc: 'Kecepatan gerak & kelincahan' },
    { key: 'hull', label: 'Nano-Titanium Hull', desc: 'Kapasitas maksimum Health' },
    { key: 'shield', label: 'Energy Shield', desc: 'Kekuatan pelindung energi' },
    { key: 'missile', label: 'Missile Bay', desc: 'Persediaan maksimum rudal' },
  ];

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-3 sm:p-6">
      {/* Top Bar */}
      <div className="pointer-events-auto flex items-center justify-between rounded-2xl border border-sky-500/35 bg-slate-950/80 px-4 py-2.5 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border border-sky-400/50 bg-slate-900 px-3 py-1.5 font-display text-xs font-bold text-sky-200 hover:bg-sky-500/20"
        >
          <ChevronLeft className="h-4 w-4" /> MENU
        </button>

        <div className="text-center">
          <h2 className="font-display text-sm sm:text-xl font-extrabold text-white">
            HANGAR PESAWAT & UPGRADE
          </h2>
          <p className="text-[11px] text-emerald-300 font-semibold">
            Pilot LV.{save.pilotLevel} ({eff.mkTierLabel}) Otomatis Meningkatkan Kemampuan Semua Pesawat (+{eff.autoLevelBonusPct}%)
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-slate-900 px-3.5 py-1.5 font-display text-xs font-bold text-amber-300">
          <Coins className="h-4 w-4 text-amber-400" />
          {save.credits.toLocaleString()} CR
        </div>
      </div>

      {/* Middle Interactive Area: Left Jet Selector, Center Live 3D Turntable Space, Right Stats & Upgrades */}
      <div className="my-auto grid grid-cols-1 lg:grid-cols-12 gap-3 items-end lg:items-center max-h-[82vh] overflow-y-auto custom-scroll py-2">
        {/* LEFT COLUMN: 5 Fighter Jets Selector (matching uploaded reference image!) */}
        <div className="pointer-events-auto lg:col-span-4 flex lg:flex-col gap-2 overflow-x-auto pb-1 lg:pb-0">
          {AIRCRAFT_LIST.map((item) => {
            const unlocked =
              save.unlockedAircraft.includes(item.id) ||
              save.pilotLevel >= item.unlockAtLevel;
            const active = previewId === item.id;
            const equipped = save.selectedAircraft === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleInspect(item.id)}
                className={`min-w-[215px] lg:min-w-0 text-left rounded-xl border p-3 transition backdrop-blur-md ${
                  active
                    ? 'border-sky-300 bg-sky-950/85 shadow-[0_0_20px_rgba(56,189,248,0.4)]'
                    : 'border-slate-700/80 bg-slate-950/75 hover:border-sky-500/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded bg-gradient-to-r ${item.badgeColor} px-2 py-0.5 font-display text-[9px] font-extrabold text-white`}
                  >
                    {item.role}
                  </span>
                  {equipped && unlocked ? (
                    <span className="text-[10px] font-display font-bold text-emerald-300">
                      AKTIF
                    </span>
                  ) : !unlocked ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300">
                      <Lock className="h-3 w-3" /> LV.{item.unlockAtLevel} / {item.unlockCost} CR
                    </span>
                  ) : null}
                </div>
                <div className="mt-1.5 font-display text-xs sm:text-sm font-extrabold text-white">
                  {item.name}
                </div>
                <div className="text-[11px] text-slate-300 line-clamp-1">{item.specialTrait}</div>
              </button>
            );
          })}
        </div>

        {/* CENTER COLUMN: Interactive 360° Touch/Drag Window for 3D Aircraft Model */}
        <div
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (dragX === null) return;
            const dx = e.clientX - dragX;
            setDragX(e.clientX);
            onRotateJet(dx * 0.012);
          }}
          onPointerUp={() => setDragX(null)}
          onPointerCancel={() => setDragX(null)}
          className="pointer-events-auto cursor-grab active:cursor-grabbing touch-none-strict lg:col-span-4 flex flex-col items-center justify-end min-h-[160px] sm:min-h-[250px]"
        >
          <div className="rounded-xl border border-sky-400/50 bg-slate-950/75 px-4 py-2 text-center backdrop-blur-md shadow-lg">
            <div className="font-display text-sm sm:text-base font-black text-white">
              {jet.name}
            </div>
            <div className="font-display text-[10px] font-bold tracking-widest text-sky-400">
              {jet.role} • LARAS LASER BAWAAN: {eff.baseBarrelCount}X
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400">
              Geser kiri/kanan untuk memutar pesawat 3D 360°
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Effective Capabilities & Workshop Upgrades */}
        <div className="pointer-events-auto lg:col-span-4 rounded-2xl border border-sky-500/40 bg-slate-950/85 p-4 backdrop-blur-xl">
          <p className="text-xs text-slate-300 mb-3">{jet.description}</p>

          {/* Live Effective Stats Grid */}
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-900/90 p-2.5 border border-slate-800 mb-3 text-center">
            <div>
              <div className="text-[10px] text-slate-400">HEALTH</div>
              <div className="font-display text-xs font-extrabold text-emerald-300">
                {eff.maxHealth}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">SHIELD</div>
              <div className="font-display text-xs font-extrabold text-cyan-300">
                {eff.maxShield}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">LASER DMG</div>
              <div className="font-display text-xs font-extrabold text-rose-300">
                {eff.laserDamage} ({eff.fireRate}/s)
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">KECEPATAN</div>
              <div className="font-display text-xs font-extrabold text-amber-300">
                {eff.speed}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">MANUVER</div>
              <div className="font-display text-xs font-extrabold text-sky-300">
                {eff.agility}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">RUDAL</div>
              <div className="font-display text-xs font-extrabold text-purple-300">
                {eff.maxMissiles} UNIT
              </div>
            </div>
          </div>

          {!isOwned ? (
            <div className="rounded-xl border border-amber-400/50 bg-amber-950/30 p-3 text-center">
              <p className="text-xs text-amber-200 mb-2">
                Terbuka otomatis saat mencapai <strong>Pilot Level {jet.unlockAtLevel}</strong> atau buka sekarang menggunakan Koin:
              </p>
              <button
                type="button"
                disabled={save.credits < jet.unlockCost}
                onClick={() => onUnlockAircraft(previewId)}
                className={`w-full rounded-xl py-2.5 font-display text-xs font-extrabold transition ${
                  save.credits >= jet.unlockCost
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:brightness-110'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                BUKA PESAWAT ({jet.unlockCost.toLocaleString()} CR)
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {upgradeRows.map((u) => {
                const tier = jetUpgrades[u.key];
                const maxed = tier >= 5;
                const cost = getUpgradeCost(u.key, tier);
                const canAfford = save.credits >= cost;

                return (
                  <div
                    key={u.key}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/75 px-3 py-1.5"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-[11px] font-bold text-white">
                          {u.label}
                        </span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((dot) => (
                            <span
                              key={dot}
                              className={`h-1.5 w-3 rounded-sm ${
                                dot <= tier ? 'bg-sky-400' : 'bg-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400">{u.desc}</p>
                    </div>

                    {maxed ? (
                      <span className="rounded bg-emerald-500/20 px-2.5 py-1 font-display text-[10px] font-bold text-emerald-300">
                        MAX
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onUpgradeStat(previewId, u.key)}
                        className={`shrink-0 rounded-lg px-2.5 py-1.5 font-display text-[10px] font-extrabold transition ${
                          canAfford
                            ? 'bg-sky-500 text-white hover:bg-sky-400'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        +{cost} CR
                      </button>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={onStartMission}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-600 py-2.5 font-display text-xs font-extrabold text-white shadow-lg hover:brightness-110"
              >
                <Play className="h-4 w-4 fill-current" /> TEMPUR DENGAN {jet.name}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const HowToPlayModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-lg">
      <div className="custom-scroll max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-sky-400/50 bg-slate-900 p-5 sm:p-7 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="font-display text-lg sm:text-2xl font-extrabold text-sky-300">
            PANDUAN BERMAIN — SPACE FIGHTER: GALAXY WAR
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-3 py-1.5 font-display text-xs font-bold text-white hover:bg-sky-600"
          >
            TUTUP
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl border border-sky-500/30 bg-slate-950/70 p-4">
            <h3 className="font-display text-xs font-extrabold text-amber-300 mb-2">
              KONTROL SMARTPHONE (MULTITOUCH)
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-200">
              <li>• <strong>Joystick Analog 360° (Kiri):</strong> Geser ke segala arah (atas, bawah, kiri, kanan, diagonal) untuk bermanuver proporsional.</li>
              <li>• <strong>Tombol FIRE (Kanan Bawah):</strong> Tahan atau tekan untuk menembakkan laser plasma.</li>
              <li>• <strong>Tombol MISSILE:</strong> Meluncurkan rudal pencari otomatis ke target terdekat.</li>
              <li>• <strong>Tombol BOOST:</strong> Meningkatkan kecepatan & akselerasi pesawat.</li>
              <li>• <strong>Tombol SHIELD:</strong> Mengaktifkan perisai pelindung kebal sementara.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-sky-500/30 bg-slate-950/70 p-4">
            <h3 className="font-display text-xs font-extrabold text-cyan-300 mb-2">
              KONTROL KOMPUTER / KEYBOARD
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-200">
              <li>• <strong>W A S D / Tombol Panah:</strong> Menggerakkan pesawat 8 arah.</li>
              <li>• <strong>SPACE (Spasi):</strong> Menembakkan Laser.</li>
              <li>• <strong>E:</strong> Meluncurkan Rudal Pencari (Missile).</li>
              <li>• <strong>SHIFT:</strong> Mengaktifkan Afterburner Boost.</li>
              <li>• <strong>Q:</strong> Mengaktifkan Pelindung (Energy Shield).</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-slate-950/70 p-4">
          <h3 className="font-display text-xs font-extrabold text-emerald-300 mb-2 flex items-center gap-1.5">
            <Cpu className="h-4 w-4" /> SISTEM NAIK LEVEL PESAWAT & POWER-UP
          </h3>
          <p className="text-xs text-slate-300 mb-2">
            Setiap menyelesaikan level baru, <strong>Level Pilot/Pesawat meningkat otomatis</strong> sehingga seluruh pesawat tempur (F-16, Eurofighter Typhoon, Dassault Rafale, Sukhoi Su-27, F-22 Raptor) mengalami peningkatan Health, Shield, Kekuatan Laser, Kecepatan, hingga evolusi laras tembakan ganda/tiga!
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-200">
            <div className="rounded bg-slate-900 p-2 border border-slate-800"><strong className="text-emerald-400">Health:</strong> +45 Hull HP</div>
            <div className="rounded bg-slate-900 p-2 border border-slate-800"><strong className="text-cyan-400">Shield:</strong> Perisai Penuh</div>
            <div className="rounded bg-slate-900 p-2 border border-slate-800"><strong className="text-yellow-400">Rapid Fire:</strong> Tembak Cepat</div>
            <div className="rounded bg-slate-900 p-2 border border-slate-800"><strong className="text-blue-400">Double Laser:</strong> 2 Laras</div>
            <div className="rounded bg-slate-900 p-2 border border-slate-800"><strong className="text-fuchsia-400">Triple Shot:</strong> 3 Laras</div>
            <div className="rounded bg-slate-900 p-2 border border-slate-800"><strong className="text-rose-400">Missile Pack:</strong> +3 Rudal</div>
            <div className="rounded bg-slate-900 p-2 border border-slate-800"><strong className="text-orange-400">Speed Boost:</strong> Kecepatan Ekstra</div>
            <div className="rounded bg-slate-900 p-2 border border-slate-800"><strong className="text-purple-400">Mega Bomb:</strong> Ledakan Area</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PauseOverlay: React.FC<{
  onResume: () => void;
  onRestart: () => void;
  onQuitToMenu: () => void;
}> = ({ onResume, onRestart, onQuitToMenu }) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
    <div className="w-full max-w-sm rounded-2xl border border-sky-400/50 bg-slate-900 p-6 text-center shadow-2xl">
      <h2 className="font-display text-2xl font-black text-white">GAME PAUSED</h2>
      <p className="mt-1 text-xs text-slate-400">Pertempuran dihentikan sementara</p>
      <div className="mt-5 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onResume}
          className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 font-display text-xs font-extrabold text-white"
        >
          LANJUTKAN PERTEMPURAN
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="rounded-xl border border-amber-400/50 bg-slate-800 py-2.5 font-display text-xs font-bold text-amber-300"
        >
          ULANGI LEVEL INI
        </button>
        <button
          type="button"
          onClick={onQuitToMenu}
          className="rounded-xl border border-slate-700 bg-slate-950 py-2.5 font-display text-xs font-bold text-slate-300"
        >
          MENU UTAMA
        </button>
      </div>
    </div>
  </div>
);

export const MissionResultModal: React.FC<{
  result: MissionEndResult;
  onNextLevel: () => void;
  onRetry: () => void;
  onOpenHangar: () => void;
  onMainMenu: () => void;
}> = ({ result, onNextLevel, onRetry, onOpenHangar, onMainMenu }) => {
  const leveledUp = result.newPilotLevel > result.previousPilotLevel;
  const hasNext = result.levelId < LEVELS.length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 backdrop-blur-lg p-4">
      <div
        className={`w-full max-w-md rounded-2xl border-2 p-6 text-center shadow-2xl ${
          result.victory
            ? 'border-emerald-400/80 bg-slate-900 shadow-[0_0_45px_rgba(16,185,129,0.35)]'
            : 'border-rose-500/80 bg-slate-900 shadow-[0_0_45px_rgba(244,63,94,0.35)]'
        }`}
      >
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 border border-slate-700">
          {result.victory ? (
            <Award className="h-8 w-8 text-amber-400 animate-bounce" />
          ) : (
            <Shield className="h-8 w-8 text-rose-400" />
          )}
        </div>

        <h2
          className={`font-display text-3xl font-black tracking-wider ${
            result.victory ? 'text-emerald-300' : 'text-rose-400'
          }`}
        >
          {result.victory ? 'VICTORY!' : 'GAME OVER'}
        </h2>
        <p className="mt-1 font-display text-xs font-bold text-sky-300">
          LEVEL {result.levelId} — {result.levelTitle}
        </p>
        <p className="mt-1 text-xs text-slate-300">{result.reason}</p>

        {/* Automatic Aircraft Level-Up Banner! */}
        {leveledUp && (
          <div className="mt-3 rounded-xl border border-amber-400/70 bg-amber-500/15 p-2.5 text-xs">
            <div className="flex items-center justify-center gap-1.5 font-display font-extrabold text-amber-300">
              <Zap className="h-4 w-4" /> LEVEL UP! PILOT LV.{result.newPilotLevel}
            </div>
            <p className="text-[11px] text-amber-100 mt-0.5">
              Kemampuan Pesawat (Health, Shield, Damage Laser & Kecepatan) otomatis meningkat!
            </p>
            {result.newlyUnlockedJetName && (
              <p className="mt-1 font-bold text-emerald-300">
                Pesawat Baru Terbuka: {result.newlyUnlockedJetName}!
              </p>
            )}
          </div>
        )}

        <div className="mt-4 space-y-1.5 rounded-xl bg-slate-950/80 p-3.5 text-xs border border-slate-800">
          <div className="flex justify-between">
            <span className="text-slate-400">Skor Pertempuran</span>
            <span className="font-bold text-white">{result.score.toLocaleString()} PTS</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Bonus Penyelesaian Misi</span>
            <span className="font-bold text-emerald-300">
              +{result.missionBonus.toLocaleString()} PTS
            </span>
          </div>
          <div className="flex justify-between border-t border-slate-800 pt-1.5 text-sm">
            <span className="font-display font-bold text-sky-300">SKOR AKHIR</span>
            <span className="font-display font-extrabold text-amber-300">
              {result.totalScore.toLocaleString()} PTS
            </span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-slate-400">Musuh Dihancurkan</span>
            <span className="font-bold text-white">{result.enemiesDestroyed} Unit</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Waktu Penyelesaian</span>
            <span className="font-bold text-white">{result.elapsedSeconds} Detik</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Reward Koin</span>
            <span className="font-bold text-amber-300">+{result.creditsEarned} CR</span>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          {result.victory && hasNext && (
            <button
              type="button"
              onClick={onNextLevel}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-600 py-3 font-display text-sm font-extrabold text-white shadow-lg hover:brightness-110"
            >
              NEXT LEVEL (LEVEL {result.levelId + 1}) <ChevronRight className="h-4 w-4" />
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-400/50 bg-slate-800 py-2.5 font-display text-xs font-bold text-sky-200 hover:bg-sky-500/20"
            >
              <RotateCcw className="h-3.5 w-3.5" /> RETRY
            </button>
            <button
              type="button"
              onClick={onOpenHangar}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/50 bg-slate-800 py-2.5 font-display text-xs font-bold text-amber-200 hover:bg-amber-500/20"
            >
              <Wrench className="h-3.5 w-3.5" /> HANGAR
            </button>
          </div>

          <button
            type="button"
            onClick={onMainMenu}
            className="rounded-xl border border-slate-700 bg-slate-950 py-2 font-display text-xs font-bold text-slate-400 hover:text-white"
          >
            MENU UTAMA
          </button>
        </div>
      </div>
    </div>
  );
};
