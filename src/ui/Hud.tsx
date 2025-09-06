// src/ui/Hud.tsx
import { useEffect, useRef } from "react";
import { useGame } from "../state/store";
import Sparkline from "./components/Sparkline";

export default function Hud() {
  const {
    game,
    running,
    start,
    pause,
    restart,
    toggleSpeed,
    startWave,
    selectTowerType,
    towerCost,
    build,
    isWaveActive,
    canStartWave,
    getSelectedTower,
    canUpgradeSelected,
    upgradeSelected,
    clearSelection,
  } = useGame();

  const waveActive = isWaveActive();
  const startWaveEnabled = canStartWave();

  const affordable = (k: "arrow" | "cannon" | "frost") =>
    game.money >= towerCost(k);
  const btnCls = (active?: boolean, disabled?: boolean) =>
    `btn ${active ? "dark" : ""} ${disabled ? "disabled" : ""}`;

  const selected = getSelectedTower();
  const { ok: canUpgrade, cost: upCost } = canUpgradeSelected();

  // --- простая телеметрия (для графиков) ---
  const moneyRef = useRef<number[]>([]);
  const livesRef = useRef<number[]>([]);
  const lastTRef = useRef<number>(-1);

  // Семплируем раз в ~0.25с по времени симуляции
  useEffect(() => {
    if (lastTRef.current < 0) lastTRef.current = game.time;
    if (game.time - lastTRef.current >= 0.25 || !running) {
      lastTRef.current = game.time;
      moneyRef.current = [...moneyRef.current, game.money].slice(-80);
      livesRef.current = [...livesRef.current, game.lives].slice(-80);
    }
  }, [game.time, game.money, game.lives, running]);

  return (
    <div className="hud">
      <div className="card">
        <div className="label">HUD</div>
        <div className="row">
          <span>Money</span>
          <b>{game.money}</b>
        </div>
        <div className="row">
          <span>Lives</span>
          <b>{game.lives}</b>
        </div>
        <div className="row">
          <span>Wave</span>
          <b>{game.waveIndex + 1}</b>
        </div>
        <div className="row">
          <span>Speed</span>
          <b>{game.speedMult}×</b>
        </div>
        <div className="row">
          <span>Status</span>
          <b>
            {game.lives > 0
              ? running
                ? waveActive
                  ? "In wave"
                  : "Idle"
                : "Paused"
              : "Game Over"}
          </b>
        </div>
      </div>

      {/* Графики */}
      <div className="card">
        <div className="label">Stats</div>
        <Sparkline data={moneyRef.current} label="Money" />
        <div style={{ height: 8 }} />
        <Sparkline data={livesRef.current} label="Lives" />
      </div>

      <div className="grid2 card">
        {running ? (
          <button onClick={pause} className="btn dark">
            Pause
          </button>
        ) : (
          <button onClick={start} className="btn dark">
            Start
          </button>
        )}
        <button onClick={restart} className="btn">
          Restart
        </button>
        <button onClick={toggleSpeed} className="btn">
          Speed ×2
        </button>
        <button
          onClick={startWave}
          className="btn green"
          disabled={!startWaveEnabled}
          title={waveActive ? "Wave in progress" : "Start next wave"}
        >
          Start wave
        </button>
      </div>

      <div className="card">
        <div className="label">Build</div>
        <div className="grid3">
          <button
            className={btnCls(build.selected === "arrow")}
            onClick={() => selectTowerType("arrow")}
            title={`Cost ${towerCost("arrow")}`}
          >
            Arrow · {towerCost("arrow")}
          </button>

          <button
            className={btnCls(
              build.selected === "cannon",
              !affordable("cannon")
            )}
            onClick={() => affordable("cannon") && selectTowerType("cannon")}
            title={
              affordable("cannon")
                ? `Cost ${towerCost("cannon")}`
                : "Not enough money"
            }
            disabled={!affordable("cannon")}
          >
            Cannon · {towerCost("cannon")}
          </button>

          <button
            className={btnCls(build.selected === "frost", !affordable("frost"))}
            onClick={() => affordable("frost") && selectTowerType("frost")}
            title={
              affordable("frost")
                ? `Cost ${towerCost("frost")}`
                : "Not enough money"
            }
            disabled={!affordable("frost")}
          >
            Frost · {towerCost("frost")}
          </button>
        </div>
        <div className="hint">
          Клик по пустой клетке — построить. Клик по башне — выделить.
        </div>
      </div>

      {selected && (
        <div className="card">
          <div className="label">Selected tower</div>
          <div className="row">
            <span>Type</span>
            <b>{selected.kind}</b>
          </div>
          <div className="row">
            <span>Tier</span>
            <b>{selected.tier}/3</b>
          </div>
          <div className="row">
            <span>Damage</span>
            <b>{selected.damage}</b>
          </div>
          <div className="row">
            <span>Rate</span>
            <b>{selected.rate.toFixed(2)} /s</b>
          </div>
          <div className="row">
            <span>Range</span>
            <b>{selected.range.toFixed(1)}</b>
          </div>
          <div className="grid2" style={{ marginTop: 8 }}>
            <button
              onClick={upgradeSelected}
              className="btn green"
              disabled={!canUpgrade}
              title={
                canUpgrade
                  ? `Upgrade cost ${upCost}`
                  : "Max tier / not enough money"
              }
            >
              Upgrade {canUpgrade ? `(${upCost})` : ""}
            </button>
            <button onClick={clearSelection} className="btn">
              Deselect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
