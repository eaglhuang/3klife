// @spec-source → Issue #2135（幕府大廳 Q 版人物隨機走動）；來源 spine-trial lobby-wander-gait-v2 (856b82b) render/lobby_wander/wanderCore.ts
// 以移植為主；3klife 動了 tick()/blockedBy()/pickTarget() 三處，並新增 addActor/leave/drainRemoved（輪替進退場，只增不改原行為）（搜尋 "[3klife]"），整檔重新同步時要把這兩處帶回去，
// 或請 spine-trial 端收進上游：被擋住時不要在走動中直接掉頭（掉頭瞬間 scaleX 翻面，站立腳會彈到另一側）；選目標時就轉向。
/**
 * Engine-agnostic lobby-hall wander core.
 *
 * No DOM, no Spine, no Cocos imports. The host (Cocos `sp.Skeleton`,
 * spine-webgl, etc.) reads each step's foot position, facing, animation
 * name and clickable flag, and applies them to its own skeleton nodes.
 *
 * Coordinate space (module-native):
 *   - origin: top-left of the lobby design canvas (1920 x 1080)
 *   - x right, y down
 *   - a point is the character's FEET (root bone)
 *
 * Cocos often uses y-up from the canvas centre. Convert with:
 *   cocosX = foot.x - designWidth / 2
 *   cocosY = designHeight / 2 - foot.y
 * which is the same mapping as HallStagePlanner (`stageY: halfH - footY`).
 */

export interface Vec2 {
  x: number;
  y: number;
}

/** Inclusive axis-aligned walkable box in module coordinates. */
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export type WanderTier = 'general' | 'soldier';

export interface WanderActorConfig {
  id: string;
  tier: WanderTier;
  /**
   * Foot travel in module px / s while the walk animation plays.
   * Must be `walkGroundSpeed(tier) * displayScale` so the stance foot
   * does not slide. `displayScale` is the uniform scale applied to the
   * skeleton (the absolute value; facing is applied separately).
   */
  speed: number;
  start: Vec2;
  /** +1 faces right (the rig's setup pose), -1 faces left via scaleX. */
  facing?: 1 | -1;
}

export interface WanderConfig {
  seed: number;
  floor: Rect;
  /** Optional tighter polygon inside `floor`. Feet stay inside both. */
  floorPolygon?: Vec2[];
  /** Idle dwell before picking a new target. Default [2, 4]. */
  idleSeconds?: [number, number];
  /** Minimum foot-to-foot distance when picking a new target. Default 150. */
  minDistance?: number;
  actors: WanderActorConfig[];
}

export type WanderStateName = 'idle' | 'walk';

export interface WanderActorState {
  id: string;
  tier: WanderTier;
  /** Foot position, y down. */
  x: number;
  y: number;
  /** Apply as `skeleton.scaleX = displayScale * facing`. */
  facing: 1 | -1;
  state: WanderStateName;
  /** Spine animation to play this frame (looped). */
  anim: string;
  loop: true;
  /** True only while idling and not dialogue-locked — this is the clickable state. */
  clickable: boolean;
  /**
   * [3klife] 畫面上要不要顯示：排隊等進場（waiting）與走在地板帶外側的人都不顯示，也不接點擊。
   * 否則多人同時輪替進場會疊在畫面邊緣、被左右面板蓋住點不到（PROG-2-10090）。
   */
  visible: boolean;
  targetX: number;
  targetY: number;
  idleLeft: number;
}

/** Stride-matched ground speed in skeleton units / s at scale 1. */
export const WALK_GROUND_SPEED = {
  /**
   * `spec/standard.json` `tiers.general.legs.walk_ground_speed`: stance foot travels
   * 56 units (stride 28 × 2) in the 0.6 s contact window of the 1.2 s
   * `walk_in_place` cycle → 93.33 u/s (no foot slide).
   */
  general: 93.33,
  /** `spec/standard.json` `tiers.soldier.legs.walk_ground_speed`. */
  soldier: 100,
} as const;

/** Spine animation names to play on `sp.Skeleton`. */
export const WANDER_ANIMS = {
  general: { idle: 'idle', walk: 'walk_in_place' },
  soldier: { idle: 'idle', walk: 'walk' },
} as const;

