// @spec-source → Issue #2135（幕府大廳 Q 版人物隨機走動）；來源 spine-trial lobby-wander-gait-v2 (856b82b) render/lobby_wander/wanderCore.ts
// 原樣移植、不改邏輯：產生器端調步伐時整檔重新同步即可。
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
}

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
    for (const a of this.actors) this.tick(a, t, dt);
    this.t = t + dt;
    return this.snapshot();
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
    return a.state === 'idle' && !this.isLocked(a);
  }

  private tick(a: InternalActor, t: number, dt: number): void {
    if (this.isLocked(a, t)) {
      a.state = 'idle';
      return;
    }
    if (a.state === 'walk') {
      const dx = a.tx - a.x;
      const dy = a.ty - a.y;
      const dist = Math.hypot(dx, dy);
      const step = a.cfg.speed * dt;
      if (this.blockedBy(a, a.x + (dist < 1e-6 ? 0 : (dx / dist) * step),
                          a.y + (dist < 1e-6 ? 0 : (dy / dist) * step))) {
        this.pickTarget(a);
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
    a.idleLeft -= dt;
    if (a.idleLeft <= 0) this.pickTarget(a);
  }

  private blockedBy(self: InternalActor, nx: number, ny: number): boolean {
    const min = this.config.minDistance! * 0.72;
    for (const o of this.actors) {
      if (o === self) continue;
      if (Math.hypot(nx - o.x, ny - o.y) < min) return true;
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
        if (o === a) continue;
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
