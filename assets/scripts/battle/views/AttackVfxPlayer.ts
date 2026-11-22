/**
 * AttackVfxPlayer — 戰場攻擊特效（試作，View 層，零貼圖、單一 Graphics 節點、全部數值來自 data/attack-vfx.json）。
 *
 * 設計：
 *   步兵 arcSlash   ：由上往下的弧形刀光，頭亮尾淡，命中處迸火花。
 *   長槍兵 thrustLine：一道細長突刺線往前竄＋平行速度線，槍尖到點迸星芒。
 *   弓兵 arrowTrail ：箭矢身後的漸細尾跡＋幾點閃光，命中小光圈（箭矢本體仍是 ArrowShotView 的 Sprite）。
 *   武將 = 武器模板（blade/spear/sword/bow/cast，同一批畫法放大）＋代表色＋名將獨特細節（signature）：
 *     關羽 moonBlade：青綠月牙刀光外加一道慢半拍的外圈月牙與飄起的青綠碎光；
 *     諸葛亮 bagua：施法法陣外圈八卦爻＋爆點羽扇弧。
 *
 * 效能：整個播放器只有一個 Graphics 節點（一次 drawcall），特效是池內的資料記錄而不是節點；
 * 全場同時特效數與粒子數有上限（JSON budget），超過就縮減粒子或略過，絕不新增節點。沒有特效時不重畫、節點停用。
 *
 * 參考（只借節奏與寫法，沒有複製程式）：00GameDevs https://00gamedevs.com/ 的 flame-surge（火舌掃過＋邊緣碎火星）、
 *   arcane-matrix（符文方陣緩轉）、healing-field（擴散光圈）。
 *   Original code © 2026 00GameDevs (@00vchannel), MIT License。three.js © 2010-2026 three.js authors, MIT License。
 *   以下為依其節奏重新寫成 Cocos Graphics 的版本；依 MIT 條款保留上述版權聲明。
 *
 * Unity 對照：一個以程式繪製的 LineRenderer／Mesh 特效管理器；attack-vfx.json 即 ScriptableObject。
 */
import { Color, Graphics, JsonAsset, Node, resources } from 'cc';

export interface AtkPalette { main: string; glow: string; core: string; accent: string }
type Params = Record<string, number | string | AtkPalette>;
export interface AttackVfxConfig {
  enabled: boolean;
  budget: { maxEffects: number; maxParticles: number; minLinePx: number };
  troops: Record<string, Params & { kind: string; palette: AtkPalette }>;
  generalTemplates: Record<string, Params & { kind: string }>;
  signatures: Record<string, Params>;
  generalProfiles: Record<string, { weapon: string; signature?: string; palette: AtkPalette }>;
  fallback: { weaponByRole: Record<string, string>; defaultWeapon: string; elementPalettes: Record<string, AtkPalette>; defaultPalette: AtkPalette };
}
export type AttackVfxTroop = 'slash' | 'thrust' | 'bow';
export interface GeneralVfxInfo { id: string; role?: string; element?: string }

/** 量測用：效能報告與單元測試讀取（也掛在 globalThis.__ATK_VFX_STATS__） */
export const attackVfxStats = { activeFx: 0, particles: 0, peakFx: 0, peakParticles: 0, primitives: 0, played: 0, skipped: 0 };

interface Fx {
  active: boolean; kind: string; t: number; seed: number;
  ax: number; ay: number; bx: number; by: number; ang: number; dist: number; flip: number;
  p: Params; pal: AtkPalette; sig: Params | null; sigName: string; particles: number; total: number;
}

let loaded: AttackVfxConfig | null = null;
let loading = false;
/** 讀 resources/data/attack-vfx.json（只讀一次）；讀到前回傳 null，呼叫端退回舊特效。 */
export function getAttackVfxConfig(): AttackVfxConfig | null {
  if (!loaded && !loading) {
    loading = true;
    resources.load('data/attack-vfx', JsonAsset, (err, asset) => { if (!err && asset) loaded = asset.json as AttackVfxConfig; });
  }
  return loaded;
}

