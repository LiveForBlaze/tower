// src/engine/sim.ts
import type {
  Game,
  Grid,
  Mob,
  MobType,
  Tower,
  TowerKind,
  Vec2,
  Wave,
  Projectile,
} from "./types";
import { tileIndex } from "./grid";

export const TICK_DT = 1 / 60;

// ===== init =====
export function initGame(grid: Grid): Game {
  return {
    time: 0,
    mobs: [],
    towers: [],
    projectiles: [],
    money: 150,
    lives: 20,
    waveIndex: 0,
    grid,
    speedMult: 1,
    spawning: null,
  };
}

// ===== mobs and waves =====
function mobBase(kind: MobType): Omit<Mob, "id" | "pos" | "waypointIndex"> {
  if (kind === "fast") return { hp: 18, speed: 3.0, armor: 0, type: "fast" };
  if (kind === "tank") return { hp: 60, speed: 1.2, armor: 2, type: "tank" };
  if (kind === "flying")
    return { hp: 22, speed: 2.4, armor: 0, type: "flying" };
  return { hp: 25, speed: 2.0, armor: 1, type: "normal" };
}

const WAVES: Wave[] = [
  { id: 1, entries: [{ delay: 0, kind: "normal", count: 8, spacing: 0.7 }] },
  { id: 2, entries: [{ delay: 0, kind: "fast", count: 10, spacing: 0.6 }] },
  { id: 3, entries: [{ delay: 0, kind: "tank", count: 6, spacing: 0.9 }] },
  { id: 4, entries: [{ delay: 0, kind: "normal", count: 10, spacing: 0.5 }] },
];

