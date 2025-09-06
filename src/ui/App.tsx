import { useEffect, useRef, useState } from "react";
import { useGame } from "../state/store";
import { drawGame, tilePx, setTilePx } from "../renderers/canvas";
import Hud from "./Hud";
import { TICK_DT } from "../engine/sim";
import { preloadTowerBitmaps, type TowerBitmaps } from "../assets/towerImages";
import { preloadMobBitmaps, type MobBitmaps } from "../assets/mobImages";

export default function App() {
  const { running, canBuild, placeTower, selectAt, build } = useGame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  const accRef = useRef<number>(0);

  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const hoverRef = useRef<typeof hover>(null);
  useEffect(() => {
    hoverRef.current = hover;
  }, [hover]);

  const [towerImages, setTowerImages] = useState<TowerBitmaps | null>(null);
  const towerImagesRef = useRef<TowerBitmaps | null>(null);
  useEffect(() => {
    towerImagesRef.current = towerImages;
  }, [towerImages]);

  const [mobImages, setMobImages] = useState<MobBitmaps | null>(null);
  const mobImagesRef = useRef<MobBitmaps | null>(null);
  useEffect(() => {
    mobImagesRef.current = mobImages;
  }, [mobImages]);

  // крупнее тайл
  useEffect(() => {
    setTilePx(64);
  }, []);

  // предзагрузка ассетов (один раз)
  useEffect(() => {
    let alive = true;
    (async () => {
      const [t, m] = await Promise.all([
        preloadTowerBitmaps(),
        preloadMobBitmaps(),
      ]);
      if (!alive) return;
      setTowerImages(t);
      setMobImages(m);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Hi-DPI размер канваса
  const resizeCanvas = () => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    // ширину/высоту берём из актуального game, а не из пропсов компонента
    const { game } = useGame.getState();
    const wCss = game.grid.width * tilePx();
    const hCss = game.grid.height * tilePx();
    c.width = Math.floor(wCss * dpr);
    c.height = Math.floor(hCss * dpr);
    c.style.width = `${wCss}px`;
    c.style.height = `${hCss}px`;
  };
  useEffect(() => {
    resizeCanvas();
    const onResize = () => resizeCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // главный цикл — зависит ТОЛЬКО от running
  useEffect(() => {
    if (!running) return;

    const loop = (now: number) => {
      if (lastRef.current === 0) lastRef.current = now;
      let dt = (now - lastRef.current) / 1000;
      lastRef.current = now;

      // защитимся от вкладки в бэкграунде
      dt = Math.min(dt, 0.25);

      accRef.current += dt;
      const { tick } = useGame.getState();
      while (accRef.current >= TICK_DT) {
        tick(TICK_DT);
        accRef.current -= TICK_DT;
      }

      // рисуем всегда по актуальному состоянию стора
      const { game, selected } = useGame.getState();
      const selectedTile = selected?.towerId
        ? game.towers.find((t) => t.id === selected.towerId)?.tile ?? null
        : null;

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        drawGame(
          ctx,
          game,
          hoverRef.current,
          towerImagesRef.current ?? undefined,
          mobImagesRef.current ?? undefined,
          selectedTile
        );
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = 0;
      accRef.current = 0;
    };
  }, [running]);

  // подрисовать кадр на паузе / после загрузки картинок / при первом маунте
  useEffect(() => {
    const { game, selected } = useGame.getState();
    const selectedTile = selected?.towerId
      ? game.towers.find((t) => t.id === selected.towerId)?.tile ?? null
      : null;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      drawGame(
        ctx,
        game,
        hoverRef.current,
        towerImagesRef.current ?? undefined,
        mobImagesRef.current ?? undefined,
        selectedTile
      );
    }
  }, [towerImages, mobImages, hover]); // не включаем "game" сюда!

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const px = e.clientX - rect.left,
      py = e.clientY - rect.top;
    const tile = { x: Math.floor(px / tilePx()), y: Math.floor(py / tilePx()) };
    setHover(tile);
  };
  const onLeave = () => setHover(null);

  const onClick = () => {
    const h = hoverRef.current;
    if (!h) return;
    if (build.selected && canBuild(h)) {
      placeTower(h);
    } else {
      selectAt(h);
    }
  };

  return (
    <div className="page">
      <div className="header">
        <h1>React TD</h1>
      </div>
      <div className="content">
        <canvas
          ref={canvasRef}
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
