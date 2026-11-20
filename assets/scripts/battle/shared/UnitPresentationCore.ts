/** 戰場單位演出核心；座標為場景腳底點，與引擎及角色種類無關。 */
export type UnitAction = 'idle' | 'move' | 'attack' | 'hit' | 'dodge' | 'fall' | 'retreat';
export interface FootPoint { x: number; y: number }
export interface ActionClip {
  name: string; loop: boolean; duration: number;
  /** 骨架沒有 name 這個動作時改播的後備動作（PROG-2-9407：小兵走路缺 walk 時退回 dash_in）。 */
  fallback?: string;
}
/** 依骨架實際有的動作決定要播哪個；主動作與後備都沒有時回傳主動作名（由呼叫端記錄缺動作）。 */
export function resolveClipName(clip: ActionClip, has: (name: string) => boolean): string {
  return !has(clip.name) && clip.fallback && has(clip.fallback) ? clip.fallback : clip.name;
}
export interface UnitPresentationConfig {
  clips: Record<UnitAction, ActionClip>;
  /** 與 spine-trial 的 walk_ground_speed 同單位。 */
  walkGroundSpeed: number;
  displayScale: number;
  speedMultiplier: number;
  /**
   * follow() 依實際位移算出的步態倍率上限（PROG-2-9407）。不設就不限。
   * 位移時間固定、距離又長時，倍率會高到像快轉，腳步反而看起來在滑；封頂後寧可腳步略慢於位移，也不讓步頻失真。
   */
  maxAnimationSpeed?: number;
}
export interface UnitPresentationState {
  foot: FootPoint;
  facing: 1 | -1;
  action: UnitAction;
  clip: ActionClip;
  animationSpeed: number;
  revision: number;
}

/** 按固定速度前進，移動與步態使用相同倍率。 */
export class UnitPresentationCore {
  private foot: FootPoint;
  private facing: 1 | -1;
  private action: UnitAction = 'idle';
  private target: FootPoint | null = null;
  private elapsed = 0;
  private revision = 0;
  private animationSpeed = 1;
  /** 退場走回原位後要恢復的朝向（PROG-2-9366）。退場途中面向行進方向，到位後轉回面向戰場，否則主將會一直背對戰場。 */
  private facingAfterRetreat: 1 | -1 | null = null;
  /** 這次動作指定的動作片段（PROG-2-9400：依兵種選攻擊分動作）；只對指定它的那個 action 有效，換動作自動失效。 */
  private clipOverride: { action: UnitAction; clip: ActionClip } | null = null;
  constructor(private readonly config: UnitPresentationConfig, start: FootPoint, facing: 1 | -1 = 1) {
    if (![config.walkGroundSpeed, config.displayScale, config.speedMultiplier].every(v => Number.isFinite(v) && v > 0)) throw new Error('單位步速與縮放必須為正數');
    this.foot = { ...start };
    this.facing = facing;
  }
  public play(action: UnitAction, clip?: ActionClip): void {
    this.clipOverride = clip ? { action, clip } : null;
    this.action = action;
    this.elapsed = 0;
    this.target = null;
    this.facingAfterRetreat = null;
    this.animationSpeed = 1;
    this.revision++;
  }
  public moveTo(target: FootPoint, retreat = false, minimumSpeedMultiplier = this.config.speedMultiplier): void {
    if (!Number.isFinite(minimumSpeedMultiplier) || minimumSpeedMultiplier <= 0) throw new Error('移動倍率必須為正數');
    this.target = { ...target };
    this.facingAfterRetreat = retreat ? (this.facingAfterRetreat ?? this.facing) : null;
    this.action = retreat ? 'retreat' : 'move';
    this.elapsed = 0;
    this.animationSpeed = minimumSpeedMultiplier;
    this.revision++;
  }
  /** 場景投影既有位移時，按當幀實際位移調整步態倍率。 */
  public follow(foot: FootPoint, moving: boolean, dt: number): void {
    if (![foot.x, foot.y, dt].every(Number.isFinite) || dt < 0) throw new Error('腳點與 dt 必須為有限數字');
    const dx = foot.x - this.foot.x, dy = foot.y - this.foot.y;
    // PROG-2-9412：出手／受擊／閃避這類一次性動作還沒播完時，位置照跟但不改成走路；
    // 騎兵衝鋒是「邊移動邊出手」，以前會被覆蓋成整隊走路、看不到突刺
    const oneShotPlaying = (this.action === 'attack' || this.action === 'hit' || this.action === 'dodge') && this.elapsed < this.currentClip().duration;
    if (moving && oneShotPlaying) { this.foot = { ...foot }; return; }
    if (moving && dt > 0 && Math.hypot(dx, dy) > 0.001) {
      if (this.action !== 'move') { this.action = 'move'; this.revision++; }
      if (dx !== 0) this.facing = dx < 0 ? -1 : 1;
      const speed = Math.hypot(dx, dy) / dt / (this.config.walkGroundSpeed * this.config.displayScale);
      this.animationSpeed = Math.min(speed, this.config.maxAnimationSpeed ?? Infinity);
      this.target = null;
      this.facingAfterRetreat = null;
    } else if (!moving && this.action === 'move') {
      this.action = 'idle'; this.animationSpeed = 1; this.revision++;
    }
    this.foot = { ...foot };
  }
  private currentClip(): ActionClip {
    return this.clipOverride?.action === this.action ? this.clipOverride.clip : this.config.clips[this.action];
  }
  public snapshot(): UnitPresentationState {
    return { foot: { ...this.foot }, facing: this.facing, action: this.action, clip: this.currentClip(), animationSpeed: this.animationSpeed, revision: this.revision };
  }
  public step(dt: number): UnitPresentationState {
    if (!Number.isFinite(dt) || dt < 0) throw new Error('dt 必須為有限非負數');
    if (this.target) {
      const dx = this.target.x - this.foot.x, dy = this.target.y - this.foot.y;
      const distance = Math.hypot(dx, dy);
      if (dx !== 0) this.facing = dx < 0 ? -1 : 1;
      const travel = this.config.walkGroundSpeed * this.config.displayScale * this.animationSpeed * dt;
      if (distance <= travel || distance === 0) {
        this.foot = { ...this.target }; this.target = null; this.action = 'idle'; this.animationSpeed = 1; this.revision++;
        if (this.facingAfterRetreat !== null) { this.facing = this.facingAfterRetreat; this.facingAfterRetreat = null; }
      } else {
        this.foot = { x: this.foot.x + dx / distance * travel, y: this.foot.y + dy / distance * travel };
      }
    } else if (this.action !== 'fall') {
      this.elapsed += dt;
      const clip = this.currentClip();
      if (!clip.loop && this.elapsed >= clip.duration) { this.action = 'idle'; this.revision++; }
    }
    return this.snapshot();
  }
  /** 指定最長移動時間時，位移與步態倍率一起提高。 */
  public moveToWithin(target: FootPoint, seconds: number, retreat = false): void {
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('移動時間必須為正數');
    const distance = Math.hypot(target.x - this.foot.x, target.y - this.foot.y);
    const speed = distance / seconds / (this.config.walkGroundSpeed * this.config.displayScale);
    this.moveTo(target, retreat, Math.max(this.config.speedMultiplier, speed));
  }
}