// ===== utils =====
function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x,
    dy = a.y - b.y;
  return Math.hypot(dx, dy);
}
function id(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
export function isWaveActive(g: Game): boolean {
  return !!g.spawning || g.mobs.length > 0;
}

// ===== spawn =====
function schedule(entries: Wave["entries"], t0: number) {
  const s: { t: number; kind: MobType }[] = [];
  for (const e of entries) {
    let t = t0 + e.delay;
    for (let i = 0; i < e.count; i++) {
      s.push({ t, kind: e.kind });
      t += e.spacing;
    }
  }
  return s;
}

export function startWave(g: Game): Game {
  // защита от повторного запуска
  if (isWaveActive(g) || g.lives <= 0) return g;
  const wave = WAVES[g.waveIndex];
  if (!wave) return g;
  return {
    ...g,
    spawning: { cursor: 0, schedule: schedule(wave.entries, g.time) },
  };
}

function trySpawn(g: Game) {
  const sp = g.spawning;
  if (!sp) return;
  while (sp.cursor < sp.schedule.length && sp.schedule[sp.cursor].t <= g.time) {
    const { kind } = sp.schedule[sp.cursor++];
    const base = mobBase(kind);
    const mob: Mob = {
      id: id("m"),
      pos: { x: g.grid.start.x, y: g.grid.start.y },
      waypointIndex: 1,
      ...base,
    };
    g.mobs.push(mob);
  }
  if (sp.cursor >= sp.schedule.length) g.spawning = null;
}

// ===== movement =====
function moveMobs(g: Game, dt: number) {
  const path = g.grid.path; // центры
  const end = g.grid.end;
  for (let i = g.mobs.length - 1; i >= 0; i--) {
    const m = g.mobs[i];
    const slowed = m.slowUntil && g.time < m.slowUntil ? 0.5 : 1;
    const speed = m.speed * slowed;

    let target = path[m.waypointIndex] ?? end;
    let remaining = dt * speed;

    while (remaining > 0) {
      const d = dist(m.pos, target);
      if (d < 1e-4) {
        m.waypointIndex++;
        target = path[m.waypointIndex] ?? end;
        if (!path[m.waypointIndex]) break;
        continue;
      }
      const step = Math.min(remaining, d);
      m.pos.x += ((target.x - m.pos.x) / d) * step;
      m.pos.y += ((target.y - m.pos.y) / d) * step;
      remaining -= step;
    }

    // достигли конца пути
    if (dist(m.pos, end) < 0.3) {
      g.lives = Math.max(0, g.lives - 1); // кламп до 0
      g.mobs.splice(i, 1);
    }
  }
}

// ===== build =====
export function canBuildAt(g: Game, tile: Vec2): boolean {
  const { x, y } = tile;
  if (x < 0 || y < 0 || x >= g.grid.width || y >= g.grid.height) return false;
  const t = g.grid.tiles[tileIndex(g.grid, x, y)];
  if (t !== "buildable") return false;
  if (g.towers.some((tw) => tw.tile.x === x && tw.tile.y === y)) return false;
  return true;
}

export function towerCost(kind: TowerKind): number {
  if (kind === "cannon") return 80;
  if (kind === "frost") return 70;
  return 60;
}

export function addTower(g: Game, tile: Vec2, kind: TowerKind): boolean {
  if (!canBuildAt(g, tile)) return false;
  const cost = towerCost(kind);
  if (g.money < cost) return false;

  const base: Omit<Tower, "id" | "tile"> =
    kind === "cannon"
      ? {
          range: 2.2,
          rate: 0.8,
          damage: 16,
          projectileSpeed: 6,
          lastFiredAt: -999,
          kind,
          tier: 1,
          cost,
        }
      : kind === "frost"
      ? {
          range: 2.0,
          rate: 0.7,
          damage: 4,
          projectileSpeed: 7,
          lastFiredAt: -999,
          kind,
          tier: 1,
          cost,
        }
      : {
          range: 2.4,
          rate: 1.2,
          damage: 10,
          projectileSpeed: 9,
          lastFiredAt: -999,
          kind: "arrow",
          tier: 1,
          cost,
        };

  const t: Tower = { id: id("t"), tile, ...base };
  g.towers.push(t);
  g.money -= cost;
  return true;
}

// ===== combat =====
function findTarget(g: Game, tower: Tower): Mob | null {
  const origin = { x: tower.tile.x + 0.5, y: tower.tile.y + 0.5 };
  const inRange = g.mobs.filter((m) => dist(m.pos, origin) <= tower.range);
  if (inRange.length === 0) return null;
  const end = g.grid.end;
  inRange.sort((a, b) => dist(b.pos, end) - dist(a.pos, end));
  return inRange[0] ?? null;
}

function fireIfReady(g: Game, tower: Tower) {
  const cd = 1 / tower.rate;
  if (g.time - tower.lastFiredAt < cd) return;
  const target = findTarget(g, tower);
  if (!target) return;

  tower.lastFiredAt = g.time;
  const proj: Projectile = {
    id: id("p"),
    pos: { x: tower.tile.x + 0.5, y: tower.tile.y + 0.5 },
    targetId: target.id,
    speed: tower.projectileSpeed,
    damage: tower.damage,
    splash: tower.kind === "cannon" ? { radius: 0.9 } : undefined,
    slow: tower.kind === "frost" ? { factor: 0.5, duration: 1.0 } : undefined,
  };
  g.projectiles.push(proj);
}

function updateTowers(g: Game) {
  for (const t of g.towers) fireIfReady(g, t);
}

function applyHit(
  g: Game,
  m: Mob,
  p: { damage: number; slow?: { factor: number; duration: number } }
) {
  const eff = Math.max(1, p.damage - m.armor);
  m.hp -= eff;
  if (p.slow)
    m.slowUntil = Math.max(g.time + p.slow.duration, m.slowUntil ?? 0);
  if (m.hp <= 0) {
    g.money += 5;
    const idx = g.mobs.findIndex((x) => x.id === m.id);
    if (idx >= 0) g.mobs.splice(idx, 1);
  }
}

function updateProjectiles(g: Game, dt: number) {
  for (let i = g.projectiles.length - 1; i >= 0; i--) {
    const p = g.projectiles[i];
    const target = g.mobs.find((m) => m.id === p.targetId);
    if (!target) {
      g.projectiles.splice(i, 1);
      continue;
    }
    const d = dist(p.pos, target.pos);
    if (d < 0.05) {
      if (p.splash) {
        for (const m of g.mobs) {
          if (dist(m.pos, target.pos) <= p.splash.radius) applyHit(g, m, p);
        }
      } else {
        applyHit(g, target, p);
      }
      g.projectiles.splice(i, 1);
      continue;
    }
    const step = Math.min(dt * p.speed, d);
    p.pos.x += ((target.pos.x - p.pos.x) / d) * step;
    p.pos.y += ((target.pos.y - p.pos.y) / d) * step;
  }
}

// ===== main tick =====
export function advanceTick(g: Game, dt: number): Game {
  g.time += dt;

  trySpawn(g);
  moveMobs(g, dt);
  updateTowers(g);
  updateProjectiles(g, dt);

  // стоп на game over
  if (g.lives <= 0) {
    g.lives = 0;
    g.spawning = null;
    g.mobs.length = 0;
    return g;
  }

  // автопереход на следующую волну
  const cleared = !g.spawning && g.mobs.length === 0;
  if (cleared) {
    const next = g.waveIndex + 1;
    if (WAVES[next]) {
      g.waveIndex = next;
      const delay = 0.5;
      g.spawning = {
        cursor: 0,
        schedule: schedule(WAVES[next].entries, g.time + delay),
      };
    }
  }
  return g;
}