/** 新舊開關：網址 ?atkVfx=old／new 優先，否則看 JSON enabled */
export function isAttackVfxEnabled(cfg: AttackVfxConfig | null): boolean {
  if (!cfg) return false;
  try {
    const search = (globalThis as { location?: { search?: string } }).location?.search ?? '';
    const q = new URLSearchParams(search).get('atkVfx');
    if (q === 'old') return false;
    if (q === 'new') return true;
  } catch { /* 非網頁環境略過 */ }
  return cfg.enabled;
}

/** 依 profile → 角色 → 元素解析武將的武器模板、代表色與獨特細節（量產：沒設定的武將自動有一套） */
export function resolveGeneralVfx(cfg: AttackVfxConfig, g: GeneralVfxInfo): { weapon: string; palette: AtkPalette; signature: string } {
  const prof = cfg.generalProfiles[g.id];
  if (prof) return { weapon: prof.weapon, palette: prof.palette, signature: prof.signature ?? '' };
  const fb = cfg.fallback;
  const weapon = (g.role && fb.weaponByRole[g.role]) || fb.defaultWeapon;
  return { weapon, palette: (g.element && fb.elementPalettes[g.element]) || fb.defaultPalette, signature: '' };
}

const rgbCache = new Map<string, [number, number, number]>();
const scratch = new Color();
function col(hex: string, alpha: number): Color {
  let c = rgbCache.get(hex);
  if (!c) { const v = parseInt(hex.slice(1), 16); c = [(v >> 16) & 255, (v >> 8) & 255, v & 255]; rgbCache.set(hex, c); }
  return scratch.set(c[0], c[1], c[2], Math.max(0, Math.min(255, Math.round(alpha))));
}
const hash = (n: number): number => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (u: number): number => 1 - (1 - u) * (1 - u);
const DEG = Math.PI / 180;
const num = (p: Params, k: string): number => p[k] as number;
const TRIGRAMS = [0b111, 0b000, 0b010, 0b101, 0b001, 0b110, 0b011, 0b100]; // 乾坤坎離震巽艮兌

export class AttackVfxPlayer {
  private node: Node | null = null;
  private g: Graphics | null = null;
  private readonly pool: Fx[] = [];
  private seedCounter = 1;
  private flipCounter = 0;
  private dirty = false;

  constructor(private readonly getParent: () => Node | null, private readonly layer: () => number) { getAttackVfxConfig(); }

  /** 該兵種是否由本播放器負責（設定已載入且開關開啟） */
  public handles(style: string): style is AttackVfxTroop {
    const cfg = getAttackVfxConfig();
    return !!cfg && isAttackVfxEnabled(cfg) && !!cfg.troops[style];
  }

  /** 小兵攻擊特效。座標為畫面層（uiRoot）。回傳是否已播出。 */
  public playTroop(style: string, ax: number, ay: number, bx: number, by: number, ratio: number): boolean {
    if (!this.handles(style)) return false;
    const cfg = getAttackVfxConfig()!; const spec = cfg.troops[style];
    return this.spawn(cfg, spec.kind, spec, spec.palette, null, '', ax, ay, bx, by, ratio);
  }

  /** 武將攻擊／施法特效：武器模板＋代表色＋名將獨特細節 */
  public playGeneral(info: GeneralVfxInfo, ax: number, ay: number, bx: number, by: number): boolean {
    const cfg = getAttackVfxConfig();
    if (!cfg || !isAttackVfxEnabled(cfg)) return false;
    const r = resolveGeneralVfx(cfg, info);
    const tpl = cfg.generalTemplates[r.weapon];
    if (!tpl) return false;
    const sig = r.signature ? cfg.signatures[r.signature] ?? null : null;
    // 武將與目標常隔很遠：刀光只落在身前 hitDistPx 處，不跟著飛到對面
    const hit = tpl.hitDistPx as number | undefined;
    const dist = Math.hypot(bx - ax, by - ay) || 1;
    return this.spawn(cfg, tpl.kind, tpl, r.palette, sig, r.signature, ax, ay, bx, by, hit ? Math.min(1, hit / dist) : 1);
  }

