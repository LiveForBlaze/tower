// src/assets/icons.ts
export type Tiered<T> = { 1: T; 2: T; 3: T };
export type TowerIcons = {
  arrow: Tiered<HTMLImageElement>;
  cannon: Tiered<HTMLImageElement>;
  frost: Tiered<HTMLImageElement>;
};

let cache: TowerIcons | null = null;

function svgToImg(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
    img.onload = () => resolve(img);
  });
}

// делаем SVG покрупнее — больше деталей, а канвас сам подмасштабирует
const S = 128;

/* ===========================
 *  ARROW / FROST — без изменений (легкие)
 *  =========================== */
const svgArrow = (tier: 1 | 2 | 3) => `
<svg viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="woodA${tier}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${tier >= 2 ? "#a26a2b" : "#8b5a2b"}"/>
      <stop offset="1" stop-color="${tier === 3 ? "#d59b52" : "#b07d46"}"/>
    </linearGradient>
  </defs>
  <circle cx="64" cy="64" r="60" fill="${tier === 3 ? "#2c3440" : "#393e46"}"/>
  <circle cx="64" cy="64" r="52" fill="${tier === 3 ? "#1f2630" : "#222831"}"/>
  <rect x="56" y="28" width="16" height="72" rx="5" fill="url(#woodA${tier})"/>
  <polygon points="64,18 74,30 54,30" fill="${
    tier === 3 ? "#fff6d5" : "#d9d9d9"
  }"/>
  <polygon points="64,110 74,98 54,98" fill="${
    tier === 3 ? "#fff6d5" : "#d9d9d9"
  }"/>
  ${
    tier >= 2
      ? `<circle cx="64" cy="64" r="${
          tier === 3 ? 44 : 40
        }" fill="none" stroke="${
          tier === 3 ? "#ffd166" : "#e5e7eb"
        }" stroke-width="${tier === 3 ? 4 : 3}" stroke-dasharray="${
          tier === 3 ? "0" : "6 5"
        }" />`
      : ""
  }
</svg>`;

const svgFrost = (tier: 1 | 2 | 3) => `
<svg viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${
      tier >= 2
        ? `<filter id="frostGlow${tier}" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="0" stdDeviation="${
        tier === 3 ? 3.2 : 2
      }" flood-color="${tier === 3 ? "#bdf0ff" : "#9fe3ff"}"/>
    </filter>`
        : ""
    }
  </defs>
  <circle cx="64" cy="64" r="60" fill="${tier === 3 ? "#1b2430" : "#223"}"/>
  <g fill="${tier === 3 ? "#bdf0ff" : "#7fd3ff"}" ${
  tier >= 2 ? 'filter="url(#frostGlow' + tier + ')"' : ""
}>
    <polygon points="64,10 72,28 64,24 56,28"/>
    <polygon points="118,64 100,72 104,64 100,56"/>
    <polygon points="64,118 56,100 64,104 72,100"/>
    <polygon points="10,64 28,56 24,64 28,72"/>
    <circle cx="64" cy="64" r="${tier === 3 ? 22 : 18}"/>
  </g>
  ${
    tier === 3
      ? `<circle cx="64" cy="64" r="36" fill="none" stroke="#bdf0ff" stroke-width="3"/>`
      : ""
  }
