import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Flame, Rocket, Shield, Crosshair } from 'lucide-react';

interface VirtualControlsProps {
  onJoystickMove: (moveX: number, moveY: number, magnitude: number, angleDeg: number) => void;
  onFireChange: (firing: boolean) => void;
  onBoostChange: (boosting: boolean) => void;
  onMissilePress: () => void;
  onShieldPress: () => void;
  missiles: number;
  missileCooldown: number;
  shieldCooldown: number;
  boostEnergy: number;
  shieldActive: boolean;
}

export const VirtualControls: React.FC<VirtualControlsProps> = ({
  onJoystickMove,
  onFireChange,
  onBoostChange,
  onMissilePress,
  onShieldPress,
  missiles,
  missileCooldown,
  shieldCooldown,
  boostEnergy,
  shieldActive,
}) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const firePointerId = useRef<number | null>(null);
  const boostPointerId = useRef<number | null>(null);

  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joyActive, setJoyActive] = useState(false);
  const [angleLabel, setAngleLabel] = useState<number | null>(null);
  const [isFiringTouch, setIsFiringTouch] = useState(false);
  const [isBoostingTouch, setIsBoostingTouch] = useState(false);

  const maxRadius = 52; // max displacement in px from center

  const processJoystickPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = baseRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const rawDx = clientX - cx;
      const rawDy = clientY - cy;
      const dist = Math.hypot(rawDx, rawDy);
      const clampedDist = Math.min(dist, maxRadius);
      const angleRad = Math.atan2(rawDy, rawDx);

      const clampedX = Math.cos(angleRad) * clampedDist;
      const clampedY = Math.sin(angleRad) * clampedDist;

      setKnobOffset({ x: clampedX, y: clampedY });

      // Normalized -1..1 analog values (Up on screen is negative Y -> +1 moveY)
      const normX = Number((clampedX / maxRadius).toFixed(3));
      const normY = Number((-clampedY / maxRadius).toFixed(3));
      const mag = Number((clampedDist / maxRadius).toFixed(3));
      const deg = Math.round(((Math.atan2(-rawDy, rawDx) * 180) / Math.PI + 360) % 360);

      setAngleLabel(mag > 0.08 ? deg : null);
      onJoystickMove(normX, normY, mag, deg);
    },
    [onJoystickMove]
  );

  const resetJoystick = useCallback(() => {
    activePointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    setJoyActive(false);
    setAngleLabel(null);
    onJoystickMove(0, 0, 0, 0);
  }, [onJoystickMove]);

  useEffect(() => {
    const handleGlobalUp = (e: PointerEvent) => {
      if (e.pointerId === activePointerId.current) {
        resetJoystick();
      }
      if (e.pointerId === firePointerId.current) {
        firePointerId.current = null;
        setIsFiringTouch(false);
        onFireChange(false);
      }
      if (e.pointerId === boostPointerId.current) {
        boostPointerId.current = null;
        setIsBoostingTouch(false);
        onBoostChange(false);
      }
    };

    window.addEventListener('pointerup', handleGlobalUp);
    window.addEventListener('pointercancel', handleGlobalUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalUp);
      window.removeEventListener('pointercancel', handleGlobalUp);
    };
  }, [resetJoystick, onFireChange, onBoostChange]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-between px-4 pb-4 sm:px-7 sm:pb-6 touch-none-strict">
      {/* LEFT: 360° ANALOG VIRTUAL JOYSTICK */}
      <div className="pointer-events-auto flex flex-col items-center gap-1.5">
        <div
          ref={baseRef}
          onPointerDown={(e) => {
            if (activePointerId.current !== null) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            activePointerId.current = e.pointerId;
            setJoyActive(true);
            processJoystickPointer(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (e.pointerId !== activePointerId.current) return;
            processJoystickPointer(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (e.pointerId === activePointerId.current) {
              resetJoystick();
            }
          }}
          onPointerCancel={(e) => {
            if (e.pointerId === activePointerId.current) {
              resetJoystick();
            }
          }}
          className={`relative flex h-32 w-32 sm:h-36 sm:w-36 items-center justify-center rounded-full border-2 transition-colors touch-none-strict ${
            joyActive
              ? 'border-sky-400 bg-slate-900/75 shadow-[0_0_28px_rgba(56,189,248,0.55)]'
              : 'border-sky-500/45 bg-slate-950/60 shadow-[0_0_15px_rgba(14,165,233,0.25)]'
          } backdrop-blur-md`}
        >
          {/* Compass crosshairs & 360° degree ring */}
          <div className="pointer-events-none absolute inset-2.5 rounded-full border border-dashed border-sky-400/30" />
          <div className="pointer-events-none absolute h-full w-px bg-sky-400/15" />
          <div className="pointer-events-none absolute h-px w-full bg-sky-400/15" />

          {/* Direction markers */}
          <span className="pointer-events-none absolute top-1.5 text-[9px] font-bold text-sky-300/70">
            N
          </span>
          <span className="pointer-events-none absolute bottom-1.5 text-[9px] font-bold text-sky-300/70">
            S
          </span>
          <span className="pointer-events-none absolute left-2 text-[9px] font-bold text-sky-300/70">
            W
          </span>
          <span className="pointer-events-none absolute right-2 text-[9px] font-bold text-sky-300/70">
            E
          </span>

          {/* Analog Center Thumb Stick */}
          <div
            style={{
              transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`,
              transition: jaySpring(joyActive),
            }}
            className={`pointer-events-none flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 ${
              joyActive
                ? 'border-cyan-200 bg-gradient-to-br from-sky-400 to-blue-600 shadow-[0_0_22px_rgba(56,189,248,0.9)]'
                : 'border-sky-300/70 bg-gradient-to-br from-sky-500/80 to-slate-800/90 shadow-lg'
            }`}
          >
            <div className="h-5 w-5 rounded-full bg-white/80 shadow-inner" />
          </div>
        </div>

        <div className="rounded-full bg-slate-950/75 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-sky-300/90 border border-sky-500/25">
          {angleLabel !== null ? `ANALOG ${angleLabel}°` : '360° JOYSTICK / WASD'}
        </div>
      </div>

      {/* RIGHT: MULTITOUCH ACTION CLUSTER (FIRE, MISSILE, BOOST, SHIELD) */}
      <div className="pointer-events-auto relative flex flex-col items-end gap-2.5">
        {/* Upper Arc: SHIELD + BOOST + MISSILE */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* SHIELD BUTTON (Q) */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onShieldPress();
            }}
            disabled={shieldCooldown > 0 && !shieldActive}
            className={`relative flex h-13 w-13 sm:h-14 sm:w-14 flex-col items-center justify-center rounded-full border-2 font-display text-[10px] font-bold transition active:scale-95 touch-none-strict ${
              shieldActive
                ? 'border-cyan-300 bg-cyan-500/40 text-white shadow-[0_0_20px_rgba(34,211,238,0.85)]'
                : shieldCooldown > 0
                ? 'border-slate-700 bg-slate-900/70 text-slate-500'
                : 'border-cyan-400/75 bg-slate-900/80 text-cyan-300 hover:bg-cyan-500/25 shadow-[0_0_14px_rgba(34,211,238,0.35)]'
            }`}
          >
            <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="mt-0.5 text-[9px] leading-none">
              {shieldCooldown > 0 && !shieldActive ? `${Math.ceil(shieldCooldown)}s` : 'SHIELD'}
            </span>
            <span className="hidden sm:block text-[8px] text-cyan-200/70">[Q]</span>
          </button>

          {/* BOOST BUTTON (Hold Shift / Touch) */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              boostPointerId.current = e.pointerId;
              setIsBoostingTouch(true);
              onBoostChange(true);
            }}
            onPointerUp={(e) => {
              if (e.pointerId === boostPointerId.current) {
                boostPointerId.current = null;
                setIsBoostingTouch(false);
                onBoostChange(false);
              }
            }}
            onPointerCancel={(e) => {
              if (e.pointerId === boostPointerId.current) {
                boostPointerId.current = null;
                setIsBoostingTouch(false);
                onBoostChange(false);
              }
            }}
            className={`relative flex h-13 w-13 sm:h-14 sm:w-14 flex-col items-center justify-center rounded-full border-2 font-display text-[10px] font-bold transition active:scale-95 touch-none-strict ${
              isBoostingTouch
                ? 'border-amber-300 bg-amber-500/45 text-white shadow-[0_0_24px_rgba(245,158,11,0.9)]'
                : boostEnergy < 10
                ? 'border-slate-700 bg-slate-900/70 text-slate-500'
                : 'border-amber-400/80 bg-slate-900/80 text-amber-300 hover:bg-amber-500/25 shadow-[0_0_14px_rgba(245,158,11,0.35)]'
            }`}
          >
            <Flame className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="mt-0.5 text-[9px] leading-none">BOOST</span>
            <span className="hidden sm:block text-[8px] text-amber-200/70">[SHIFT]</span>
          </button>

          {/* MISSILE BUTTON (E) */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onMissilePress();
            }}
            disabled={missiles <= 0 || missileCooldown > 0}
            className={`relative flex h-14 w-14 sm:h-15 sm:w-15 flex-col items-center justify-center rounded-full border-2 font-display text-[10px] font-bold transition active:scale-95 touch-none-strict ${
              missiles <= 0
                ? 'border-slate-700 bg-slate-900/70 text-slate-500'
                : 'border-rose-400/85 bg-slate-900/85 text-rose-300 hover:bg-rose-500/25 shadow-[0_0_16px_rgba(244,63,94,0.45)]'
            }`}
          >
            <Rocket className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="mt-0.5 text-[9px] leading-none">MISSILE</span>
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white shadow">
              {missiles}
            </span>
          </button>
        </div>

        {/* Main Primary FIRE LASER Button (Space / Hold Touch) */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            firePointerId.current = e.pointerId;
            setIsFiringTouch(true);
            onFireChange(true);
          }}
          onPointerUp={(e) => {
            if (e.pointerId === firePointerId.current) {
              firePointerId.current = null;
              setIsFiringTouch(false);
              onFireChange(false);
            }
          }}
          onPointerCancel={(e) => {
            if (e.pointerId === firePointerId.current) {
              firePointerId.current = null;
              setIsFiringTouch(false);
              onFireChange(false);
            }
          }}
          className={`flex h-20 w-20 sm:h-24 sm:w-24 flex-col items-center justify-center rounded-full border-2 font-display font-extrabold tracking-wider transition active:scale-95 touch-none-strict ${
            isFiringTouch
              ? 'border-white bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-[0_0_34px_rgba(244,63,94,0.95)]'
              : 'border-sky-300/85 bg-gradient-to-br from-sky-500/80 to-blue-800/90 text-white shadow-[0_0_22px_rgba(56,189,248,0.55)]'
          }`}
        >
          <Crosshair className="h-7 w-7 sm:h-8 sm:w-8" />
          <span className="mt-0.5 text-xs sm:text-sm">FIRE</span>
          <span className="hidden sm:block text-[9px] font-normal text-sky-100/80">[SPACE]</span>
        </button>
      </div>
    </div>
  );
};

function jaySpring(active: boolean): string {
  return active ? 'none' : 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1)';
}
