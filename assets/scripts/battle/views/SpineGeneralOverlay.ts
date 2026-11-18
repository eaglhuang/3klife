import { Color, Node, UITransform, resources, sp } from 'cc';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';
import { UnitAction, UnitPresentationCore, UnitPresentationState, resolveClipName } from '../shared/UnitPresentationCore';
import { dustBeatsFor, stepBobOffset } from '../shared/MoveFeedback';
import { UnitSpineConfig } from '../shared/UnitPresentationConfig';
import { AttackStyle, pickAttackClip } from '../shared/AttackStyle';
import { DuelExchange, DuelPresentationCore } from '../shared/DuelPresentationCore';
import { BATTLE_VISUAL_TIMING, hitFlashStrength, sampleHitShake } from './BattlePresentationTiming';

interface Entry {
  config: UnitSpineConfig;
  core: UnitPresentationCore;
  node: Node | null;
  revision: number;
  facing: 1 | -1;
  loading: boolean;
  ready: Array<(loaded: boolean) => void>;
  visible: boolean;
  /** 小隊隊員（不含帶頭的那一位）；與帶頭者共用同一份骨架資料與圖集，不另外載入。 */
  followers: Node[];
  /** 目前要顯示的人數（含帶頭者），由呼叫端依兵力決定。 */
  members: number;
  /** 受擊回饋進行中的狀態（PROG-2-9401）；結束後為 null。只疊加在畫面位置與顏色上，不碰移動與動作狀態。 */
  hit: { elapsed: number; amplitude: number; flash: boolean } | null;
  /** 目前畫在骨架上的閃白強度（0 = 正常色）；只在數值改變時才寫 color，省得每幀弄髒渲染資料。 */
  flashPainted: number;
  /** 步態時鐘（動畫秒）：從 move 動作開始累加，用來判斷落腳時機；離開 move 歸零。 */
  stepClock: number;
}

/** 落腳通知：腳點（與單位節點同一座標系）、面向、是否為帶頭者。 */
export type FootfallListener = (id: string, x: number, y: number, facing: 1 | -1, isLeader: boolean) => void;

/**
 * 受擊閃色：Spine 骨架的 color 是「相乘」，沒辦法相乘出純白；
 * 真正的全身閃白要用雙色染色（two-color tint）著色器，這裡先用相乘可行的暖色提亮脈衝當閃色。
 */
const HIT_FLASH_TINT = { r: 255, g: 120, b: 110 };

/** 一次性動作（攻擊、受擊、倒地）隊員之間的最大時間差（秒）；太大會跟不上戰鬥節奏。 */
const SQUAD_ONE_SHOT_STAGGER_SEC = 0.3;

/** 武將與兵種共用的 Cocos/Spine 薄接層；素材路徑與動作皆由設定提供。 */
export class SpineUnitOverlay {
  private readonly entries = new Map<string, Entry>();
  private readonly failed = new Set<string>();
  private readonly pendingRemovals = new Set<string>();
  private duel: { core: DuelPresentationCore; ids: [string, string]; resolve: (played: boolean) => void } | null = null;
  constructor(private readonly getParent: () => Node | null, private readonly layer: () => number, private readonly onFootfall?: FootfallListener) {}

  public sync(id: string, config: UnitSpineConfig, x: number, y: number, facing: 1 | -1, moving: boolean, dt: number, visible = true, members = 1): boolean {
    this.pendingRemovals.delete(id);
    let entry = this.entries.get(id);
    if (entry && entry.config.path !== config.path) { this.remove(id); entry = undefined; }
    if (!entry) {
      entry = { config, core: new UnitPresentationCore(config, { x, y }, facing), node: null, revision: -1, facing, loading: false, ready: [], visible, followers: [], members, hit: null, flashPainted: 0, stepClock: 0 };
      this.entries.set(id, entry);
    }
    if (!entry.node && !entry.loading) this.load(id, entry);
    entry.visible = visible;
    entry.members = members;
    if (!this.duel?.ids.includes(id)) entry.core.follow({ x, y }, moving, dt);
    return !!entry.node?.isValid;
  }

  /** 這份素材是否已確定載不起來（缺檔或缺共用動作）；呼叫端據此改用後備素材，不讓單位退回方塊。 */
  public hasFailed(path: string): boolean { return this.failed.has(path); }

