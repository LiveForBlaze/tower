// src/renderers/canvas.ts
import type { Game } from "../engine/types";
import type { TowerBitmaps } from "../assets/towerImages";
import type { MobBitmaps } from "../assets/mobImages";

let TILE = 64;
export const tilePx = () => TILE;
export const setTilePx = (px: number) => {
  TILE = px;
};

/** ===== grass pattern cache ===== */
type GrassCache = { pattern: CanvasPattern; dpr: number };
let grassCache: GrassCache | null = null;

function buildGrassPattern(dpr: number): GrassCache {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = Math.floor(size * dpr);
  c.height = Math.floor(size * dpr);
  const g = c.getContext("2d")!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);

  const base = g.createLinearGradient(0, 0, 0, size);
  base.addColorStop(0, "#2f6f3e");
  base.addColorStop(1, "#2a6337");
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);

  const cell = size / 8;
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      if ((x + y) % 2) {
        g.fillStyle = "rgba(255,255,255,0.04)";
        g.fillRect(x * cell, y * cell, cell, cell);
      }
    }

  g.globalAlpha = 0.08;
  for (let i = 0; i < 40; i++) {
    const r = 10 + Math.random() * 28,
      x = Math.random() * size,
      y = Math.random() * size;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, "rgba(255,255,255,0.35)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;

  g.fillStyle = "rgba(0,0,0,0.10)";
  for (let i = 0; i < 32; i++) {
    const r = 1 + Math.random() * 1.5;
    g.beginPath();
    g.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    g.fill();
  }

  const ctx = document.createElement("canvas").getContext("2d")!;
  const pattern = ctx.createPattern(c, "repeat")!;
  return { pattern, dpr };
}
function getGrassPattern(): CanvasPattern {
  const dpr = window.devicePixelRatio || 1;
  if (!grassCache || grassCache.dpr !== dpr)
    grassCache = buildGrassPattern(dpr);
  return grassCache.pattern;
}

function pathPoints(game: Game, s: number) {
  return game.grid.path.map((p) => ({ x: p.x * s, y: p.y * s }));
}

export function drawGame(
  ctx: CanvasRenderingContext2D,
  game: Game,
  hover: { x: number; y: number } | null,
  towerImages?: TowerBitmaps | null,
  mobImages?: MobBitmaps | null,
  selected?: { x: number; y: number } | null
) {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const s = TILE,
    W = game.grid.width * s,
    H = game.grid.height * s;
  ctx.clearRect(0, 0, W, H);

  // трава
  ctx.fillStyle = getGrassPattern();
  ctx.fillRect(0, 0, W, H);

  // blocked
  const dark = "#16212c";
  for (let y = 0; y < game.grid.height; y++) {
    for (let x = 0; x < game.grid.width; x++) {
      const i = y * game.grid.width + x;
      if (game.grid.tiles[i] !== "blocked") continue;
      const X = x * s,
        Y = y * s;
      ctx.fillStyle = dark;
      ctx.fillRect(X, Y, s, s);
      const edge = ctx.createLinearGradient(X, Y, X, Y + s);
      edge.addColorStop(0, "rgba(255,255,255,0.04)");
      edge.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = edge;
      ctx.fillRect(X, Y, s, s);
    }
  }

  // дорога
  if (game.grid.path.length > 1) {
    const pts = pathPoints(game, s);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = s * 0.78;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    ctx.strokeStyle = "#8b6b42";
    ctx.lineWidth = s * 0.68;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    ctx.strokeStyle = "#a67c52";
    ctx.lineWidth = s * 0.52;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,220,180,0.25)";
    ctx.lineWidth = s * 0.22;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  // снаряды
  ctx.fillStyle = "#fef08a";
  for (const p of game.projectiles) {
    ctx.beginPath();
    ctx.arc(p.pos.x * s, p.pos.y * s, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // мобы — PNG + корректная HP-шкала
  for (const m of game.mobs) {
    const cx = m.pos.x * s,
      cy = m.pos.y * s;
    const size = s * 0.75;

    // спрайт
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    const img =
      m.type === "tank"
        ? mobImages?.tank
        : m.type === "fast"
        ? mobImages?.fast
        : (m as any).type === "flying"
        ? mobImages?.flying
        : mobImages?.normal;
    if (img) {
      ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
    } else {
      ctx.beginPath();
      ctx.fillStyle =
        (m as any).type === "tank"
          ? "#9ca3af"
          : (m as any).type === "fast"
          ? "#60a5fa"
          : "#f87171";
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // === HP бар ===
    // 1) определяем максимальное HP: предпочитаем hpMax, иначе — константа по типу
    const hpMax =
      (m as any).hpMax ??
      ((m as any).type === "tank"
        ? 60
        : (m as any).type === "fast"
        ? 18
        : (m as any).type === "flying"
        ? 22
        : 25);

    const ratio = Math.max(0, Math.min(1, (m.hp as number) / (hpMax || 1)));

    const barW = size * 0.8;
    const barH = 4;
    const bx = cx - barW / 2;
    const by = cy - size * 0.58;

    // фон
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(bx, by, barW, barH);

    // цвет в зависимости от остатка
    ctx.fillStyle =
      ratio > 0.5 ? "#16a34a" : ratio > 0.25 ? "#f59e0b" : "#ef4444";
    ctx.fillRect(bx, by, barW * ratio, barH);
  }

  // башни — PNG (без тировых колец)
  for (const t of game.towers) {
    const cx = (t.tile.x + 0.5) * s,
      cy = (t.tile.y + 0.5) * s;
    const size = s * 0.95;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    const img = towerImages?.[t.kind]?.[t.tier as 1 | 2 | 3];
    if (img) ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
    else {
      ctx.beginPath();
      ctx.fillStyle =
        t.kind === "cannon"
          ? "#6b7280"
          : t.kind === "frost"
          ? "#7dd3fc"
          : "#fde68a";
      ctx.arc(cx, cy, size * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // селект-кружок вокруг выбранной башни
  if (selected) {
    const cx = (selected.x + 0.5) * s,
      cy = (selected.y + 0.5) * s;
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 6;
    ctx.arc(cx, cy, s * 0.58, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // hover
  if (hover) {
    const x = hover.x * s,
      y = hover.y * s;
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
  }
}
