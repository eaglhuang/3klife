// @spec-source → 戰法系統 §H 美術特效配合（戰法施放特效依效果分組，PROG-2-10138）
/**
 * TacticVfxPlayer — 戰法分組特效（View 層）：火／水／風／回復／加速／鼓舞／控制各一套「前搖 → 命中 → 餘韻」。
 *
 * 做法（參考 AttackVfxPlayer）：零貼圖，整場只用一個加色混合的 Graphics 節點（一次 drawcall）；
 * 特效是預先配好的資料記錄池（固定 TACTIC_VFX_BUDGET.maxFx 筆），不是節點；粒子不存陣列，
 * 位置由「亂數種子＋粒子序號＋時間」每幀算出來，所以 update 內不配置任何新物件（共用暫存 Color）。
 * 沒有特效時不重畫、節點停用。同時特效數與同時粒子數受 TACTIC_VFX_BUDGET 限制，超過就縮減或略過。
 *
 * 時序：前搖 windup 放在既有 0.4 秒蓄力內（施放者身上匯聚）；命中 hit 在蓄力結束時於受影響單位所在格爆發，
 * 之後接餘韻 tail 逐漸淡出；命中＋餘韻合計 ≤ 1.0 秒。
 *
 * 輪廓與顏色（一眼可分）：火＝向上跳動的火舌＋飄起火星（紅橘）；水＝擴散漣漪＋濺起水珠（青藍）；
 * 風＝旋轉的弧形風刃＋橫掃落葉線（淡綠白）；回復＝綠色「＋」字緩升＋柔光圓盤；加速＝朝前的「》」箭頭＋速度線（黃）；
 * 鼓舞＝五芒星閃光＋上升箭頭＋金色紙屑（金）；控制＝擴散震波＋頭頂繞圈的星星（紫與黃）。
 *
 * 寫法借鑑（只借節奏，沒有複製程式）：00GameDevs https://00gamedevs.com/ 的 flame-surge、healing-field、arcane-matrix。
 *   Original code © 2026 00GameDevs (@00vchannel), MIT License。
 *
 * Unity 對照：一個加色材質的程式繪製 ParticleSystem 管理器，MaxParticles 與 Pool 由預算表控制。
 */
import { Color, gfx, Graphics, Node } from 'cc';
import {
  TACTIC_VFX_BUDGET, TACTIC_VFX_RECIPES, tacticVfxStats, grantTacticParticles, tacticHitTotalSec, extraTacticRecipeOf,
  type Rgb, type TacticVfxGroup, type TacticVfxRecipe,
} from '../shared/TacticVfxGroups';
import type { TacticHitMotif, TacticWindupMotif } from '../shared/TacticVfxExtraGroups';

const TAU = Math.PI * 2;

interface Fx {
  active: boolean;
  /** true = 命中＋餘韻（受影響格）；false = 前搖（施放者身上） */
  hit: boolean;
  group: TacticVfxGroup;
  t: number;
  dur: number;
  x: number;
  y: number;
  /** 施放方朝向：玩家 +1（往右）、敵方 -1 */
  facing: 1 | -1;
  /** 1 = 參考格寬 64px；依畫面實際格寬縮放 */
  scale: number;
  seed: number;
  /** 預算核可的粒子數 */
  n: number;
  recipe: TacticVfxRecipe;
  /** 第二批分組（PROG-2-10236）的畫法動機；第一批為 null，走專屬畫法 */
  windupMotif: TacticWindupMotif | null;
  hitMotif: TacticHitMotif | null;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
/** 0~1 的穩定亂數：同一 (seed, i, salt) 永遠回同值，粒子位置才能由時間直接算出 */
function rnd(seed: number, i: number, salt: number): number {
  const s = Math.sin(seed * 12.9898 + i * 78.233 + salt * 37.719) * 43758.5453;
  return s - Math.floor(s);
}
const easeOut = (u: number): number => 1 - (1 - u) * (1 - u);

let additiveWarned = false;

export class TacticVfxPlayer {
  private node: Node | null = null;
  private g: Graphics | null = null;
  private readonly pool: Fx[] = [];
  private needAdditive = false;
  private dirty = false;
  private seedCounter = 1;
  private readonly col = new Color(255, 255, 255, 255);

  constructor(private readonly getParent: () => Node | null, private readonly layer: () => number) {
    for (let i = 0; i < TACTIC_VFX_BUDGET.maxFx; i++) {
      this.pool.push({ active: false, hit: false, group: 'fire', t: 0, dur: 1, x: 0, y: 0, facing: 1, scale: 1, seed: 0, n: 0, recipe: TACTIC_VFX_RECIPES.fire, windupMotif: null, hitMotif: null });
    }
    (globalThis as { __TACTIC_VFX_STATS__?: unknown }).__TACTIC_VFX_STATS__ = tacticVfxStats;
  }

  /** 施放者身上的前搖（蓄力期間匯聚）。回傳是否真的播出（預算不足會略過）。 */
  public playWindup(group: TacticVfxGroup, x: number, y: number, facing: 1 | -1, scale: number, durSec: number): boolean {
    const r = TACTIC_VFX_RECIPES[group];
    return this.spawn(group, false, x, y, facing, scale, Math.max(0.15, durSec), r.windupParticles);
  }

  /** 命中格的爆發＋餘韻。 */
  public playHit(group: TacticVfxGroup, x: number, y: number, facing: 1 | -1, scale: number): boolean {
    const r = TACTIC_VFX_RECIPES[group];
    return this.spawn(group, true, x, y, facing, scale, tacticHitTotalSec(group), r.particlesPerCell);
  }

  private spawn(group: TacticVfxGroup, hit: boolean, x: number, y: number, facing: 1 | -1, scale: number, dur: number, want: number): boolean {
    const parent = this.getParent();
    if (!parent?.isValid) return false;
    let free: Fx | null = null;
    let activeFx = 0;
    let activeParticles = 0;
    for (const f of this.pool) {
      if (f.active) { activeFx++; activeParticles += f.n; } else if (!free) free = f;
    }
    const granted = free ? grantTacticParticles(want, activeFx, activeParticles) : 0;
    if (!free || granted <= 0) { tacticVfxStats.skipped++; return false; }
    if (granted < want) tacticVfxStats.trimmed++;
    this.ensureNode(parent);
    free.active = true; free.hit = hit; free.group = group; free.t = 0; free.dur = dur;
    free.x = x; free.y = y; free.facing = facing; free.scale = Math.max(0.4, Math.min(2.5, scale));
    free.seed = this.seedCounter++; free.n = granted; free.recipe = TACTIC_VFX_RECIPES[group];
    const extra = extraTacticRecipeOf(group);
    free.windupMotif = extra ? extra.windup : null; free.hitMotif = extra ? extra.hit : null;
    tacticVfxStats.played[group]++;
    return true;
  }

  public update(dt: number): void {
    const g = this.g;
    if (!g || !this.node?.isValid) return;
    let fxN = 0;
    let particles = 0;
    for (const f of this.pool) if (f.active) { fxN++; particles += f.n; }
    if (fxN === 0) {
      if (this.dirty) { g.clear(); this.dirty = false; this.node.active = false; }
      tacticVfxStats.activeFx = 0; tacticVfxStats.activeParticles = 0;
      return;
    }
    this.node.active = true;
    g.clear();
    this.dirty = true;
    fxN = 0; particles = 0;
    for (const f of this.pool) {
      if (!f.active) continue;
      f.t += dt;
      if (f.t >= f.dur) { f.active = false; continue; }
      fxN++; particles += f.n;
      if (f.hit) this.drawHit(g, f); else this.drawWindup(g, f);
    }
    tacticVfxStats.activeFx = fxN;
    tacticVfxStats.activeParticles = particles;
    if (fxN > tacticVfxStats.peakFx) tacticVfxStats.peakFx = fxN;
    if (particles > tacticVfxStats.peakParticles) tacticVfxStats.peakParticles = particles;
  }

  public destroy(): void {
    if (this.node?.isValid) this.node.destroy();
    this.node = null; this.g = null;
    for (const f of this.pool) f.active = false;
    tacticVfxStats.nodes = 0;
  }

