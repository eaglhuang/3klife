/** 戰場單位演出核心；座標為場景腳底點，與引擎及角色種類無關。 */
export type UnitAction = 'idle' | 'move' | 'attack' | 'hit' | 'dodge' | 'fall' | 'retreat';
export interface FootPoint { x: number; y: number }
export interface ActionClip { name: string; loop: boolean; duration: number }
export interface UnitPresentationConfig {
  clips: Record<UnitAction, ActionClip>;
  /** 與 spine-trial 的 walk_ground_speed 同單位。 */
  walkGroundSpeed: number;
  displayScale: number;
  speedMultiplier: number;
}
export interface UnitPresentationState {
  foot: FootPoint;
  facing: 1 | -1;
  action: UnitAction;
  clip: ActionClip;
  animationSpeed: number;
}

/** 按固定速度前進，移動與步態使用相同倍率。 */
export class UnitPresentationCore {
  private foot: FootPoint;
  private facing: 1 | -1;
  private action: UnitAction = 'idle';
  private target: FootPoint | null = null;
  private elapsed = 0;
  constructor(private readonly config: UnitPresentationConfig, start: FootPoint, facing: 1 | -1 = 1) {
    if (![config.walkGroundSpeed, config.displayScale, config.speedMultiplier].every(v => Number.isFinite(v) && v > 0)) throw new Error('單位步速與縮放必須為正數');
    this.foot = { ...start };
    this.facing = facing;
  }
  public play(action: UnitAction): void {
    this.action = action;
    this.elapsed = 0;
    this.target = null;
  }
  public moveTo(target: FootPoint, retreat = false): void {
    this.target = { ...target };
    this.action = retreat ? 'retreat' : 'move';
    this.elapsed = 0;
  }
  public step(dt: number): UnitPresentationState {
    if (!Number.isFinite(dt) || dt < 0) throw new Error('dt 必須為有限非負數');
    if (this.target) {
      const dx = this.target.x - this.foot.x, dy = this.target.y - this.foot.y;
      const distance = Math.hypot(dx, dy);
      if (dx !== 0) this.facing = dx < 0 ? -1 : 1;
      const travel = this.config.walkGroundSpeed * this.config.displayScale * this.config.speedMultiplier * dt;
      if (distance <= travel || distance === 0) {
        this.foot = { ...this.target }; this.target = null; this.action = 'idle';
      } else {
        this.foot = { x: this.foot.x + dx / distance * travel, y: this.foot.y + dy / distance * travel };
      }
    } else if (this.action !== 'fall') {
      this.elapsed += dt;
      const clip = this.config.clips[this.action];
      if (!clip.loop && this.elapsed >= clip.duration) this.action = 'idle';
    }
    return { foot: { ...this.foot }, facing: this.facing, action: this.action, clip: this.config.clips[this.action], animationSpeed: this.action === 'move' || this.action === 'retreat' ? this.config.speedMultiplier : 1 };
  }
}
