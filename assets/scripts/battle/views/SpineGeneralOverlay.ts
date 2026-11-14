import { Node, UITransform, resources, sp } from 'cc';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';
import { UnitAction, UnitPresentationCore, UnitPresentationState } from '../shared/UnitPresentationCore';
import { UnitSpineConfig } from '../shared/UnitPresentationConfig';
import { DuelExchange, DuelPresentationCore } from '../shared/DuelPresentationCore';

interface Entry {
  config: UnitSpineConfig;
  core: UnitPresentationCore;
  node: Node | null;
  revision: number;
  facing: 1 | -1;
  loading: boolean;
  ready: Array<(loaded: boolean) => void>;
  visible: boolean;
}

/** 武將與兵種共用的 Cocos/Spine 薄接層；素材路徑與動作皆由設定提供。 */
export class SpineUnitOverlay {
  private readonly entries = new Map<string, Entry>();
  private readonly failed = new Set<string>();
  private readonly pendingRemovals = new Set<string>();
  private duel: { core: DuelPresentationCore; ids: [string, string]; resolve: () => void } | null = null;
  constructor(private readonly getParent: () => Node | null, private readonly layer: () => number) {}

  public sync(id: string, config: UnitSpineConfig, x: number, y: number, facing: 1 | -1, moving: boolean, dt: number, visible = true): boolean {
    this.pendingRemovals.delete(id);
    let entry = this.entries.get(id);
    if (entry && entry.config.path !== config.path) { this.remove(id); entry = undefined; }
    if (!entry) {
      entry = { config, core: new UnitPresentationCore(config, { x, y }, facing), node: null, revision: -1, facing, loading: false, ready: [], visible };
      this.entries.set(id, entry);
    }
    if (!entry.node && !entry.loading) this.load(id, entry);
    entry.visible = visible;
    if (!this.duel?.ids.includes(id)) entry.core.follow({ x, y }, moving, dt);
    return !!entry.node?.isValid;
  }

  public update(dt: number): void {
    const controlled = this.duel?.ids;
    if (this.duel) {
      const duel = this.duel;
      const result = duel.core.step(dt);
      duel.ids.forEach((id, i) => { const e = this.entries.get(id); if (e) this.apply(e, result.units[i]); });
      if (result.phase === 'done') {
        this.duel = null;
        for (const id of duel.ids) if (this.pendingRemovals.has(id)) this.remove(id);
        duel.resolve();
      }
    }
    for (const [id, entry] of this.entries) {
      if (!controlled?.includes(id)) this.apply(entry, entry.core.step(dt));
    }
    const sorted = [...this.entries.values()].filter(e => e.node?.isValid)
      .sort((a, b) => b.core.snapshot().foot.y - a.core.snapshot().foot.y);
    sorted.forEach((entry, index) => entry.node?.setSiblingIndex(index));
  }

  public play(id: string, action: UnitAction): boolean {
    const entry = this.entries.get(id);
    if (!entry?.node?.isValid) return false;
    const skel = entry.node.getComponent(sp.Skeleton);
    if (!skel?.skeletonData?.getRuntimeData()?.findAnimation(entry.config.clips[action].name)) return false;
    if (action !== 'fall' || entry.core.snapshot().action !== 'fall') entry.core.play(action);
    return true;
  }
  public exists(id: string): boolean { return this.entries.has(id); }
  public revive(id: string): void {
    const entry = this.entries.get(id);
    if (entry && !this.duel?.ids.includes(id) && entry.core.snapshot().action === 'fall') entry.core.play('idle');
  }

  public async playDuel(a: string, b: string, winner: 0 | 1 | null, fallen: boolean, exchanges: readonly DuelExchange[]): Promise<void> {
    if (this.duel) return;
    const loaded = await Promise.all([this.waitForEntry(a), this.waitForEntry(b)]);
    if (!loaded.every(Boolean) || this.duel) return;
    const first = this.entries.get(a), second = this.entries.get(b);
    if (!first?.node?.isValid || !second?.node?.isValid) return;
    const left = first.core.snapshot().foot, right = second.core.snapshot().foot;
    const midpoint = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
    const dx = right.x - left.x, dy = right.y - left.y, distance = Math.hypot(dx, dy);
    const direction = distance > 0.001 ? { x: dx / distance, y: dy / distance } : { x: 1, y: 0 };
    const gap = Math.min(90, Math.max(40, distance / 4));
    const core = new DuelPresentationCore(
      { unit: first.core, sideline: left, arena: { x: midpoint.x - direction.x * gap, y: midpoint.y - direction.y * gap } },
      { unit: second.core, sideline: right, arena: { x: midpoint.x + direction.x * gap, y: midpoint.y + direction.y * gap } }, winner, fallen, exchanges,
    );
    return new Promise<void>(resolve => { this.duel = { core, ids: [a, b], resolve }; });
  }