  private ensureNode(parent: Node): void {
    if (!this.node?.isValid) {
      const n = new Node('TacticVfx');
      n.layer = this.layer();
      this.g = n.addComponent(Graphics);
      this.g.lineJoin = Graphics.LineJoin.ROUND;
      this.g.lineCap = Graphics.LineCap.ROUND;
      this.needAdditive = true;
      this.node = n;
      tacticVfxStats.nodes = 1;
    }
    if (this.node.parent !== parent) parent.addChild(this.node);
    this.node.setSiblingIndex(parent.children.length - 1);
    this.node.active = true;
    if (this.needAdditive && this.g) { this.needAdditive = false; this.applyAdditive(this.g); }
  }

  /** 材質實例覆寫成加色（SRC_ALPHA, ONE）；失敗退回一般混合並 warn 一次（與 AttackVfxPlayer 同做法） */
  private applyAdditive(g: Graphics): void {
    try {
      g.getMaterialInstance(0)?.overridePipelineStates({
        blendState: { targets: [{
          blend: true,
          blendSrc: gfx.BlendFactor.SRC_ALPHA, blendDst: gfx.BlendFactor.ONE,
          blendSrcAlpha: gfx.BlendFactor.SRC_ALPHA, blendDstAlpha: gfx.BlendFactor.ONE,
        }] },
      });
    } catch (error) {
      if (!additiveWarned) { additiveWarned = true; console.warn('[TacticVfxPlayer] 加色材質覆寫失敗，退回一般混合', error); }
    }
  }

  // ───────────── 基本筆刷 ─────────────

  private setFill(g: Graphics, c: Rgb, a: number): void { this.col.set(c[0], c[1], c[2], Math.round(255 * clamp01(a))); g.fillColor = this.col; }
  private setStroke(g: Graphics, c: Rgb, a: number, w: number): void { this.col.set(c[0], c[1], c[2], Math.round(255 * clamp01(a))); g.strokeColor = this.col; g.lineWidth = Math.max(1, w); }

  /** 光點：外層柔暈（低 alpha 大圓）＋本體＋近白核心 */
  private dot(g: Graphics, f: Fx, x: number, y: number, r: number, a: number): void {
    const rc = f.recipe;
    this.setFill(g, rc.glow, a * 0.3); g.circle(x, y, r * 2.2); g.fill();
    this.setFill(g, rc.main, a); g.circle(x, y, r); g.fill();
    this.setFill(g, rc.core, a * 0.9); g.circle(x, y, r * 0.45); g.fill();
  }

  private line(g: Graphics, f: Fx, x0: number, y0: number, x1: number, y1: number, w: number, a: number): void {
    const rc = f.recipe;
    this.setStroke(g, rc.glow, a * 0.35, w * 2.6); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    this.setStroke(g, rc.main, a, w); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    this.setStroke(g, rc.core, a * 0.85, w * 0.4); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }

  private ring(g: Graphics, f: Fx, cx: number, cy: number, rx: number, ry: number, w: number, a: number): void {
    const rc = f.recipe;
    this.setStroke(g, rc.glow, a * 0.35, w * 2.4); g.ellipse(cx, cy, rx, ry); g.stroke();
    this.setStroke(g, rc.main, a, w); g.ellipse(cx, cy, rx, ry); g.stroke();
  }