</svg>`;

/* ===========================
 *  CANNON — детальная стилизация с каменным основанием и деревом
 *  t1 — стиль из твоего примера; t2/t3 — богаче отделка.
 *  =========================== */
const svgCannon = (tier: 1 | 2 | 3) => `
<svg viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Камень -->
    <linearGradient id="stone${tier}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d8dbe1"/>
      <stop offset="1" stop-color="#b9c0c9"/>
    </linearGradient>
    <linearGradient id="stoneDark${tier}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9aa2ad"/>
      <stop offset="1" stop-color="#7f8792"/>
    </linearGradient>

    <!-- Дерево -->
    <linearGradient id="wood${tier}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8b5a2b"/>
      <stop offset="1" stop-color="#b27b46"/>
    </linearGradient>
    <linearGradient id="woodRich${tier}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${tier >= 2 ? "#9a642f" : "#8b5a2b"}"/>
      <stop offset="1" stop-color="${tier === 3 ? "#d59b52" : "#b27b46"}"/>
    </linearGradient>

    <!-- Металл -->
    <linearGradient id="steel${tier}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#4b5563"/>
      <stop offset="0.5" stop-color="#9aa4b2"/>
      <stop offset="1" stop-color="#3b4451"/>
    </linearGradient>
    <radialGradient id="spec${tier}" cx="35%" cy="35%" r="70%">
      <stop offset="0" stop-color="rgba(255,255,255,0.9)"/>
      <stop offset="0.35" stop-color="rgba(255,255,255,0.25)"/>
      <stop offset="1" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>

    <!-- Тени -->
    <filter id="shadow${tier}" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="rgba(0,0,0,0.35)"/>
    </filter>
    ${
      tier >= 2
        ? `<filter id="glowRing${tier}" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="0" stdDeviation="${
        tier === 3 ? 2.4 : 1.4
      }" flood-color="${tier === 3 ? "#ffd166" : "#cbd5e1"}"/>
    </filter>`
        : ""
    }
  </defs>

  <!-- Подложка травы -->
  <g opacity="0.9">
    <ellipse cx="64" cy="110" rx="42" ry="10" fill="#9bbf84"/>
    <ellipse cx="64" cy="112" rx="36" ry="8" fill="#7ea36a"/>
  </g>

  <!-- Каменная башня -->
  <g filter="url(#shadow${tier})">
    <!-- тело башни -->
    <path d="M40 44 L88 44 L92 80 L36 80 Z" fill="url(#stone${tier})" stroke="#7a808a" stroke-width="2"/>
    <!-- нижний ярус, темнее -->
    <path d="M36 80 L92 80 L92 96 L36 96 Z" fill="url(#stoneDark${tier})" stroke="#6d737d" stroke-width="2"/>

    <!-- швы камней -->
    <g stroke="#8b919b" stroke-width="1.5" opacity="0.6">
      <line x1="52" y1="44" x2="52" y2="96"/>
      <line x1="72" y1="44" x2="72" y2="96"/>
      <line x1="40" y1="62" x2="88" y2="62"/>
      <line x1="36" y1="80" x2="92" y2="80"/>
    </g>

    <!-- дверь и окно -->
    <rect x="55" y="82" width="18" height="14" rx="2" fill="#3b3f46"/>
    <rect x="60" y="58" width="10" height="8" rx="2" fill="#3b3f46"/>
  </g>

  <!-- Деревянный козырёк -->
  <g filter="url(#shadow${tier})">
    <polygon points="34,44 94,44 86,38 42,38" fill="url(#wood${tier})" stroke="#6b3f1b" stroke-width="2"/>
    <rect x="38" y="36" width="20" height="6" rx="2" fill="url(#woodRich${tier})"/>
    <rect x="70" y="36" width="20" height="6" rx="2" fill="url(#woodRich${tier})"/>
  </g>

  <!-- Пушка -->
  <g filter="url(#shadow${tier})">
    <!-- ствол -->
    <rect x="56" y="22" width="44" height="18" rx="9" fill="url(#steel${tier})"/>
    <circle cx="100" cy="31" r="9" fill="url(#steel${tier})"/>
    <!-- блик -->
    <ellipse cx="78" cy="26" rx="22" ry="6" fill="url(#spec${tier})" opacity="0.7"/>
    <!-- кольца/опояски -->
    <circle cx="56" cy="31" r="10" fill="none" stroke="${
      tier === 3 ? "#ffd166" : "#7b8899"
    }" stroke-width="${tier === 3 ? 4 : 3}" ${
  tier >= 2 ? 'filter="url(#glowRing' + tier + ')"' : ""
}/>
    <circle cx="92" cy="31" r="8" fill="none" stroke="${
      tier === 3 ? "#ffd166" : "#9aa4b2"
    }" stroke-width="${tier === 3 ? 3 : 2}" ${
  tier >= 2 ? 'filter="url(#glowRing' + tier + ')"' : ""
}/>
    <!-- дульце -->
    <circle cx="104" cy="31" r="7" fill="#1f2730" stroke="#9aa4b2" stroke-width="2"/>
    <circle cx="104" cy="31" r="3.4" fill="#0c1116"/>
  </g>

  <!-- Ступеньки -->
  <g>
    <rect x="44" y="96" width="16" height="6" rx="2" fill="url(#stoneDark${tier})"/>
    <rect x="48" y="102" width="16" height="6" rx="2" fill="url(#stoneDark${tier})"/>
  </g>

  <!-- Декор для t2/t3 -->
  ${
    tier >= 2
      ? `
    <!-- акценты -->
    <circle cx="64" cy="50" r="${tier === 3 ? 5 : 4}" fill="${
          tier === 3 ? "#ffd166" : "#cbd5e1"
        }"/>
    <path d="M36 96 L92 96" stroke="${
      tier === 3 ? "#ffd166" : "#cbd5e1"
    }" stroke-width="${tier === 3 ? 2.5 : 1.6}" opacity="0.9"/>
  `
      : ``
  }
</svg>`;

/* ===========================
 *  Предзагрузка
 *  =========================== */
export async function preloadTowerIcons(): Promise<TowerIcons> {
  if (cache) return cache;

  const [a1, a2, a3, c1, c2, c3, f1, f2, f3] = await Promise.all([
    svgToImg(svgArrow(1)),
    svgToImg(svgArrow(2)),
    svgToImg(svgArrow(3)),
    svgToImg(svgCannon(1)),
    svgToImg(svgCannon(2)),
    svgToImg(svgCannon(3)),
    svgToImg(svgFrost(1)),
    svgToImg(svgFrost(2)),
    svgToImg(svgFrost(3)),
  ]);

  cache = {
    arrow: { 1: a1, 2: a2, 3: a3 },
    cannon: { 1: c1, 2: c2, 3: c3 },
    frost: { 1: f1, 2: f2, 3: f3 },
  };
  return cache;
}