  public update(dt: number): void {
    const controlled = this.duel?.ids;
    if (this.duel) {
      const duel = this.duel;
      // 演出出錯也要收尾：這裡丟例外會每一格都丟，單挑永遠不結束、回合整個卡死（PROG-2-9355）
      let phase: string = 'done';
      try {
        const result = duel.core.step(dt);
        duel.ids.forEach((id, i) => { const e = this.entries.get(id); if (e) this.apply(e, result.units[i]); });
        phase = result.phase;
      } catch (error) { console.error('[SpineUnitOverlay] 單挑演出出錯，直接收尾', error); }
      if (phase === 'done') {
        this.duel = null;
        for (const id of duel.ids) if (this.pendingRemovals.has(id)) this.remove(id);
        duel.resolve(true);
      }
    }
    for (const [id, entry] of this.entries) {
      if (entry.hit) entry.hit.elapsed += dt;
      if (!controlled?.includes(id)) {
        const state = entry.core.step(dt);
        this.apply(entry, state);
        this.emitFootfalls(id, entry, state, dt);
      }
    }
    // 畫面越下方（y 越小）越靠近鏡頭，要蓋在上面；隊員各自依落腳點排序，才不會整隊被隔壁格蓋住
    const sorted: Array<{ node: Node; y: number }> = [];
    for (const entry of this.entries.values()) {
      if (!entry.node?.isValid) continue;
      const footY = entry.core.snapshot().foot.y;
      sorted.push({ node: entry.node, y: footY });
      entry.followers.forEach((node, i) => { if (node.isValid && node.active) sorted.push({ node, y: footY + (entry.config.squad?.[i]?.y ?? 0) }); });
    }
    sorted.sort((a, b) => b.y - a.y).forEach((item, index) => item.node.setSiblingIndex(index));
  }

  /** attackStyle 只對 'attack' 有效：依兵種風格播分動作，缺動作時退回通用攻擊動作（PROG-2-9400）。 */
  public play(id: string, action: UnitAction, attackStyle?: AttackStyle): boolean {
    const entry = this.entries.get(id);
    if (!entry?.node?.isValid) return false;
    const runtime = entry.node.getComponent(sp.Skeleton)?.skeletonData?.getRuntimeData();
    const has = (name: string): boolean => !!runtime?.findAnimation(name);
    if (!has(resolveClipName(entry.config.clips[action], has))) return false;
    const clip = action === 'attack' && attackStyle
      ? pickAttackClip(attackStyle, entry.config.clips.attack, name => !!runtime.findAnimation(name)) : undefined;
    if (action !== 'fall' || entry.core.snapshot().action !== 'fall') entry.core.play(action, clip);
    // 倒地時不再抖動閃色，避免和 fall、boom 疊在一起（下一次 apply 會把顏色刷回正常）
    if (action === 'fall') entry.hit = null;
    return true;
  }

  /**
   * 受擊回饋：閃色 + 左右抖動（PROG-2-9401）。抖動是畫面位置上的暫時偏移，每幀由 apply 疊加在移動位置上，
   * 所以不會打斷移動、也不會把單位拉回舊位置；結束時偏移自然歸零。
   * @param amplitudePx 抖動最大位移（畫面像素），0 表示只閃色不抖
   */
  public hit(id: string, amplitudePx: number, flash = true): boolean {
    const entry = this.entries.get(id);
    if (!entry?.node?.isValid) return false;
    entry.hit = { elapsed: 0, amplitude: Math.max(0, amplitudePx), flash };
    return true;
  }
  public exists(id: string): boolean { return this.entries.has(id); }
  public revive(id: string): void {
    const entry = this.entries.get(id);
    if (entry && !this.duel?.ids.includes(id) && entry.core.snapshot().action === 'fall') entry.core.play('idle');
  }

