// @spec-source → 主戰場UI規格書.md (doc_ui_0001)；PROG-2-10243 戰場打擊感第二批（衝擊環、輝光、刀光拖尾、殘影）
/**
 * BattleJuiceFx — 命中衝擊環／輝光、刀光拖尾、攻擊殘影（View 層，純表現）。
 *
 * 全部畫在「同一個」加色混合的 Graphics 節點上：整場最多 1 個節點、1 次繪製批次；
 * 特效資料放固定大小的陣列（槽位重用），播放中每幀只重畫、閒置時完全不動（不 clear、不配置物件）。
 * 外觀與數量上限全在 data/battle-juice.json；關閉對應開關就不會產生任何特效。
 * 座標是畫面層（uiRoot）座標，與 AttackVfxPlayer 同一套。
 *
 * Unity 對照：像一個共用的 Additive 材質 LineRenderer 池，每個特效只是池裡一格的計時與參數。
 */
import { Color, Graphics, Node, gfx, isValid } from 'cc';
import { burstColor, easeValue, fxSpecFor, getBattleJuice, sampleRing, sparkSpecFor, type HitKind, type RingSample, type Rgb } from '../shared/BattleJuice';

const enum FxKind { Ring, Glow, Trail, Ghost, Sparks }

interface Slot {
  active: boolean;
  kind: FxKind;
  x: number;
  y: number;
  /** 左右方向：+1 往右、-1 往左（刀光與殘影用）。 */
  dir: number;
  t: number;
  dur: number;
  /** 命中種類（衝擊環／輝光取外觀用）。 */
  hit: HitKind;
  /** 火花亂數種子。 */
  seed: number;
}

const SLOTS = 24;
const hash = (n: number): number => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
/** 刀光尾巴切成幾段畫（段數越多越圓滑，也越多描邊指令）。 */
const TRAIL_SEGMENTS = 8;

/** 播放統計（QA 與單元測試用，不影響畫面）。 */
export const juiceFxStats = { ring: 0, glow: 0, trail: 0, ghost: 0, sparks: 0 };
// 除錯探針（無頭瀏覽器實測用），與 __BATTLE_JUICE__ 同類，不影響邏輯。
(globalThis as { __BATTLE_JUICE_FX__?: unknown }).__BATTLE_JUICE_FX__ = juiceFxStats;

export class BattleJuiceFx {
  private node: Node | null = null;
  private g: Graphics | null = null;
  private readonly slots: Slot[] = [];
  private activeCount = 0;
  private dirty = false;
  private needAdditive = true;
  private prewarmed = false;
  private readonly color = new Color();
  private readonly ring: RingSample = { radius: 0, alpha: 0, width: 0 };
  private readonly rgbTmp: Rgb = [0, 0, 0];
  private seedCounter = 1;

  constructor(private readonly getParent: () => Node | null, private readonly layer: () => number) {
    for (let i = 0; i < SLOTS; i++) this.slots.push({ active: false, kind: FxKind.Ring, x: 0, y: 0, dir: 1, t: 0, dur: 1, hit: 'normal', seed: 0 });
  }

  /** 命中衝擊環。 */
  public playRing(x: number, y: number, kind: HitKind): boolean {
    const c = getBattleJuice().impactRing;
    if (!c.enabled) return false;
    if (!this.spawn(FxKind.Ring, x, y, 1, fxSpecFor('impactRing', kind).sec, kind, c.maxActive)) return false;
    juiceFxStats.ring++;
    return true;
  }

  /** 命中輝光（短促的加色光團）。 */
  public playGlow(x: number, y: number, kind: HitKind): boolean {
    const c = getBattleJuice().glow;
    if (!c.enabled) return false;
    if (!this.spawn(FxKind.Glow, x, y, 1, fxSpecFor('glow', kind).sec, kind, c.maxActive)) return false;
    juiceFxStats.glow++;
    return true;
  }

