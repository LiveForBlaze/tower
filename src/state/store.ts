// src/state/store.ts
import { create } from "zustand";
import { loadGrid } from "../engine/grid";
import {
  initGame,
  advanceTick,
  startWave as startWaveSim,
  addTower,
  canBuildAt,
  towerCost,
  isWaveActive as isWaveActiveSim,
} from "../engine/sim";
import type { Game, TowerKind, Vec2 } from "../engine/types";

export type GameStore = {
  game: Game;
  running: boolean;
  build: { selected: TowerKind | null };

  start: () => void;
  pause: () => void;
  restart: () => void;
  toggleSpeed: () => void;

  tick: (dt: number) => void;
  startWave: () => void;

  selectTower: (kind: TowerKind | null) => void;
  placeTower: (tile: Vec2) => boolean;
  canBuild: (tile: Vec2) => boolean;
  towerCost: (kind: TowerKind) => number;

  isWaveActive: () => boolean;
  canStartWave: () => boolean;
};

const grid = loadGrid();
const initial = initGame(grid);

export const useGame = create<GameStore>((set, get) => ({
  game: initial,
  running: false,
  build: { selected: null },

  start: () =>
    set((s) => {
      let g = s.game;
      if (!isWaveActiveSim(g) && g.lives > 0) g = startWaveSim(g); // автостарт первой волны
      return { running: true, game: g };
    }),

  pause: () => set({ running: false }),

  restart: () =>
    set({
      game: initGame(grid),
      running: false,
      build: { selected: null },
    }),

  toggleSpeed: () =>
    set((s) => ({
      game: { ...s.game, speedMult: s.game.speedMult === 1 ? 2 : 1 },
    })),

  tick: (dt: number) => {
    const g = get().game;
    advanceTick(g, dt * g.speedMult);

    if (g.lives <= 0) {
      set({ game: { ...g, lives: 0 }, running: false });
    } else {
      set({ game: { ...g } }); // новый ref чтобы HUD обновился
    }
  },

  startWave: () =>
    set((s) => {
      // защита от даблклика и game over
      if (!s.running || isWaveActiveSim(s.game) || s.game.lives <= 0) return s;
      return { game: startWaveSim(s.game) };
    }),

  selectTower: (kind) => set({ build: { selected: kind } }),

  placeTower: (tile) => {
    const g = get().game;
    const kind = get().build.selected;
    if (!kind) return false;
    const ok = addTower(g, tile, kind);
    if (ok) set({ game: { ...g } });
    return ok;
  },

  canBuild: (tile) => canBuildAt(get().game, tile),
  towerCost: (kind) => towerCost(kind),

  isWaveActive: () => isWaveActiveSim(get().game),
  canStartWave: () =>
    get().running && !isWaveActiveSim(get().game) && get().game.lives > 0,
}));
