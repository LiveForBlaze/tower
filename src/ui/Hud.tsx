import { useGame } from "../state/store";

export default function Hud() {
  const {
    game,
    running,
    start,
    pause,
    restart,
    toggleSpeed,
    startWave,
    selectTower,
    towerCost,
    build,
  } = useGame();
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
          <b>{Math.min(game.waveIndex + 1, 3)}</b>
        </div>
        <div className="row">
          <span>Speed</span>
          <b>{game.speedMult}×</b>
        </div>
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
        <button onClick={startWave} disabled={!running} className="btn green">
          Start wave
        </button>
      </div>

      <div className="card">
        <div className="label">Build</div>
        <div className="grid3">
          <button
            className={`btn ${build.selected === "arrow" ? "dark" : ""}`}
            onClick={() => selectTower("arrow")}
            title={`Cost ${towerCost("arrow")}`}
          >
            Arrow · {towerCost("arrow")}
          </button>
          <button
            className={`btn ${build.selected === "cannon" ? "dark" : ""}`}
            onClick={() => selectTower("cannon")}
            title={`Cost ${towerCost("cannon")}`}
          >
            Cannon · {towerCost("cannon")}
          </button>
          <button
            className={`btn ${build.selected === "frost" ? "dark" : ""}`}
            onClick={() => selectTower("frost")}
            title={`Cost ${towerCost("frost")}`}
          >
            Frost · {towerCost("frost")}
          </button>
        </div>
        <div className="hint">
          Клик по свободной клетке размещает выбранную башню
        </div>
        <div className="row">
          <span>Status</span>
          <b>{game.lives > 0 ? "Playing" : "Game Over"}</b>
        </div>
      </div>
    </div>
  );
}