  private star(g: Graphics, f: Fx, cx: number, cy: number, rOut: number, rIn: number, a: number, rot: number): void {
    const rc = f.recipe;
    for (let layer = 0; layer < 2; layer++) {
      const k = layer === 0 ? 1.35 : 1;
      this.setFill(g, layer === 0 ? rc.glow : rc.core, layer === 0 ? a * 0.4 : a);
      for (let i = 0; i < 10; i++) {
        const ang = rot + (i * Math.PI) / 5;
        const rr = (i % 2 === 0 ? rOut : rIn) * k;
        const px = cx + Math.cos(ang) * rr;
        const py = cy + Math.sin(ang) * rr;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.close(); g.fill();
    }
  }

  // ───────────── 前搖（施放者身上，蓄力期間） ─────────────

  private drawWindup(g: Graphics, f: Fx): void {
    const u = clamp01(f.t / f.dur);
    const S = f.scale;
    const a = Math.sin(u * Math.PI) * 0.9 + 0.1 * u;
    if (f.windupMotif) { this.windupByMotif(g, f, f.windupMotif, u, S, a); return; }
    switch (f.group) {
      case 'fire':
        // 火星從四周湧向施放者並上飄
        for (let i = 0; i < f.n; i++) {
          const ang = rnd(f.seed, i, 1) * TAU; const R = (34 + 22 * rnd(f.seed, i, 2)) * S * (1 - easeOut(u));
          this.dot(g, f, f.x + Math.cos(ang) * R, f.y - 8 * S + Math.sin(ang) * R * 0.6 + u * 18 * S, (2.4 - u) * S, a);
        }
        break;
      case 'water':
        // 向內收攏的漣漪
        for (let k = 0; k < 3; k++) {
          const p = (u + k / 3) % 1; const R = 44 * S * (1 - p);
          this.ring(g, f, f.x, f.y - 14 * S, R, R * 0.42, 2 * S, a * (0.4 + 0.6 * p));
        }
        break;
      case 'wind':
        // 繞身旋轉的風刃弧
        for (let i = 0; i < Math.min(f.n, 6); i++) {
          const R = (18 + 20 * (i % 3)) * S * (0.6 + 0.4 * u); const a0 = u * TAU * 1.5 + i * 1.1;
          this.setStroke(g, f.recipe.main, a * 0.9, 2.4 * S); g.arc(f.x, f.y, R, a0, a0 + 0.9, true); g.stroke();
        }
        break;
      case 'heal': {
        // 收攏的綠環＋閃點
        const R = (46 - 30 * easeOut(u)) * S;
        this.ring(g, f, f.x, f.y, R, R, 2.4 * S, a);
        for (let i = 0; i < f.n; i++) {
          const ang = rnd(f.seed, i, 1) * TAU; const rr = (50 - 40 * u) * S * (0.6 + 0.4 * rnd(f.seed, i, 2));
          this.dot(g, f, f.x + Math.cos(ang) * rr, f.y + Math.sin(ang) * rr, 1.8 * S, a);
        }
        break;
      }
      case 'haste':
        // 往身後倒灌的速度線（朝前衝刺的預備）
        for (let i = 0; i < f.n; i++) {
          const oy = (rnd(f.seed, i, 1) - 0.5) * 44 * S; const len = (16 + 20 * rnd(f.seed, i, 2)) * S;
          const x1 = f.x - f.facing * (50 - 38 * u + len * 0.3) * S * 0.8;
          this.line(g, f, x1, f.y + oy, x1 - f.facing * len, f.y + oy, 1.6 * S, a);
        }
        break;
      case 'morale':
        // 金色火花聚向施放者頭頂（舉旗）
        for (let i = 0; i < f.n; i++) {
          const ang = rnd(f.seed, i, 1) * TAU; const R = (46 + 16 * rnd(f.seed, i, 2)) * S * (1 - easeOut(u));
          this.dot(g, f, f.x + Math.cos(ang) * R, f.y + 10 * S + Math.sin(ang) * R * 0.7 + u * 16 * S, (2.2 - 0.6 * u) * S, a);
        }
        break;
      case 'stun': {
        // 向內收縮的紫環＋旋轉小點（醞釀震波）
        const R = (50 - 34 * easeOut(u)) * S;
        this.ring(g, f, f.x, f.y - 10 * S, R, R * 0.5, 2.4 * S, a);
        for (let i = 0; i < f.n; i++) {
          const ang = u * TAU * 1.2 + i * (TAU / f.n);
          this.dot(g, f, f.x + Math.cos(ang) * R, f.y - 10 * S + Math.sin(ang) * R * 0.5, 1.8 * S, a);
        }
        break;
      }
    }
  }

  // ───────────── 命中＋餘韻（受影響格） ─────────────

  private drawHit(g: Graphics, f: Fx): void {
    const rc = f.recipe;
    const burst = clamp01(f.t / rc.hitSec); // 爆發進度（命中那一下）
    const life = clamp01(f.t / f.dur); // 整段進度
    const fade = f.t <= rc.hitSec ? 1 : 1 - clamp01((f.t - rc.hitSec) / Math.max(0.01, f.dur - rc.hitSec)); // 餘韻漸淡
    const S = f.scale;
    const a = fade;
    if (f.hitMotif) { this.hitByMotif(g, f, f.hitMotif, burst, life, a, S); return; }
    switch (f.group) {
      case 'fire': this.hitFire(g, f, burst, life, a, S); break;
      case 'water': this.hitWater(g, f, burst, life, a, S); break;
      case 'wind': this.hitWind(g, f, burst, life, a, S); break;
      case 'heal': this.hitHeal(g, f, burst, life, a, S); break;
      case 'haste': this.hitHaste(g, f, burst, life, a, S); break;
      case 'morale': this.hitMorale(g, f, burst, life, a, S); break;
      case 'stun': this.hitStun(g, f, burst, life, a, S); break;
    }
  }

  private hitFire(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    const tongues = Math.ceil(f.n * 0.4);
    const flick = f.t * 22;
    const grow = Math.min(1, easeOut(burst) * 1.2) * (1 - life * 0.55);
    for (let i = 0; i < tongues; i++) {
      const bx = f.x + (rnd(f.seed, i, 1) - 0.5) * 46 * S;
      const by = f.y - 14 * S + (rnd(f.seed, i, 2) - 0.5) * 8 * S;
      const h = (26 + 30 * rnd(f.seed, i, 3)) * S * grow * (0.82 + 0.18 * Math.sin(flick + i * 2.3));
      const w = (6 + 5 * rnd(f.seed, i, 4)) * S;
      const sway = Math.sin(flick * 0.7 + i) * 4 * S;
      this.setFill(g, f.recipe.glow, a * 0.5); g.moveTo(bx - w * 1.4, by); g.lineTo(bx + sway, by + h * 1.15); g.lineTo(bx + w * 1.4, by); g.close(); g.fill();
      this.setFill(g, f.recipe.main, a * 0.95); g.moveTo(bx - w, by); g.lineTo(bx + sway, by + h); g.lineTo(bx + w, by); g.close(); g.fill();
      this.setFill(g, f.recipe.core, a * 0.9); g.moveTo(bx - w * 0.45, by); g.lineTo(bx + sway, by + h * 0.55); g.lineTo(bx + w * 0.45, by); g.close(); g.fill();
    }
    for (let i = tongues; i < f.n; i++) {
      const p = clamp01(life * (0.8 + 0.5 * rnd(f.seed, i, 5)));
      const x = f.x + (rnd(f.seed, i, 6) - 0.5) * 50 * S + Math.sin(p * 6 + i) * 6 * S;
      const y = f.y - 10 * S + p * (40 + 50 * rnd(f.seed, i, 7)) * S;
      this.dot(g, f, x, y, (2.6 - 1.6 * p) * S, a * (1 - p));
    }
  }

  private hitWater(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    for (let k = 0; k < 3; k++) {
      const p = clamp01(life * 1.4 - k * 0.18);
      if (p <= 0) continue;
      const R = (14 + 40 * easeOut(p)) * S;
      this.ring(g, f, f.x, f.y - 14 * S, R, R * 0.42, (3.2 - 2 * p) * S, a * (1 - p));
    }
    const drops = f.n;
    for (let i = 0; i < drops; i++) {
      const vx = (rnd(f.seed, i, 1) - 0.5) * 70 * S; const vy = (40 + 50 * rnd(f.seed, i, 2)) * S;
      const t = f.t * 1.2;
      const x = f.x + vx * t; const y = f.y - 10 * S + vy * t - 150 * S * t * t;
      if (y < f.y - 22 * S) continue; // 落回水面就不畫
      this.dot(g, f, x, y, (2.4 - life) * S, a);
    }
    if (burst < 1) { this.setFill(g, f.recipe.core, (1 - burst) * 0.5 * a); g.ellipse(f.x, f.y - 14 * S, 18 * S * (0.5 + burst), 8 * S * (0.5 + burst)); g.fill(); }
  }

  private hitWind(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    const spin = life * TAU * 1.4;
    for (let k = 0; k < 3; k++) {
      const R = (14 + 38 * easeOut(clamp01(life * 1.3))) * S * (0.7 + 0.3 * k);
      const a0 = spin + k * (TAU / 3);
      this.setStroke(g, f.recipe.glow, a * 0.35, 7 * S); g.arc(f.x, f.y, R, a0, a0 + 1.3, true); g.stroke();
      this.setStroke(g, f.recipe.main, a, 3 * S); g.arc(f.x, f.y, R, a0, a0 + 1.3, true); g.stroke();
      this.setStroke(g, f.recipe.core, a * 0.9, 1.2 * S); g.arc(f.x, f.y, R, a0 + 0.2, a0 + 1.1, true); g.stroke();
    }
    // 橫掃的落葉／氣流線（往施放方朝向吹）
    for (let i = 0; i < f.n; i++) {
      const p = clamp01(life * (0.9 + 0.6 * rnd(f.seed, i, 1)));
      const oy = (rnd(f.seed, i, 2) - 0.5) * 50 * S;
      const x = f.x - f.facing * 34 * S + f.facing * p * 70 * S;
      const y = f.y + oy + Math.sin(p * 9 + i) * 5 * S;
      const len = (8 + 10 * rnd(f.seed, i, 3)) * S;
      this.line(g, f, x, y, x - f.facing * len, y, 1.4 * S, a * (1 - p * p));
    }
  }

  private hitHeal(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    // 柔光圓盤：很快擴開再淡
    this.setFill(g, f.recipe.glow, a * 0.28 * (1 - burst * 0.5)); g.ellipse(f.x, f.y - 12 * S, 30 * S * (0.4 + easeOut(burst)), 14 * S * (0.4 + easeOut(burst))); g.fill();
    this.ring(g, f, f.x, f.y - 12 * S, 34 * S * easeOut(clamp01(life * 1.5)), 15 * S * easeOut(clamp01(life * 1.5)), 2 * S, a * (1 - clamp01(life * 1.5)));
    // 緩緩上升的「＋」字
    const crosses = Math.ceil(f.n * 0.5);
    for (let i = 0; i < f.n; i++) {
      const p = clamp01(life * (0.85 + 0.3 * rnd(f.seed, i, 1)) - rnd(f.seed, i, 2) * 0.2);
      if (p <= 0) continue;
      const x = f.x + (rnd(f.seed, i, 3) - 0.5) * 44 * S + Math.sin(p * 5 + i) * 3 * S;
      const y = f.y - 14 * S + p * (36 + 26 * rnd(f.seed, i, 4)) * S;
      const al = a * Math.sin(p * Math.PI);
      if (i < crosses) {
        const r = (4.5 + 3.5 * rnd(f.seed, i, 5)) * S;
        this.line(g, f, x - r, y, x + r, y, 2.4 * S, al);
        this.line(g, f, x, y - r, x, y + r, 2.4 * S, al);
      } else {
        this.dot(g, f, x, y, 1.8 * S, al);
      }
    }
  }

  private hitHaste(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    // 朝前飛的「》」箭頭
    for (let k = 0; k < 3; k++) {
      const p = clamp01(life * 1.5 - k * 0.1);
      if (p <= 0) continue;
      const cx = f.x - f.facing * 26 * S + f.facing * p * (62 + k * 8) * S;
      const cy = f.y + (k - 1) * 12 * S;
      const s = (9 - k) * S; const al = a * Math.sin(p * Math.PI);
      for (let w = 0; w < 2; w++) {
        const ox = f.facing * (-w * 7 * S);
        this.line(g, f, cx + ox - f.facing * s * 0.6, cy + s, cx + ox + f.facing * s * 0.6, cy, 2.6 * S, al);
        this.line(g, f, cx + ox + f.facing * s * 0.6, cy, cx + ox - f.facing * s * 0.6, cy - s, 2.6 * S, al);
      }
    }
    // 身後拖出的水平速度線
    for (let i = 0; i < f.n; i++) {
      const oy = (rnd(f.seed, i, 1) - 0.5) * 46 * S; const len = (16 + 22 * rnd(f.seed, i, 2)) * S;
      const p = clamp01(life * 1.3 - rnd(f.seed, i, 3) * 0.25);
      if (p <= 0) continue;
      const x = f.x - f.facing * (6 + p * 46) * S;
      this.line(g, f, x, f.y + oy, x - f.facing * len, f.y + oy, 1.5 * S, a * (1 - p));
    }
  }

  private hitMorale(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    // 五芒星閃光（命中那一下最大）＋放射線
    const pop = burst < 1 ? Math.sin(burst * Math.PI * 0.5) : 1;
    this.star(g, f, f.x, f.y + 6 * S, (8 + 16 * pop) * S * (1 - life * 0.4), (4 + 6 * pop) * S, a, -Math.PI / 2 + life * 0.6);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * TAU + 0.2; const r0 = 14 * S * pop; const r1 = (20 + 18 * pop) * S;
      this.line(g, f, f.x + Math.cos(ang) * r0, f.y + 6 * S + Math.sin(ang) * r0, f.x + Math.cos(ang) * r1, f.y + 6 * S + Math.sin(ang) * r1, 1.8 * S, a * (1 - burst) );
    }
    // 上升的「︿」箭頭（士氣上揚）
    for (let k = 0; k < 3; k++) {
      const p = clamp01(life * 1.4 - k * 0.14);
      if (p <= 0) continue;
      const cx = f.x + (k - 1) * 14 * S; const cy = f.y + p * 44 * S; const s = 6 * S; const al = a * Math.sin(p * Math.PI);
      this.line(g, f, cx - s, cy - s * 0.7, cx, cy + s * 0.5, 2.4 * S, al);
      this.line(g, f, cx, cy + s * 0.5, cx + s, cy - s * 0.7, 2.4 * S, al);
    }
    // 金色紙屑往下飄
    for (let i = 0; i < f.n; i++) {
      const p = clamp01(life * (0.8 + 0.4 * rnd(f.seed, i, 1)));
      const x = f.x + (rnd(f.seed, i, 2) - 0.5) * 56 * S + Math.sin(p * 7 + i) * 5 * S;
      const y = f.y + 30 * S - p * 56 * S;
      this.dot(g, f, x, y, 1.9 * S, a * (1 - p * p));
    }
  }