  /** 飛濺火花：一次爆出 N 顆帶重力的小碎光（單一槽位，不逐顆配置物件）。 */
  public playSparks(x: number, y: number, kind: HitKind): boolean {
    const c = getBattleJuice().sparks;
    if (!c.enabled) return false;
    if (!this.spawn(FxKind.Sparks, x, y, 1, sparkSpecFor(kind).sec, kind, c.maxActive)) return false;
    juiceFxStats.sparks++;
    return true;
  }

  /** 刀光拖尾：從攻擊者胸前往目標方向掃一道弧形劍光。 */
  public playTrail(ax: number, ay: number, bx: number): boolean {
    const c = getBattleJuice().bladeTrail;
    if (!c.enabled) return false;
    const dir = bx >= ax ? 1 : -1;
    if (!this.spawn(FxKind.Trail, ax, ay + c.yOffsetPx, dir, c.sec, 'normal', c.maxActive)) return false;
    juiceFxStats.trail++;
    return true;
  }

  /** 攻擊殘影：攻擊者身後留幾格漸隱的色塊（不複製骨架）。 */
  public playGhost(ax: number, ay: number, bx: number): boolean {
    const c = getBattleJuice().afterimage;
    if (!c.enabled) return false;
    const dir = bx >= ax ? 1 : -1;
    if (!this.spawn(FxKind.Ghost, ax, ay + c.yOffsetPx, dir, c.sec, 'normal', c.maxActive)) return false;
    juiceFxStats.ghost++;
    return true;
  }

  /**
   * 預熱：戰場一開始就建好加色節點與材質、送出一次全透明的繪製，
   * 讓繪圖管線（pipeline／著色器）在第一次命中前就編譯完，避免第一擊那一格卡頓。只做一次。
   */
  public prewarm(): void {
    if (this.prewarmed) return;
    const g = this.ensureGraphics();
    if (!g) return;
    this.prewarmed = true;
    this.color.set(255, 255, 255, 0);
    g.strokeColor = this.color;
    g.fillColor = this.color;
    g.lineWidth = 1;
    g.circle(0, 0, 1);
    g.fill();
    g.moveTo(0, 0);
    g.lineTo(1, 0);
    g.stroke();
    this.dirty = true; // 下一次 update 沒有特效時會自動 clear
  }

  /** 目前播放中的特效數（QA 用）。 */
  public get active(): number { return this.activeCount; }

  /** 每幀推進；沒有進行中的特效就什麼都不做。 */
  public update(dt: number): void {
    if (this.activeCount === 0) {
      if (this.dirty && this.g) { this.g.clear(); this.dirty = false; }
      return;
    }
    const g = this.ensureGraphics();
    if (!g) return;
    g.clear();
    this.dirty = true;
    const cfg = getBattleJuice();
    const step = dt > 0 ? dt : 0;
    for (let i = 0; i < SLOTS; i++) {
      const s = this.slots[i];
      if (!s.active) continue;
      s.t += step;
      if (s.t >= s.dur) { s.active = false; this.activeCount--; continue; }
      const u = s.t / s.dur;
      switch (s.kind) {
        case FxKind.Ring: this.drawRing(g, s, u); break;
        case FxKind.Glow: this.drawGlow(g, s, u); break;
        case FxKind.Sparks: this.drawSparks(g, s, u); break;
        case FxKind.Trail: this.drawTrail(g, s, u, cfg.bladeTrail); break;
        default: this.drawGhost(g, s, u, cfg.afterimage); break;
      }
    }
    if (this.activeCount === 0) { g.clear(); this.dirty = false; }
  }

  public destroy(): void {
    if (this.node && isValid(this.node)) this.node.destroy();
    this.node = null; this.g = null;
    for (const s of this.slots) s.active = false;
    this.activeCount = 0;
  }

  private spawn(kind: FxKind, x: number, y: number, dir: number, dur: number, hit: HitKind, maxActive: number): boolean {
    let used = 0;
    let free: Slot | null = null;
    for (let i = 0; i < SLOTS; i++) {
      const s = this.slots[i];
      if (s.active) { if (s.kind === kind) used++; } else if (!free) free = s;
    }
    if (!free || used >= maxActive) return false;
    free.active = true; free.kind = kind; free.x = x; free.y = y; free.dir = dir; free.t = 0; free.dur = dur; free.hit = hit; free.seed = this.seedCounter++ * 7.13;
    this.activeCount++;
    return true;
  }

