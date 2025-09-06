export type Tiered<T> = { 1: T; 2: T; 3: T };
export type TowerBitmaps = {
  arrow: Tiered<HTMLImageElement>;
  cannon: Tiered<HTMLImageElement>;
  frost: Tiered<HTMLImageElement>;
};

const files = {
  arrow: { 1: "arrow_t1.png", 2: "arrow_t2.png", 3: "arrow_t3.png" },
  cannon: { 1: "cannon_t1.png", 2: "cannon_t2.png", 3: "cannon_t3.png" },
  frost: { 1: "frost_t1.png", 2: "frost_t2.png", 3: "frost_t3.png" },
} as const;

const relUrl = (name: string) =>
  new URL(`./towers/${name}`, import.meta.url).href;
const pubUrl = (name: string) => `/assets/towers/${name}`;

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
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1f2937";
  g.fillRect(0, 0, size, size);
  g.strokeStyle = "#ef4444";
  g.lineWidth = 6;
  g.strokeRect(6, 6, size - 12, size - 12);
  g.fillStyle = "#fff";
  g.font = "bold 16px sans-serif";
  g.textAlign = "center";
  g.fillText(label, size / 2, size / 2);
  const img = new Image();
  img.src = c.toDataURL("image/png");
  return img;
}

async function loadOne(name: string, tower: string): Promise<HTMLImageElement> {
  const src1 = relUrl(name);
  const src2 = pubUrl(name);
  try {
    const im = await load(src1);
    if ("decode" in im) {
      try {
        await (im as any).decode();
      } catch {}
    }
    return im;
  } catch (err1) {
    console.warn(`[towers] not found in src/assets -> ${src1}`, err1);
    try {
      const im2 = await load(src2);
      if ("decode" in im2) {
        try {
          await (im2 as any).decode();
        } catch {}
      }
      return im2;
    } catch (err2) {
      console.error(`[towers] MISSING in both locations`, {
        src1,
        src2,
        tower,
        name,
        err2,
      });
      return placeholder(`${tower}\nmissing`);
    }
  }
}

let cache: TowerBitmaps | null = null;

export async function preloadTowerBitmaps(): Promise<TowerBitmaps> {
  if (cache) return cache;

  const [a1, a2, a3, c1, c2, c3, f1, f2, f3] = await Promise.all([
    loadOne(files.arrow[1], "arrow"),
    loadOne(files.arrow[2], "arrow"),
    loadOne(files.arrow[3], "arrow"),
    loadOne(files.cannon[1], "cannon"),
    loadOne(files.cannon[2], "cannon"),
    loadOne(files.cannon[3], "cannon"),
    loadOne(files.frost[1], "frost"),
    loadOne(files.frost[2], "frost"),
    loadOne(files.frost[3], "frost"),
  ]);

  cache = {
    arrow: { 1: a1, 2: a2, 3: a3 },
    cannon: { 1: c1, 2: c2, 3: c3 },
    frost: { 1: f1, 2: f2, 3: f3 },
  };

  console.log("[towers] loaded:", {
    arrow: [a1.naturalWidth, a2.naturalWidth, a3.naturalWidth],
    cannon: [c1.naturalWidth, c2.naturalWidth, c3.naturalWidth],
    frost: [f1.naturalWidth, f2.naturalWidth, f3.naturalWidth],
  });

  return cache;
}