  private hitStun(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    // 震波：快速擴開的橢圓環
    for (let k = 0; k < 2; k++) {
      const p = clamp01(burst * 1.2 - k * 0.25);
      if (p <= 0 || p >= 1) continue;
      const R = (10 + 38 * easeOut(p)) * S;
      this.ring(g, f, f.x, f.y - 12 * S, R, R * 0.45, (4 - 3 * p) * S, a * (1 - p));
    }
    // 頭頂繞圈的星星（暈）：整段都在，餘韻時才淡出
    const stars = Math.min(3, Math.max(2, Math.floor(f.n / 3)));
    const spin = f.t * 9; const pop = clamp01(f.t / 0.12);
    for (let k = 0; k < stars; k++) {
      const ang = spin + k * (TAU / stars);
      const sx = f.x + Math.cos(ang) * 22 * S; const sy = f.y + 30 * S + Math.sin(ang) * 7 * S;
      this.star(g, f, sx, sy, 6.5 * S * pop, 2.6 * S * pop, a * (Math.sin(ang) > 0 ? 0.7 : 1), ang);
    }
    // 迸出的紫色碎光
    for (let i = 0; i < f.n; i++) {
      const p = clamp01(burst * (0.7 + 0.5 * rnd(f.seed, i, 1)));
      const ang = rnd(f.seed, i, 2) * TAU; const R = (10 + 30 * easeOut(p)) * S;
      if (p >= 1) continue;
      this.dot(g, f, f.x + Math.cos(ang) * R, f.y - 8 * S + Math.sin(ang) * R * 0.6, 1.8 * S, a * (1 - p));
    }
  }

  // ───────────── 第二批分組（PROG-2-10236）：通用動機畫法，配色與粒子量取自配方；update 內不配置新物件 ─────────────

  private windupByMotif(g: Graphics, f: Fx, motif: TacticWindupMotif, u: number, S: number, a: number): void {
    switch (motif) {
      case 'converge':
        // 光點由四周匯向施放者並微微上飄
        for (let i = 0; i < f.n; i++) {
          const ang = rnd(f.seed, i, 1) * TAU; const R = (36 + 22 * rnd(f.seed, i, 2)) * S * (1 - easeOut(u));
          this.dot(g, f, f.x + Math.cos(ang) * R, f.y - 6 * S + Math.sin(ang) * R * 0.6 + u * 14 * S, (2.4 - u) * S, a);
        }
        break;
      case 'ring': {
        // 向內收縮的光環＋繞行小點
        const R = (48 - 32 * easeOut(u)) * S;
        this.ring(g, f, f.x, f.y - 10 * S, R, R * 0.5, 2.2 * S, a);
        for (let i = 0; i < f.n; i++) {
          const ang = u * TAU * 1.2 + i * (TAU / f.n);
          this.dot(g, f, f.x + Math.cos(ang) * R, f.y - 10 * S + Math.sin(ang) * R * 0.5, 1.8 * S, a);
        }
        break;
      }
      case 'streak':
        // 往身後倒灌的速度線（衝出去的預備）
        for (let i = 0; i < f.n; i++) {
          const oy = (rnd(f.seed, i, 1) - 0.5) * 40 * S; const len = (14 + 18 * rnd(f.seed, i, 2)) * S;
          const x1 = f.x - f.facing * (46 - 34 * u) * S;
          this.line(g, f, x1, f.y + oy, x1 - f.facing * len, f.y + oy, 1.6 * S, a);
        }
        break;
      case 'orbit':
        // 繞身旋轉的弧線
        for (let i = 0; i < Math.min(f.n, 5); i++) {
          const R = (16 + 18 * (i % 3)) * S * (0.6 + 0.4 * u); const a0 = u * TAU * 1.5 + i * 1.3;
          this.setStroke(g, f.recipe.main, a * 0.9, 2.2 * S); g.arc(f.x, f.y, R, a0, a0 + 0.9, true); g.stroke();
        }
        break;
      case 'rise':
        // 腳下光環升起，光點沿身體往上飄（祝福／淨化／號令的預備）
        this.ring(g, f, f.x, f.y - 14 * S, (22 - 6 * u) * S, (22 - 6 * u) * 0.38 * S, 2 * S, a * 0.8);
        for (let i = 0; i < f.n; i++) {
          const p = clamp01(u * (0.9 + 0.5 * rnd(f.seed, i, 2)) + rnd(f.seed, i, 3) * 0.15);
          this.dot(g, f, f.x + (rnd(f.seed, i, 1) - 0.5) * 30 * S, f.y - 14 * S + p * 48 * S, (2.2 - p) * S, a * Math.sin(p * Math.PI));
        }
        break;
      case 'shout':
        // 朝前方擴散的三道聲波弧（戰吼預備）
        for (let k = 0; k < 3; k++) {
          const p = clamp01(u * 1.25 - k * 0.2);
          if (p <= 0) continue;
          const R = (8 + 26 * p) * S; const a0 = f.facing > 0 ? -0.8 : Math.PI - 0.8;
          this.setStroke(g, f.recipe.glow, a * (1 - p) * 0.4, 5 * S); g.arc(f.x + f.facing * 8 * S, f.y + 6 * S, R, a0, a0 + 1.6, true); g.stroke();
          this.setStroke(g, f.recipe.main, a * (1 - p), 2 * S); g.arc(f.x + f.facing * 8 * S, f.y + 6 * S, R, a0, a0 + 1.6, true); g.stroke();
        }
        this.dot(g, f, f.x + f.facing * 8 * S, f.y + 6 * S, (2 + 3 * u) * S, a);
        break;
      case 'glint': {
        // 兵器處亮起十字閃光：越蓄越大，邊緣射出短光線
        const gx = f.x + f.facing * 14 * S; const gy = f.y + 6 * S; const r = (4 + 18 * easeOut(u)) * S;
        this.line(g, f, gx - r, gy, gx + r, gy, 2 * S, a);
        this.line(g, f, gx, gy - r, gx, gy + r, 2 * S, a);
        this.dot(g, f, gx, gy, (2 + 3 * u) * S, a);
        for (let i = 0; i < Math.min(f.n, 6); i++) {
          const ang = rnd(f.seed, i, 1) * TAU; const r0 = r * 0.7; const r1 = r * (1.2 + 0.5 * rnd(f.seed, i, 2));
          this.line(g, f, gx + Math.cos(ang) * r0, gy + Math.sin(ang) * r0, gx + Math.cos(ang) * r1, gy + Math.sin(ang) * r1, 1.2 * S, a * 0.8);
        }
        break;
      }
    }
  }

