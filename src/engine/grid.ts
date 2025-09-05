// src/engine/grid.ts
import type { Grid, Vec2 } from "./types";

const MAP: string[] = [
  "BBBBBBBBBBBBPBBB",
  "B........B..P..B",
  "PPPPP....B..P..B",
  "B...PBBBBB..P..B",
  "B...P......PP..B",
  "B...P..PPPPP...B",
  "B...P..P....BBBB",
  "B...PPPP....B..B",
  "B...........B..B",
  "BBBBBBBBBBBBBBBB",
];

const DIRS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const key = (p: Vec2) => `${p.x},${p.y}`;
const toCenter = (p: Vec2): Vec2 => ({ x: p.x + 0.5, y: p.y + 0.5 });

export function loadGrid(): Grid {
  const height = MAP.length;
  const width = MAP[0].length;

  // 1) Разбираем карту: B -> blocked, P -> path, . -> buildable
  const tiles: Grid["tiles"] = [];
  const pathCellsFromMap: Vec2[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = MAP[y][x];
      let t: Grid["tiles"][number] = "buildable";
      if (ch === "B") t = "blocked";
      if (ch === "P") {
        t = "path";
        pathCellsFromMap.push({ x, y });
      }
      tiles.push(t);
    }
  }

  // helpers
  const inBounds = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height;
  const isPath = (x: number, y: number) =>
    inBounds(x, y) && tiles[y * width + x] === "path";
  const isBuildable = (x: number, y: number) =>
    inBounds(x, y) && tiles[y * width + x] === "buildable";

  // 2) Если P существуют — строим маршрут по ним (BFS)
  let intPath: Vec2[] | null = null;
  if (pathCellsFromMap.length > 0) {
    // вычислим степени, найдём старт/финиш как крайние по степени 1
    const deg = new Map<string, number>();
    for (const c of pathCellsFromMap) {
      let d = 0;
      for (const [dx, dy] of DIRS) if (isPath(c.x + dx, c.y + dy)) d++;
      deg.set(key(c), d);
    }
    const endpoints = pathCellsFromMap.filter(
      (c) => (deg.get(key(c)) ?? 0) === 1
    );
    const start =
      endpoints.length > 0
        ? endpoints.reduce((best, cur) =>
            cur.x < best.x || (cur.x === best.x && cur.y < best.y) ? cur : best
          )
        : pathCellsFromMap[0];

    // BFS от start по path-тайлам и берём самый дальний как end
    const { dist, parent } = bfs(start, (x, y) => isPath(x, y));
    let end = start;
    let best = -1;
    for (const c of endpoints.length ? endpoints : pathCellsFromMap) {
      const d = dist.get(key(c)) ?? -1;
      if (d > best) {
        best = d;
        end = c;
      }
    }
    intPath = restorePath(start, end, parent);
  }

  // 3) Если P нет — строим A* от левого к правому краю по buildable
  if (!intPath) {
    const start = findEdgeCell(tiles, width, height, "left", isBuildable);
    const goal = findEdgeCell(tiles, width, height, "right", isBuildable);
    intPath = astar(start, goal, (x, y) => isBuildable(x, y));
    // помечаем найденные клетки как path, чтобы получилось 3 типа
    if (intPath) {
      for (const c of intPath) {
        tiles[c.y * width + c.x] = "path";
      }
    }
  }

  // 4) Fallback если путь так и не нашёлся
  if (!intPath || intPath.length === 0) {
    intPath = [];
    for (let x = 1; x < width - 1; x++)
      intPath.push({ x, y: Math.floor(height / 2) });
    for (const c of intPath) tiles[c.y * width + c.x] = "path";
  }

  const path = intPath.map(toCenter);
  const start = path[0];
  const end = path[path.length - 1];

  return { width, height, tiles, path, start, end };
}

function bfs(
  start: Vec2,
  passable: (x: number, y: number) => boolean
): { dist: Map<string, number>; parent: Map<string, string> } {
  const q: Vec2[] = [start];
  const dist = new Map<string, number>([[key(start), 0]]);
  const parent = new Map<string, string>();
  while (q.length) {
    const v = q.shift()!;
    const dv = dist.get(key(v))!;
    for (const [dx, dy] of DIRS) {
      const nx = v.x + dx;
      const ny = v.y + dy;
      if (!passable(nx, ny)) continue;
      const nk = `${nx},${ny}`;
      if (dist.has(nk)) continue;
      dist.set(nk, dv + 1);
      parent.set(nk, key(v));
      q.push({ x: nx, y: ny });
    }
  }
  return { dist, parent };
}

function restorePath(
  start: Vec2,
  end: Vec2,
  parent: Map<string, string>
): Vec2[] {
  const path: Vec2[] = [];
  let k = key(end);
  const sk = key(start);
  const seen = new Set<string>();
  while (true) {
    if (seen.has(k)) break; // защита от циклов
    seen.add(k);
    const [x, y] = k.split(",").map((n) => parseInt(n, 10));
    path.push({ x, y });
    if (k === sk) break;
    const p = parent.get(k);
    if (!p) break;
    k = p;
  }
  path.reverse();
  return path;
}

function astar(
  start: Vec2,
  goal: Vec2,
  passable: (x: number, y: number) => boolean
): Vec2[] | null {
  const open = new Set<string>([key(start)]);
  const came = new Map<string, string>();
  const g = new Map<string, number>([[key(start), 0]]);
  const f = new Map<string, number>([[key(start), h(start, goal)]]);

  function h(a: Vec2, b: Vec2) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
  function lowestF(): Vec2 | null {
    let bestK: string | null = null;
    let best = Infinity;
    for (const k of open) {
      const v = f.get(k) ?? Infinity;
      if (v < best) {
        best = v;
        bestK = k;
      }
    }
    if (!bestK) return null;
    const [sx, sy] = bestK.split(",").map((n) => parseInt(n, 10));
    return { x: sx, y: sy };
  }

  while (open.size) {
    const cur = lowestF()!;
    if (cur.x === goal.x && cur.y === goal.y)
      return restorePath(start, goal, came);
    open.delete(key(cur));
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!passable(nx, ny)) continue;
      const nk = `${nx},${ny}`;
      const tentative = (g.get(key(cur)) ?? Infinity) + 1;
      if (tentative < (g.get(nk) ?? Infinity)) {
        came.set(nk, key(cur));
        g.set(nk, tentative);
        f.set(nk, tentative + h({ x: nx, y: ny }, goal));
        open.add(nk);
      }
    }
  }
  return null;
}

function findEdgeCell(
  tiles: Grid["tiles"],
  width: number,
  height: number,
  side: "left" | "right",
  passable: (x: number, y: number) => boolean
): Vec2 {
  const x = side === "left" ? 1 : width - 2;
  for (let y = 1; y < height - 1; y++) {
    if (passable(x, y)) return { x, y };
  }
  return side === "left" ? { x: 1, y: 1 } : { x: width - 2, y: height - 2 };
}

export function tileIndex(grid: Grid, x: number, y: number): number {
  return y * grid.width + x;
}
