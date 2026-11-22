/**
 * TileBuffVfx — 棋盤 buff 格「攻」「命」的畫法（View 層，Graphics 程式繪製，不吃任何貼圖）。
 *
 * 兩種畫面（PROG-2-9734）：
 *   1. 格子平常（drawTileStatic）：靜態淡光圈＋小圓章。光圈只在「種類／倍數／稀有」改變時重畫，不逐幀重畫。
 *      層數靠三件事一眼分出來：光圈圈數（×2 一圈、×3 兩圈、×5 三圈）、刻度數、亮度；圓章旁另有大字倍數。
 *   2. 部隊吃到 buff 的當下（drawPickupFrame）：在部隊腳下放一個大特效，循環 pickup.durationSec（2.5 秒）後淡出。
 *      攻＝金紅符文環＋上竄刃形火星；命＝翠玉呼吸環＋擴散光圈＋上升光點；減益改紫色，火星下沉、光圈收縮。
 *      一個部隊一份（不是每個小兵各播），由 UnitBuffPickupVfx 的節點池重用。
 *
 * 參考（只借著色器／粒子的「寫法與節奏」，沒有複製程式；原始碼放在工作筆記，不進專案）：
 *   00GameDevs https://00gamedevs.com/ — healing-field（擴散光圈＋浮動符號）、burning-ground（地面發光裂紋＋上升火星）、
 *   arcane-matrix（符文方陣＋浮動符號）、flame-surge（往上滾的火扇、邊緣碎火星）。
 *   Original code © 2026 00GameDevs (@00vchannel), MIT License。three.js © 2010-2026 three.js authors, MIT License。
 *   以下為依其節奏重新寫成 Cocos Graphics 的版本；依 MIT 條款保留上述版權聲明。
 *
 * 記憶體／效能：不建粒子節點、不用貼圖；動畫由時間純函式算出。
 *
 * Unity 對照：LineRenderer／Mesh 程式繪製的格子特效；config 即 ScriptableObject。
 */
import { Color, Graphics, JsonAsset, resources } from 'cc';
import { pickupEnvelope, tileBuffTierIndex } from '../shared/TileBuffVfxMath';

export interface TileBuffVfxTier { minFactor: number; rings: number; particles: number; ticks: number; glow: number }
interface Palette {
  rim: string; inner: string; base: string; hot: string; mid: string; tail: string; disc: string; glyph: string;
}
export interface TileBuffVfxConfig {
  version: number;
  tile: { rx: number; ry: number; alpha: number };
  icon: { radius: number; y: number };
  stackTiers: TileBuffVfxTier[];
  pickup: { durationSec: number; fadeInSec: number; fadeOutSec: number; poolMax: number; tierIndex: number; rx: number; ry: number; tickSpeed: number; baseAlpha: number };
  attack: Palette & { sparkLifeSec: number; sparkRisePx: number; sparkLenPx: number; sparkWidthPx: number; bladeCount: number };
  hp: Palette & { ringPeriodSec: number; breathPeriodSec: number; moteLifeSec: number; moteRisePx: number; moteSwayPx: number; moteSizePx: number };
  debuff: Palette;
  metal: { gold: string; goldDark: string; highlight: string };
}

export type TileBuffVfxKind = 'attack' | 'hp';

/** 量測用（單元測試、QA 讀取）：格子重畫次數、腳下特效畫了幾幀、累計圖元數 */
export const tileBuffVfxStats = { tileRedraws: 0, pickupFrames: 0, primitives: 0 };

let loaded: TileBuffVfxConfig | null = null;
let loading = false;
const colorCache = new Map<string, Color>();

/** 讀 resources/data/tile-buff-vfx.json（只讀一次）。讀到前回傳 null，呼叫端稍後再試。 */
export function getTileBuffVfxConfig(): TileBuffVfxConfig | null {
  if (!loaded && !loading) {
    loading = true;
    resources.load('data/tile-buff-vfx', JsonAsset, (err, asset) => {
      if (!err && asset) loaded = asset.json as TileBuffVfxConfig;
      else loading = false;
    });
  }
  return loaded;
}

const scratch = Array.from({ length: 8 }, () => new Color());
let scratchIdx = 0;

function baseColor(hex: string): Color {
  let c = colorCache.get(hex);
  if (!c) {
    const v = parseInt(hex.slice(1), 16);
    c = new Color((v >> 16) & 255, (v >> 8) & 255, v & 255, 255);
    colorCache.set(hex, c);
  }
  return c;
}

/** 取得（含 alpha 的）顏色；回傳暫存物件，下次呼叫可能被覆寫，只能立刻拿去設色 */
function col(hex: string, alpha = 255): Color {
  const c = baseColor(hex);
  const out = scratch[scratchIdx = (scratchIdx + 1) % scratch.length];
  out.set(c.r, c.g, c.b, Math.max(0, Math.min(255, Math.round(alpha))));
  return out;
}

