/**
 * TileBuffVfx — 棋盤 buff 格「攻」「命」特效（試作，View 層，用 Graphics 程式繪製，不吃任何貼圖）。
 *
 * 設計：
 *   攻：地面金紅符文環（外圈金、內圈橘，刻度與刃形三角緩轉）＋一束束往上竄的刃形火星（白金→橘→暗紅漸變）。
 *   命：地面翠玉呼吸環＋往外擴散的光圈＋柔和上升、左右輕擺的玉色光點。
 *   疊層（倍數 ×N）：N 越大，光圈越多圈、刻度／粒子越多、整體越亮（見 tile-buff-vfx.json stackTiers）；
 *   上限 3 圈 8 顆，避免糊成一團。減益沿用同套形狀，改紫色，且方向相反（火星下沉、光圈收縮）。
 *   圓章保留但縮小並改成金屬邊框（金環＋高光弧＋暗漆底），字由呼叫端的 Label 疊上去：
 *   頭頂狀態圖示與飛入圖示還是同一個「攻／命」字，玩家吃到後能對得上。
 *
 * 參考（只借著色器／粒子的「寫法與節奏」，沒有複製程式；原始碼放在工作筆記，不進專案）：
 *   00GameDevs https://00gamedevs.com/ — healing-field（擴散光圈＋浮動符號）、burning-ground（地面發光裂紋＋上升火星）、
 *   arcane-matrix（符文方陣＋浮動符號）、flame-surge（往上滾的火扇、邊緣碎火星）。
 *   Original code © 2026 00GameDevs (@00vchannel), MIT License。three.js © 2010-2026 three.js authors, MIT License。
 *   以下為依其節奏重新寫成 Cocos Graphics 的版本；依 MIT 條款保留上述版權聲明。
 *
 * 記憶體／效能：單一 Graphics 一次畫完（地面＋粒子＋圓章），不建粒子節點、不用貼圖；
 * 每個標記最多約 3 圈＋16 刻度＋8 顆粒子，動畫由 time 純函式算出，不逐幀大圖。
 *
 * Unity 對照：一個 LineRenderer／Mesh 程式繪製的格子特效；config 即 ScriptableObject。
 */
import { Color, Graphics, JsonAsset, resources } from 'cc';

export interface TileBuffVfxTier { minFactor: number; rings: number; particles: number; ticks: number; glow: number }
interface Palette {
  rim: string; inner: string; base: string; hot: string; mid: string; tail: string; disc: string; glyph: string;
}
export interface TileBuffVfxConfig {
  version: number;
  enabled: boolean;
  ground: { rx: number; ry: number; tickSpeed: number; baseAlpha: number };
  icon: { radius: number; y: number; bobPx: number; bobPeriodSec: number };
  stackTiers: TileBuffVfxTier[];
  attack: Palette & { sparkLifeSec: number; sparkRisePx: number; sparkLenPx: number; sparkWidthPx: number; bladeCount: number };
  hp: Palette & { ringPeriodSec: number; breathPeriodSec: number; moteLifeSec: number; moteRisePx: number; moteSwayPx: number; moteSizePx: number };
  debuff: Palette;
  metal: { gold: string; goldDark: string; highlight: string };
}

/** 量測用：本幀畫了幾個圖元、幾次填色（單元測試／效能報告讀取） */
export const tileBuffVfxStats = { primitives: 0, particles: 0 };

let loaded: TileBuffVfxConfig | null = null;
let loading = false;
const colorCache = new Map<string, Color>();

/** 讀 resources/data/tile-buff-vfx.json（只讀一次）。讀到前回傳 null，呼叫端退回舊樣式。 */
export function getTileBuffVfxConfig(): TileBuffVfxConfig | null {
  if (!loaded && !loading) {
    loading = true;
    resources.load('data/tile-buff-vfx', JsonAsset, (err, asset) => {
      if (!err && asset) loaded = asset.json as TileBuffVfxConfig;
    });
  }
  return loaded;
}

/** 新舊開關：網址 ?buffVfx=old／new 優先，否則看 JSON 的 enabled */
export function isTileBuffVfxEnabled(cfg: TileBuffVfxConfig | null): boolean {
  if (!cfg) return false;
  try {
    const search = (globalThis as { window?: { location?: { search?: string } } }).window?.location?.search ?? '';
    const q = new URLSearchParams(search).get('buffVfx');
    if (q === 'old') return false;
    if (q === 'new') return true;
  } catch { /* 非網頁環境略過 */ }
  return cfg.enabled;
}