  private ensureGraphics(): Graphics | null {
    const parent = this.getParent();
    if (!parent || !isValid(parent)) return null;
    if (!this.node || !isValid(this.node)) {
      const n = new Node('BattleJuiceFx');
      n.layer = this.layer();
      this.g = n.addComponent(Graphics);
      this.g.lineJoin = Graphics.LineJoin.ROUND;
      this.g.lineCap = Graphics.LineCap.ROUND;
      this.node = n;
      this.needAdditive = true;
    }
    if (this.node.parent !== parent) parent.addChild(this.node);
    this.node.setSiblingIndex(parent.children.length - 1);
    if (this.needAdditive && this.g) { this.needAdditive = false; this.applyAdditive(this.g); }
    return this.g;
  }

  /** 把這個 Graphics 的混合改成加色（SRC_ALPHA, ONE）；做法同 AttackVfxPlayer，失敗退回一般混合。 */
  private applyAdditive(g: Graphics): void {
    try {
      g.getMaterialInstance(0)?.overridePipelineStates({
        blendState: { targets: [{ blend: true, blendSrc: gfx.BlendFactor.SRC_ALPHA, blendDst: gfx.BlendFactor.ONE, blendSrcAlpha: gfx.BlendFactor.SRC_ALPHA, blendDstAlpha: gfx.BlendFactor.ONE }] },
      });
    } catch (error) { console.warn('[BattleJuiceFx] 加色材質覆寫失敗，退回一般混合', error); }
  }

  private drawRing(g: Graphics, s: Slot, u: number): void {
    const spec = fxSpecFor('impactRing', s.hit);
    const r = sampleRing(u, spec, this.ring);
    const rc = burstColor(u, getBattleJuice().burstPalette, this.rgbTmp);
    // 兩道疊畫：寬而淡的外暈＋細而亮的環緣，邊緣才不會是一條硬邊；透視壓扁：橫向圓環在 3/4 視角下是扁橢圓
    this.color.set(rc[0], rc[1], rc[2], 255 * r.alpha * 0.35);
    g.strokeColor = this.color;
    g.lineWidth = r.width * 2.6;
    g.ellipse(s.x, s.y, r.radius, r.radius * 0.6);
    g.stroke();
    this.color.set(rc[0], rc[1], rc[2], 255 * r.alpha);
    g.strokeColor = this.color;
    g.lineWidth = r.width;
    g.ellipse(s.x, s.y, r.radius, r.radius * 0.6);
    g.stroke();
  }

  /** 中心白熱閃光：極短（1～2 幀量級）。四層由外到內：暖橙淡暈→暖白→近白→純白核，疊成中心亮、邊緣柔的光團，不是一塊扁平圓盤。 */
  private drawGlow(g: Graphics, s: Slot, u: number): void {
    const spec = fxSpecFor('glow', s.hit);
    const fade = Math.pow(1 - u, 1.2);
    const grow = 0.8 + 0.4 * easeValue('quadOut', u);
    const pal = getBattleJuice().burstPalette;
    for (let k = 0; k < 4; k++) {
      const layerScale = 1 - k * 0.24;
      const rc = burstColor(0.4 * (1 - k / 3), pal, this.rgbTmp);
      this.color.set(rc[0], rc[1], rc[2], 255 * spec.alpha * fade * (0.16 + 0.2 * k));
      g.fillColor = this.color;
      g.circle(s.x, s.y, spec.radiusPx * grow * layerScale);
      g.fill();
    }
  }

  /** 飛濺火花：一次爆出 N 顆帶重力的小碎光（單一槽位，不逐顆配置物件）。 */
  public playSparks(x: number, y: number, kind: HitKind): boolean {
    const c = getBattleJuice().sparks;
    if (!c.enabled) return false;
    if (!this.spawn(FxKind.Sparks, x, y, 1, sparkSpecFor(kind).sec, kind, c.maxActive)) return false;
    juiceFxStats.sparks++;
    return true;
  }