  /** 回傳是否真的播了交鋒動畫；任一方沒有 Spine 動畫時回 false，呼叫端要自己補演出 */
  public async playDuel(a: string, b: string, winner: 0 | 1 | null, fallen: boolean, exchanges: readonly DuelExchange[]): Promise<boolean> {
    if (this.duel) return false;
    const loaded = await Promise.all([this.waitForEntry(a), this.waitForEntry(b)]);
    if (!loaded.every(Boolean) || this.duel) return false;
    const first = this.entries.get(a), second = this.entries.get(b);
    if (!first?.node?.isValid || !second?.node?.isValid) return false;
    const left = first.core.snapshot().foot, right = second.core.snapshot().foot;
    const midpoint = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
    const dx = right.x - left.x, dy = right.y - left.y, distance = Math.hypot(dx, dy);
    const direction = distance > 0.001 ? { x: dx / distance, y: dy / distance } : { x: 1, y: 0 };
    const gap = Math.min(90, Math.max(40, distance / 4));
    const core = new DuelPresentationCore(
      { unit: first.core, sideline: left, arena: { x: midpoint.x - direction.x * gap, y: midpoint.y - direction.y * gap } },
      { unit: second.core, sideline: right, arena: { x: midpoint.x + direction.x * gap, y: midpoint.y + direction.y * gap } }, winner, fallen, exchanges,
    );
    return new Promise<boolean>(resolve => { this.duel = { core, ids: [a, b], resolve }; });
  }

  /** 強制收掉進行中的單挑演出（逾時保底，PROG-2-9404）：以「沒播完」回報，呼叫端會補逐招跳傷害 */
  public abortDuel(): void {
    const duel = this.duel;
    if (!duel) return;
    this.duel = null;
    for (const id of duel.ids) if (this.pendingRemovals.has(id)) this.remove(id);
    duel.resolve(false);
  }

  public remove(id: string): void {
    if (this.duel?.ids.includes(id)) { this.pendingRemovals.add(id); return; }
    this.pendingRemovals.delete(id);
    const entry = this.entries.get(id);
    if (entry) this.finishLoading(entry, false);
    if (entry?.node?.isValid) entry.node.destroy();
    entry?.followers.forEach(node => { if (node.isValid) node.destroy(); });
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
    if (this.duel) { this.duel.resolve(true); this.duel = null; }
    for (const id of this.entries.keys()) this.remove(id);
  }

  private apply(entry: Entry, state: UnitPresentationState): void {
    const node = entry.node;
    const skeleton = node?.getComponent(sp.Skeleton);
    if (!node?.isValid || !skeleton) return;
    node.active = entry.visible || !!this.duel?.ids.some(id => this.entries.get(id) === entry);
    const offset = entry.config.footOffset;
    // 受擊回饋：抖動位移與閃色強度（結束後歸零並清掉狀態）
    const hit = entry.hit;
    const shakeX = hit ? sampleHitShake(hit.elapsed, hit.amplitude) : 0;
    const flash = hit?.flash ? hitFlashStrength(hit.elapsed) : 0;
    if (hit && hit.elapsed >= Math.max(BATTLE_VISUAL_TIMING.hitShakeSec, BATTLE_VISUAL_TIMING.hitFlashSec)) entry.hit = null;
    const flashChanged = this.paintFlash(skeleton, entry, flash);
    // 走路起伏：落腳最低、兩步中間最高，避免整隊像在地上滑
    const walking = state.action === 'move';
    const leaderBob = walking ? stepBobOffset(entry.stepClock) : 0;
    node.setPosition(state.foot.x - offset.x * entry.config.displayScale * state.facing + shakeX,
      state.foot.y - offset.y * entry.config.displayScale + leaderBob, 0);
    node.setScale(entry.config.displayScale * state.facing, entry.config.displayScale, 1);
    const skinChanged = entry.facing !== state.facing || entry.revision < 0;
    const clipChanged = entry.revision !== state.revision;
    const runtime = skeleton.skeletonData?.getRuntimeData();
    const skin = state.facing < 0 && entry.config.mirrorSkin && runtime?.findSkin(entry.config.mirrorSkin) ? entry.config.mirrorSkin : 'default';
    const name = resolveClipName(state.clip, n => !!runtime?.findAnimation(n));
    const hasClip = !!runtime?.findAnimation(name);
    if (skinChanged) { skeleton.setSkin(skin); entry.facing = state.facing; }
    if (clipChanged) {
      if (hasClip) skeleton.setAnimation(0, name, state.clip.loop);
      else UCUFLogger.warn(LogCategory.BATTLE, `[SpineUnitOverlay] 缺少動作 ${name}: ${entry.config.path}`);
      entry.revision = state.revision;
    }
    skeleton.timeScale = state.animationSpeed;
    // 隊員跟著帶頭者做同一個動作，只差站位與時間差，看起來才不像複製貼上
    entry.followers.forEach((follower, i) => {
      const slot = entry.config.squad?.[i];
      const followerSkel = follower.getComponent(sp.Skeleton);
      if (!slot || !follower.isValid || !followerSkel) return;
      follower.active = node.active && i < entry.members - 1;
      const pos = node.position;
      // 站位以「面向的後方」為準，所以 x 要跟著朝向翻面
      // pos 已含抖動偏移與帶頭者起伏；起伏換成隊員自己相位的，才是錯開的集體走路
      const followerBob = walking ? stepBobOffset(entry.stepClock, slot.phase * state.clip.duration) - leaderBob : 0;
      follower.setPosition(pos.x - slot.x * state.facing, pos.y + slot.y + followerBob, 0);
      if (flashChanged) this.setSkeletonFlash(followerSkel, flash);
      follower.setScale(entry.config.displayScale * state.facing, entry.config.displayScale, 1);
      if (skinChanged) followerSkel.setSkin(skin);
      if (clipChanged && hasClip) {
        const track = followerSkel.setAnimation(0, name, state.clip.loop);
        if (track) {
          // 循環動作錯開起始時間；一次性動作（攻擊、受擊、倒地）改用延後開始，才會依序出手
          if (state.clip.loop) track.trackTime = slot.phase * state.clip.duration;
          else track.delay = slot.phase * SQUAD_ONE_SHOT_STAGGER_SEC;
        }
      }
      followerSkel.timeScale = state.animationSpeed;
    });
  }