  private spawn(cfg: AttackVfxConfig, kind: string, p: Params, pal: AtkPalette, sig: Params | null, sigName: string,
    ax: number, ay: number, bx: number, by: number, ratio: number): boolean {
    try {
      const parent = this.getParent();
      if (!parent?.isValid) return false;
      let used = 0, activeN = 0;
      let slot: Fx | null = null;
      for (const f of this.pool) { if (f.active) { used += f.particles; activeN++; } else if (!slot) slot = f; }
      if (activeN >= cfg.budget.maxEffects) { attackVfxStats.skipped++; return true; } // 已滿：略過但視為已處理，不退回舊特效疊畫
      if (!slot) { slot = { active: false, kind: '', t: 0, seed: 0, ax: 0, ay: 0, bx: 0, by: 0, ang: 0, dist: 0, flip: 1, p, pal, sig: null, sigName: '', particles: 0, total: 0 }; this.pool.push(slot); }
      const want = this.wantParticles(kind, p, sig);
      slot.particles = Math.max(0, Math.min(want, cfg.budget.maxParticles - used));
      slot.total = want;
      const dx = bx - ax, dy = by - ay;
      slot.kind = kind; slot.p = p; slot.pal = pal; slot.sig = sig; slot.sigName = sigName;
      slot.t = 0; slot.seed = this.seedCounter++ * 7.31; slot.flip = (this.flipCounter++ & 1) ? -1 : 1;
      slot.ang = Math.atan2(dy, dx); slot.dist = Math.hypot(dx, dy);
      slot.ax = ax; slot.ay = ay;
      // 刀光中心：目標方向上 ratio 處的命中點；其餘種類 b 就是目標
      slot.bx = kind === 'arcSlash' ? ax + dx * ratio : bx; slot.by = kind === 'arcSlash' ? ay + dy * ratio : by;
      slot.active = true;
      this.ensureNode(parent);
      attackVfxStats.played++;
      return true;
    } catch (error) { console.warn('[AttackVfxPlayer] 攻擊特效略過', error); return false; }
  }

  private wantParticles(kind: string, p: Params, sig: Params | null): number {
    let n = (p.sparkCount as number | undefined) ?? 0;
    if (kind === 'thrustLine') n += num(p, 'speedLines');
    if (kind === 'arrowTrail') n += num(p, 'glints');
    if (kind === 'castOrb') n = num(p, 'burstRays') + num(p, 'spiralArms');
    if (sig?.motes) n += num(sig, 'motes');
    if (sig?.featherArcs) n += num(sig, 'featherArcs');
    return n;
  }

  public update(dt: number): void {
    const g = this.g;
    if (!g || !this.node?.isValid) return;
    let any = false, parts = 0, fxN = 0, prims = 0;
    for (const f of this.pool) if (f.active) { any = true; break; }
    if (!any) {
      if (this.dirty) { g.clear(); this.dirty = false; this.node.active = false; }
      return;
    }
    this.node.active = true;
    g.clear(); this.dirty = true;
    for (const f of this.pool) {
      if (!f.active) continue;
      f.t += dt;
      const dur = num(f.p, 'delaySec') + num(f.p, 'durationSec');
      if (f.t >= dur) { f.active = false; continue; }
      fxN++; parts += f.particles;
      const t = f.t - num(f.p, 'delaySec');
      if (t < 0) continue;
      const u = clamp01(t / num(f.p, 'durationSec'));
      switch (f.kind) {
        case 'arcSlash': prims += this.drawArcSlash(g, f, t, u); break;
        case 'thrustLine': prims += this.drawThrust(g, f, t, u); break;
        case 'arrowTrail': prims += this.drawArrow(g, f, t, u); break;
        case 'castOrb': prims += this.drawCast(g, f, t, u); break;
      }
    }
    attackVfxStats.activeFx = fxN; attackVfxStats.particles = parts; attackVfxStats.primitives = prims;
    if (fxN > attackVfxStats.peakFx) attackVfxStats.peakFx = fxN;
    if (parts > attackVfxStats.peakParticles) attackVfxStats.peakParticles = parts;
    (globalThis as { __ATK_VFX_STATS__?: unknown }).__ATK_VFX_STATS__ = attackVfxStats;
  }

  public destroy(): void {
    if (this.node?.isValid) this.node.destroy();
    this.node = null; this.g = null; this.pool.length = 0;
  }

