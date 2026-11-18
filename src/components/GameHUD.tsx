import React from 'react';
import {
  AlertTriangle,
  Coins,
  Pause,
  Rocket,
  Shield,
  Skull,
  Timer,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { HudSnapshot } from '../types/game';

interface GameHUDProps {
  hud: HudSnapshot;
  aircraftName: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onPause: () => void;
}

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  aircraftName,
  soundEnabled,
  onToggleSound,
  onPause,
}) => {
  const hpPct = Math.max(0, Math.min(100, (hud.health / Math.max(1, hud.maxHealth)) * 100));
  const shieldPct = Math.max(0, Math.min(100, (hud.shield / Math.max(1, hud.maxShield)) * 100));
  const lowHp = hpPct <= 28;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-4">
      {/* Low Health Red Vignette Alert */}
      {lowHp && (
        <div className="pointer-events-none fixed inset-0 border-[6px] border-rose-500/75 shadow-[inset_0_0_65px_rgba(244,63,94,0.55)] animate-danger" />
      )}

      {/* TOP HUD ROW */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        {/* TOP-LEFT: Aircraft Status (Health, Shield, Boost, Rank) */}
        <div className="w-56 sm:w-72 rounded-xl border border-sky-500/35 bg-slate-950/75 p-2.5 backdrop-blur-md shadow-lg">
          <div className="mb-1.5 flex items-center justify-between gap-1">
            <span className="truncate font-display text-[10px] sm:text-xs font-bold tracking-wider text-sky-300">
              {aircraftName}
            </span>
            <span className="shrink-0 rounded bg-amber-500/20 border border-amber-400/50 px-1.5 py-0.5 font-display text-[9px] font-bold text-amber-300">
              LV.{hud.pilotLevel} {hud.mkTierLabel}
            </span>
          </div>

          {/* Health Bar */}
          <div className="mb-1.5">
            <div className="mb-0.5 flex justify-between text-[10px] font-bold">
              <span className={lowHp ? 'text-rose-400 animate-pulse' : 'text-emerald-300'}>
                HULL INTEGRITY
              </span>
              <span className="text-white">
                {hud.health}/{hud.maxHealth}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800 p-[1px]">
              <div
                style={{ width: `${hpPct}%` }}
                className={`h-full rounded-full transition-all duration-150 ${
                  lowHp
                    ? 'bg-gradient-to-r from-rose-600 to-red-400'
                    : 'bg-gradient-to-r from-emerald-500 to-lime-400'
                }`}
              />
            </div>
          </div>

          {/* Energy Shield Bar */}
          <div className="mb-1.5">
            <div className="mb-0.5 flex justify-between text-[10px] font-bold">
              <span className="flex items-center gap-1 text-cyan-300">
                <Shield className="h-3 w-3" /> ENERGY SHIELD
              </span>
              <span className="text-cyan-100">
                {hud.shield}/{hud.maxShield}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800 p-[1px]">
              <div
                style={{ width: `${shieldPct}%` }}
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-all duration-150"
              />
            </div>
          </div>

          {/* Boost Thruster Bar & Missile Count */}
          <div className="flex items-center justify-between gap-2 pt-0.5 text-[10px] font-semibold">
            <div className="flex flex-1 items-center gap-1.5">
              <Zap className="h-3 w-3 text-amber-400 shrink-0" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  style={{ width: `${hud.boostEnergy}%` }}
                  className="h-full bg-amber-400 transition-all duration-100"
                />
              </div>
            </div>
            <div className="flex items-center gap-1 text-rose-300 font-bold">
              <Rocket className="h-3 w-3" />
              <span>
                {hud.missiles}/{hud.maxMissiles}
              </span>
            </div>
          </div>
        </div>

        {/* TOP-CENTER: Mission Progress, Level Title & Boss / Station Bar */}
        <div className="order-3 w-full lg:order-2 lg:w-[390px] flex flex-col items-center gap-1.5">
          <div className="w-full rounded-xl border border-sky-500/35 bg-slate-950/75 px-3 py-2 backdrop-blur-md shadow-lg">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="font-display text-sky-300">
                LEVEL {hud.levelId} — {hud.levelTitle}
              </span>
              <span className="font-display text-amber-300">{hud.progressPercent}%</span>
            </div>
            <p className="truncate text-[11px] text-slate-200">{hud.missionObjective}</p>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                style={{ width: `${hud.progressPercent}%` }}
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 transition-all duration-200"
              />
            </div>
            {hud.waveCurrent !== null && hud.waveTotal !== null && (
              <div className="mt-1 text-center text-[10px] font-bold text-fuchsia-300">
                GELOMBANG SKUADRON: {hud.waveCurrent} / {hud.waveTotal}
              </div>
            )}
          </div>

          {/* Level 6 Space Station Health Bar */}
          {hud.stationHp !== null && hud.stationMaxHp !== null && (
            <div className="w-full rounded-lg border border-cyan-400/50 bg-slate-950/85 px-3 py-1.5 backdrop-blur-md">
              <div className="flex justify-between text-[10px] font-bold text-cyan-300">
                <span>STASIUN AEGIS-7 INTEGRITY</span>
                <span>
                  {hud.stationHp} / {hud.stationMaxHp}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  style={{
                    width: `${Math.max(0, (hud.stationHp / hud.stationMaxHp) * 100)}%`,
                  }}
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-300 transition-all"
                />
              </div>
            </div>
          )}

          {/* Level 9 Mothership / Level 10 Final Boss Health Bar */}
          {hud.bossName && hud.bossHp !== null && hud.bossMaxHp !== null && (
            <div className="w-full rounded-lg border border-rose-500/65 bg-slate-950/90 px-3 py-1.5 backdrop-blur-md shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <div className="flex items-center justify-between text-[10px] font-extrabold text-rose-300 font-display">
                <span className="truncate">{hud.bossName}</span>
                {hud.bossPhase !== null && (
                  <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[9px] text-white">
                    FASE {hud.bossPhase}/3
                  </span>
                )}
                {hud.bossSubsystemsRemaining !== null && hud.bossSubsystemsRemaining > 0 && (
                  <span className="rounded bg-teal-600 px-1.5 py-0.5 text-[9px] text-white">
                    PERISAI AKTIF ({hud.bossSubsystemsRemaining} SUBSISTEM)
                  </span>
                )}
              </div>
              <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  style={{
                    width: `${Math.max(0, (hud.bossHp / Math.max(1, hud.bossMaxHp)) * 100)}%`,
                  }}
                  className="h-full bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400 transition-all"
                />
              </div>
            </div>
          )}
        </div>

        {/* TOP-RIGHT: Score, Kills, Timer, Pause & Sound Buttons */}
        <div className="order-2 lg:order-3 flex items-start gap-2">
          <div className="rounded-xl border border-sky-500/35 bg-slate-950/75 px-3 py-2 backdrop-blur-md shadow-lg text-right">
            <div className="font-display text-sm sm:text-base font-extrabold text-white tracking-wider">
              {hud.score.toLocaleString()}{' '}
              <span className="text-[10px] font-semibold text-sky-400">PTS</span>
            </div>
            <div className="mt-0.5 flex items-center justify-end gap-2.5 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-rose-300">
                <Skull className="h-3.5 w-3.5" /> {hud.enemiesDestroyed}
              </span>
              <span className="flex items-center gap-1 text-amber-300">
                <Coins className="h-3.5 w-3.5" /> +{hud.creditsEarned}
              </span>
              <span
                className={`flex items-center gap-1 ${
                  hud.remainingSeconds !== null && hud.remainingSeconds <= 15
                    ? 'text-rose-400 animate-pulse'
                    : 'text-sky-200'
                }`}
              >
                <Timer className="h-3.5 w-3.5" />
                {hud.remainingSeconds !== null
                  ? formatClock(hud.remainingSeconds)
                  : formatClock(hud.elapsedSeconds)}
              </span>
            </div>
          </div>

          <div className="pointer-events-auto flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onPause}
              title="Pause"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-400/40 bg-slate-900/85 text-sky-200 hover:bg-sky-500/25 active:scale-95"
            >
              <Pause className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToggleSound}
              title="Sound On/Off"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-400/40 bg-slate-900/85 text-sky-200 hover:bg-sky-500/25 active:scale-95"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-rose-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* CENTER DYNAMIC ALERTS, BLACK HOLE WARNING & POWER-UP TOASTS */}
      <div className="my-auto flex flex-col items-center gap-2 pointer-events-none">
        {hud.alertBanner && (
          <div className="rounded-xl border border-amber-400/70 bg-slate-950/85 px-5 py-2 text-center font-display text-xs sm:text-sm font-extrabold tracking-widest text-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.45)]">
            {hud.alertBanner}
          </div>
        )}

        {hud.blackHolePullWarning && (
          <div className="flex items-center gap-2 rounded-full border border-purple-400/80 bg-purple-950/85 px-4 py-1 text-xs font-bold text-purple-200 animate-pulse">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            TARIKAN GRAVITASI LUBANG HITAM! GUNAKAN BOOST!
          </div>
        )}

        {hud.pickupToast && (
          <div className="rounded-full border border-emerald-400/70 bg-emerald-950/85 px-4 py-1 font-display text-xs font-bold text-emerald-300 shadow-lg">
            {hud.pickupToast}
          </div>
        )}

        {/* Active Power-Up Badges */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {hud.buffs.shieldActiveTimer > 0 && (
            <span className="rounded bg-cyan-500/30 border border-cyan-300 px-2 py-0.5 text-[10px] font-bold text-cyan-100">
              SHIELD {hud.buffs.shieldActiveTimer.toFixed(1)}s
            </span>
          )}
          {hud.buffs.rapidFireTimer > 0 && (
            <span className="rounded bg-yellow-500/30 border border-yellow-300 px-2 py-0.5 text-[10px] font-bold text-yellow-100">
              RAPID FIRE {hud.buffs.rapidFireTimer.toFixed(1)}s
            </span>
          )}
          {hud.buffs.doubleLaserTimer > 0 && (
            <span className="rounded bg-blue-500/30 border border-blue-300 px-2 py-0.5 text-[10px] font-bold text-blue-100">
              DOUBLE LASER {hud.buffs.doubleLaserTimer.toFixed(1)}s
            </span>
          )}
          {hud.buffs.tripleShotTimer > 0 && (
            <span className="rounded bg-fuchsia-500/30 border border-fuchsia-300 px-2 py-0.5 text-[10px] font-bold text-fuchsia-100">
              TRIPLE SHOT {hud.buffs.tripleShotTimer.toFixed(1)}s
            </span>
          )}
          {hud.buffs.speedBoostTimer > 0 && (
            <span className="rounded bg-orange-500/30 border border-orange-300 px-2 py-0.5 text-[10px] font-bold text-orange-100">
              SPEED BOOST {hud.buffs.speedBoostTimer.toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      {/* Bottom spacer reserved for VirtualControls */}
      <div className="h-32 sm:h-36" />
    </div>
  );
};
