export type Vec2 = { x: number; y: number };
export type TowerKind = "arrow" | "cannon" | "frost";
export type MobType = "normal" | "fast" | "tank" | "flying";

export type Mob = {
  id: string;
  pos: Vec2; // центр в тайловых координатах
  hp: number;
  speed: number; // тайлов в сек
  armor: number; // плоская броня
  type: MobType;
  waypointIndex: number;
  slowUntil?: number; // время симуляции, когда спадет замедление
};

export type Tower = {
  id: string;
  tile: Vec2; // целочисленные координаты
  range: number; // радиус в тайлах
  rate: number; // выстрелов в сек
  damage: number;
  projectileSpeed: number; // тайлов в сек
  lastFiredAt: number; // время симуляции
  kind: TowerKind;
  tier: 1 | 2 | 3;
  cost: number;
};

export type Projectile = {
  id: string;
  pos: Vec2;
  targetId: string;
  speed: number;
  damage: number;
  splash?: { radius: number };
  slow?: { factor: number; duration: number };
};

export type WaveEntry = {
  delay: number;
  kind: MobType;
  count: number;
  spacing: number;
};
export type Wave = { id: number; entries: WaveEntry[] };

export type Grid = {
  width: number;
  height: number;
  tiles: ("path" | "buildable" | "blocked")[]; // row-major
  path: Vec2[]; // массив центров тайлов пути
  start: Vec2; // первый центр
  end: Vec2; // последний центр
};

export type Game = {
  time: number;
  mobs: Mob[];
  towers: Tower[];
  projectiles: Projectile[];
  money: number;
  lives: number;
  waveIndex: number; // текущая волна 0-based
  grid: Grid;
};
