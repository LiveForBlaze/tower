export type MobBitmaps = {
  normal: HTMLImageElement;
  fast: HTMLImageElement;
  tank: HTMLImageElement;
  flying: HTMLImageElement;
};

const names = {
  normal: "normal.png",
  fast: "fast.png",
  tank: "tank.png",
  flying: "flying.png",
} as const;

const relUrl = (n: string) => new URL(`./mobs/${n}`, import.meta.url).href;
const pubUrl = (n: string) => `/assets/mobs/${n}`;

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = (e) => reject({ src, e });
  });
}

function placeholder(label: string): HTMLImageElement {
  const S = 128;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0f172a";
  g.fillRect(0, 0, S, S);
  g.strokeStyle = "#ef4444";
  g.lineWidth = 6;
  g.strokeRect(6, 6, S - 12, S - 12);
  g.fillStyle = "#fff";
  g.font = "bold 16px sans-serif";
  g.textAlign = "center";
  g.fillText(label, S / 2, S / 2);
  const img = new Image();
  img.src = c.toDataURL("image/png");
  return img;
}

async function loadOne(
  name: string,
  key: keyof MobBitmaps
): Promise<HTMLImageElement> {
  const s1 = relUrl(name),
    s2 = pubUrl(name);
  try {
    const im = await load(s1);
    if ("decode" in im) {
      try {
        await (im as any).decode();
      } catch {
        console.error(Error);
      }
    }
    return im;
  } catch (e1) {
    console.warn(`[mobs] not in src/assets -> ${s1}`, e1);
    try {
      const im2 = await load(s2);
      if ("decode" in im2) {
        try {
          await (im2 as any).decode();
        } catch {
          console.error(Error);
        }
      }
      return im2;
    } catch (e2) {
      console.error("[mobs] MISSING in both locations", { s1, s2, key, e2 });
      return placeholder(key);
    }
  }
}

let cache: MobBitmaps | null = null;

export async function preloadMobBitmaps(): Promise<MobBitmaps> {
  if (cache) return cache;
  const [normal, fast, tank, flying] = await Promise.all([
    loadOne(names.normal, "normal"),
    loadOne(names.fast, "fast"),
    loadOne(names.tank, "tank"),
    loadOne(names.flying, "flying"),
  ]);
  cache = { normal, fast, tank, flying };
  console.log("[mobs] loaded", {
    normal: normal.naturalWidth,
    fast: fast.naturalWidth,
    tank: tank.naturalWidth,
    flying: flying.naturalWidth,
  });
  return cache;
}