  /** 刀光拖尾：從攻擊者胸前往目標方向掃一道弧形劍光。 */
  public playTrail(ax: number, ay: number, bx: number): boolean {
    const c = getBattleJuice().bladeTrail;
    if (!c.enabled) return false;
    const dir = bx >= ax ? 1 : -1;
    if (!this.spawn(FxKind.Trail, ax, ay + c.yOffsetPx, dir, c.sec, 'normal', c.maxActive)) return false;
    juiceFxStats.trail++;
    return true;
  }

  /** 攻擊殘影：攻擊者身後留幾格漸隱的色塊（不複製骨架）。 */
  public playGhost(ax: number, ay: number, bx: number): boolean {
    const c = getBattleJuice().afterimage;
    if (!c.enabled) return false;
    const dir = bx >= ax ? 1 : -1;
    if (!this.spawn(FxKind.Ghost, ax, ay + c.yOffsetPx, dir, c.sec, 'normal', c.maxActive)) return false;
    juiceFxStats.ghost++;
    return true;
  }

  /**
   * 預熱：戰場一開始就建好加色節點與材質、送出一次全透明的繪製，
   * 讓繪圖管線（pipeline／著色器）在第一次命中前就編譯完，避免第一擊那一格卡頓。只做一次。
   */
  public prewarm(): void {
    if (this.prewarmed) return;
    const g = this.ensureGraphics();
    if (!g) return;
    this.prewarmed = true;
    this.color.set(255, 255, 255, 0);
    g.strokeColor = this.color;
    g.fillColor = this.color;
    g.lineWidth = 1;
    g.circle(0, 0, 1);
    g.fill();
    g.moveTo(0, 0);
    g.lineTo(1, 0);
    g.stroke();
    this.dirty = true; // 下一次 update 沒有特效時會自動 clear
  }

  /** 目前播放中的特效數（QA 用）。 */
  public get active(): number { return this.activeCount; }

  /** 每幀推進；沒有進行中的特效就什麼都不做。 */
  public update(dt: number): void {
    if (this.activeCount === 0) {
      if (this.dirty && this.g) { this.g.clear(); this.dirty = false; }
      return;
    }
    const g = this.ensureGraphics();
    if (!g) return;
    g.clear();
    this.dirty = true;
    const cfg = getBattleJuice();
    const step = dt > 0 ? dt : 0;
    for (let i = 0; i < SLOTS; i++) {
      const s = this.slots[i];
      if (!s.active) continue;
      s.t += step;
      if (s.t >= s.dur) { s.active = false; this.activeCount--; continue; }
      const u = s.t / s.dur;
      switch (s.kind) {
        case FxKind.Ring: this.drawRing(g, s, u); break;
        case FxKind.Glow: this.drawGlow(g, s, u); break;
        case FxKind.Sparks: this.drawSparks(g, s, u); break;
        case FxKind.Trail: this.drawTrail(g, s, u, cfg.bladeTrail); break;
        default: this.drawGhost(g, s, u, cfg.afterimage); break;
      }
    }
    if (this.activeCount === 0) { g.clear(); this.dirty = false; }
  }

  public destroy(): void {
    if (this.node && isValid(this.node)) this.node.destroy();
    this.node = null; this.g = null;
    for (const s of this.slots) s.active = false;
    this.activeCount = 0;
  }

  private spawn(kind: FxKind, x: number, y: number, dir: number, dur: number, hit: HitKind, maxActive: number): boolean {
    let used = 0;
    let free: Slot | null = null;
    for (let i = 0; i < SLOTS; i++) {
      const s = this.slots[i];
      if (s.active) { if (s.kind === kind) used++; } else if (!free) free = s;
    }
    if (!free || used >= maxActive) return false;
    free.active = true; free.kind = kind; free.x = x; free.y = y; free.dir = dir; free.t = 0; free.dur = dur; free.hit = hit; free.seed = this.seedCounter++ * 7.13;
    this.activeCount++;
    return true;
  }

