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
    money: 1500,
    lives: 20,
    waveIndex: 0,
    grid,
    speedMult: 1,
    spawning: null,
  };
}

// ===== mobs & waves =====
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
  { id: 5, entries: [{ delay: 0, kind: "flying", count: 12, spacing: 0.5 }] },
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

// ===== tower stats & upgrades =====
function towerStats(kind: TowerKind, tier: 1 | 2 | 3) {
  if (kind === "cannon") {
    if (tier === 1)
      return { range: 2.2, rate: 0.8, damage: 16, projectileSpeed: 6 };
    if (tier === 2)
      return { range: 2.4, rate: 1.0, damage: 24, projectileSpeed: 6.5 };
    return { range: 2.6, rate: 1.2, damage: 36, projectileSpeed: 7 };
  }
  if (kind === "frost") {
    // ← единственное изменение: добавлен урон у Frost
    if (tier === 1)
      return { range: 2.0, rate: 0.7, damage: 4, projectileSpeed: 7 };
    if (tier === 2)
      return { range: 2.2, rate: 0.9, damage: 6, projectileSpeed: 7.5 };
    return { range: 2.4, rate: 1.0, damage: 8, projectileSpeed: 8 };
  }
  // arrow
  if (tier === 1)
    return { range: 2.4, rate: 1.2, damage: 10, projectileSpeed: 9 };
  if (tier === 2)
    return { range: 2.6, rate: 1.5, damage: 16, projectileSpeed: 10 };
  return { range: 2.8, rate: 1.8, damage: 24, projectileSpeed: 11 };
}

export function towerUpgradeCost(kind: TowerKind, tier: 1 | 2 | 3): number {
  if (tier >= 3) return Infinity;
  if (kind === "cannon") return tier === 1 ? 100 : 140;
  if (kind === "frost") return tier === 1 ? 85 : 120;
  return tier === 1 ? 70 : 100; // arrow
}

function applyTowerStats(t: Tower) {
  const s = towerStats(t.kind, t.tier);
  t.range = s.range;
  t.rate = s.rate;
  t.damage = s.damage;
  t.projectileSpeed = s.projectileSpeed;
}

export function getTowerAt(g: Game, tile: Vec2): Tower | null {
  return (
    g.towers.find((tw) => tw.tile.x === tile.x && tw.tile.y === tile.y) ?? null
  );
}
export function canUpgradeTower(t: Tower): boolean {
  return t.tier < 3;
}
export function upgradeTower(g: Game, towerId: string): boolean {
  const t = g.towers.find((x) => x.id === towerId);
  if (!t) return false;
  if (!canUpgradeTower(t)) return false;
  const cost = towerUpgradeCost(t.kind, t.tier);
  if (!isFinite(cost) || g.money < cost) return false;
  g.money -= cost;
  t.tier = (t.tier + 1) as 1 | 2 | 3;
  applyTowerStats(t);
  return true;
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
  if (isWaveActive(g) || g.lives <= 0) return g; // защита от дабл-старта
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
  return 60; // arrow
}

export function addTower(g: Game, tile: Vec2, kind: TowerKind): boolean {
  if (!canBuildAt(g, tile)) return false;
  const cost = towerCost(kind);
  if (g.money < cost) return false;

  const base: Omit<Tower, "id" | "tile"> = {
    tier: 1,
    lastFiredAt: -999,
    kind,
    cost,
    ...towerStats(kind, 1), // ← здесь возьмётся damage для frost
  } as any;
  const t: Tower = { id: id("t"), tile, ...base };
  g.towers.push(t);
  g.money -= cost;
  return true;
}

// ===== combat =====
function findTarget(g: Game, tower: Tower): Mob | null {
  const origin = { x: tower.tile.x + 0.5, y: tower.tile.y + 0.5 };
  let best: Mob | null = null;
  let bestD = Infinity;
  for (const m of g.mobs) {
    const d = dist(m.pos, origin);
    if (d <= tower.range && d < bestD) {
      best = m;
      bestD = d;
    }
  }
  return best;
}

function fireIfReady(g: Game, tower: Tower) {
  const cd = 1 / tower.rate;
  if (g.time - tower.lastFiredAt < cd) return;
  const target = findTarget(g, tower);
  if (!target) return;

  tower.lastFiredAt = g.time;
  const splashRadius =
    tower.kind === "cannon" ? 1.5 + 0.4 * (tower.tier - 1) : undefined;
  const slowDuration =
    tower.kind === "frost" ? 1.0 + 0.3 * (tower.tier - 1) : undefined;

  const proj: Projectile = {
    id: id("p"),
    pos: { x: tower.tile.x + 0.5, y: tower.tile.y + 0.5 },
    targetId: target.id,
    speed: tower.projectileSpeed,
    damage: tower.damage, // ← frost теперь не 0
    splash: splashRadius ? { radius: splashRadius } : undefined,
    slow: slowDuration ? { factor: 0.5, duration: slowDuration } : undefined,
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
  const hitRadius = 0.18;
  for (let i = g.projectiles.length - 1; i >= 0; i--) {
    const p = g.projectiles[i];
    const target = g.mobs.find((m) => m.id === p.targetId);
    if (!target) {
      g.projectiles.splice(i, 1);
      continue;
    }

    const d = dist(p.pos, target.pos);
    const travel = dt * p.speed;

    if (d <= hitRadius || travel >= d) {
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

    const step = Math.min(travel, d);
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

  if (g.lives <= 0) {
    g.lives = 0;
    g.spawning = null;
    g.mobs.length = 0;
    return g;
  }

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