  private hitByMotif(g: Graphics, f: Fx, motif: TacticHitMotif, burst: number, life: number, a: number, S: number): void {
    switch (motif) {
      case 'bolts': this.hitBolts(g, f, burst, life, a, S); break;
      case 'shards': this.hitShards(g, f, burst, life, a, S); break;
      case 'bubbles': this.hitBubbles(g, f, burst, life, a, S); break;
      case 'slashes': this.hitSlashes(g, f, burst, life, a, S); break;
      case 'thrust': this.hitThrust(g, f, burst, life, a, S); break;
      case 'rain': this.hitRain(g, f, burst, life, a, S); break;
      case 'dash': this.hitDash(g, f, burst, life, a, S); break;
      case 'mist': this.hitMist(g, f, burst, life, a, S); break;
      case 'dome': this.hitDome(g, f, burst, life, a, S); break;
      case 'chain': this.hitChain(g, f, burst, life, a, S); break;
      case 'runes': this.hitRunes(g, f, burst, life, a, S); break;
      case 'cycle': this.hitCycle(g, f, burst, life, a, S); break;
      case 'quake': this.hitQuake(g, f, burst, life, a, S); break;
      case 'droop': this.hitDroop(g, f, burst, life, a, S); break;
      case 'swirl': this.hitSwirl(g, f, burst, life, a, S); break;
      case 'halo': this.hitHalo(g, f, burst, life, a, S); break;
      case 'cleanse': this.hitCleanse(g, f, burst, life, a, S); break;
      case 'judgement': this.hitJudgement(g, f, burst, life, a, S); break;
      case 'banner': this.hitBanner(g, f, burst, life, a, S); break;
      case 'soundwave': this.hitSoundwave(g, f, burst, life, a, S); break;
    }
  }

  /** 雷：2～3 道鋸齒閃電從天劈下（每 1/30 秒換一次抖動），地面電環與火花 */
  private hitBolts(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    const bolts = Math.min(3, Math.ceil(f.n / 5));
    const step = Math.floor(f.t * 30);
    const flash = burst < 1 ? 1 - burst * 0.6 : Math.max(0, 0.4 - (life - 0.3) * 0.6);
    for (let k = 0; k < bolts; k++) {
      const bx = f.x + (k - (bolts - 1) / 2) * 18 * S;
      let px = bx; let py = f.y + 70 * S;
      for (let s = 1; s <= 5; s++) {
        const nx = bx + (rnd(f.seed + step, k * 7 + s, 1) - 0.5) * 22 * S * (s < 5 ? 1 : 0.2);
        const ny = f.y + 70 * S - s * 15 * S;
        this.line(g, f, px, py, nx, ny, 2.4 * S, a * flash);
        px = nx; py = ny;
      }
    }
    const e = easeOut(clamp01(life * 1.6));
    this.ring(g, f, f.x, f.y - 10 * S, (8 + 34 * e) * S, (8 + 34 * e) * 0.42 * S, 2.4 * S, a * (1 - clamp01(life * 1.6)));
    for (let i = 0; i < f.n; i++) {
      const p = clamp01(burst * (0.8 + 0.5 * rnd(f.seed, i, 1)));
      const ang = rnd(f.seed, i, 2) * TAU; const R = (6 + 28 * easeOut(p)) * S;
      this.dot(g, f, f.x + Math.cos(ang) * R, f.y - 8 * S + Math.sin(ang) * R * 0.6, 1.6 * S, a * (1 - p));
    }
  }

  /** 冰：放射狀冰晶碎片＋地面霜盤，餘韻飄落雪點 */
  private hitShards(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    const e = easeOut(clamp01(life * 1.5));
    this.setFill(g, f.recipe.glow, a * 0.22); g.ellipse(f.x, f.y - 12 * S, 26 * S * (0.4 + easeOut(burst)), 11 * S * (0.4 + easeOut(burst))); g.fill();
    this.ring(g, f, f.x, f.y - 12 * S, 30 * S * e, 13 * S * e, 2 * S, a * (1 - clamp01(life * 1.5)));
    const shards = Math.ceil(f.n * 0.6);
    for (let i = 0; i < shards; i++) {
      const ang = (i / shards) * TAU + rnd(f.seed, i, 1) * 0.5;
      const r0 = 5 * S; const r1 = (10 + 26 * rnd(f.seed, i, 2)) * S * easeOut(clamp01(burst * 1.3));
      const cx = f.x; const cy = f.y + 2 * S; const w = 0.2;
      this.setFill(g, f.recipe.glow, a * 0.45);
      g.moveTo(cx + Math.cos(ang - w) * r0, cy + Math.sin(ang - w) * r0 * 0.8); g.lineTo(cx + Math.cos(ang) * r1 * 1.15, cy + Math.sin(ang) * r1 * 1.15 * 0.8); g.lineTo(cx + Math.cos(ang + w) * r0, cy + Math.sin(ang + w) * r0 * 0.8); g.close(); g.fill();
      this.setFill(g, f.recipe.main, a * 0.95);
      g.moveTo(cx + Math.cos(ang - w * 0.7) * r0, cy + Math.sin(ang - w * 0.7) * r0 * 0.8); g.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1 * 0.8); g.lineTo(cx + Math.cos(ang + w * 0.7) * r0, cy + Math.sin(ang + w * 0.7) * r0 * 0.8); g.close(); g.fill();
    }
    for (let i = shards; i < f.n; i++) {
      const p = clamp01(life * (0.8 + 0.4 * rnd(f.seed, i, 3)));
      this.dot(g, f, f.x + (rnd(f.seed, i, 4) - 0.5) * 48 * S, f.y + 28 * S - p * 44 * S, 1.5 * S, a * Math.sin(p * Math.PI));
    }
  }

  /** 毒：地面毒霧圓盤＋上浮的空心毒泡 */
  private hitBubbles(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    const grow = 0.5 + easeOut(burst) * 0.7;
    this.setFill(g, f.recipe.glow, a * 0.3); g.ellipse(f.x, f.y - 12 * S, 28 * S * grow, 12 * S * grow); g.fill();
    this.setFill(g, f.recipe.main, a * 0.14); g.ellipse(f.x, f.y - 12 * S, 18 * S, 8 * S); g.fill();
    for (let i = 0; i < f.n; i++) {
      const p = clamp01(life * (0.9 + 0.4 * rnd(f.seed, i, 1)) - rnd(f.seed, i, 2) * 0.25);
      if (p <= 0) continue;
      const x = f.x + (rnd(f.seed, i, 3) - 0.5) * 38 * S + Math.sin(p * 6 + i) * 3 * S;
      const y = f.y - 10 * S + p * (28 + 30 * rnd(f.seed, i, 4)) * S;
      const r = (2.2 + 2.6 * rnd(f.seed, i, 5)) * S * (0.6 + 0.4 * p);
      const al = a * Math.sin(p * Math.PI);
      this.setStroke(g, f.recipe.main, al, 1.6 * S); g.circle(x, y, r); g.stroke();
      this.setFill(g, f.recipe.core, al * 0.9); g.circle(x - r * 0.3, y + r * 0.3, r * 0.25); g.fill();
    }
  }

  /** 斬擊：三道交錯斬線依序劈出（左下到右上、再反向、再橫斬），命中點迸火花 */
  private hitSlashes(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    for (let k = 0; k < 3; k++) {
      const p = clamp01((f.t - k * 0.07) / 0.16);
      if (p <= 0) continue;
      const dir = k % 2 === 0 ? 1 : -1; const dy = k === 2 ? 0 : 22 * S * dir;
      const x0 = f.x - f.facing * 26 * S * dir; const y0 = f.y + dy;
      const x1 = f.x + f.facing * 26 * S * dir; const y1 = f.y - dy;
      const head = easeOut(p); const tail = Math.max(0, head - 0.55);
      const fadeK = a * (1 - clamp01((f.t - k * 0.07 - 0.16) / 0.4));
      this.line(g, f, x0 + (x1 - x0) * tail, y0 + (y1 - y0) * tail, x0 + (x1 - x0) * head, y0 + (y1 - y0) * head, (4 - k * 0.6) * S, fadeK);
    }
    for (let i = 0; i < f.n; i++) {
      const p = clamp01((f.t - 0.05) * 3 * (0.8 + 0.5 * rnd(f.seed, i, 1)));
      if (p <= 0 || p >= 1) continue;
      const ang = rnd(f.seed, i, 2) * TAU; const R = (6 + 24 * easeOut(p)) * S;
      this.dot(g, f, f.x + Math.cos(ang) * R, f.y + Math.sin(ang) * R * 0.7, 1.5 * S, a * (1 - p));
    }
  }

