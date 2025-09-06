# React TD — Tower Defense built with React + Canvas

A minimal, fast tower-defense game crafted for a frontend challenge. Emphasis on **UX/UI**, predictable logic, and a clean, testable architecture. Rendering uses Canvas 2D with Hi-DPI support and asset preloading.

---

## 🚀 Quick Start

(Requires Node 18+)

    npm i
    npm run dev
    # open http://localhost:5173

Build & preview:

    npm run build
    npm run preview

---

## 🗂 Project Structure

    src/
      engine/
        sim.ts         # game logic: ticks, waves, towers, mobs, projectiles
        grid.ts        # map and path (tile indexing)
        types.ts       # strict types for Game/Grid/Mob/Tower/Projectile
      state/
        store.ts       # zustand store: actions (tick, placeTower, startWave, etc.)
      renderers/
        canvas.ts      # drawing board, road, grass, mobs, towers, HP bars
      assets/
        towerImages.ts # PNG loader for towers (supports src/ and public/), cache, decode()
        mobImages.ts   # PNG loader for mobs (supports src/ and public/), cache, decode()
      ui/
        App.tsx        # frame loop, Hi-DPI canvas, render + HUD integration
        Hud.tsx        # controls panel: status, build/upgrade, speed, start
    public/
      assets/
        towers/ ...    # alternative place for assets (if not under src/)
        mobs/   ...

---

## 🎮 Gameplay

- **Tiles:**  
  `path` — enemy route • `buildable` — can build here • `blocked` — neither build nor pass.
- **Towers (3 types × 3 tiers):**
  - **Arrow** — single target, high fire rate.  
  - **Cannon** — area damage (splash).  
  - **Frost** — small damage **and** slow (stacks by duration; slow factor takes the minimum).
- **Mobs:** `normal`, `fast`, `tank`, `flying`.  
- **Waves:** started with *Start wave*; protected from double-start; auto-advance to the next wave after the field is cleared.
- **Lives:** decrease on leaks and clamp at 0 (simulation stops on game over).

---

## 🕹 Controls

- In **Build**, pick a tower → click an empty `buildable` tile to place it.  
- Click a tower to select; use **Upgrade** / **Deselect** in the side panel.  
- **Start wave** to spawn; **Pause/Resume**, **Restart**, **Speed ×2** for simulation control.

---

## 🖼 Assets (PNG)

Loaders search in **two locations** — use whichever is convenient.

- `src/assets/towers/` **or** `public/assets/towers/`

      arrow_t1.png  arrow_t2.png  arrow_t3.png
      cannon_t1.png cannon_t2.png cannon_t3.png
      frost_t1.png  frost_t2.png  frost_t3.png

- `src/assets/mobs/` **or** `public/assets/mobs/`

      normal.png  fast.png  tank.png  flying.png

If a file is missing, a visible placeholder is rendered and both searched paths are logged to the console.

---

## 🖌 Rendering

- **Grass** — procedural seamless pattern (crisp on Retina).  
- **Road** — “ribbon” composed of multiple strokes: shadow, ground, border, highlight.  
- **Towers/Mobs** — PNG sprites with soft shadows; correct **HP bars** (gray track + color by remaining health).  
- **Selection** — subtle white ring around the selected tower.  
- **Hi-DPI** — canvas scales with `devicePixelRatio`.

---

## ⚙️ Performance

- A single `requestAnimationFrame` loop that depends only on `running`.  
- Inside the loop, state is read via `useGame.getState()` — no effect re-creation when `game` changes.  
- Assets are preloaded and cached. (Optionally, background/road can be baked to an offscreen canvas.)

---

## 📈 Default Balance

- **Arrow:** dmg 10 / 16 / 24, range 2.4 / 2.6 / 2.8, rate 1.2 / 1.5 / 1.8.  
- **Cannon:** dmg 16 / 24 / 36, range 2.2 / 2.4 / 2.6, rate 0.8 / 1.0 / 1.2; splash increases by tier.  
- **Frost:** dmg 4 / 6 / 8, range 2.0 / 2.2 / 2.4, rate 0.7 / 0.9 / 1.0; slow ≈50% with longer duration per tier.

All values live in `engine/sim.ts`.

---

## 🔧 Configuration

- Tile size — `setTilePx(64)` in `renderers/canvas.ts`.  
- Map/path — edit in `engine/grid.ts`.  
- Costs, upgrades, and wave schedule — in `engine/sim.ts`.

---

## 🧪 Test Checklist

- [ ] Building is only possible on `buildable` and not on occupied tiles.  
- [ ] *Start wave* does not re-trigger an active wave.  
- [ ] Lives clamp at 0; simulation stops.  
- [ ] Upgrade changes stats and deducts the cost.  
- [ ] HP bars visibly decrease (damage is visible for all towers, including Frost).  
- [ ] FPS stays stable when placing/upgrading towers.

---

## 📜 License

MIT