function col(hex: string, alpha = 255): Color {
  let c = colorCache.get(hex);
  if (!c) {
    const v = parseInt(hex.slice(1), 16);
    c = new Color((v >> 16) & 255, (v >> 8) & 255, v & 255, 255);
    colorCache.set(hex, c);
  }
  // 回傳共用物件會被改 alpha，所以這裡每次複製一份到暫存
  const out = scratch[scratchIdx = (scratchIdx + 1) % scratch.length];
  out.set(c.r, c.g, c.b, Math.max(0, Math.min(255, Math.round(alpha))));
  return out;
}
const scratch = Array.from({ length: 8 }, () => new Color());
let scratchIdx = 0;

function lerpColor(a: string, b: string, k: number, alpha: number): Color {
  const ca = col(a); const ar = ca.r, ag = ca.g, ab = ca.b;
  const cb = col(b);
  return col('#000000', alpha).set(ar + (cb.r - ar) * k, ag + (cb.g - ag) * k, ab + (cb.b - ab) * k, Math.round(alpha));
}

export function tierOf(cfg: TileBuffVfxConfig, factor: number): TileBuffVfxTier {
  let t = cfg.stackTiers[0];
  for (const tier of cfg.stackTiers) if (factor >= tier.minFactor) t = tier;
  return t;
}

/** 固定亂數：同一顆粒子每圈位置一致但彼此錯開 */
function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function ellipsePoint(rx: number, ry: number, a: number, k: number, out: { x: number; y: number }): void {
  out.x = Math.cos(a) * rx * k;
  out.y = Math.sin(a) * ry * k;
}
const pt = { x: 0, y: 0 };

export type TileBuffVfxKind = 'attack' | 'hp';

/**
 * 畫一格的完整特效（地面＋粒子＋圓章底）。座標原點為格子地面中心。
 * @returns 圓章中心的 y（呼叫端把字 Label 放在同一高度）
 */
