import type { Game } from "../engine/types";

const TILE_PX = 36;

export function tilePx() {
  return TILE_PX;
}

export function drawGame(
  ctx: CanvasRenderingContext2D,
  g: Game,
  hover: { x: number; y: number } | null,
  placing?: { kind: string } | null
) {
  const W = g.grid.width * TILE_PX;
  const H = g.grid.height * TILE_PX;
  ctx.clearRect(0, 0, W, H);

  // Сетка + фон
  for (let y = 0; y < g.grid.height; y++) {
    for (let x = 0; x < g.grid.width; x++) {
      const t = g.grid.tiles[y * g.grid.width + x];
      ctx.fillStyle =
        t === "path" ? "#e2e8f0" : t === "blocked" ? "#334155" : "#f8fafc";
      ctx.fillRect(x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
      ctx.strokeStyle = "#cbd5e1";
      ctx.strokeRect(x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
    }
  }

  // Башни
  for (const t of g.towers) {
    const cx = (t.tile.x + 0.5) * TILE_PX;
    const cy = (t.tile.y + 0.5) * TILE_PX;
    // радиус
    ctx.beginPath();
    ctx.arc(cx, cy, t.range * TILE_PX, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(30, 64, 175, 0.2)";
    ctx.lineWidth = 2;
    ctx.stroke();
    // корпус
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fillStyle =
      t.kind === "cannon"
        ? "#ef4444"
        : t.kind === "frost"
        ? "#22c55e"
        : "#0ea5e9";
    ctx.fill();
  }

  // Проектайлы
  for (const p of g.projectiles) {
    ctx.beginPath();
    ctx.arc(p.pos.x * TILE_PX, p.pos.y * TILE_PX, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#111827";
    ctx.fill();
  }

  // Мобы
  for (const m of g.mobs) {
    ctx.beginPath();
    ctx.arc(m.pos.x * TILE_PX, m.pos.y * TILE_PX, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#475569";
    ctx.fill();

    // HP бар
    const hpW = 24;
    const hpX = m.pos.x * TILE_PX - hpW / 2;
    const hpY = m.pos.y * TILE_PX - 18;
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(hpX, hpY, hpW, 4);
    const pct = Math.max(0, Math.min(1, m.hp / 25));
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(hpX, hpY, hpW * pct, 4);
  }

  // Hover для размещения
  if (hover) {
    const x = hover.x * TILE_PX;
    const y = hover.y * TILE_PX;
    ctx.strokeStyle = "#0ea5e9";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, TILE_PX, TILE_PX);
  }
}