/**
 * Walkable area on the 1920×1080 lobby-hall design canvas, y down, foot points.
 * Strip in front of the benches / dais, between the left and right panels,
 * above the bottom dock (`hall-stage-spots.json` feet sit inside this).
 */
export const LOBBY_DESIGN = {
  width: 1920,
  height: 1080,
  floor: { x0: 480, y0: 842, x1: 1440, y1: 933 } as Rect,
  /** Trapezoid: slightly narrower near the dais, wider toward the camera. */
  floorPolygon: [
    { x: 540, y: 848 },
    { x: 1380, y: 848 },
    { x: 1440, y: 933 },
    { x: 480, y: 933 },
  ] as Vec2[],
  /** Game standing spots (footX / footY) from hall-stage-spots.json. */
  spots: [
    { id: 'spot-1', x: 640, y: 860 },
    { id: 'spot-2', x: 960, y: 872 },
    { id: 'spot-3', x: 1280, y: 866 },
    { id: 'spot-4', x: 800, y: 926 },
    { id: 'spot-5', x: 1120, y: 924 },
    { id: 'spot-6', x: 520, y: 856 },
    { id: 'spot-7', x: 1400, y: 856 },
  ],
  /** Display height of a general on this canvas (~25–30% of 1080). */
  generalHeight: 280,
  soldierHeight: 220,
  animMix: 0.18,
} as const;

export function walkGroundSpeed(tier: WanderTier): number {
  return WALK_GROUND_SPEED[tier];
}

export function walkAnim(tier: WanderTier): string {
  return WANDER_ANIMS[tier].walk;
}

export function idleAnim(tier: WanderTier): string {
  return WANDER_ANIMS[tier].idle;
}

/** Convert a foot point from this module into Cocos y-up-from-centre space. */
export function toCocosCenter(foot: Vec2, canvas = LOBBY_DESIGN): Vec2 {
  return { x: foot.x - canvas.width / 2, y: canvas.height / 2 - foot.y };
}

export function pointInRect(p: Vec2, r: Rect): boolean {
  return p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;
}

/** Ray-crossing test. Vertices must be in order (CW or CCW). */
export function pointInPolygon(p: Vec2, poly: Vec2[]): boolean {
  if (poly.length < 3) return true;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    const hit = (a.y > p.y) !== (b.y > p.y)
      && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y + 1e-12) + a.x;
    if (hit) inside = !inside;
  }
  return inside;
}

export function pointAllowed(p: Vec2, floor: Rect, polygon?: Vec2[]): boolean {
  if (!pointInRect(p, floor)) return false;
  if (polygon && polygon.length >= 3 && !pointInPolygon(p, polygon)) return false;
  return true;
}

