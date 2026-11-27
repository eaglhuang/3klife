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
  TACTIC_VFX_BUDGET, TACTIC_VFX_RECIPES, tacticVfxStats, grantTacticParticles, tacticHitTotalSec,
  type Rgb, type TacticVfxGroup, type TacticVfxRecipe,
} from '../shared/TacticVfxGroups';

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
      this.pool.push({ active: false, hit: false, group: 'fire', t: 0, dur: 1, x: 0, y: 0, facing: 1, scale: 1, seed: 0, n: 0, recipe: TACTIC_VFX_RECIPES.fire });
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
}
