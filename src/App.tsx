import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/SoundEngine';
import { GameHUD } from './components/GameHUD';
import {
  HangarScreen,
  HowToPlayModal,
  LevelSelectScreen,
  MainMenuScreen,
  MissionResultModal,
  PauseOverlay,
} from './components/MenuScreens';
import { VirtualControls } from './components/VirtualJoystick';
import {
  AIRCRAFT_LIST,
  getAircraftById,
  getUpgradeCost,
  LEVELS,
  loadSaveData,
  persistSaveData,
} from './data/gameData';
import { SpaceBattleEngine } from './three/SpaceBattleEngine';
import {
  AircraftId,
  HudSnapshot,
  MissionEndResult,
  SaveGameData,
  UpgradeLevels,
} from './types/game';

type ActiveScreen = 'menu' | 'levels' | 'hangar' | 'playing';

const INITIAL_HUD: HudSnapshot = {
  health: 130,
  maxHealth: 130,
  shield: 85,
  maxShield: 85,
  boostEnergy: 100,
  missiles: 6,
  maxMissiles: 6,
  missileCooldown: 0,
  shieldCooldown: 0,
  score: 0,
  creditsEarned: 0,
  enemiesDestroyed: 0,
  levelId: 1,
  levelTitle: 'FIRST CONTACT',
  missionObjective: '',
  progressPercent: 0,
  elapsedSeconds: 0,
  remainingSeconds: null,
  stationHp: null,
  stationMaxHp: null,
  blackHolePullWarning: false,
  bossName: null,
  bossHp: null,
  bossMaxHp: null,
  bossPhase: null,
  bossSubsystemsRemaining: null,
  waveCurrent: null,
  waveTotal: null,
  alertBanner: null,
  pickupToast: null,
  buffs: {
    rapidFireTimer: 0,
    doubleLaserTimer: 0,
    tripleShotTimer: 0,
    speedBoostTimer: 0,
    shieldActiveTimer: 0,
  },
  pilotLevel: 1,
  mkTierLabel: 'MK-I',
};