function lerpColor(a: string, b: string, k: number, alpha: number): Color {
  const ca = baseColor(a);
  const cb = baseColor(b);
  const out = scratch[scratchIdx = (scratchIdx + 1) % scratch.length];
  out.set(ca.r + (cb.r - ca.r) * k, ca.g + (cb.g - ca.g) * k, ca.b + (cb.b - ca.b) * k, Math.max(0, Math.min(255, Math.round(alpha))));
  return out;
}

export function tierOf(cfg: TileBuffVfxConfig, factor: number): TileBuffVfxTier {
  return cfg.stackTiers[tileBuffTierIndex(cfg.stackTiers, factor)];
}

function paletteOf(cfg: TileBuffVfxConfig, kind: TileBuffVfxKind, isDebuff: boolean): Palette {
  return isDebuff ? cfg.debuff : (kind === 'attack' ? cfg.attack : cfg.hp);
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

/** 小菱形（玉符）填色，呼叫前先設 fillColor */
function diamond(g: Graphics, x: number, y: number, hw: number, hh: number): void {
  g.moveTo(x, y + hh); g.lineTo(x + hw, y); g.lineTo(x, y - hh); g.lineTo(x - hw, y); g.close(); g.fill();
}

/**
 * 畫格子平常的靜態淡光圈＋圓章底（只在內容改變時呼叫一次）。座標原點為格子地面中心。
 * 層數分級：圈數／刻度／亮度隨倍數明顯遞增；減益紫色。字（攻／命、×N）由呼叫端的 Label 疊上。
 * @returns 圓章中心的 y（呼叫端把字 Label 放在同一高度）
 */
export function drawTileStatic(
  g: Graphics, cfg: TileBuffVfxConfig, kind: TileBuffVfxKind, isDebuff: boolean, rare: boolean, factor: number,
): number {
  const pal = paletteOf(cfg, kind, isDebuff);
  const tier = tierOf(cfg, factor);
  const { rx, ry, alpha } = cfg.tile;
  const k = alpha * tier.glow;
  let prims = 0;
  g.clear();
  // 地面底板：很淡的暗色，讓環在任何地形上讀得出來
  g.fillColor = col(pal.base, 150 * k);
  g.ellipse(0, 0, rx, ry); g.fill(); prims++;
  g.fillColor = col(pal.inner, 80 * k);
  g.ellipse(0, 0, rx * 0.62, ry * 0.62); g.fill(); prims++;
  // 外圈
  g.lineWidth = 2.4;
  g.strokeColor = col(kind === 'attack' && !isDebuff ? cfg.metal.gold : pal.rim, 255 * k);
  g.ellipse(0, 0, rx, ry); g.stroke(); prims++;
  // 層數圈：每多一級多一圈內縮細環（最多 3 圈）
  for (let r = 0; r < tier.rings; r++) {
    const s = 0.78 - r * 0.2;
    g.lineWidth = r === 0 ? 1.8 : 1.4;
    g.strokeColor = col(pal.inner, 255 * k);
    g.ellipse(0, 0, rx * s, ry * s); g.stroke(); prims++;
  }
  if (kind === 'attack') {
    // 刻度：外圈與第一圈之間的短刻度，層數越高越密
    g.lineWidth = 1.6;
    g.strokeColor = col(pal.rim, 255 * k);
    for (let i = 0; i < tier.ticks; i++) {
      const a = (i / tier.ticks) * Math.PI * 2;
      ellipsePoint(rx, ry, a, 0.82, pt); g.moveTo(pt.x, pt.y);
      ellipsePoint(rx, ry, a, 0.96, pt); g.lineTo(pt.x, pt.y);
      prims++;
    }
    g.stroke();
    // 刃形三角：四個朝外的小三角
    g.fillColor = col(cfg.metal.gold, 235 * k);
    for (let i = 0; i < cfg.attack.bladeCount; i++) {
      const a = (i / cfg.attack.bladeCount) * Math.PI * 2 + Math.PI / 4;
      ellipsePoint(rx, ry, a, 1.0, pt); const tx = pt.x, ty = pt.y;
      ellipsePoint(rx, ry, a - 0.16, 0.86, pt); const lx = pt.x, ly = pt.y;
      ellipsePoint(rx, ry, a + 0.16, 0.86, pt);
      g.moveTo(tx, ty); g.lineTo(lx, ly); g.lineTo(pt.x, pt.y); g.close(); g.fill(); prims++;
    }
  } else {
    // 外緣小菱形（玉符）：數量隨層數
    const gems = tier.ticks / 2;
    g.fillColor = col(pal.rim, 255 * k);
    for (let i = 0; i < gems; i++) {
      ellipsePoint(rx, ry, (i / gems) * Math.PI * 2, 0.96, pt);
      diamond(g, pt.x, pt.y, 2.6, 3.4); prims++;
    }
  }
  // 圓章（金屬）：暗漆底＋金環＋高光弧；稀有格再加一圈細金環
  const cy = cfg.icon.y;
  const R = cfg.icon.radius;
  g.fillColor = col(pal.disc, 235);
  g.circle(0, cy, R); g.fill(); prims++;
  g.lineWidth = 2.6;
  g.strokeColor = col(isDebuff ? pal.rim : cfg.metal.gold, 255);
  g.circle(0, cy, R); g.stroke(); prims++;
  g.lineWidth = 1.1;
  g.strokeColor = col(cfg.metal.goldDark, 200);
  g.circle(0, cy, R - 3.2); g.stroke(); prims++;
  g.lineWidth = 1.8;
  g.strokeColor = col(cfg.metal.highlight, 190);
  g.arc(0, cy, R - 1.5, Math.PI * 0.62, Math.PI * 0.95, true); g.stroke(); prims++;
  if (rare) {
    g.lineWidth = 2;
    g.strokeColor = col(cfg.metal.gold, 230);
    g.circle(0, cy, R + 4.5); g.stroke(); prims++;
  }
  tileBuffVfxStats.tileRedraws++;
  tileBuffVfxStats.primitives += prims;
  return cy;
}

/**
 * 畫部隊腳下特效的一幀。g 畫地面（放在單位底下），sparks 畫火星／光點（放在單位上方）。
 * 座標原點為部隊腳下。t 為開始後經過的秒數；超過 pickup.durationSec 時兩個 Graphics 都清空。
 */
export function drawPickupFrame(
  g: Graphics, sparks: Graphics, cfg: TileBuffVfxConfig, kind: TileBuffVfxKind, isDebuff: boolean, t: number,
): void {
  g.clear();
  sparks.clear();
  const P = cfg.pickup;
  const env = pickupEnvelope(t, P.durationSec, P.fadeInSec, P.fadeOutSec);
  if (env <= 0) return;
  const pal = paletteOf(cfg, kind, isDebuff);
  const tier = cfg.stackTiers[Math.min(P.tierIndex, cfg.stackTiers.length - 1)];
  const { rx, ry } = P;
  const glow = tier.glow * env;
  const dir = isDebuff ? -1 : 1;
  let prims = 0;

  // 地面底板＋中心發亮（兩層實心橢圓模擬放射漸層）
  g.fillColor = col(pal.base, P.baseAlpha * glow);
  g.ellipse(0, 0, rx, ry); g.fill(); prims++;
  const core = 0.75 + 0.25 * Math.sin(t * 2.4 * Math.PI);
  g.fillColor = col(pal.inner, 60 * glow * core);
  g.ellipse(0, 0, rx * 0.8, ry * 0.8); g.fill(); prims++;
  g.fillColor = col(pal.mid, 65 * glow * core);
  g.ellipse(0, 0, rx * 0.45, ry * 0.45); g.fill(); prims++;
  // 外圈與內圈
  g.lineWidth = 3.6;
  g.strokeColor = col(kind === 'attack' && !isDebuff ? cfg.metal.gold : pal.rim, 240 * (0.8 + 0.2 * core) * glow);
  g.ellipse(0, 0, rx, ry); g.stroke(); prims++;
  g.lineWidth = 2.4;
  g.strokeColor = col(pal.inner, 230 * glow);
  g.ellipse(0, 0, rx * 0.74, ry * 0.74); g.stroke(); prims++;

  const spin = t * P.tickSpeed * dir;
  const n = Math.round(tier.particles * 1.4);
  if (kind === 'attack') {
    const A = cfg.attack;
    // 符文刻度與刃形三角（緩轉）
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
    g.fillColor = col(cfg.metal.gold, 245 * glow);
    for (let i = 0; i < A.bladeCount; i++) {
      const a = -spin * 0.7 + (i / A.bladeCount) * Math.PI * 2 + Math.PI / 4;
      ellipsePoint(rx, ry, a, 1.0, pt); const tx = pt.x, ty = pt.y;
      ellipsePoint(rx, ry, a - 0.16, 0.84, pt); const lx = pt.x, ly = pt.y;
      ellipsePoint(rx, ry, a + 0.16, 0.84, pt);
      g.moveTo(tx, ty); g.lineTo(lx, ly); g.lineTo(pt.x, pt.y); g.close(); g.fill(); prims++;
    }
    for (let r = 1; r < tier.rings; r++) {
      g.lineWidth = 1.2;
      g.strokeColor = col(A.mid, 150 * glow);
      g.ellipse(0, 0, rx * (0.74 - r * 0.17), ry * (0.74 - r * 0.17)); g.stroke(); prims++;
    }
    // 往上竄的刃形火星：白金（剛出）→橘→暗紅（散去）；畫在單位上方
    for (let i = 0; i < n; i++) {
      const u = (((t / A.sparkLifeSec) + hash(i + 1)) % 1 + 1) % 1;
      const x0 = (hash(i * 3 + 7) - 0.5) * rx * 1.5;
      const rise = (isDebuff ? 1 - u : u) * A.sparkRisePx;
      const y = ry * 0.3 + (hash(i * 5 + 2) - 0.5) * ry * 0.7 + rise * (0.35 + 0.65 * u);
      const x = x0 + Math.sin(u * 6 + i) * 2;
      const alpha = Math.sin(Math.PI * u) * 240 * env;
      const len = A.sparkLenPx * (0.7 + 0.5 * hash(i + 9)) * (1 - 0.35 * u);
      const w = A.sparkWidthPx * (1 - 0.4 * u);
      sparks.fillColor = lerpColor(pal.mid, pal.tail, 0.5, alpha * 0.4);
      sparks.moveTo(x + w * 0.7, y - len * 0.3); sparks.lineTo(x, y - len * 2.6 * dir); sparks.lineTo(x - w * 0.7, y - len * 0.3); sparks.close(); sparks.fill();
      sparks.fillColor = u < 0.3 ? lerpColor(pal.hot, pal.mid, u / 0.3, alpha) : lerpColor(pal.mid, pal.tail, (u - 0.3) / 0.7, alpha);
      sparks.moveTo(x, y + len); sparks.lineTo(x + w, y); sparks.lineTo(x, y - len * 0.45); sparks.lineTo(x - w, y); sparks.close(); sparks.fill();
      prims += 2;
    }
  } else {
    const H = cfg.hp;
    // 呼吸環＋擴散光圈（減益反過來往內收）
    const breath = 0.5 + 0.5 * Math.sin((t / H.breathPeriodSec) * Math.PI * 2);
    g.lineWidth = 3;
    g.strokeColor = col(pal.hot, (140 + 100 * breath) * glow);
    const kk = 0.5 + 0.1 * breath;
    g.ellipse(0, 0, rx * kk, ry * kk); g.stroke(); prims++;
    for (let r = 0; r < tier.rings; r++) {
      const u = ((t / H.ringPeriodSec) + r / tier.rings) % 1;
      const e = isDebuff ? 1 - u : u;
      const s = 0.3 + 0.7 * e;
      g.lineWidth = 3.4 * (1 - 0.6 * u);
      g.strokeColor = col(pal.mid, 230 * (1 - u) * glow);
      g.ellipse(0, 0, rx * s, ry * s); g.stroke(); prims++;
    }
    const gems = Math.min(8, 4 + (tier.rings - 1) * 2);
    g.fillColor = col(pal.rim, 215 * glow);
    for (let i = 0; i < gems; i++) {
      ellipsePoint(rx, ry, spin * 0.7 + (i / gems) * Math.PI * 2, 0.97, pt);
      diamond(g, pt.x, pt.y, 2.4, 3.2); prims++;
    }
    // 柔和上升光點：小菱形加一個淡暈
    for (let i = 0; i < n; i++) {
      const u = (((t / H.moteLifeSec) + hash(i + 11)) % 1 + 1) % 1;
      const x = (hash(i * 3 + 5) - 0.5) * rx * 1.3 + Math.sin(u * Math.PI * 2 + i) * H.moteSwayPx;
      const y = ry * 0.2 + (isDebuff ? 1 - u : u) * H.moteRisePx;
      const alpha = Math.sin(Math.PI * u) * 240 * env;
      const s = H.moteSizePx * (0.8 + 0.6 * hash(i + 4)) * (1 - 0.3 * u);
      sparks.fillColor = col(pal.mid, alpha * 0.35);
      sparks.circle(x, y, s * 1.9); sparks.fill();
      sparks.fillColor = lerpColor(pal.hot, pal.mid, u, alpha);
      diamond(sparks, x, y, s, s * 1.5);
      prims += 2;
    }
  }
  tileBuffVfxStats.pickupFrames++;
  tileBuffVfxStats.primitives += prims;
}

export function tileBuffVfxGlyphColor(cfg: TileBuffVfxConfig, kind: TileBuffVfxKind, isDebuff: boolean): Color {
  const c = baseColor(paletteOf(cfg, kind, isDebuff).glyph);
  return new Color(c.r, c.g, c.b, 255);
}