  private ensureNode(parent: Node): void {
    if (!this.node?.isValid) {
      const n = new Node('AttackVfx');
      n.layer = this.layer();
      this.g = n.addComponent(Graphics);
      this.g.lineJoin = Graphics.LineJoin.ROUND;
      this.g.lineCap = Graphics.LineCap.ROUND;
      this.node = n;
    }
    if (this.node.parent !== parent) parent.addChild(this.node);
    this.node.setSiblingIndex(parent.children.length - 1);
    this.node.active = true;
  }

  // ───────────── 共用畫法 ─────────────

  /** 一段環帶（弧形刀光）：外徑固定，內徑從 in0 線性變到 in1，角度 a0→a1。 */
  private strip(g: Graphics, cx: number, cy: number, rOut: number, in0: number, in1: number, a0: number, a1: number): void {
    const S = 3;
    for (let i = 0; i <= S; i++) {
      const a = a0 + (a1 - a0) * i / S;
      const x = cx + Math.cos(a) * rOut, y = cy + Math.sin(a) * rOut;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    for (let i = S; i >= 0; i--) {
      const a = a0 + (a1 - a0) * i / S; const r = in0 + (in1 - in0) * i / S;
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.close(); g.fill();
  }

  /** 從 (x,y) 往 ang 方向、由 r0 到 r1 的一條火花線 */
  private ray(g: Graphics, x: number, y: number, ang: number, r0: number, r1: number, w: number, color: Color): void {
    g.lineWidth = Math.max(2, w); g.strokeColor = color;
    g.moveTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0);
    g.lineTo(x + Math.cos(ang) * r1, y + Math.sin(ang) * r1); g.stroke();
  }

  /** 命中火花＋光圈：從 u0 起 0→1 展開。count 受粒子上限，回傳圖元數 */
  private burst(g: Graphics, f: Fx, x: number, y: number, k: number, count: number, lenPx: number, wPx: number, ringPx: number, baseAng: number, spread: number): number {
    if (k <= 0) return 0;
    let prims = 0; const fade = 1 - k;
    for (let i = 0; i < count; i++) {
      const a = baseAng + (count === 1 ? 0 : (i / (count - 1) - 0.5) * spread) + (hash(f.seed + i) - 0.5) * 0.5;
      const len = lenPx * (0.7 + hash(f.seed + i * 3) * 0.6);
      this.ray(g, x, y, a, len * 0.25 * easeOut(k), len * easeOut(k), wPx * (1 - k * 0.5), col(i & 1 ? f.pal.accent : f.pal.main, 255 * fade));
      prims++;
    }
    if (ringPx > 0) {
      g.lineWidth = 3; g.strokeColor = col(f.pal.glow, 220 * fade);
      g.circle(x, y, ringPx * 0.3 + ringPx * 0.7 * easeOut(k)); g.stroke(); prims++;
    }
    return prims;
  }

  // ───────────── arcSlash ─────────────
  private drawArcSlash(g: Graphics, f: Fx, t: number, u: number): number {
    const p = f.p; let prims = 0;
    const R = num(p, 'radiusPx'), thick = num(p, 'thickPx'), K = num(p, 'trailSegments');
    const cx = f.bx - Math.cos(f.ang) * R * num(p, 'centerBack');
    const cy = f.by - Math.sin(f.ang) * R * num(p, 'centerBack');
    prims += this.slashPass(g, f, cx, cy, R, thick, K, u, 1);
    const sig = f.sig;
    if (sig && f.sigName === 'moonBlade') {
      const lag = num(sig, 'echoLagSec') / num(p, 'durationSec');
      if (u > lag) prims += this.slashPass(g, f, cx, cy, R * num(sig, 'echoRadiusScale'), thick * num(sig, 'echoThickScale'), K, u - lag, num(sig, 'echoAlpha'));
      // 青綠碎光：從刀光弧上冒出，往上飄、左右輕擺
      const life = num(sig, 'moteLifeFrac');
      const n = Math.min(num(sig, 'motes'), f.particles);
      for (let i = 0; i < n; i++) {
        const s0 = 0.25 + hash(f.seed + i * 5) * 0.4;
        const k = clamp01((u - s0) / life);
        if (k <= 0 || k >= 1) continue;
        const a = f.ang + f.flip * (hash(f.seed + i) - 0.5) * (num(p, 'sweepDeg') * DEG);
        const mx = cx + Math.cos(a) * R + Math.sin(t * 9 + i * 2) * num(sig, 'moteSwayPx') * k;
        const my = cy + Math.sin(a) * R + num(sig, 'moteRisePx') * easeOut(k);
        const sz = num(sig, 'moteSizePx') * (1 - k * 0.5);
        g.fillColor = col(i & 1 ? f.pal.accent : f.pal.main, 255 * (1 - k * k));
        g.moveTo(mx, my + sz); g.lineTo(mx + sz * 0.6, my); g.lineTo(mx, my - sz); g.lineTo(mx - sz * 0.6, my); g.close(); g.fill(); prims++;
      }
    }
    // 命中火花：刀光掃到底之後
    const hk = clamp01((u - num(p, 'headFrac') * 0.9) / (1 - num(p, 'headFrac') * 0.9));
    const nSpark = Math.min(num(p, 'sparkCount'), f.particles);
    prims += this.burst(g, f, f.bx, f.by, hk, nSpark, num(p, 'sparkLenPx'), num(p, 'sparkWidthPx'), num(p, 'ringPx'), f.ang + Math.PI, 2.2);
    return prims;
  }

  /** 一道弧形刀光（halo＋本體＋白芯三層）。 */
  private slashPass(g: Graphics, f: Fx, cx: number, cy: number, R: number, thick: number, K: number, u: number, alpha: number): number {
    const p = f.p; let prims = 0;
    const sweep = num(p, 'sweepDeg') * DEG, trail = num(p, 'trailDeg') * DEG;
    const h = clamp01(u / num(p, 'headFrac'));
    const e = easeOut(h);
    const aStart = f.ang + f.flip * sweep / 2, aEnd = f.ang - f.flip * sweep / 2;
    const aHead = aStart + (aEnd - aStart) * e;
    const covered = Math.abs(aHead - aStart);
    const aTail = aHead - Math.sign(aEnd - aStart) * Math.min(trail, covered);
    const fs = num(p, 'fadeStart');
    const fade = u > fs ? 1 - (u - fs) / (1 - fs) : 1;
    if (fade <= 0) return 0;
    const layers: [number, string, number][] = [[1.7, f.pal.glow, 0.38], [1, f.pal.main, 0.95], [0.38, f.pal.core, 1]];
    for (const [tk, hex, la] of layers) {
      for (let j = 0; j < K; j++) {
        const k0 = j / K, k1 = (j + 1) / K;
        const a0 = aTail + (aHead - aTail) * k0, a1 = aTail + (aHead - aTail) * k1;
        g.fillColor = col(hex, 255 * la * fade * alpha * Math.pow(k1, 1.4));
        this.strip(g, cx, cy, R + thick * 0.12 * tk, R + thick * 0.12 * tk - thick * tk * Math.pow(k0, 0.8), R + thick * 0.12 * tk - thick * tk * Math.pow(k1, 0.8), a0, a1);
        prims++;
      }
    }
    return prims;
  }

  // ───────────── thrustLine ─────────────
  private drawThrust(g: Graphics, f: Fx, t: number, u: number): number {
    const p = f.p; let prims = 0;
    const L = num(p, 'lengthPx'), W = num(p, 'widthPx');
    const maxReach = (p.maxReachPx as number | undefined) ?? Infinity;
    const reach = Math.max(num(p, 'startOffPx') + 20, Math.min(maxReach, f.dist * num(p, 'reachFrac')));
    const h = clamp01(u / num(p, 'headFrac')); const e = easeOut(h);
    const head = num(p, 'startOffPx') + (reach - num(p, 'startOffPx')) * e;
    const tail = Math.max(num(p, 'startOffPx') * 0.5, head - L * (0.4 + 0.6 * e));
    const fade = u < 0.5 ? 1 : 1 - (u - 0.5) / 0.5;
    const ca = Math.cos(f.ang), sa = Math.sin(f.ang), nx = -sa, ny = ca;
    const tri = (t0: number, t1: number, w: number, color: Color, off = 0): void => {
      g.fillColor = color;
      g.moveTo(f.ax + ca * t0 + nx * off, f.ay + sa * t0 + ny * off);
      g.lineTo(f.ax + ca * (t1 - w * 2) + nx * (off + w), f.ay + sa * (t1 - w * 2) + ny * (off + w));
      g.lineTo(f.ax + ca * t1 + nx * off, f.ay + sa * t1 + ny * off);
      g.lineTo(f.ax + ca * (t1 - w * 2) + nx * (off - w), f.ay + sa * (t1 - w * 2) + ny * (off - w));
      g.close(); g.fill(); prims++;
    };
    if (fade > 0) {
      tri(tail, head, W * 1.1, col(f.pal.glow, 110 * fade));
      tri(tail, head, W * 0.62, col(f.pal.main, 245 * fade));
      tri(tail + (head - tail) * 0.2, head, W * 0.3, col(f.pal.core, 255 * fade));
      const n = Math.min(num(p, 'speedLines'), f.particles);
      for (let i = 0; i < n; i++) {
        const side = (i % 2 === 0 ? 1 : -1) * (Math.floor(i / 2) + 1) * num(p, 'speedLineGapPx');
        const sl = (head - tail) * num(p, 'speedLineScale');
        const s1 = head - (hash(f.seed + i) * 0.25) * L * 0.5, s0 = s1 - sl;
        g.lineWidth = 2.5; g.strokeColor = col(f.pal.accent, 190 * fade * (1 - i * 0.12));
        g.moveTo(f.ax + ca * Math.max(0, s0) + nx * side, f.ay + sa * Math.max(0, s0) + ny * side);
        g.lineTo(f.ax + ca * s1 + nx * side, f.ay + sa * s1 + ny * side); g.stroke(); prims++;
      }
    }
    const hk = clamp01((u - num(p, 'headFrac')) / (1 - num(p, 'headFrac')));
    const tipX = f.ax + ca * head, tipY = f.ay + sa * head;
    const nSpark = Math.min(num(p, 'sparkCount'), Math.max(0, f.particles - num(p, 'speedLines')));
    prims += this.burst(g, f, tipX, tipY, hk, nSpark, num(p, 'sparkLenPx'), num(p, 'sparkWidthPx'), num(p, 'ringPx'), f.ang, Math.PI * 1.4);
    return prims;
  }

  // ───────────── arrowTrail ─────────────
  private drawArrow(g: Graphics, f: Fx, t: number, u: number): number {
    const p = f.p; let prims = 0;
    const flight = num(p, 'flightSec');
    const k = clamp01(t / flight);
    const ca = Math.cos(f.ang), sa = Math.sin(f.ang);
    const hx = f.ax + (f.bx - f.ax) * k, hy = f.ay + (f.by - f.ay) * k;
    if (t < flight + 0.08) {
      const S = num(p, 'trailSegments'); const len = Math.min(num(p, 'trailLenPx'), f.dist * k + 8);
      const post = t > flight ? 1 - (t - flight) / 0.08 : 1;
      for (let i = 0; i < S; i++) {
        const k0 = i / S, k1 = (i + 1) / S; // k0 靠尾端
        const x0 = hx - ca * len * (1 - k0), y0 = hy - sa * len * (1 - k0);
        const x1 = hx - ca * len * (1 - k1), y1 = hy - sa * len * (1 - k1);
        g.lineWidth = Math.max(2, num(p, 'trailWidthPx') * k1 * 1.9); g.strokeColor = col(f.pal.glow, 120 * k1 * post);
        g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        g.lineWidth = Math.max(2, num(p, 'trailWidthPx') * k1 * 0.8); g.strokeColor = col(f.pal.main, 235 * k1 * post);
        g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); prims += 2;
      }
      const n = Math.min(num(p, 'glints'), f.particles);
      for (let i = 0; i < n; i++) {
        const back = (0.15 + hash(f.seed + i) * 0.8) * len;
        const wob = Math.sin(t * 24 + i * 2.3) * 7;
        const life = 1 - (back / len) * 0.8;
        g.fillColor = col(f.pal.core, 230 * life * post);
        g.circle(hx - ca * back - sa * wob, hy - sa * back + ca * wob, Math.max(2, num(p, 'glintSizePx') * life)); g.fill(); prims++;
      }
    }
    const hk = clamp01((t - flight) / (num(p, 'durationSec') - flight));
    const nSpark = Math.min(num(p, 'sparkCount'), f.particles);
    prims += this.burst(g, f, f.bx, f.by, hk, nSpark, num(p, 'sparkLenPx'), num(p, 'sparkWidthPx'), num(p, 'ringPx'), f.ang + Math.PI, Math.PI * 1.2);
    return prims;
  }