export function drawTileBuffVfx(
  g: Graphics, cfg: TileBuffVfxConfig, kind: TileBuffVfxKind, isDebuff: boolean, rare: boolean, factor: number, t: number,
): number {
  const pal: Palette = isDebuff ? cfg.debuff : (kind === 'attack' ? cfg.attack : cfg.hp);
  const tier = tierOf(cfg, factor);
  const { rx, ry } = cfg.ground;
  const glow = tier.glow;
  const dir = isDebuff ? -1 : 1;
  g.clear();
  let prims = 0;

  // 1. 地面底板：深色暗漆，讓亮色環在任何地形上都讀得出來，不用整片螢光
  g.fillColor = col(pal.base, cfg.ground.baseAlpha * glow);
  g.ellipse(0, 0, rx, ry); g.fill(); prims++;
  // 中心發亮：兩層漸亮的實心橢圓模擬放射漸層（不吃貼圖）
  const core = 0.75 + 0.25 * Math.sin(t * 2.4);
  g.fillColor = col(pal.inner, 55 * glow * core);
  g.ellipse(0, 0, rx * 0.8, ry * 0.8); g.fill(); prims++;
  g.fillColor = col(pal.mid, 60 * glow * core);
  g.ellipse(0, 0, rx * 0.45, ry * 0.45); g.fill(); prims++;

  // 2. 外圈金屬邊（金）＋內圈
  const rimPulse = 0.78 + 0.22 * Math.sin(t * 2.4);
  g.lineWidth = 3.4;
  g.strokeColor = col(kind === 'attack' && !isDebuff ? cfg.metal.gold : pal.rim, 235 * rimPulse * glow);
  g.ellipse(0, 0, rx, ry); g.stroke(); prims++;
  g.lineWidth = 2.2;
  g.strokeColor = col(pal.inner, 230 * glow);
  g.ellipse(0, 0, rx * 0.74, ry * 0.74); g.stroke(); prims++;

  if (kind === 'attack') {
    const A = cfg.attack;
    // 符文刻度：外圈與內圈之間的短刻度，緩轉；層數越高刻度越密
    const spin = t * cfg.ground.tickSpeed * dir;
    g.lineWidth = 1.8;
    g.strokeColor = col(pal.rim, 210 * glow);
    for (let i = 0; i < tier.ticks; i++) {
      const a = spin + (i / tier.ticks) * Math.PI * 2;
      const long = i % 4 === 0;
      ellipsePoint(rx, ry, a, long ? 0.74 : 0.8, pt); g.moveTo(pt.x, pt.y);
      ellipsePoint(rx, ry, a, 0.96, pt); g.lineTo(pt.x, pt.y);
      prims++;
    }
    g.stroke();
    // 刃形三角：四個朝外的小三角，反向慢轉（符文環的「刃」）
    g.fillColor = col(cfg.metal.gold, 245 * glow);
    for (let i = 0; i < A.bladeCount; i++) {
      const a = -spin * 0.7 + (i / A.bladeCount) * Math.PI * 2 + Math.PI / 4;
      ellipsePoint(rx, ry, a, 1.0, pt); const tx = pt.x, ty = pt.y;
      ellipsePoint(rx, ry, a - 0.16, 0.84, pt); const lx = pt.x, ly = pt.y;
      ellipsePoint(rx, ry, a + 0.16, 0.84, pt);
      g.moveTo(tx, ty); g.lineTo(lx, ly); g.lineTo(pt.x, pt.y); g.close(); g.fill(); prims++;
    }
    // 層數圈：每多一層，多一圈內縮的橘細環（最多 3 圈含內圈）
    for (let r = 1; r < tier.rings; r++) {
      g.lineWidth = 1.2;
      g.strokeColor = col(A.mid, 150 * glow);
      g.ellipse(0, 0, rx * (0.74 - r * 0.17), ry * (0.74 - r * 0.17)); g.stroke(); prims++;
    }
    // 往上竄的刃形火星：白金（剛出）→橘→暗紅（散去）
    let parts = 0;
    for (let i = 0; i < tier.particles; i++) {
      const life = A.sparkLifeSec;
      const u = (((t / life) + hash(i + 1)) % 1 + 1) % 1; // 0..1
      const x0 = (hash(i * 3 + 7) - 0.5) * rx * 1.5;
      const rise = (isDebuff ? 1 - u : u) * A.sparkRisePx;
      const y = ry * 0.3 + (hash(i * 5 + 2) - 0.5) * ry * 0.7 + rise * (0.35 + 0.65 * u);
      const x = x0 + Math.sin(u * 6 + i) * 2;
      const alpha = Math.sin(Math.PI * u) * 235 * glow;
      const len = A.sparkLenPx * (0.7 + 0.5 * hash(i + 9)) * (1 - 0.35 * u);
      const w = A.sparkWidthPx * (1 - 0.4 * u);
      // 拖尾：往下變細的淡色刃光，讓火星有「往上竄」的速度感
      const tailC = lerpColor(pal.mid, pal.tail, 0.5, alpha * 0.4);
      g.fillColor = tailC;
      g.moveTo(x + w * 0.7, y - len * 0.3); g.lineTo(x, y - len * 2.6 * dir); g.lineTo(x - w * 0.7, y - len * 0.3); g.close(); g.fill();
      g.fillColor = u < 0.3 ? lerpColor(pal.hot, pal.mid, u / 0.3, alpha) : lerpColor(pal.mid, pal.tail, (u - 0.3) / 0.7, alpha);
      g.moveTo(x, y + len); g.lineTo(x + w, y); g.lineTo(x, y - len * 0.45); g.lineTo(x - w, y); g.close(); g.fill();
      prims += 2; parts++;
    }
    tileBuffVfxStats.particles += parts;
  } else {
    const H = cfg.hp;
    // 呼吸環：內圈半徑跟著呼吸，亮度同步
    const breath = 0.5 + 0.5 * Math.sin((t / H.breathPeriodSec) * Math.PI * 2);
    g.lineWidth = 3;
    g.strokeColor = col(pal.hot, (140 + 100 * breath) * glow);
    const k = 0.5 + 0.1 * breath;
    g.ellipse(0, 0, rx * k, ry * k); g.stroke(); prims++;
    // 擴散光圈：圈數由疊層決定，錯開相位；擴散由內往外變細變淡（減益反過來往內收）
    for (let r = 0; r < tier.rings; r++) {
      const u = ((t / H.ringPeriodSec) + r / tier.rings) % 1;
      const e = isDebuff ? 1 - u : u;
      const s = 0.3 + 0.7 * e;
      g.lineWidth = 3.4 * (1 - 0.6 * u);
      g.strokeColor = col(pal.mid, 230 * (1 - u) * glow);
      g.ellipse(0, 0, rx * s, ry * s); g.stroke(); prims++;
    }
    // 外緣小菱形（玉符）：刻度改成緩轉的小菱形，數量隨疊層
    const gems = Math.min(8, 4 + (tier.rings - 1) * 2);
    g.fillColor = col(pal.rim, 215 * glow);
    for (let i = 0; i < gems; i++) {
      const a = t * cfg.ground.tickSpeed * 0.7 * dir + (i / gems) * Math.PI * 2;
      ellipsePoint(rx, ry, a, 0.97, pt);
      g.moveTo(pt.x, pt.y + 3.2); g.lineTo(pt.x + 2.4, pt.y); g.lineTo(pt.x, pt.y - 3.2); g.lineTo(pt.x - 2.4, pt.y); g.close(); g.fill(); prims++;
    }
    // 柔和上升光點：小菱形加一個淡暈
    let parts = 0;
    for (let i = 0; i < tier.particles; i++) {
      const u = (((t / H.moteLifeSec) + hash(i + 11)) % 1 + 1) % 1;
      const x = (hash(i * 3 + 5) - 0.5) * rx * 1.3 + Math.sin(u * Math.PI * 2 + i) * H.moteSwayPx;
      const y = ry * 0.2 + (isDebuff ? 1 - u : u) * H.moteRisePx;
      const alpha = Math.sin(Math.PI * u) * 240 * glow;
      const s = H.moteSizePx * (0.8 + 0.6 * hash(i + 4)) * (1 - 0.3 * u);
      g.fillColor = col(pal.mid, alpha * 0.35);
      g.circle(x, y, s * 1.9); g.fill();
      g.fillColor = lerpColor(pal.hot, pal.mid, u, alpha);
      g.moveTo(x, y + s * 1.5); g.lineTo(x + s, y); g.lineTo(x, y - s * 1.5); g.lineTo(x - s, y); g.close(); g.fill();
      prims += 2; parts++;
    }
    tileBuffVfxStats.particles += parts;
  }

  // 3. 圓章（金屬）：暗漆底＋金環＋高光弧；稀有格再加一圈細金環
  const bob = Math.sin((t / cfg.icon.bobPeriodSec) * Math.PI * 2) * cfg.icon.bobPx;
  const cy = cfg.icon.y + bob;
  const R = cfg.icon.radius;
  // 柔光暈（呼吸）：很淡，只做氣氛
  const halo = 0.6 + 0.4 * Math.sin(t * 2.2);
  g.fillColor = col(pal.mid, 40 * halo * glow);
  g.circle(0, cy, R + 7 + tier.rings * 1.5); g.fill(); prims++;
  g.fillColor = col(pal.disc, 255);
  g.circle(0, cy, R); g.fill(); prims++;
  g.lineWidth = 3;
  g.strokeColor = col(isDebuff ? pal.rim : cfg.metal.gold, 255);
  g.circle(0, cy, R); g.stroke(); prims++;
  g.lineWidth = 1.2;
  g.strokeColor = col(cfg.metal.goldDark, 200);
  g.circle(0, cy, R - 3.4); g.stroke(); prims++;
  g.lineWidth = 2;
  g.strokeColor = col(cfg.metal.highlight, 200);
  g.arc(0, cy, R - 1.6, Math.PI * 0.62, Math.PI * 0.95, true); g.stroke(); prims++;
  if (rare) {
    g.lineWidth = 2;
    g.strokeColor = col(cfg.metal.gold, 230);
    g.circle(0, cy, R + 5); g.stroke(); prims++;
  }
  tileBuffVfxStats.primitives += prims;
  return cy;
}

export function tileBuffVfxGlyphColor(cfg: TileBuffVfxConfig, kind: TileBuffVfxKind, isDebuff: boolean): Color {
  const pal = isDebuff ? cfg.debuff : (kind === 'attack' ? cfg.attack : cfg.hp);
  const v = parseInt(pal.glyph.slice(1), 16);
  return new Color((v >> 16) & 255, (v >> 8) & 255, v & 255, 255);
}