/** Mulberry32. Same seed → same wander path. */
export class SeededRng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  /** Uniform float in [0, 1). */
  next(): number {
    let t = (this.s = (this.s + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Uniform float in [a, b). */
  float(a: number, b: number): number {
    return a + this.next() * (b - a);
  }
}

interface InternalActor {
  cfg: WanderActorConfig;
  x: number;
  y: number;
  facing: 1 | -1;
  state: WanderStateName;
  tx: number;
  ty: number;
  idleLeft: number;
  lockUntil: number;
  /** [3klife] 輪替退場中：走到地板帶外就移除，不再選新目標 */
  leaving?: boolean;
  /** [3klife] 排隊等進場：起點在地板帶外側時先排隊，一次只放一位走進來（見 admitNext） */
  waiting?: boolean;
  /** [3klife] 被放行進場的時間（模擬秒），逾時就不再卡住後面的人 */
  admittedAt?: number;
}

/** [3klife] 前一位進場者走進地板帶這麼深（設計像素），才放下一位，避免進場口疊在一起 */
export const WANDER_ENTRY_CLEAR = 40;
/** [3klife] 前一位進場者最久佔住進場口的秒數；被擋住或卡住也不拖累後面的人 */
export const WANDER_ENTRY_TIMEOUT = 12;

/** [3klife] 進退場時走到地板帶左右外側這麼遠的位置（設計像素），人在畫面外才移除／從這裡走進來 */
export const WANDER_EXIT_MARGIN = 70;

/**
 * Simulation only. The host calls `step(dt)` every frame and applies
 * the returned states to its skeletons (see README.md).
 */
export class HallWander {
  readonly config: Required<Pick<WanderConfig, 'seed' | 'floor' | 'idleSeconds' | 'minDistance'>> & WanderConfig;
  private readonly rng: SeededRng;
  private readonly actors: InternalActor[];
  private t = 0;

  constructor(config: WanderConfig) {
    this.config = {
      ...config,
      idleSeconds: config.idleSeconds ?? [2, 4],
      minDistance: config.minDistance ?? 150,
    };
    this.rng = new SeededRng(config.seed);
    this.actors = config.actors.map((cfg) => ({
      cfg,
      x: cfg.start.x,
      y: cfg.start.y,
      facing: cfg.facing ?? 1,
      state: 'idle' as WanderStateName,
      tx: cfg.start.x,
      ty: cfg.start.y,
      idleLeft: this.rng.float(0.4, 2.2),
      lockUntil: -1,
    }));
  }

  get time(): number {
    return this.t;
  }

  /**
   * Advance the simulation by `dt` seconds (e.g. 1/30).
   * Returns actors in back-to-front draw order (smaller y / farther first;
   * larger y / lower on the screen last, so they paint in front).
   */
  step(dt: number): WanderActorState[] {
    const t = this.t;
    this.admitNext();
    for (const a of this.actors) this.tick(a, t, dt);
    this.t = t + dt;
    this.sweepLeft();
    return this.snapshot();
  }

  /**
   * [3klife] 新增一位走進來的人：起點通常放在地板帶外側（WANDER_EXIT_MARGIN），
   * 下一幀就挑目標走進場內。id 已存在時不處理，回傳 false。
   */
  addActor(cfg: WanderActorConfig): boolean {
    if (this.actors.some((a) => a.cfg.id === cfg.id)) return false;
    this.actors.push({
      cfg,
      x: cfg.start.x,
      y: cfg.start.y,
      facing: cfg.facing ?? 1,
      state: 'idle',
      tx: cfg.start.x,
      ty: cfg.start.y,
      idleLeft: 0,
      lockUntil: -1,
      // 起點在地板帶左右外側＝輪替進場，先排隊
      waiting: cfg.start.x < this.config.floor.x0 || cfg.start.x > this.config.floor.x1,
    });
    return true;
  }

  /** [3klife] 請某人退場：解除鎖定，走到最近的左右外側後自動移除（見 drainRemoved）。 */
  leave(id: string): void {
    const a = this.actors.find((x) => x.cfg.id === id);
    if (!a || a.leaving) return;
    a.leaving = true;
    a.lockUntil = -1;
    a.state = 'idle';
  }

  /** [3klife] 退場途中又被叫回來：取消退場，之後照常走動。 */
  stay(id: string): void {
    const a = this.actors.find((x) => x.cfg.id === id);
    if (a) a.leaving = false;
  }

  /** [3klife] 立刻移除（沒有走位的靜態小人用）；不進 drainRemoved。 */
  remove(id: string): void {
    const i = this.actors.findIndex((x) => x.cfg.id === id);
    if (i >= 0) this.actors.splice(i, 1);
  }

  /** [3klife] 取走已走出畫面而被移除的 id（取一次就清空）。 */
  drainRemoved(): string[] {
    const out = this.removed;
    this.removed = [];
    return out;
  }

  private removed: string[] = [];

  private sweepLeft(): void {
    const gone = this.actors.filter((a) => a.leaving && a.state === 'idle' && this.atExit(a));
    if (gone.length === 0) return;
    for (const a of gone) this.removed.push(a.cfg.id);
    for (const a of gone) this.actors.splice(this.actors.indexOf(a), 1);
  }

  private exitX(a: InternalActor): number {
    const f = this.config.floor;
    return a.x < (f.x0 + f.x1) / 2 ? f.x0 - WANDER_EXIT_MARGIN : f.x1 + WANDER_EXIT_MARGIN;
  }

  private atExit(a: InternalActor): boolean {
    const f = this.config.floor;
    return a.x <= f.x0 - WANDER_EXIT_MARGIN + 0.5 || a.x >= f.x1 + WANDER_EXIT_MARGIN - 0.5;
  }

  /** Back-to-front: farther (smaller foot y) first. */
  drawOrder(): WanderActorState[] {
    return this.snapshot();
  }

  /**
   * Hit-test an idle (clickable) actor by foot position.
   * `radius` is in the same units as the floor (design px).
   */
  pickIdleAt(x: number, y: number, radius: number): WanderActorState | null {
    let best: InternalActor | null = null;
    let bestD = radius;
    for (const a of this.actors) {
      if (!this.isClickable(a)) continue;
      const d = Math.hypot(a.x - x, a.y - y);
      if (d <= bestD) {
        best = a;
        bestD = d;
      }
    }
    return best ? this.view(best) : null;
  }

  /**
   * Hold an actor in idle (e.g. after a click, while a dialogue bubble is up).
   * Pass `seconds` or omit to hold until `unlock`.
   */
  lockIdle(id: string, seconds?: number): void {
    const a = this.actors.find((x) => x.cfg.id === id);
    if (!a) return;
    a.state = 'idle';
    a.lockUntil = seconds == null ? Number.POSITIVE_INFINITY : this.t + seconds;
    a.idleLeft = Math.max(a.idleLeft, seconds ?? 0);
  }

  unlock(id: string): void {
    const a = this.actors.find((x) => x.cfg.id === id);
    if (!a) return;
    a.lockUntil = -1;
    if (a.state === 'idle' && a.idleLeft < 0.3) a.idleLeft = 0.3;
  }

  private isLocked(a: InternalActor, t = this.t): boolean {
    return a.lockUntil >= 0 && t <= a.lockUntil;
  }

  private isClickable(a: InternalActor): boolean {
    return a.state === 'idle' && !this.isLocked(a) && this.isVisible(a);
  }

  /** [3klife] 排隊中或走在地板帶外側的人不顯示（左右面板會蓋住，點也點不到） */
  private isVisible(a: InternalActor): boolean {
    if (a.waiting) return false;
    const f = this.config.floor;
    return a.x >= f.x0 && a.x <= f.x1;
  }

  /** [3klife] 進場口一次只放一位：前一位走進地板帶 WANDER_ENTRY_CLEAR 以上（或逾時）才放下一位，依加入順序 */
  private admitNext(): void {
    const next = this.actors.find((a) => a.waiting);
    if (!next) return;
    const f = this.config.floor;
    const busy = this.actors.some((a) => a.admittedAt !== undefined && !a.waiting && !a.leaving
      && (a.x < f.x0 + WANDER_ENTRY_CLEAR || a.x > f.x1 - WANDER_ENTRY_CLEAR)
      && this.t - a.admittedAt < WANDER_ENTRY_TIMEOUT);
    if (busy) return;
    next.waiting = false;
    next.admittedAt = this.t;
    next.idleLeft = 0;
  }

  private tick(a: InternalActor, t: number, dt: number): void {
    if (a.waiting) return;
    if (this.isLocked(a, t)) {
      a.state = 'idle';
      return;
    }
    if (a.state === 'walk') {
      const dx = a.tx - a.x;
      const dy = a.ty - a.y;
      const dist = Math.hypot(dx, dy);
      const step = a.cfg.speed * dt;
      if (!a.leaving && this.blockedBy(a, a.x + (dist < 1e-6 ? 0 : (dx / dist) * step),
                          a.y + (dist < 1e-6 ? 0 : (dy / dist) * step))) {
        // [3klife] 被擋住：先站住（idle）等一下再重選目標。原版在這裡直接 pickTarget，
        // 角色會在走動中立刻反向，scaleX 翻面時站立腳會從一側彈到另一側（腳滑／跳）。
        a.state = 'idle';
        a.idleLeft = this.rng.float(this.config.idleSeconds![0], this.config.idleSeconds![1]);
        return;
      }
      if (dist <= Math.max(step, 1.5)) {
        a.x = a.tx;
        a.y = a.ty;
        a.state = 'idle';
        a.idleLeft = this.rng.float(this.config.idleSeconds![0], this.config.idleSeconds![1]);
      } else {
        a.x += (dx / dist) * step;
        a.y += (dy / dist) * step;
        if (Math.abs(dx) > 1.2) a.facing = dx < 0 ? -1 : 1;
      }
      return;
    }
    if (a.leaving) {
      if (!this.atExit(a)) this.headForExit(a);
      return;
    }
    a.idleLeft -= dt;
    if (a.idleLeft <= 0) this.pickTarget(a);
  }

  /** [3klife] 退場：直接朝左右外側走，不再挑地板上的目標 */
  private headForExit(a: InternalActor): void {
    a.tx = this.exitX(a);
    a.ty = a.y;
    a.state = 'walk';
    a.facing = a.tx < a.x ? -1 : 1;
  }

  private blockedBy(self: InternalActor, nx: number, ny: number): boolean {
    const min = this.config.minDistance! * 0.72;
    for (const o of this.actors) {
      if (o === self || o.waiting) continue;
      const next = Math.hypot(nx - o.x, ny - o.y);
      // [3klife] 只有「正在靠近」才算擋住；起點本來就太近時要讓人走得開，否則兩人永遠互卡
      if (next < min && next < Math.hypot(self.x - o.x, self.y - o.y)) return true;
    }
    return false;
  }

  private pickTarget(a: InternalActor): void {
    const { floor, floorPolygon, minDistance } = this.config;
    const min = minDistance!;
    let tx = a.x, ty = a.y, ok = false;
    for (let i = 0; i < 16; i++) {
      const p = this.randomPoint();
      if (!pointAllowed(p, floor, floorPolygon)) continue;
      const dx = p.x - a.x, dy = p.y - a.y;
      if (Math.hypot(dx, dy) < 80) continue;
      if (Math.abs(dx) < 40 && this.rng.next() < 0.7) continue;
      let close = false;
      for (const o of this.actors) {
        if (o === a || o.waiting) continue;
        const ox = o.state === 'walk' ? o.tx : o.x;
        const oy = o.state === 'walk' ? o.ty : o.y;
        if (Math.hypot(p.x - ox, p.y - oy) < min) {
          close = true;
          break;
        }
        if (Math.hypot(p.x - o.x, p.y - o.y) < min * 0.8) {
          close = true;
          break;
        }
      }
      if (close) continue;
      tx = p.x;
      ty = p.y;
      ok = true;
      break;
    }
    if (!ok) {
      // Relaxed fallback: stay inside the floor even if spacing fails.
      for (let i = 0; i < 8; i++) {
        const p = this.randomPoint();
        if (pointAllowed(p, floor, floorPolygon) && Math.hypot(p.x - a.x, p.y - a.y) >= 40) {
          tx = p.x;
          ty = p.y;
          break;
        }
      }
    }
    a.tx = tx;
    a.ty = ty;
    a.state = 'walk';
    // [3klife] 選到目標的當下就轉向。原版要到第一個位移幀才改 facing，
    // 動畫已切成 walk 後才翻面，會多出一幀「面向舊方向的走路」。
    if (Math.abs(tx - a.x) > 1.2) a.facing = tx < a.x ? -1 : 1;
  }

  private randomPoint(): Vec2 {
    const r = this.config.floor;
    return { x: this.rng.float(r.x0, r.x1), y: this.rng.float(r.y0, r.y1) };
  }

  private view(a: InternalActor): WanderActorState {
    const anims = WANDER_ANIMS[a.cfg.tier];
    return {
      id: a.cfg.id,
      tier: a.cfg.tier,
      x: a.x,
      y: a.y,
      facing: a.facing,
      state: a.state,
      anim: a.state === 'walk' ? anims.walk : anims.idle,
      loop: true,
      clickable: this.isClickable(a),
      visible: this.isVisible(a),
      targetX: a.tx,
      targetY: a.ty,
      idleLeft: a.idleLeft,
    };
  }

  private snapshot(): WanderActorState[] {
    return this.actors
      .slice()
      .sort((p, q) => p.y - q.y)
      .map((a) => this.view(a));
  }
}