  /** 突刺：三道平行槍影沿朝向直線穿出，尖端三角閃光＋衝擊環 */
  private hitThrust(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    const p = easeOut(clamp01(f.t / 0.18));
    const tailK = clamp01((f.t - 0.12) / 0.3);
    for (let k = 0; k < 3; k++) {
      const oy = (k - 1) * 9 * S; const reach = (92 - Math.abs(k - 1) * 22) * S;
      const xs = f.x - f.facing * 46 * S; const xh = xs + f.facing * reach * p; const xt = xs + f.facing * reach * tailK * 0.9;
      this.line(g, f, xt, f.y + oy, xh, f.y + oy, (k === 1 ? 3.4 : 2) * S, a);
      if (k === 1) {
        this.setFill(g, f.recipe.core, a);
        g.moveTo(xh + f.facing * 9 * S, f.y + oy); g.lineTo(xh - f.facing * 3 * S, f.y + oy + 5 * S); g.lineTo(xh - f.facing * 3 * S, f.y + oy - 5 * S); g.close(); g.fill();
      }
    }
    const q = clamp01((f.t - 0.12) / 0.4);
    if (q > 0 && q < 1) this.ring(g, f, f.x + f.facing * 18 * S, f.y, (6 + 22 * easeOut(q)) * S, (6 + 22 * easeOut(q)) * 0.6 * S, (3 - 2 * q) * S, a * (1 - q));
    for (let i = 0; i < f.n; i++) {
      const pp = clamp01((f.t - 0.1) * 3.2 * (0.8 + 0.4 * rnd(f.seed, i, 1)));
      if (pp <= 0 || pp >= 1) continue;
      this.dot(g, f, f.x + f.facing * (10 + 26 * pp) * S, f.y + (rnd(f.seed, i, 2) - 0.5) * 30 * S * pp, 1.5 * S, a * (1 - pp));
    }
  }

  /** 箭雨：紅羽箭由上方斜落，插地後留一支短箭與落點小環 */
  private hitRain(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    for (let i = 0; i < f.n; i++) {
      const t0 = rnd(f.seed, i, 1) * 0.3; const q = clamp01((f.t - t0) / 0.16);
      if (q <= 0) continue;
      const gx = f.x + (rnd(f.seed, i, 2) - 0.5) * 54 * S; const gy = f.y - 8 * S + (rnd(f.seed, i, 3) - 0.5) * 16 * S;
      const slant = f.facing * 0.35; const len = 16 * S;
      if (q < 1) {
        // 箭頭從落點上方（朝施放方一側）斜落到落點
        const rem = 70 * S * (1 - q); const hx = gx - slant * rem; const hy = gy + rem;
        this.line(g, f, hx - slant * len, hy + len, hx, hy, 1.7 * S, a);
      } else {
        const stay = a * (1 - clamp01((f.t - t0 - 0.16) / 0.5));
        this.line(g, f, gx - slant * len * 0.6, gy + len * 0.6, gx, gy, 1.7 * S, stay);
        const r = clamp01((f.t - t0 - 0.16) / 0.25);
        if (r < 1) this.ring(g, f, gx, gy - 2 * S, (2 + 7 * r) * S, (2 + 7 * r) * 0.45 * S, 1.2 * S, a * (1 - r));
      }
    }
  }

  /** 衝鋒：水平速度帶朝前掃過，後方揚起土塵，終點衝擊環 */
  private hitDash(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    const p = easeOut(clamp01(f.t / 0.22));
    for (let k = 0; k < 3; k++) {
      const oy = (k - 1) * 10 * S; const xs = f.x - f.facing * 52 * S; const xh = xs + f.facing * 104 * S * p;
      this.line(g, f, xh - f.facing * (34 - k * 6) * S, f.y + oy, xh, f.y + oy, (k === 1 ? 3.6 : 2.2) * S, a * (1 - clamp01((f.t - 0.22) / 0.4)));
    }
    for (let i = 0; i < f.n; i++) {
      const u0 = rnd(f.seed, i, 1); const q = clamp01(life * 1.5 - u0 * 0.5);
      if (q <= 0 || q >= 1) continue;
      const x = f.x - f.facing * (44 - 88 * u0) * S; const y = f.y - 12 * S + q * (10 + 14 * rnd(f.seed, i, 2)) * S;
      this.setFill(g, f.recipe.glow, a * (1 - q) * 0.35); g.circle(x, y, (3 + 6 * q) * S); g.fill();
      this.setFill(g, f.recipe.main, a * (1 - q) * 0.5); g.circle(x, y, (1.5 + 3 * q) * S); g.fill();
    }
    const q = clamp01((f.t - 0.16) / 0.4);
    if (q > 0 && q < 1) this.ring(g, f, f.x + f.facing * 30 * S, f.y - 8 * S, (6 + 24 * easeOut(q)) * S, (6 + 24 * easeOut(q)) * 0.5 * S, (3.2 - 2.2 * q) * S, a * (1 - q));
  }

  /** 暗：地面紫黑霧盤向外鋪開，霧點盤旋，中心浮現一雙眼縫 */
  private hitMist(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    const e = easeOut(clamp01(life * 1.4));
    this.setFill(g, f.recipe.glow, a * 0.3); g.ellipse(f.x, f.y - 12 * S, 34 * S * (0.4 + e), 14 * S * (0.4 + e)); g.fill();
    this.setFill(g, f.recipe.main, a * 0.16); g.ellipse(f.x, f.y - 12 * S, 22 * S * (0.4 + e), 9 * S * (0.4 + e)); g.fill();
    for (let i = 0; i < f.n; i++) {
      const ang = rnd(f.seed, i, 1) * TAU + life * 3.2; const R = (8 + 24 * rnd(f.seed, i, 2)) * S * (0.4 + e);
      this.dot(g, f, f.x + Math.cos(ang) * R, f.y - 10 * S + Math.sin(ang) * R * 0.42 + life * 12 * S, (1.6 + 1.4 * rnd(f.seed, i, 3)) * S, a * 0.8);
    }
    const eye = clamp01((life - 0.12) * 4) * (1 - clamp01((life - 0.7) * 3.3)) * a;
    if (eye > 0) {
      for (let s = -1; s <= 1; s += 2) {
        this.setFill(g, f.recipe.core, eye);
        g.moveTo(f.x + s * 5 * S, f.y + 12 * S); g.lineTo(f.x + s * 11 * S, f.y + 15 * S); g.lineTo(f.x + s * 11 * S, f.y + 11 * S); g.close(); g.fill();
      }
    }
  }

  /** 防禦：護盾穹頂自地面撐起，穹頂內三道放射紋，邊緣閃光點 */
  private hitDome(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    const R = (10 + 26 * easeOut(clamp01(burst * 1.2))) * S; const cy = f.y - 8 * S;
    this.setFill(g, f.recipe.glow, a * 0.14); g.ellipse(f.x, cy, R, R * 0.4); g.fill();
    this.setStroke(g, f.recipe.glow, a * 0.35, 7 * S); g.arc(f.x, cy, R, 0, Math.PI, true); g.stroke();
    this.setStroke(g, f.recipe.main, a, 3 * S); g.arc(f.x, cy, R, 0, Math.PI, true); g.stroke();
    this.setStroke(g, f.recipe.core, a * 0.8, 1.2 * S); g.arc(f.x, cy, R * 0.94, 0.15, Math.PI - 0.15, true); g.stroke();
    this.ring(g, f, f.x, cy, R, R * 0.4, 1.8 * S, a * 0.8);
    for (let k = 1; k <= 3; k++) {
      const ang = (k / 4) * Math.PI;
      this.line(g, f, f.x + Math.cos(ang) * R * 0.3, cy + Math.sin(ang) * R * 0.3, f.x + Math.cos(ang) * R * 0.92, cy + Math.sin(ang) * R * 0.92, 1 * S, a * 0.45);
    }
    for (let i = 0; i < f.n; i++) {
      const ang = rnd(f.seed, i, 1) * Math.PI; const tw = Math.sin(f.t * 14 + i * 2.1) * 0.5 + 0.5;
      this.dot(g, f, f.x + Math.cos(ang) * R, cy + Math.sin(ang) * R, 1.5 * S, a * tw);
    }
  }

