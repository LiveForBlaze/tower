import { useEffect, useRef, useState } from "react";
import { useGame } from "../state/store";
import { drawGame, tilePx } from "../renderers/canvas";
import Hud from "./Hud";
import { TICK_DT } from "../engine/sim";

export default function App() {
  const { game, running, tick, placeTower, canBuild } = useGame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  const accRef = useRef<number>(0);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  // Игровой цикл — только когда running=true
  useEffect(() => {
    const loop = (now: number) => {
      if (lastRef.current === 0) lastRef.current = now;
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      accRef.current += Math.min(dt, 0.25);
      while (accRef.current >= TICK_DT) {
        tick(TICK_DT);
        accRef.current -= TICK_DT;
      }
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) drawGame(ctx, game, hover);
      rafRef.current = requestAnimationFrame(loop);
    };
    if (running) {
      rafRef.current = requestAnimationFrame(loop);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = 0;
      accRef.current = 0;
    };
  }, [running, tick, game, hover]);

  // Рисуем один кадр сразу (на паузе)
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawGame(ctx, game, hover);
  }, [game, hover]);

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const tile = { x: Math.floor(px / tilePx()), y: Math.floor(py / tilePx()) };
    setHover(tile);
  };

  const onLeave = () => setHover(null);
  const onClick = () => {
    if (hover && canBuild(hover)) placeTower(hover);
  };

  return (
    <div className="page">
      <div className="header">
        <h1>React TD</h1>
      </div>
      <div className="content">
        <canvas
          ref={canvasRef}
          width={game.grid.width * tilePx()}
          height={game.grid.height * tilePx()}
          className="board"
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          onClick={onClick}
        />
        <div className="side">
          <Hud />
        </div>
      </div>
    </div>
  );
}