  private ensureGraphics(): Graphics | null {
    const parent = this.getParent();
    if (!parent || !isValid(parent)) return null;
    if (!this.node || !isValid(this.node)) {
      const n = new Node('BattleJuiceFx');
      n.layer = this.layer();
      this.g = n.addComponent(Graphics);
      this.g.lineJoin = Graphics.LineJoin.ROUND;
      this.g.lineCap = Graphics.LineCap.ROUND;
      this.node = n;
      this.needAdditive = true;
    }
    if (this.node.parent !== parent) parent.addChild(this.node);
    this.node.setSiblingIndex(parent.children.length - 1);
    if (this.needAdditive && this.g) { this.needAdditive = false; this.applyAdditive(this.g); }
    return this.g;
  }

  /** 把這個 Graphics 的混合改成加色（SRC_ALPHA, ONE）；做法同 AttackVfxPlayer，失敗退回一般混合。 */
  private applyAdditive(g: Graphics): void {
    try {
      g.getMaterialInstance(0)?.overridePipelineStates({
        blendState: { targets: [{ blend: true, blendSrc: gfx.BlendFactor.SRC_ALPHA, blendDst: gfx.BlendFactor.ONE, blendSrcAlpha: gfx.BlendFactor.SRC_ALPHA, blendDstAlpha: gfx.BlendFactor.ONE }] },
      });
    } catch (error) { console.warn('[BattleJuiceFx] 加色材質覆寫失敗，退回一般混合', error); }
  }

  private drawRing(g: Graphics, s: Slot, u: number): void {
    const spec = fxSpecFor('impactRing', s.hit);
    const r = sampleRing(u, spec, this.ring);
    const rc = burstColor(u, getBattleJuice().burstPalette, this.rgbTmp);
    // 兩道疊畫：寬而淡的外暈＋細而亮的環緣，邊緣才不會是一條硬邊；透視壓扁：橫向圓環在 3/4 視角下是扁橢圓
    this.color.set(rc[0], rc[1], rc[2], 255 * r.alpha * 0.35);
    g.strokeColor = this.color;
    g.lineWidth = r.width * 2.6;
    g.ellipse(s.x, s.y, r.radius, r.radius * 0.6);
    g.stroke();
    this.color.set(rc[0], rc[1], rc[2], 255 * r.alpha);
    g.strokeColor = this.color;
    g.lineWidth = r.width;
    g.ellipse(s.x, s.y, r.radius, r.radius * 0.6);
    g.stroke();
  }

  /** 中心白熱閃光：極短（1～2 幀量級），中心近白、外圍暖色，三層疊出柔邊。 */
  private drawGlow(g: Graphics, s: Slot, u: number): void {
    const spec = fxSpecFor('glow', s.hit);
    const fade = Math.pow(1 - u, 1.2);
    const grow = 0.8 + 0.4 * easeValue('quadOut', u);
    for (let k = 0; k < 3; k++) {
      const layerScale = 1 - k * 0.32;
      const warm = k === 0 ? 0.35 : k === 1 ? 0.15 : 0;
      this.color.set(spec.color[0], spec.color[1] * (1 - warm * 0.4), spec.color[2] * (1 - warm), 255 * spec.alpha * fade * (0.35 + 0.3 * k));
      g.fillColor = this.color;
      g.circle(s.x, s.y, spec.radiusPx * grow * layerScale);
      g.fill();
    }
  }