  // ───────────── castOrb ─────────────
  private drawCast(g: Graphics, f: Fx, t: number, u: number): number {
    const p = f.p; let prims = 0;
    const rise = clamp01(t / num(p, 'ringRiseSec'));
    const orbT = (t - num(p, 'orbStartSec')) / num(p, 'orbFlightSec');
    const burstK = clamp01((t - num(p, 'orbStartSec') - num(p, 'orbFlightSec')) / num(p, 'burstSec'));
    const out = u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1;
    const rcx = f.ax, rcy = f.ay - num(p, 'ringDropPx'); // 武將節點在身體中心，法陣畫在腳下
    // 腳下法陣：橢圓（3/4 視角）＋緩轉刻度
    const rx = num(p, 'ringRxPx') * easeOut(rise), ry = num(p, 'ringRyPx') * easeOut(rise);
    g.lineWidth = 3; g.strokeColor = col(f.pal.main, 235 * out); g.ellipse(rcx, rcy, rx, ry); g.stroke();
    g.lineWidth = 2; g.strokeColor = col(f.pal.glow, 200 * out); g.ellipse(rcx, rcy, rx * 0.72, ry * 0.72); g.stroke(); prims += 2;
    g.fillColor = col(f.pal.glow, 55 * out); g.ellipse(rcx, rcy, rx * 0.72, ry * 0.72); g.fill(); prims++;
    const spin = t * num(p, 'ringSpinDegPerSec') * DEG;
    const ticks = num(p, 'ringTicks');
    g.lineWidth = 2.5; g.strokeColor = col(f.pal.core, 220 * out);
    for (let i = 0; i < ticks; i++) {
      const a = spin + i * Math.PI * 2 / ticks;
      g.moveTo(rcx + Math.cos(a) * rx * 0.8, rcy + Math.sin(a) * ry * 0.8);
      g.lineTo(rcx + Math.cos(a) * rx * 0.97, rcy + Math.sin(a) * ry * 0.97);
    }
    g.stroke(); prims++;
    if (f.sig && f.sigName === 'bagua') prims += this.drawBagua(g, f, rcx, rcy, rx, ry, spin, out);
    // 氣旋球：螺旋尾跡
    if (orbT > 0 && orbT < 1.12) {
      const k = clamp01(orbT);
      const ca = Math.cos(f.ang), sa = Math.sin(f.ang), nx = -sa, ny = ca;
      const px = (kk: number): number => f.ax + (f.bx - f.ax) * easeOut(kk);
      const py = (kk: number): number => f.ay + (f.by - f.ay) * easeOut(kk) + 34 * Math.sin(Math.PI * kk); // 微拋物
      const arms = Math.min(num(p, 'spiralArms'), f.particles);
      const tl = num(p, 'trailLenFrac'); const fadeEnd = orbT > 1 ? 1 - (orbT - 1) / 0.12 : 1;
      for (let a = 0; a < arms; a++) {
        const ph = a * Math.PI * 2 / Math.max(1, arms);
        g.lineWidth = 2.5; g.strokeColor = col(a & 1 ? f.pal.accent : f.pal.main, 230 * fadeEnd);
        const N = 8;
        for (let i = 0; i <= N; i++) {
          const kk = clamp01(k - tl * (1 - i / N));
          const rad = num(p, 'spiralRadiusPx') * (i / N) * (1 - 0.3 * kk);
          const ang = ph + kk * num(p, 'spiralTurns') * Math.PI * 2 * 2 - 0;
          const x = px(kk) + (nx * Math.cos(ang)) * rad, y = py(kk) + (Math.sin(ang) * rad * 0.9);
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke(); prims++;
      }
      const ox = px(k), oy = py(k), orad = num(p, 'orbRadiusPx');
      g.fillColor = col(f.pal.glow, 120 * fadeEnd); g.circle(ox, oy, orad * 1.9); g.fill();
      g.fillColor = col(f.pal.main, 255 * fadeEnd); g.circle(ox, oy, orad); g.fill();
      g.fillColor = col(f.pal.core, 255 * fadeEnd); g.circle(ox, oy, orad * 0.5); g.fill(); prims += 3;
    }
    // 爆點：光圈＋放射光芒＋羽扇弧
    if (burstK > 0) {
      const fade = 1 - burstK;
      g.lineWidth = 4; g.strokeColor = col(f.pal.main, 240 * fade);
      g.circle(f.bx, f.by, num(p, 'burstRingPx') * (0.2 + 0.8 * easeOut(burstK))); g.stroke();
      g.fillColor = col(f.pal.glow, 90 * fade); g.circle(f.bx, f.by, num(p, 'burstRingPx') * 0.7 * easeOut(burstK)); g.fill(); prims += 2;
      const n = Math.min(num(p, 'burstRays'), f.particles);
      for (let i = 0; i < n; i++) {
        const a = i * Math.PI * 2 / n + f.seed;
        this.ray(g, f.bx, f.by, a, num(p, 'burstRayLenPx') * 0.3 * easeOut(burstK), num(p, 'burstRayLenPx') * easeOut(burstK), num(p, 'sparkWidthPx') * (1 - burstK * 0.5), col(i & 1 ? f.pal.core : f.pal.accent, 255 * fade)); prims++;
      }
      if (f.sig && f.sigName === 'bagua') {
        const sg = f.sig; const arcs = num(sg, 'featherArcs');
        g.lineWidth = num(sg, 'featherWidthPx');
        for (let i = 0; i < arcs; i++) {
          const base = f.ang + Math.PI + (i - (arcs - 1) / 2) * 0.55;
          g.strokeColor = col(f.pal.core, 230 * fade);
          const r0 = 10 + 18 * easeOut(burstK), r1 = num(sg, 'featherLenPx') * easeOut(burstK);
          g.moveTo(f.bx + Math.cos(base) * r0, f.by + Math.sin(base) * r0);
          g.quadraticCurveTo(f.bx + Math.cos(base + 0.5) * (r0 + r1) * 0.6, f.by + Math.sin(base + 0.5) * (r0 + r1) * 0.6, f.bx + Math.cos(base + 0.18) * r1, f.by + Math.sin(base + 0.18) * r1);
          g.stroke(); prims++;
        }
      }
    }
    return prims;
  }

  /** 八卦爻：法陣外圈八組三爻，連爻一條、斷爻兩截，隨法陣緩轉。 */
  private drawBagua(g: Graphics, f: Fx, rcx: number, rcy: number, rx: number, ry: number, spin: number, out: number): number {
    const sg = f.sig!; let prims = 0;
    const bar = num(sg, 'barLenPx'), gap = num(sg, 'barGapPx'), s = num(sg, 'trigramRadiusScale');
    g.lineWidth = num(sg, 'barWidthPx'); g.strokeColor = col(f.pal.accent, 235 * out);
    for (let i = 0; i < 8; i++) {
      const a = spin * 0.35 + i * Math.PI / 4;
      const ca = Math.cos(a), sa = Math.sin(a);
      const tx = -sa * rx, ty = ca * ry; const tl = Math.hypot(tx, ty) || 1; const tdx = tx / tl, tdy = ty / tl; // 切線
      const rdx = ca * rx, rdy = sa * ry; const rl = Math.hypot(rdx, rdy) || 1; // 徑向
      for (let b = 0; b < 3; b++) {
        const off = (b - 1) * gap;
        const cx = rcx + ca * rx * s + (rdx / rl) * off, cy = rcy + sa * ry * s + (rdy / rl) * off;
        const yang = (TRIGRAMS[i] >> b) & 1;
        const half = bar / 2;
        if (yang) { g.moveTo(cx - tdx * half, cy - tdy * half); g.lineTo(cx + tdx * half, cy + tdy * half); }
        else {
          g.moveTo(cx - tdx * half, cy - tdy * half); g.lineTo(cx - tdx * 2, cy - tdy * 2);
          g.moveTo(cx + tdx * 2, cy + tdy * 2); g.lineTo(cx + tdx * half, cy + tdy * half);
        }
      }
    }
    g.stroke(); prims++;
    return prims;
  }
}