  /**
   * 落腳揚塵時機（PROG-2-9407）：依步態倍率累積時鐘，每 0.4 動畫秒（walk 一步）通知一次；
   * 小隊隊員用各自的相位偏移，腳步和骨架上錯開的動作對得上，看起來是集體走路而不是同步複製。
   */
  private emitFootfalls(id: string, entry: Entry, state: UnitPresentationState, dt: number): void {
    if (!this.onFootfall) return;
    if (state.action !== 'move' || !entry.visible || !entry.node?.active) { entry.stepClock = 0; return; }
    const prev = entry.stepClock;
    entry.stepClock = prev + dt * state.animationSpeed;
    const { x, y } = state.foot;
    if (dustBeatsFor(prev, state.animationSpeed, dt) > 0) this.onFootfall(id, x, y, state.facing, true);
    entry.followers.forEach((follower, i) => {
      const slot = entry.config.squad?.[i];
      if (!slot || !follower.isValid || !follower.active) return;
      if (dustBeatsFor(prev, state.animationSpeed, dt, slot.phase * state.clip.duration) > 0) {
        this.onFootfall?.(id, x - slot.x * state.facing, y + slot.y, state.facing, false);
      }
    });
  }

  private readonly flashColor = new Color();

  /** 把閃色強度畫到帶頭者骨架上；強度沒變就不動。回傳是否有變，讓 apply 的隊員迴圈跟著畫。 */
  private paintFlash(skeleton: sp.Skeleton, entry: Entry, strength: number): boolean {
    if (strength === entry.flashPainted) return false;
    this.setSkeletonFlash(skeleton, strength);
    entry.flashPainted = strength;
    return true;
  }

  private setSkeletonFlash(skeleton: sp.Skeleton, strength: number): void {
    const t = HIT_FLASH_TINT;
    this.flashColor.set(255 - (255 - t.r) * strength, 255 - (255 - t.g) * strength, 255 - (255 - t.b) * strength, 255);
    skeleton.color = this.flashColor;
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
      const has = (name: string): boolean => !!runtime?.findAnimation(name);
      const missing = Object.values(entry.config.clips).map(clip => resolveClipName(clip, has)).find(name => !has(name));
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
      // 隊員直接沿用同一份 data（Cocos 對同一路徑只留一份骨架與貼圖），所以多兩個人只多節點與動畫狀態
      for (let i = 0; i < (entry.config.squad?.length ?? 0); i += 1) {
        const follower = new Node(`SpineUnit_${id}_m${i + 1}`);
        follower.layer = this.layer(); follower.addComponent(UITransform); parent.addChild(follower); follower.setSiblingIndex(0);
        const followerSkel = follower.addComponent(sp.Skeleton);
        followerSkel.premultipliedAlpha = false; followerSkel.skeletonData = data;
        entry.followers.push(follower);
      }
      this.apply(entry, entry.core.snapshot());
      this.finishLoading(entry, true);
    });
  }
}