  /** 連環：四個鐵環一節扣一節橫貫格子，交錯立環／平環，連結處閃火花 */
  private hitChain(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    const links = 4; const shown = Math.ceil(links * easeOut(clamp01(burst * 1.4)));
    const sway = Math.sin(f.t * 10) * 1.5 * S;
    for (let k = 0; k < shown; k++) {
      const cx = f.x + (k - (links - 1) / 2) * 14 * S; const cy = f.y - 2 * S + (k % 2 === 0 ? sway : -sway);
      if (k % 2 === 0) this.ring(g, f, cx, cy, 8.5 * S, 5 * S, 2.4 * S, a);
      else this.ring(g, f, cx, cy, 5 * S, 8.5 * S, 2.4 * S, a);
      if (k > 0) this.dot(g, f, cx - 7 * S, cy, 1.6 * S, a * (1 - clamp01(life * 1.4)));
    }
    for (let i = 0; i < f.n; i++) {
      const p = clamp01(life * (0.9 + 0.4 * rnd(f.seed, i, 1)));
      this.dot(g, f, f.x + (rnd(f.seed, i, 2) - 0.5) * 60 * S, f.y + (rnd(f.seed, i, 3) - 0.5) * 20 * S + p * 18 * S, 1.3 * S, a * Math.sin(p * Math.PI));
    }
  }

  /** 文擊／奇策：地面旋轉符文陣（雙環＋八道刻度），符點上升 */
  private hitRunes(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    const R = (10 + 24 * easeOut(clamp01(burst * 1.2))) * S; const cy = f.y - 10 * S; const spin = f.t * 2.4;
    this.ring(g, f, f.x, cy, R, R * 0.42, 2 * S, a);
    this.ring(g, f, f.x, cy, R * 0.62, R * 0.62 * 0.42, 1.4 * S, a * 0.8);
    for (let i = 0; i < 8; i++) {
      const ang = spin + (i / 8) * TAU; const cs = Math.cos(ang); const sn = Math.sin(ang);
      this.line(g, f, f.x + cs * R * 0.62, cy + sn * R * 0.62 * 0.42, f.x + cs * R, cy + sn * R * 0.42, 1.4 * S, a * 0.9);
    }
    this.star(g, f, f.x, cy, 7 * S * (0.4 + easeOut(burst)), 3 * S * (0.4 + easeOut(burst)), a * 0.9, spin);
    for (let i = 0; i < f.n; i++) {
      const p = clamp01(life * (0.9 + 0.4 * rnd(f.seed, i, 1)) - rnd(f.seed, i, 2) * 0.2);
      if (p <= 0) continue;
      const ang = rnd(f.seed, i, 3) * TAU; const rr = R * 0.9 * rnd(f.seed, i, 4);
      this.dot(g, f, f.x + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * 0.42 + p * 34 * S, 1.6 * S, a * Math.sin(p * Math.PI));
    }
  }

  /** 再動／重置：兩道旋轉的圓弧箭頭首尾相接，中心閃光，火花上浮 */
  private hitCycle(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    const R = (10 + 16 * easeOut(clamp01(burst * 1.2))) * S; const cy = f.y + 4 * S; const spin = f.t * 5;
    for (let k = 0; k < 2; k++) {
      const a0 = spin + k * Math.PI; const a1 = a0 + 2.4;
      this.setStroke(g, f.recipe.glow, a * 0.35, 7 * S); g.arc(f.x, cy, R, a0, a1, true); g.stroke();
      this.setStroke(g, f.recipe.main, a, 3 * S); g.arc(f.x, cy, R, a0, a1, true); g.stroke();
      const hx = f.x + Math.cos(a1) * R; const hy = cy + Math.sin(a1) * R; const tx = -Math.sin(a1); const ty = Math.cos(a1);
      this.setFill(g, f.recipe.core, a);
      g.moveTo(hx + tx * 7 * S, hy + ty * 7 * S); g.lineTo(hx - tx + ty * 5 * S, hy - ty - tx * 5 * S); g.lineTo(hx - tx - ty * 5 * S, hy - ty + tx * 5 * S); g.close(); g.fill();
    }
    this.dot(g, f, f.x, cy, (3 + 3 * (1 - burst)) * S, a);
    for (let i = 0; i < f.n; i++) {
      const p = clamp01(life * (0.9 + 0.4 * rnd(f.seed, i, 1)));
      this.dot(g, f, f.x + (rnd(f.seed, i, 2) - 0.5) * 40 * S, cy + p * 38 * S, 1.5 * S, a * Math.sin(p * Math.PI));
    }
  }

  /** 震地：地面放射裂痕、衝擊環、碎石拋物線與塵 */
  private hitQuake(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    const e = easeOut(clamp01(burst * 1.3)); const cy = f.y - 10 * S;
    for (let k = 0; k < 7; k++) {
      const ang = (k / 7) * TAU + 0.3; const len = (14 + 18 * rnd(f.seed, k, 1)) * S * e;
      const mx = f.x + Math.cos(ang) * len * 0.55 + (rnd(f.seed, k, 2) - 0.5) * 6 * S; const my = cy + Math.sin(ang) * len * 0.55 * 0.5;
      this.line(g, f, f.x, cy, mx, my, 2 * S, a);
      this.line(g, f, mx, my, f.x + Math.cos(ang) * len, cy + Math.sin(ang) * len * 0.5, 1.4 * S, a);
    }
    this.ring(g, f, f.x, cy, (8 + 36 * e) * S, (8 + 36 * e) * 0.45 * S, (4 - 3 * e) * S, a * (1 - e));
    for (let i = 0; i < f.n; i++) {
      const vx = (rnd(f.seed, i, 1) - 0.5) * 60 * S; const vy = (30 + 40 * rnd(f.seed, i, 2)) * S; const t = f.t * 1.3;
      const y = cy + vy * t - 140 * S * t * t;
      if (y < cy - 4 * S) continue;
      this.dot(g, f, f.x + vx * t, y, (2 - life) * S, a);
    }
  }

  // ───────────── 第三批（PROG-2-10240）：減益／光聖／號令 ─────────────

  /** 虛弱／恐懼：灰紫光暈壓在身上，三枚「∨」下沉箭頭，冷汗滴落，腳下裂環 */
  private hitDroop(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    const e = easeOut(clamp01(burst * 1.2));
    this.setFill(g, f.recipe.glow, a * 0.42); g.ellipse(f.x, f.y - 2 * S, 24 * S * (0.5 + e * 0.5), 28 * S * (0.5 + e * 0.5)); g.fill();
    for (let k = 0; k < 3; k++) {
      const p = clamp01(life * 1.5 - k * 0.15);
      if (p <= 0) continue;
      const x = f.x + (k - 1) * 11 * S; const y = f.y + 44 * S - p * 44 * S; const al = a * Math.sin(p * Math.PI);
      this.line(g, f, x - 8 * S, y + 8 * S, x, y, 3 * S, al);
      this.line(g, f, x, y, x + 8 * S, y + 8 * S, 3 * S, al);
    }
    for (let i = 0; i < f.n; i++) {
      const p = clamp01(life * (0.8 + 0.5 * rnd(f.seed, i, 1)) - rnd(f.seed, i, 2) * 0.2);
      if (p <= 0) continue;
      this.dot(g, f, f.x + (rnd(f.seed, i, 3) - 0.5) * 30 * S, f.y + 26 * S - p * 40 * S, 1.5 * S, a * Math.sin(p * Math.PI));
    }
    this.ring(g, f, f.x, f.y - 12 * S, (10 + 18 * e) * S, (10 + 18 * e) * 0.42 * S, 1.6 * S, a * 0.7);
  }

  /** 混亂／魅惑／離間：星點繞頭旋轉（前後交錯大小），頭頂一顆旋轉小星與雙層橢圓軌道 */
  private hitSwirl(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    const e = easeOut(clamp01(burst * 1.3)); const hy = f.y + 22 * S;
    this.ring(g, f, f.x, hy, 17 * S * e, 7 * S * e, 1.4 * S, a * 0.7);
    this.ring(g, f, f.x, hy, 11 * S * e, 4.5 * S * e, 1.2 * S, a * 0.5);
    for (let i = 0; i < f.n; i++) {
      const ang = f.t * 7 + i * (TAU / f.n); const sn = Math.sin(ang);
      this.dot(g, f, f.x + Math.cos(ang) * 17 * S * e, hy + sn * 7 * S * e, (1.5 + 0.8 * sn) * S, a * (0.6 + 0.4 * sn));
    }
    this.star(g, f, f.x, hy + 14 * S, 6.5 * S * e, 2.8 * S * e, a * 0.9, f.t * 4);
  }