  /** 飛濺火花／碎屑：每顆是收尖的小楔形，沿速度方向，帶重力下落；色階暖白→橙→暗紅，越飛越淡。 */
  private drawSparks(g: Graphics, s: Slot, u: number): void {
    const spec = sparkSpecFor(s.hit);
    const t = s.t;
    const rc = burstColor(u, getBattleJuice().burstPalette, this.rgbTmp);
    const alpha = 255 * spec.alpha * Math.pow(1 - u, 0.8);
    this.color.set(rc[0], rc[1], rc[2], alpha);
    g.fillColor = this.color;
    for (let i = 0; i < spec.count; i++) {
      const h1 = hash(s.seed + i * 3.1), h2 = hash(s.seed + i * 5.7 + 1), h3 = hash(s.seed + i * 9.3 + 2);
      // 向上偏的扇形：15°～165°，少數往旁邊
      const ang = (15 + h1 * 150) * Math.PI / 180;
      const sp = spec.speedPx * (0.45 + 0.75 * h2);
      const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp;
      const px = s.x + vx * t, py = s.y + vy * t - 0.5 * spec.gravityPx * t * t;
      const cvx = vx, cvy = vy - spec.gravityPx * t; // 目前速度
      const cl = Math.hypot(cvx, cvy) || 1;
      const ux = cvx / cl, uy = cvy / cl;
      const len = spec.lenPx * (0.6 + 0.7 * h3) * Math.min(1, 0.35 + cl / spec.speedPx);
      const hw = spec.widthPx * 0.5 * (1 - 0.5 * u);
      g.moveTo(px + ux * hw, py + uy * hw);
      g.lineTo(px - uy * hw, py + ux * hw);
      g.lineTo(px - ux * len, py - uy * len);
      g.lineTo(px + uy * hw, py - ux * hw);
      g.close();
      g.fill();
    }
  }

  /** 弧形劍光：頭端先掃過去、尾端漸隱；掃完後整條淡出。 */
  private drawTrail(g: Graphics, s: Slot, u: number, c: ReturnType<typeof getBattleJuice>['bladeTrail']): void {
    const sweep = (c.sweepDeg * Math.PI) / 180;
    const startAng = sweep * 0.5;
    const head = easeValue('cubicOut', Math.min(1, u / 0.6));
    const tailLen = 0.55;
    const fade = u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4;
    const cx = s.x + s.dir * c.arcRadiusPx * 0.35;
    for (let i = 0; i < TRAIL_SEGMENTS; i++) {
      const a0 = Math.max(0, head - tailLen * (1 - i / TRAIL_SEGMENTS));
      const a1 = Math.max(0, head - tailLen * (1 - (i + 1) / TRAIL_SEGMENTS));
      if (a1 <= 0) continue;
      const w = (i + 1) / TRAIL_SEGMENTS;
      const ang0 = startAng - sweep * a0;
      const ang1 = startAng - sweep * a1;
      this.color.set(c.color[0], c.color[1], c.color[2], 255 * c.alpha * fade * w);
      g.strokeColor = this.color;
      g.lineWidth = Math.max(1, c.widthPx * w);
      g.moveTo(cx + s.dir * c.arcRadiusPx * Math.cos(ang0), s.y + c.arcRadiusPx * 0.8 * Math.sin(ang0));
      g.lineTo(cx + s.dir * c.arcRadiusPx * Math.cos(ang1), s.y + c.arcRadiusPx * 0.8 * Math.sin(ang1));
      g.stroke();
    }
  }

  /** 殘影：身後幾道收尖的速度楔形（頭寬尾尖，由寬端往身後拖），越下面越短越淡，依序晚一點淡出。 */
  private drawGhost(g: Graphics, s: Slot, u: number, c: ReturnType<typeof getBattleJuice>['afterimage']): void {
    for (let i = 0; i < c.count; i++) {
      const lag = i / (c.count + 1);
      const k = u <= lag ? 0 : Math.min(1, (u - lag) / (1 - lag));
      if (k >= 1) continue;
      const a = c.alpha * 2.2 * (1 - k) * (1 - i / (c.count + 1)) * (u < 0.15 ? u / 0.15 : 1);
      if (a <= 0.003) continue;
      this.color.set(c.color[0], c.color[1], c.color[2], Math.min(255, 255 * a));
      g.fillColor = this.color;
      const yy = s.y + (i - (c.count - 1) / 2) * c.heightPx * 0.4;
      const len = c.spacingPx * 3.2 * (1 - i * 0.12) * (0.6 + 0.4 * (1 - k));
      const hw = c.widthPx * 0.5 * (1 - i * 0.15);
      const x0 = s.x - s.dir * 4;
      g.moveTo(x0, yy + hw);
      g.lineTo(x0 - s.dir * len, yy);
      g.lineTo(x0, yy - hw);
      g.close();
      g.fill();
    }
  }
}