export function App() {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SpaceBattleEngine | null>(null);

  const [save, setSave] = useState<SaveGameData>(() => loadSaveData());
  const saveRef = useRef<SaveGameData>(save);
  saveRef.current = save;

  const [screen, setScreen] = useState<ActiveScreen>('menu');
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [missionResult, setMissionResult] = useState<MissionEndResult | null>(null);

  // Track separate joystick vs keyboard vectors so neither overwrites the other
  const joyVecRef = useRef({ x: 0, y: 0, mag: 0, deg: 0 });
  const keysPressedRef = useRef<Set<string>>(new Set());
  const touchFiringRef = useRef(false);
  const touchBoostingRef = useRef(false);

  const updateSave = useCallback((updater: (prev: SaveGameData) => SaveGameData) => {
    setSave((prev) => {
      const next = updater(prev);
      persistSaveData(next);
      return next;
    });
  }, []);

  // Sync Audio Engine configuration
  useEffect(() => {
    soundEngine.configure(save.soundEnabled, save.musicVolume, save.sfxVolume);
  }, [save.soundEnabled, save.musicVolume, save.sfxVolume]);

  // Unlock Web Audio on first user interaction
  useEffect(() => {
    const unlockAudio = () => {
      soundEngine.unlock();
      if (screen !== 'playing') {
        soundEngine.setMusicMode('menu');
      }
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [screen]);

  const handleMissionEnd = useCallback(
    (rawResult: MissionEndResult) => {
      const currentSave = saveRef.current;
      let nextPilotLevel = currentSave.pilotLevel;
      let newlyUnlockedJetName: string | null = null;

      if (rawResult.victory) {
        // Advancing levels automatically increases Pilot/Aircraft Level & Capabilities!
        nextPilotLevel = Math.max(currentSave.pilotLevel, rawResult.levelId + 1);
        const unlockedJet = AIRCRAFT_LIST.find(
          (a) =>
            a.unlockAtLevel > currentSave.pilotLevel &&
            a.unlockAtLevel <= nextPilotLevel &&
            !currentSave.unlockedAircraft.includes(a.id)
        );
        if (unlockedJet) {
          newlyUnlockedJetName = unlockedJet.name;
        }
      }

      const enrichedResult: MissionEndResult = {
        ...rawResult,
        previousPilotLevel: currentSave.pilotLevel,
        newPilotLevel: nextPilotLevel,
        newlyUnlockedJetName,
      };

      updateSave((prev) => {
        const nextUnlockedLevel = rawResult.victory
          ? Math.min(LEVELS.length, Math.max(prev.unlockedLevel, rawResult.levelId + 1))
          : prev.unlockedLevel;

        const autoUnlockedJets = AIRCRAFT_LIST.filter(
          (a) => a.unlockAtLevel <= nextPilotLevel
        ).map((a) => a.id);
        const mergedAircraft = Array.from(
          new Set([...prev.unlockedAircraft, ...autoUnlockedJets])
        );

        const prevBest = prev.levelHighScores[rawResult.levelId] || 0;

        return {
          ...prev,
          unlockedLevel: nextUnlockedLevel,
          lastPlayedLevel: rawResult.victory ? nextUnlockedLevel : rawResult.levelId,
          pilotLevel: nextPilotLevel,
          credits: prev.credits + rawResult.creditsEarned,
          unlockedAircraft: mergedAircraft,
          levelHighScores: {
            ...prev.levelHighScores,
            [rawResult.levelId]: Math.max(prevBest, rawResult.totalScore),
          },
        };
      });

      setMissionResult(enrichedResult);
    },
    [updateSave]
  );

  // Initialize Three.js SpaceBattleEngine once
  useEffect(() => {
    if (!canvasHostRef.current) return;
    const engine = new SpaceBattleEngine(
      canvasHostRef.current,
      (snapshot) => setHud(snapshot),
      handleMissionEnd
    );
    engineRef.current = engine;

    const initialSave = saveRef.current;
    engine.setAircraftConfig(
      initialSave.selectedAircraft,
      initialSave.pilotLevel,
      initialSave.upgrades[initialSave.selectedAircraft]
    );
    engine.enterShowcase('menu');

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [handleMissionEnd]);

  // Keep 3D Hangar/Menu showcase aircraft updated whenever selection, pilotLevel, or upgrades change
  useEffect(() => {
    if (!engineRef.current || screen === 'playing') return;
    engineRef.current.setAircraftConfig(
      save.selectedAircraft,
      save.pilotLevel,
      save.upgrades[save.selectedAircraft]
    );
    engineRef.current.setShowcaseStyle(screen === 'hangar' ? 'hangar' : 'menu');
  }, [save.selectedAircraft, save.pilotLevel, save.upgrades, screen]);

  const syncCombinedMovementToEngine = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const keys = keysPressedRef.current;
    let kx = 0;
    let ky = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) kx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) kx += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) ky += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) ky -= 1;

    if (kx !== 0 && ky !== 0) {
      const inv = 1 / Math.SQRT2;
      kx *= inv;
      ky *= inv;
    }

    // Prefer active analog joystick if moved, otherwise keyboard vector
    const j = joyVecRef.current;
    const useJoy = j.mag > 0.04;
    const finalX = useJoy ? j.x : kx;
    const finalY = useJoy ? j.y : ky;
    const finalMag = useJoy ? j.mag : Math.min(1, Math.hypot(kx, ky));
    const finalDeg = useJoy
      ? j.deg
      : finalMag > 0
      ? Math.round(((Math.atan2(finalY, finalX) * 180) / Math.PI + 360) % 360)
      : 0;

    const kbFire = keys.has('Space');
    const kbBoost = keys.has('ShiftLeft') || keys.has('ShiftRight');

    engine.updateControlInput({
      moveX: finalX,
      moveY: finalY,
      magnitude: finalMag,
      angleDeg: finalDeg,
      firing: touchFiringRef.current || kbFire,
      boosting: touchBoostingRef.current || kbBoost,
    });
  }, []);

  // Desktop Keyboard Controls (WASD / Arrows + Space, Shift, E, Q, Esc)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'playing') return;

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (!missionResult) {
          setPaused((prev) => {
            const next = !prev;
            engineRef.current?.setPaused(next);
            return next;
          });
        }
        return;
      }

      if (
        [
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Space',
          'ShiftLeft',
          'ShiftRight',
        ].includes(e.code)
      ) {
        e.preventDefault();
        keysPressedRef.current.add(e.code);
        syncCombinedMovementToEngine();
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        engineRef.current?.triggerMissileOnce();
      } else if (e.code === 'KeyQ') {
        e.preventDefault();
        engineRef.current?.triggerShieldOnce();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (keysPressedRef.current.has(e.code)) {
        keysPressedRef.current.delete(e.code);
        syncCombinedMovementToEngine();
      }
    };

    const onBlur = () => {
      keysPressedRef.current.clear();
      touchFiringRef.current = false;
      touchBoostingRef.current = false;
      joyVecRef.current = { x: 0, y: 0, mag: 0, deg: 0 };
      syncCombinedMovementToEngine();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [screen, missionResult, syncCombinedMovementToEngine]);

  const launchLevel = useCallback(
    (levelId: number) => {
      soundEngine.unlock();
      const s = saveRef.current;
      updateSave((prev) => ({ ...prev, lastPlayedLevel: levelId }));

      setMissionResult(null);
      setPaused(false);
      setScreen('playing');

      keysPressedRef.current.clear();
      touchFiringRef.current = false;
      touchBoostingRef.current = false;
      joyVecRef.current = { x: 0, y: 0, mag: 0, deg: 0 };

      engineRef.current?.startMission(
        levelId,
        s.selectedAircraft,
        s.pilotLevel,
        s.upgrades[s.selectedAircraft]
      );
    },
    [updateSave]
  );

  const returnToMenu = useCallback(
    (target: 'menu' | 'hangar' = 'menu') => {
      setMissionResult(null);
      setPaused(false);
      setScreen(target);
      engineRef.current?.enterShowcase(target === 'hangar' ? 'hangar' : 'menu');
    },
    []
  );

  const handleToggleSound = useCallback(() => {
    soundEngine.unlock();
    updateSave((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  }, [updateSave]);

  const handleChangeVolume = useCallback(
    (musicVolume: number, sfxVolume: number) => {
      soundEngine.unlock();
      updateSave((prev) => ({ ...prev, musicVolume, sfxVolume }));
    },
    [updateSave]
  );

  const handleSelectAircraft = useCallback(
    (id: AircraftId) => {
      const jet = getAircraftById(id);
      const isOwned =
        saveRef.current.unlockedAircraft.includes(id) ||
        saveRef.current.pilotLevel >= jet.unlockAtLevel;

      // Always preview in 3D Hangar; persist as selected if owned!
      engineRef.current?.setAircraftConfig(
        id,
        saveRef.current.pilotLevel,
        saveRef.current.upgrades[id]
      );
      if (isOwned) {
        updateSave((prev) => ({ ...prev, selectedAircraft: id }));
      }
    },
    [updateSave]
  );

  const handleUnlockAircraft = useCallback(
    (id: AircraftId) => {
      const spec = getAircraftById(id);
      if (saveRef.current.credits < spec.unlockCost) return;
      soundEngine.playPowerUp(false);
      updateSave((prev) => ({
        ...prev,
        credits: prev.credits - spec.unlockCost,
        selectedAircraft: id,
        unlockedAircraft: Array.from(new Set([...prev.unlockedAircraft, id])),
      }));
    },
    [updateSave]
  );

  const handleUpgradeStat = useCallback(
    (id: AircraftId, key: keyof UpgradeLevels) => {
      const curTier = saveRef.current.upgrades[id][key];
      if (curTier >= 5) return;
      const cost = getUpgradeCost(key, curTier);
      if (saveRef.current.credits < cost) return;

      soundEngine.playPowerUp(false);
      updateSave((prev) => ({
        ...prev,
        credits: prev.credits - cost,
        upgrades: {
          ...prev.upgrades,
          [id]: {
            ...prev.upgrades[id],
            [key]: curTier + 1,
          },
        },
      }));
    },
    [updateSave]
  );

  const activeAircraftSpec = getAircraftById(save.selectedAircraft);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950 select-none">
      {/* FULLSCREEN 3D THREE.JS WEBGL WORLD */}
      <div ref={canvasHostRef} className="fixed inset-0 z-0 h-full w-full" />

      {/* MAIN MENU */}
      {screen === 'menu' && (
        <MainMenuScreen
          save={save}
          onStartNewOrCurrent={() => launchLevel(1)}
          onContinueGame={() => launchLevel(save.lastPlayedLevel || save.unlockedLevel)}
          onOpenLevels={() => setScreen('levels')}
          onOpenHangar={() => setScreen('hangar')}
          onOpenHowToPlay={() => setShowHowToPlay(true)}
          onToggleSound={handleToggleSound}
          onChangeVolume={handleChangeVolume}
        />
      )}

      {/* LEVEL SELECT */}
      {screen === 'levels' && (
        <LevelSelectScreen
          save={save}
          onSelectLevel={(lvlId) => launchLevel(lvlId)}
          onBack={() => setScreen('menu')}
        />
      )}

      {/* 3D HANGAR & AIRCRAFT UPGRADES */}
      {screen === 'hangar' && (
        <HangarScreen
          save={save}
          onSelectAircraft={handleSelectAircraft}
          onUnlockAircraft={handleUnlockAircraft}
          onUpgradeStat={handleUpgradeStat}
          onRotateJet={(rad) => engineRef.current?.addHangarYaw(rad)}
          onStartMission={() => launchLevel(save.lastPlayedLevel || save.unlockedLevel)}
          onBack={() => {
            // Ensure 3D model reverts to owned selected aircraft when exiting Hangar
            engineRef.current?.setAircraftConfig(
              save.selectedAircraft,
              save.pilotLevel,
              save.upgrades[save.selectedAircraft]
            );
            setScreen('menu');
          }}
        />
      )}

      {/* ACTIVE GAMEPLAY HUD + MULTITOUCH 360° JOYSTICK & ACTION BUTTONS */}
      {screen === 'playing' && (
        <>
          <GameHUD
            hud={hud}
            aircraftName={activeAircraftSpec.name}
            soundEnabled={save.soundEnabled}
            onToggleSound={handleToggleSound}
            onPause={() => {
              setPaused(true);
              engineRef.current?.setPaused(true);
            }}
          />

          {!paused && !missionResult && (
            <VirtualControls
              onJoystickMove={(mx, my, mag, deg) => {
                joyVecRef.current = { x: mx, y: my, mag, deg };
                syncCombinedMovementToEngine();
              }}
              onFireChange={(firing) => {
                touchFiringRef.current = firing;
                syncCombinedMovementToEngine();
              }}
              onBoostChange={(boosting) => {
                touchBoostingRef.current = boosting;
                syncCombinedMovementToEngine();
              }}
              onMissilePress={() => engineRef.current?.triggerMissileOnce()}
              onShieldPress={() => engineRef.current?.triggerShieldOnce()}
              missiles={hud.missiles}
              missileCooldown={hud.missileCooldown}
              shieldCooldown={hud.shieldCooldown}
              boostEnergy={hud.boostEnergy}
              shieldActive={hud.buffs.shieldActiveTimer > 0}
            />
          )}

          {paused && !missionResult && (
            <PauseOverlay
              onResume={() => {
                setPaused(false);
                engineRef.current?.setPaused(false);
              }}
              onRestart={() => launchLevel(hud.levelId)}
              onQuitToMenu={() => returnToMenu('menu')}
            />
          )}

          {missionResult && (
            <MissionResultModal
              result={missionResult}
              onNextLevel={() => launchLevel(Math.min(LEVELS.length, missionResult.levelId + 1))}
              onRetry={() => launchLevel(missionResult.levelId)}
              onOpenHangar={() => returnToMenu('hangar')}
              onMainMenu={() => returnToMenu('menu')}
            />
          )}
        </>
      )}

      {/* HOW TO PLAY GUIDE MODAL */}
      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
    </div>
  );
}

export default App;