  /** 祝福：光柱自天而降，金白光環套到頭上，光點上浮 */
  private hitHalo(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    const e = easeOut(clamp01(burst * 1.2));
    this.setFill(g, f.recipe.glow, a * 0.16); g.rect(f.x - 11 * S * e, f.y - 14 * S, 22 * S * e, 74 * S); g.fill();
    this.setFill(g, f.recipe.main, a * 0.3); g.rect(f.x - 5 * S * e, f.y - 14 * S, 10 * S * e, 74 * S); g.fill();
    const hy = f.y + (50 - 26 * e) * S;
    this.ring(g, f, f.x, hy, 13 * S, 4.5 * S, 2.4 * S, a);
    this.ring(g, f, f.x, f.y - 12 * S, (8 + 14 * e) * S, (8 + 14 * e) * 0.4 * S, 1.6 * S, a * 0.7);
    for (let i = 0; i < f.n; i++) {
      const p = clamp01(life * (0.9 + 0.5 * rnd(f.seed, i, 1)) - rnd(f.seed, i, 2) * 0.2);
      if (p <= 0) continue;
      this.dot(g, f, f.x + (rnd(f.seed, i, 3) - 0.5) * 28 * S, f.y - 12 * S + p * 56 * S, 1.6 * S, a * Math.sin(p * Math.PI));
    }
  }

  /** 淨化：三道漣漪環由腳向頭掃過，淡色十字光點上升 */
  private hitCleanse(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    this.setFill(g, f.recipe.glow, a * 0.18); g.ellipse(f.x, f.y - 12 * S, 24 * S, 9 * S); g.fill();
    for (let k = 0; k < 3; k++) {
      const p = clamp01(life * 1.5 - k * 0.2);
      if (p <= 0) continue;
      const rx = (22 - 6 * p) * S;
      this.ring(g, f, f.x, f.y - 12 * S + p * 46 * S, rx, rx * 0.36, 2 * S, a * Math.sin(p * Math.PI));
    }
    for (let i = 0; i < f.n; i++) {
      const p = clamp01(life * (0.9 + 0.5 * rnd(f.seed, i, 1)) - rnd(f.seed, i, 2) * 0.2);
      if (p <= 0) continue;
      const x = f.x + (rnd(f.seed, i, 3) - 0.5) * 34 * S; const y = f.y - 10 * S + p * 52 * S; const al = a * Math.sin(p * Math.PI);
      this.line(g, f, x - 2.5 * S, y, x + 2.5 * S, y, 1 * S, al); this.line(g, f, x, y - 2.5 * S, x, y + 2.5 * S, 1 * S, al);
    }
  }

  /** 神罰：金白光柱劈下（命中瞬間最亮），落點十字閃光與擴散環，放射火花 */
  private hitJudgement(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    const flash = burst < 1 ? 1 : Math.max(0.15, 1 - (life - 0.3) * 1.5);
    const w = (14 - 6 * clamp01(life * 1.4)) * S;
    this.setFill(g, f.recipe.glow, a * 0.2 * flash); g.rect(f.x - w * 1.6, f.y - 8 * S, w * 3.2, 96 * S); g.fill();
    this.setFill(g, f.recipe.main, a * 0.6 * flash); g.rect(f.x - w, f.y - 8 * S, w * 2, 96 * S); g.fill();
    this.setFill(g, f.recipe.core, a * 0.9 * flash); g.rect(f.x - w * 0.4, f.y - 8 * S, w * 0.8, 96 * S); g.fill();
    const e = easeOut(clamp01(burst * 1.2)); const r = (8 + 16 * e) * S;
    this.line(g, f, f.x - r, f.y - 4 * S, f.x + r, f.y - 4 * S, 2.4 * S, a * flash);
    this.line(g, f, f.x, f.y - 4 * S - r * 0.6, f.x, f.y - 4 * S + r * 0.6, 2.4 * S, a * flash);
    const ee = easeOut(clamp01(life * 1.6));
    this.ring(g, f, f.x, f.y - 8 * S, (8 + 34 * ee) * S, (8 + 34 * ee) * 0.42 * S, 2.4 * S, a * (1 - clamp01(life * 1.6)));
    for (let i = 0; i < f.n; i++) {
      const p = clamp01(burst * (0.8 + 0.5 * rnd(f.seed, i, 1)));
      const ang = rnd(f.seed, i, 2) * TAU; const R = (6 + 26 * easeOut(p)) * S;
      this.dot(g, f, f.x + Math.cos(ang) * R, f.y - 6 * S + Math.sin(ang) * R * 0.6, 1.5 * S, a * (1 - p));
    }
  }

  /** 號令／鼓舞：戰旗桿升起，旗面隨風起伏，旗側人字箭頭上飄與彩屑落下 */
  private hitBanner(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    const e = easeOut(clamp01(burst * 1.2)); const h = 50 * e * S; const px = f.x - 6 * S; const base = f.y - 12 * S;
    this.line(g, f, px, base, px, base + h, 2 * S, a);
    if (e > 0.3) {
      const top = base + h; const segs = 4; const len = 26 * S;
      for (let layer = 0; layer < 2; layer++) {
        const grow = layer === 0 ? 1.18 : 1;
        this.setFill(g, layer === 0 ? f.recipe.glow : f.recipe.main, layer === 0 ? a * 0.35 : a * 0.9);
        g.moveTo(px, top);
        for (let sg = 1; sg <= segs; sg++) g.lineTo(px + (sg / segs) * len * grow, top + Math.sin(f.t * 9 + sg) * 2.5 * S * (sg / segs));
        for (let sg = segs; sg >= 0; sg--) g.lineTo(px + (sg / segs) * len * grow, top - 15 * S * grow + Math.sin(f.t * 9 + sg) * 2.5 * S * (sg / segs));
        g.close(); g.fill();
      }
    }
    for (let k = 0; k < 2; k++) {
      const p = clamp01(life * 1.4 - k * 0.2);
      if (p <= 0) continue;
      const y = base + h + (6 + p * 14) * S; const x = f.x + 14 * S; const al = a * Math.sin(p * Math.PI);
      this.line(g, f, x - 5 * S, y - 4 * S, x, y, 2 * S, al); this.line(g, f, x, y, x + 5 * S, y - 4 * S, 2 * S, al);
    }
    for (let i = 0; i < f.n; i++) {
      const p = clamp01(life * (0.8 + 0.5 * rnd(f.seed, i, 1)) - rnd(f.seed, i, 2) * 0.15);
      if (p <= 0) continue;
      this.dot(g, f, f.x + (rnd(f.seed, i, 3) - 0.5) * 38 * S, base + 54 * S - p * 56 * S, 1.4 * S, a * Math.sin(p * Math.PI));
    }
  }

  /** 戰吼：以目標為心的三道聲波環接連擴散，放射短線與震起塵點 */
  private hitSoundwave(g: Graphics, f: Fx, burst: number, life: number, a: number, S: number): void {
    const cy = f.y + 4 * S;
    for (let k = 0; k < 3; k++) {
      const p = clamp01(life * 1.7 - k * 0.2);
      if (p <= 0) continue;
      const R = (10 + 34 * p) * S;
      this.ring(g, f, f.x, cy, R, R * 0.8, (3 - 2 * p) * S, a * (1 - p));
    }
    const e = easeOut(clamp01(burst * 1.3));
    for (let j = 0; j < 8; j++) {
      const ang = (j / 8) * TAU + 0.2; const r0 = (10 + 20 * e) * S;
      this.line(g, f, f.x + Math.cos(ang) * r0, cy + Math.sin(ang) * r0 * 0.8, f.x + Math.cos(ang) * (r0 + 8 * S), cy + Math.sin(ang) * (r0 + 8 * S) * 0.8, 1.6 * S, a * (1 - clamp01(burst) * 0.4));
    }
    for (let i = 0; i < f.n; i++) {
      const p = clamp01(life * (0.8 + 0.5 * rnd(f.seed, i, 1)));
      this.dot(g, f, f.x + (rnd(f.seed, i, 2) - 0.5) * 50 * S, f.y - 10 * S + p * 14 * S, 1.4 * S, a * Math.sin(p * Math.PI));
    }
  }
}
