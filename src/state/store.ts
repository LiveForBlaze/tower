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
  getTowerAt,
  upgradeTower,
  towerUpgradeCost,
} from "../engine/sim";
import type { Game, Tower, TowerKind, Vec2 } from "../engine/types";

export type GameStore = {
  game: Game;
  running: boolean;
  build: { selected: TowerKind | null };
  selected: { towerId: string | null };

  start: () => void;
  pause: () => void;
  restart: () => void;
  toggleSpeed: () => void;

  tick: (dt: number) => void;
  startWave: () => void;

  selectTowerType: (kind: TowerKind | null) => void;
  placeTower: (tile: Vec2) => boolean;
  canBuild: (tile: Vec2) => boolean;
  towerCost: (kind: TowerKind) => number;

  selectAt: (tile: Vec2 | null) => void;
  clearSelection: () => void;
  getSelectedTower: () => Tower | null;
  canUpgradeSelected: () => { ok: boolean; cost: number };
  upgradeSelected: () => boolean;

  isWaveActive: () => boolean;
  canStartWave: () => boolean;
};

const grid = loadGrid();
const initial = initGame(grid);

export const useGame = create<GameStore>((set, get) => ({
  game: initial,
  running: false,
  build: { selected: null },
  selected: { towerId: null },

  start: () =>
    set((s) => {
      let g = s.game;
      if (!isWaveActiveSim(g) && g.lives > 0) g = startWaveSim(g); // автостарт 1-й волны
      return { running: true, game: g };
    }),

  pause: () => set({ running: false }),

  restart: () =>
    set({
      game: initGame(grid),
      running: false,
      build: { selected: null },
      selected: { towerId: null },
    }),

  toggleSpeed: () =>
    set((s) => ({
      game: { ...s.game, speedMult: s.game.speedMult === 1 ? 2 : 1 },
    })),

  tick: (dt: number) => {
    const g = get().game;
    advanceTick(g, dt * (g.speedMult ?? 1));
    if (g.lives <= 0) set({ game: { ...g, lives: 0 }, running: false });
    else set({ game: { ...g } });
  },

  startWave: () =>
    set((s) => {
      if (!s.running || isWaveActiveSim(s.game) || s.game.lives <= 0) return s;
      return { game: startWaveSim(s.game) };
    }),

  selectTowerType: (kind) => set({ build: { selected: kind } }),

  placeTower: (tile) => {
    const g = get().game;
    const kind = get().build.selected;
    if (!kind) return false;
    const ok = addTower(g, tile, kind);
    if (ok) {
      const tw = g.towers[g.towers.length - 1];
      set({ game: { ...g }, selected: { towerId: tw.id } });
    }
    return ok;
  },

  canBuild: (tile) => canBuildAt(get().game, tile),
  towerCost: (kind) => towerCost(kind),

  selectAt: (tile) => {
    if (!tile) return set({ selected: { towerId: null } });
    const t = getTowerAt(get().game, tile);
    set({ selected: { towerId: t ? t.id : null } });
  },

  clearSelection: () => set({ selected: { towerId: null } }),

  getSelectedTower: () => {
    const id = get().selected.towerId;
    return id ? get().game.towers.find((t) => t.id === id) ?? null : null;
  },

  canUpgradeSelected: () => {
    const t = get().getSelectedTower();
    if (!t) return { ok: false, cost: Infinity };
    const cost = towerUpgradeCost(t.kind, t.tier);
    return { ok: t.tier < 3 && get().game.money >= cost, cost };
  },

  upgradeSelected: () => {
    const id = get().selected.towerId;
    if (!id) return false;
    const g = get().game;
    const ok = upgradeTower(g, id);
    if (ok) set({ game: { ...g } });
    return ok;
  },

  isWaveActive: () => isWaveActiveSim(get().game),
  canStartWave: () =>
    get().running && !isWaveActiveSim(get().game) && get().game.lives > 0,
}));