  public remove(id: string): void {
    if (this.duel?.ids.includes(id)) { this.pendingRemovals.add(id); return; }
    this.pendingRemovals.delete(id);
    const entry = this.entries.get(id);
    if (entry) this.finishLoading(entry, false);
    if (entry?.node?.isValid) entry.node.destroy();
    this.entries.delete(id);
  }
  private waitForEntry(id: string): Promise<boolean> {
    const entry = this.entries.get(id);
    if (!entry || this.failed.has(entry.config.path)) return Promise.resolve(false);
    if (entry.node?.isValid) return Promise.resolve(true);
    if (!entry.loading) this.load(id, entry);
    if (entry.node?.isValid) return Promise.resolve(true);
    if (!entry.loading) return Promise.resolve(false);
    return new Promise(resolve => {
      let settled = false;
      const finish = (value: boolean): void => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        const index = entry.ready.indexOf(finish);
        if (index >= 0) entry.ready.splice(index, 1);
        resolve(value);
      };
      const timer = setTimeout(() => finish(false), 3000);
      entry.ready.push(finish);
    });
  }
  private finishLoading(entry: Entry, success: boolean): void {
    for (const done of entry.ready.splice(0)) done(success);
  }
  public clear(): void {
    if (this.duel) { this.duel.resolve(); this.duel = null; }
    for (const id of this.entries.keys()) this.remove(id);
  }

  private apply(entry: Entry, state: UnitPresentationState): void {
    const node = entry.node;
    const skeleton = node?.getComponent(sp.Skeleton);
    if (!node?.isValid || !skeleton) return;
    node.active = entry.visible || !!this.duel?.ids.some(id => this.entries.get(id) === entry);
    const offset = entry.config.footOffset;
    node.setPosition(state.foot.x - offset.x * entry.config.displayScale * state.facing,
      state.foot.y - offset.y * entry.config.displayScale, 0);
    node.setScale(entry.config.displayScale * state.facing, entry.config.displayScale, 1);
    if (entry.facing !== state.facing || entry.revision < 0) {
      const skin = state.facing < 0 && entry.config.mirrorSkin && skeleton.skeletonData?.getRuntimeData()?.findSkin(entry.config.mirrorSkin)
        ? entry.config.mirrorSkin : 'default';
      skeleton.setSkin(skin);
      entry.facing = state.facing;
    }
    if (entry.revision !== state.revision) {
      const name = state.clip.name;
      if (skeleton.skeletonData?.getRuntimeData()?.findAnimation(name)) skeleton.setAnimation(0, name, state.clip.loop);
      else UCUFLogger.warn(LogCategory.BATTLE, `[SpineUnitOverlay] 缺少動作 ${name}: ${entry.config.path}`);
      entry.revision = state.revision;
    }
    skeleton.timeScale = state.animationSpeed;
  }

  private load(id: string, entry: Entry): void {
    const parent = this.getParent();
    if (!parent || this.failed.has(entry.config.path)) return;
    entry.loading = true;
    resources.load(entry.config.path, sp.SkeletonData, (err, data) => {
      entry.loading = false;
      if (this.entries.get(id) !== entry || !parent.isValid) { this.finishLoading(entry, false); return; }
      if (err || !data) {
        this.failed.add(entry.config.path);
        UCUFLogger.warn(LogCategory.BATTLE, `[SpineUnitOverlay] 載入失敗: ${entry.config.path}`, err);
        this.finishLoading(entry, false);
        return;
      }
      const runtime = data.getRuntimeData();
      const missing = Object.values(entry.config.clips).map(clip => clip.name).find(name => !runtime?.findAnimation(name));
      if (missing) {
        this.failed.add(entry.config.path);
        UCUFLogger.warn(LogCategory.BATTLE, `[SpineUnitOverlay] 素材缺少共用動作 ${missing}: ${entry.config.path}`);
        this.finishLoading(entry, false);
        return;
      }
      const node = new Node(`SpineUnit_${id}`);
      node.layer = this.layer(); node.addComponent(UITransform); parent.addChild(node); node.setSiblingIndex(0);
      const skeleton = node.addComponent(sp.Skeleton);
      skeleton.premultipliedAlpha = false; skeleton.skeletonData = data;
      entry.node = node;
      this.apply(entry, entry.core.snapshot());
      this.finishLoading(entry, true);
    });
  }
}
