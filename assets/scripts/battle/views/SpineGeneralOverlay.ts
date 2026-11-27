import { Color, EffectAsset, JsonAsset, Material, Node, UITransform, Vec4, resources, sp } from 'cc';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';
import { UnitAction, UnitPresentationCore, UnitPresentationState, resolveClipName } from '../shared/UnitPresentationCore';
import { dustBeatsFor, floodDriftSample, stepBobOffset } from '../shared/MoveFeedback';
import { sampleChargePose } from '../shared/SkillCastPresentation';
import { DeployLandingSample, deployLandingTotalSec, landingCrossed, memberDeployDelay, sampleDeployLanding } from '../shared/DeployLanding';
import { UnitSpineConfig } from '../shared/UnitPresentationConfig';
import { AttackStyle, pickAttackClip } from '../shared/AttackStyle';
import { DuelExchange, DuelPresentationCore } from '../shared/DuelPresentationCore';

/** 場邊單挑雙方各離中心的距離（overlay 像素，PROG-2-9719）。 */
const DUEL_SIDELINE_GAP = 70;
import { getHitFlashCurve, hitFeedbackTotalSec, hitFlashStrength, parseHitFlashCurve, sampleHitRecoil, sampleHitShake, setHitFlashCurve } from './BattlePresentationTiming';

/** 2D 節點繞 z 軸傾斜（度）；角度沒變就不寫，省得每幀弄髒節點變換。 */
const paintedTilt = new WeakMap<Node, number>();
function setTilt(node: Node, deg: number): void {
  if ((paintedTilt.get(node) ?? 0) === deg) return;
  paintedTilt.set(node, deg);
  node.setRotationFromEuler(0, 0, deg);
}

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
  /** frame：受擊後第幾格；holdEnd：全白停留最後一格時的 elapsed（PROG-2-9483） */
  hit: { elapsed: number; amplitude: number; flash: boolean; push: number; frame: number; holdEnd: number } | null;
  /** 命中頓格剩餘秒數（PROG-2-9412）；大於 0 時骨架動畫與動作計時都停住。 */
  freeze: number;
  /** 目前畫在骨架上的閃白強度（0 = 正常色）；只在數值改變時才寫 color，省得每幀弄髒渲染資料。 */
  flashPainted: number;
  /** 步態時鐘（動畫秒）：從 move 動作開始累加，用來判斷落腳時機；離開 move 歸零。 */
  stepClock: number;
  /** 部署落地演出進行中的時鐘（秒，PROG-2-9409）；素材載好才開始走，結束後為 null。 */
  deploy: { t: number } | null;
  /** 放招蓄力進行中的時鐘（秒，PROG-2-9410）；結束後為 null。 */
  charge: { t: number; dur: number } | null;
  /** 漂流（被水沖走／卡在水流格，PROG-2-10100）時鐘（秒）；null 表示沒在漂。只疊加沉浮與傾斜，不碰動作狀態。 */
  drift: { t: number } | null;
}

/** 落腳通知：腳點（與單位節點同一座標系）、面向、是否為帶頭者。 */
export type FootfallListener = (id: string, x: number, y: number, facing: 1 | -1, isLeader: boolean) => void;
/** 部署落地通知（PROG-2-9409）：某名士兵剛落地的腳點、是否為帶頭者。 */
export type LandingListener = (id: string, x: number, y: number, isLeader: boolean) => void;

/**
 * 受擊閃色：Spine 骨架的 color 是「相乘」，沒辦法相乘出純白；
 * 真正的全身閃白要用雙色染色（two-color tint）著色器，這裡先用相乘可行的暖色提亮脈衝當閃色。
 */
const HIT_FLASH_TINT = { r: 255, g: 120, b: 110 };

/** 骨架基礎色：一般單位白色（不染）；設了 tint 的骨架（敵方騎兵暫代紅色）用該色，閃色也在它上面疊。 */
function baseColorOf(config: UnitSpineConfig): Color {
  const t = config.tint;
  return t ? new Color(t.r, t.g, t.b, 255) : Color.WHITE;
}

/**
 * PROG-2-9412：受擊閃白材質（resources/effects/spine-hit-flash）。全部單位共用一份 Material，
 * 引擎會替每具骨架另建材質實例，所以各自的閃白強度互不影響。載入失敗就維持 null，閃色退回相乘暖色。
 */
const HIT_FLASH_EFFECT_PATH = 'effects/spine-hit-flash';
let hitFlashMaterial: Material | null = null;
let hitFlashLoading = false;
const hitFlashWaiters: Array<() => void> = [];
/** 受擊閃白曲線設定（PROG-2-9483）：第一次建立疊層時讀一次，讀到之前用預設值。 */
let hitFlashCurveRequested = false;
function ensureHitFlashCurve(): void {
  if (hitFlashCurveRequested) return;
  hitFlashCurveRequested = true;
  try {
    resources.load('data/battle-hit-feedback', JsonAsset, (err, asset) => {
      if (err || !asset) return; // 讀不到用預設
      setHitFlashCurve(parseHitFlashCurve(asset.json));
    });
  } catch { /* 資源系統未就緒：用預設 */ }
}

function ensureHitFlashMaterial(onReady: () => void): void {
  if (hitFlashMaterial) { onReady(); return; }
  hitFlashWaiters.push(onReady);
  if (hitFlashLoading) return;
  hitFlashLoading = true;
  resources.load(HIT_FLASH_EFFECT_PATH, EffectAsset, (err, effectAsset) => {
    if (err || !effectAsset) {
      UCUFLogger.warn(LogCategory.BATTLE, '[SpineUnitOverlay] 受擊閃白材質載入失敗，改用暖色閃', err);
      hitFlashWaiters.length = 0;
      return;
    }
    const material = new Material();
    material.initialize({ effectAsset });
    hitFlashMaterial = material;
    for (const done of hitFlashWaiters.splice(0)) done();
  });
}

/**
 * 一次性動作（攻擊、受擊、倒地）隊員之間的最大時間差（秒）；太大會跟不上戰鬥節奏。
 * PROG-2-9412：0.3 秒時隊員比帶頭者晚 0.1～0.2 秒，帶頭者砍中時隊員還站著，看起來像只有一隻在打；
 * 改成 0.12 秒（隊員晚約 0.04、0.08 秒），整隊幾乎同時出手、仍保留一點錯落感。
 */
const SQUAD_ONE_SHOT_STAGGER_SEC = 0.12;

/** 兄弟索引順序沒變時，每隔幾幀仍強制對齊一次（防外部改動順序；PROG-2-10155） */
export const SORT_RESYNC_FRAMES = 120;

/** 節點池每個骨架路徑最多保留幾個閒置節點（PROG-2-9706）；超過的直接銷毀，避免池無限長大吃記憶體。 */
export const SPINE_UNIT_POOL_MAX_PER_PATH = 24;

/** 節點 → 骨架元件快取（PROG-2-10155）：每幀每隊員不再 getComponent；節點銷毀後由 WeakMap 自動釋放。 */
const skeletonCache = new WeakMap<Node, sp.Skeleton>();
function skeletonOf(node: Node | null | undefined): sp.Skeleton | null {
  if (!node) return null;
  const cached = skeletonCache.get(node);
  if (cached) return cached; // 骨架元件與節點同生共死；節點是否有效由呼叫端檢查
  const skeleton = node.getComponent(sp.Skeleton);
  if (skeleton) skeletonCache.set(node, skeleton);
  return skeleton;
}

/** 武將與兵種共用的 Cocos/Spine 薄接層；素材路徑與動作皆由設定提供。 */
export class SpineUnitOverlay {
  private readonly entries = new Map<string, Entry>();
  /** 兄弟索引排序緩衝與上一幀順序（PROG-2-10155）：順序沒變就不重排，也不每幀配置新陣列／物件 */
  private readonly sortPool: Array<{ node: Node; y: number }> = [];
  private readonly sortItems: Array<{ node: Node; y: number }> = [];
  private lastSortedNodes: Node[] = [];
  private sortFrames = 0;
  private readonly failed = new Set<string>();
  private readonly pendingRemovals = new Set<string>();
  /** 已要求落地但疊層還沒建立的單位（playDeploy 可能早於第一次 sync） */
  private readonly pendingDeploys = new Set<string>();
  /**
   * 骨架節點池（PROG-2-9706）：以骨架資料路徑為 key 存放閒置（已隱藏、已重設）的節點，
   * 部署／陣亡時重用而不重建，少一次 new Node + addComponent + 銷毀的卡頓與 GC。
   * 池只活在這個疊層實例內，clear()（場景銷毀時由 UnitRenderer 呼叫）會整池銷毀，不會跨場景殘留。
   */
  private readonly nodePool = new Map<string, Node[]>();
  /** 戰前預載的骨架資料（PROG-2-10078）：持有一份引用，場景內不會被資源回收；clear() 時釋放。 */
  private readonly preloaded = new Map<string, sp.SkeletonData>();
  private duel: { core: DuelPresentationCore; ids: [string, string]; resolve: (played: boolean) => void } | null = null;
  /** 地面層容器（格子 buff 標記、揚塵）：每幀排序後固定送回最底，依序排在 index 0、1…（PROG-2-9708） */
  private groundNodes: () => ReadonlyArray<Node | null> = () => [];
  constructor(private readonly getParent: () => Node | null, private readonly layer: () => number, private readonly onFootfall?: FootfallListener,
    private readonly onLanding?: LandingListener) { ensureHitFlashCurve(); }

  public sync(id: string, config: UnitSpineConfig, x: number, y: number, facing: 1 | -1, moving: boolean, dt: number, visible = true, members = 1): boolean {
    this.pendingRemovals.delete(id);
    let entry = this.entries.get(id);
    if (entry && entry.config.path !== config.path) { this.remove(id); entry = undefined; }
    if (!entry) {
      entry = { config, core: new UnitPresentationCore(config, { x, y }, facing), node: null, revision: -1, facing, loading: false, ready: [], visible, followers: [], members, hit: null, freeze: 0, flashPainted: 0, stepClock: 0, deploy: null, charge: null, drift: null };
      this.entries.set(id, entry);
      if (this.pendingDeploys.delete(id)) entry.deploy = { t: 0 };
    }
    if (!entry.node && !entry.loading) this.load(id, entry);
    entry.visible = visible;
    entry.members = members;
    if (!this.duel?.ids.includes(id)) entry.core.follow({ x, y }, moving, dt);
    return !!entry.node?.isValid;
  }

  /**
   * 戰前預載（PROG-2-10078）：先把這場會用到的兵種骨架資料載好並持有引用，再替每個骨架預建幾個閒置節點放進節點池。
   * 原因：骨架資料（json、圖集、貼圖）第一次用到才 resources.load，騎兵的馬身骨架實測要 2 秒多，騎兵出現時整隊已跑出好幾格；
   * 預載後單位建立時 resources.load 直接命中快取、節點直接從池取，當幀就能顯示。
   * 載不到的素材不在這裡標記失敗（交給實際單位載入時處理後備素材）；整體有逾時保底，不拖住戰場載入畫面。
   * @param prewarmNodes true = 每個骨架預建一整隊的閒置節點（帶頭者＋隊員）；false = 只載資料
   */
  public preload(configs: ReadonlyArray<UnitSpineConfig>, prewarmNodes = true, timeoutMs = 8000): Promise<void> {
    ensureHitFlashMaterial(() => { /* 預熱材質：之後單位載入時不用再等 */ });
    const paths = new Map<string, UnitSpineConfig>();
    for (const config of configs) if (!this.failed.has(config.path) && !this.preloaded.has(config.path)) paths.set(config.path, config);
    const jobs = Array.from(paths.values()).map(config => new Promise<void>(resolve => {
      resources.load(config.path, sp.SkeletonData, (err, data) => {
        if (err || !data) { resolve(); return; }
        data.addRef();
        this.preloaded.set(config.path, data);
        if (prewarmNodes) this.prewarmNodes(config.path, data, 1 + (config.squad?.length ?? 0));
        resolve();
      });
    }));
    return new Promise<void>(resolve => {
      const timer = setTimeout(resolve, timeoutMs);
      void Promise.all(jobs).then(() => { clearTimeout(timer); resolve(); });
    });
  }

  /** 已預載並持有引用的骨架數（測試與除錯用）。 */
  public preloadedCount(): number { return this.preloaded.size; }

  /** 替骨架預建閒置節點放進池（需要疊層父節點；沒有就略過）。已在池內的數量算在內，不重複建。 */
  private prewarmNodes(path: string, data: sp.SkeletonData, count: number): void {
    const parent = this.getParent();
    if (!parent?.isValid || count <= 0) return;
    const want = Math.min(count, SPINE_UNIT_POOL_MAX_PER_PATH) - (this.nodePool.get(path)?.length ?? 0);
    const fresh: Node[] = [];
    for (let i = 0; i < want; i += 1) {
      const node = new Node('SpineUnit_pooled');
      node.layer = this.layer(); node.addComponent(UITransform); parent.addChild(node);
      const skeleton = node.addComponent(sp.Skeleton);
      skeleton.premultipliedAlpha = false; skeleton.skeletonData = data;
      fresh.push(node);
    }
    for (const node of fresh) this.releaseNode(path, node);
  }

  /** 這份素材是否已確定載不起來（缺檔或缺共用動作）；呼叫端據此改用後備素材，不讓單位退回方塊。 */
  public hasFailed(path: string): boolean { return this.failed.has(path); }

  /** 載不起來的素材數（只增不減）；呼叫端用它判斷後備設定快取是否過期（PROG-2-10155）。 */
  public failedCount(): number { return this.failed.size; }

  /**
   * 部署落地演出（PROG-2-9409）：整隊從上方依序落下、落地壓扁回彈，每名士兵落地時通知 onLanding。
   * 疊層還沒建立就先記著，建立時再開始；素材還在載入時時鐘不走，載好才落，玩家才看得到。
   */
  /** 放招蓄力（PROG-2-9410）：durationSec 內慢慢膨脹、越抖越快，時間到自動回原狀。沒有這個單位回 false。 */
  public charge(id: string, durationSec: number): boolean {
    const entry = this.entries.get(id);
    if (!entry?.node?.isValid || !(durationSec > 0)) return false;
    entry.charge = { t: 0, dur: durationSec };
    return true;
  }

  /** 開關漂流姿態（PROG-2-10100）：開著時每幀上下沉浮、左右搖晃；關掉立刻回正。沒有這個單位回 false。 */
  public setDrift(id: string, on: boolean): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;
    if (on && !entry.drift) entry.drift = { t: 0 };
    else if (!on) entry.drift = null;
    return true;
  }

  public deploy(id: string): void {
    const entry = this.entries.get(id);
    if (entry) entry.deploy = { t: 0 };
    else this.pendingDeploys.add(id);
  }

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
      if (entry.hit) {
        // 受擊當格不加時間（frame 0、elapsed 0），之後每格往前；停留期間記下最後一格的時間，退色從這裡起算
        if (entry.hit.frame >= 0) entry.hit.elapsed += dt;
        entry.hit.frame += 1;
        if (entry.hit.frame < getHitFlashCurve().holdFrames) entry.hit.holdEnd = entry.hit.elapsed;
      }
      if (entry.drift) entry.drift.t += Math.max(0, dt);
      if (entry.charge) { entry.charge.t += Math.max(0, dt); if (entry.charge.t >= entry.charge.dur) entry.charge = null; }
      const landingPrev = this.advanceDeploy(entry, dt);
      const frozen = entry.freeze > 0;
      if (frozen) entry.freeze = Math.max(0, entry.freeze - dt);
      if (!controlled?.includes(id)) {
        const state = entry.core.step(frozen ? 0 : dt);
        this.apply(entry, state);
        this.emitFootfalls(id, entry, state, dt);
        if (landingPrev !== null) this.emitLandings(id, entry, state, landingPrev);
      }
    }
    // 畫面越下方（y 越小）越靠近鏡頭，要蓋在上面；隊員各自依落腳點排序，才不會整隊被隔壁格蓋住
    // PROG-2-10155：緩衝重用；排序結果與上一幀相同（節點與順序都沒變）就不碰兄弟索引，每 SORT_RESYNC_FRAMES 幀仍強制對齊一次，防外部動過順序
    const items = this.sortItems;
    let count = 0;
    const put = (node: Node, y: number): void => {
      const item = this.sortPool[count] ?? (this.sortPool[count] = { node, y });
      item.node = node; item.y = y; items[count] = item; count += 1;
    };
    for (const entry of this.entries.values()) {
      if (!entry.node?.isValid) continue;
      const footY = entry.core.footY();
      put(entry.node, footY);
      entry.followers.forEach((node, i) => { if (node.isValid && node.active) put(node, footY + (entry.config.squad?.[i]?.y ?? 0)); });
    }
    items.length = count;
    items.sort((a, b) => b.y - a.y); // 穩定排序：同高度維持先後，避免來回跳
    this.sortFrames += 1;
    const last = this.lastSortedNodes;
    let same = last.length === count && this.sortFrames % SORT_RESYNC_FRAMES !== 0;
    for (let i = 0; same && i < count; i += 1) if (last[i] !== items[i].node) same = false;
    if (!same) {
      // 只在小兵原本占的區段內重排（從目前最低的兄弟索引起排），不搶到 index 0：
      // 壓在最底層的格子 buff 標記、落地揚塵等地面節點要留在小兵底下（PROG-2-9708）
      let base = Number.POSITIVE_INFINITY;
      for (let i = 0; i < count; i += 1) base = Math.min(base, items[i].node.getSiblingIndex());
      if (!Number.isFinite(base)) base = 0;
      for (let i = 0; i < count; i += 1) items[i].node.setSiblingIndex(base + i);
      last.length = count;
      for (let i = 0; i < count; i += 1) last[i] = items[i].node;
    }
    // 新單位建立時會插到 index 0，把地面層擠上來；這裡送回最底（已在定位就不動，平常不產生重排）
    const parent = this.getParent();
    let slot = 0;
    for (const ground of this.groundNodes()) {
      if (!ground?.isValid || ground.parent !== parent) continue;
      if (ground.getSiblingIndex() !== slot) ground.setSiblingIndex(slot);
      slot += 1;
    }
  }

  /** 指定要永遠壓在單位底下的地面層容器（PROG-2-9708） */
  public setGroundNodes(provider: () => ReadonlyArray<Node | null>): void {
    this.groundNodes = provider;
  }

  /** attackStyle 只對 'attack' 有效：依兵種風格播分動作，缺動作時退回通用攻擊動作（PROG-2-9400）。 */
  public play(id: string, action: UnitAction, attackStyle?: AttackStyle): boolean {
    const entry = this.entries.get(id);
    if (!entry?.node?.isValid) return false;
    const runtime = entry.node.getComponent(sp.Skeleton)?.skeletonData?.getRuntimeData();
    const has = (name: string): boolean => !!runtime?.findAnimation(name);
    if (!has(resolveClipName(entry.config.clips[action], has))) return false;
    const clip = action === 'attack' && attackStyle
      ? pickAttackClip(attackStyle, entry.config.clips.attack, has) : undefined;
    if (action !== 'fall' || entry.core.snapshot().action !== 'fall') entry.core.play(action, clip);
    // 倒地時不再抖動閃色，避免和 fall、boom 疊在一起（下一次 apply 會把顏色刷回正常）
    if (action === 'fall') entry.hit = null;
    return true;
  }

  /** 施法：骨架有專屬施法動作（config.castClip，騎乘包的通用 cast）就播它，否則沿用通用攻擊動作（PROG-2-9993）。 */
  public playCast(id: string): boolean {
    const entry = this.entries.get(id);
    const cast = entry?.config.castClip;
    if (entry?.node?.isValid && cast) {
      const runtime = entry.node.getComponent(sp.Skeleton)?.skeletonData?.getRuntimeData();
      if (runtime?.findAnimation(cast.name)) { entry.core.play('attack', cast); return true; }
    }
    return this.play(id, 'attack');
  }

  /**
   * 受擊回饋：閃色 + 左右抖動（PROG-2-9401）。抖動是畫面位置上的暫時偏移，每幀由 apply 疊加在移動位置上，
   * 所以不會打斷移動、也不會把單位拉回舊位置；結束時偏移自然歸零。
   * @param amplitudePx 抖動最大位移（畫面像素），0 表示只閃色不抖
   * @param pushPx 受擊後退距離（畫面像素，往面向的反方向推），0 表示不後退（PROG-2-9412）
   */
  public hit(id: string, amplitudePx: number, flash = true, pushPx = 0): boolean {
    const entry = this.entries.get(id);
    if (!entry?.node?.isValid) return false;
    entry.hit = { elapsed: 0, amplitude: Math.max(0, amplitudePx), flash, push: Math.max(0, pushPx), frame: -1, holdEnd: 0 };
    return true;
  }

  /** 命中頓格（PROG-2-9412）：骨架動畫定格 sec 秒；位置位移（後退、抖動）照常，所以是「動作卡住、身體被打退」。 */
  public hitStop(id: string, sec: number): void {
    const entry = this.entries.get(id);
    if (entry && sec > 0) entry.freeze = Math.max(entry.freeze, sec);
  }
  public exists(id: string): boolean { return this.entries.has(id); }
  /** 這個單位的 Spine 節點是否已載好、畫得出來（PROG-2-9715：主將出陣衝刺要等載好才起跑） */
  public isShown(id: string): boolean { return !!this.entries.get(id)?.node?.isValid; }
  public revive(id: string): void {
    const entry = this.entries.get(id);
    if (entry && !this.duel?.ids.includes(id) && entry.core.snapshot().action === 'fall') entry.core.play('idle');
  }

  /** 回傳是否真的播了交鋒動畫；任一方沒有 Spine 動畫時回 false，呼叫端要自己補演出 */
  /**
   * arenaCenter：有給就到這個點（場邊）對站，左方 a、右方 b；沒給沿用雙方腳點中點（PROG-2-9719 Q1=B）。
   * 演完雙方各自走回出發時的腳點（主將回格子、場邊待命者回待命點）。
   */
  public async playDuel(a: string, b: string, winner: 0 | 1 | null, fallen: boolean, exchanges: readonly DuelExchange[], arenaCenter?: { x: number; y: number } | null): Promise<boolean> {
    if (this.duel) return false;
    const loaded = await Promise.all([this.waitForEntry(a), this.waitForEntry(b)]);
    if (!loaded.every(Boolean) || this.duel) return false;
    const first = this.entries.get(a), second = this.entries.get(b);
    if (!first?.node?.isValid || !second?.node?.isValid) return false;
    const left = first.core.snapshot().foot, right = second.core.snapshot().foot;
    const dx = right.x - left.x, dy = right.y - left.y, distance = Math.hypot(dx, dy);
    const midpoint = arenaCenter ? { x: arenaCenter.x, y: arenaCenter.y } : { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
    // 場邊對站一律左右排開（玩家在左）；沒指定場邊時沿雙方連線方向
    const direction = arenaCenter ? { x: 1, y: 0 } : distance > 0.001 ? { x: dx / distance, y: dy / distance } : { x: 1, y: 0 };
    const gap = arenaCenter ? DUEL_SIDELINE_GAP : Math.min(90, Math.max(40, distance / 4));
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
    this.pendingDeploys.delete(id);
    const entry = this.entries.get(id);
    if (entry) this.finishLoading(entry, false);
    if (entry) {
      // 回收而不銷毀（PROG-2-9706）：release 會強制把閃白、顏色、動作、造型全部還原
      if (entry.node) this.releaseNode(entry.config.path, entry.node);
      entry.followers.forEach(node => this.releaseNode(entry.config.path, node));
      entry.node = null;
      entry.followers = [];
    }
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
    for (const id of Array.from(this.entries.keys())) this.remove(id);
    // 整池銷毀：場景結束後不留任何閒置節點
    for (const nodes of this.nodePool.values()) for (const node of nodes) if (node.isValid) node.destroy();
    this.nodePool.clear();
    for (const data of this.preloaded.values()) data.decRef();
    this.preloaded.clear();
  }

  /** 目前池內閒置節點數（測試與除錯用）；不帶路徑回傳全部。 */
  public pooledCount(path?: string): number {
    if (path !== undefined) return this.nodePool.get(path)?.length ?? 0;
    let total = 0;
    for (const nodes of this.nodePool.values()) total += nodes.length;
    return total;
  }

  /** 把節點還原成「剛建好」的乾淨狀態：閃白強度歸零、顏色全白、動作清空、造型與變換歸位。 */
  private resetNode(node: Node): void {
    const skeleton = node.getComponent(sp.Skeleton);
    if (!skeleton) return;
    // 閃白材質：u_flash 歸零（每個材質實例都寫）；沒有材質時 strength 0 會把相乘色刷回白
    this.setSkeletonFlash(skeleton, 0);
    skeleton.color = Color.WHITE;
    skeleton.timeScale = 1;
    skeleton.clearTracks();
    skeleton.setToSetupPose();
    skeleton.setSkin('default');
    node.setScale(1, 1, 1);
    setTilt(node, 0); // 回收的節點不帶著漂流傾斜
    node.setPosition(0, 0, 0);
  }

  private releaseNode(path: string, node: Node): void {
    if (!node.isValid) return;
    const pool = this.nodePool.get(path) ?? [];
    if (pool.length >= SPINE_UNIT_POOL_MAX_PER_PATH || !node.getComponent(sp.Skeleton)) { node.destroy(); return; }
    this.resetNode(node);
    node.active = false;
    pool.push(node);
    this.nodePool.set(path, pool);
  }

  /** 從池裡取一個同路徑的乾淨節點；池空、節點已失效（父節點被銷毀）就丟掉再試，全沒有回 null 由呼叫端新建。 */
  private acquireNode(path: string, parent: Node, name: string, data: sp.SkeletonData): Node | null {
    const pool = this.nodePool.get(path);
    while (pool && pool.length > 0) {
      const node = pool.pop() as Node;
      const skeleton = node.isValid ? node.getComponent(sp.Skeleton) : null;
      if (!skeleton) continue;
      if (node.parent !== parent) parent.addChild(node);
      this.resetNode(node); // 取出時再保險重設一次，不信任回收時的狀態
      node.name = name;
      node.layer = this.layer();
      node.active = true;
      node.setSiblingIndex(0);
      if (skeleton.skeletonData !== data) skeleton.skeletonData = data;
      return node;
    }
    return null;
  }

  private createNode(path: string, parent: Node, name: string, data: sp.SkeletonData): Node {
    const pooled = this.acquireNode(path, parent, name, data);
    if (pooled) return pooled;
    const node = new Node(name);
    node.layer = this.layer(); node.addComponent(UITransform); parent.addChild(node); node.setSiblingIndex(0);
    const skeleton = node.addComponent(sp.Skeleton);
    skeleton.premultipliedAlpha = false; skeleton.skeletonData = data;
    return node;
  }

  private apply(entry: Entry, state: UnitPresentationState): void {
    const node = entry.node;
    const skeleton = skeletonOf(node);
    if (!node?.isValid || !skeleton) return;
    node.active = entry.visible || !!this.duel?.ids.some(id => this.entries.get(id) === entry);
    const offset = entry.config.footOffset;
    // 受擊回饋：抖動位移與閃色強度（結束後歸零並清掉狀態）
    const hit = entry.hit;
    const chargePose = entry.charge ? sampleChargePose(entry.charge.t, entry.charge.dur) : { scale: 1, shakeX: 0 };
    const shakeX = (hit ? sampleHitShake(hit.elapsed, hit.amplitude) : 0) + chargePose.shakeX;
    const flash = hit?.flash ? hitFlashStrength(hit.frame, hit.elapsed - hit.holdEnd) : 0;
    // 受擊後退：往面向的反方向推（單位都面向敵方），隊員跟著帶頭者位置走，所以整隊一起退
    const recoilX = hit && hit.push > 0 ? -state.facing * hit.push * sampleHitRecoil(hit.elapsed) : 0;
    if (hit && hit.elapsed >= hitFeedbackTotalSec()) entry.hit = null;
    const flashChanged = this.paintFlash(skeleton, entry, flash);
    // 走路起伏：落腳最低、兩步中間最高，避免整隊像在地上滑
    const walking = state.action === 'move';
    const gait = entry.config;
    const leaderBob = walking ? stepBobOffset(entry.stepClock, 0, gait.bobPx, gait.footfallIntervalSec) : 0;
    // 部署落地：往上的位移與壓扁縮放（腳點為骨架原點，縮放不會讓腳離地）
    const landing = this.landingSample(entry, 0);
    const drift = entry.drift ? floodDriftSample(entry.drift.t) : null;
    node.setPosition(state.foot.x - offset.x * entry.config.displayScale * state.facing + shakeX + recoilX,
      state.foot.y - offset.y * entry.config.displayScale + leaderBob + landing.dy + (drift?.dy ?? 0), 0);
    const tilt = drift?.angle ?? 0;
    setTilt(node, tilt);
    node.setScale(entry.config.displayScale * state.facing * landing.scaleX * chargePose.scale, entry.config.displayScale * landing.scaleY * chargePose.scale, 1);
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
    const speed = entry.freeze > 0 ? 0 : state.animationSpeed;
    skeleton.timeScale = speed;
    // 隊員跟著帶頭者做同一個動作，只差站位與時間差，看起來才不像複製貼上
    entry.followers.forEach((follower, i) => {
      const slot = entry.config.squad?.[i];
      const followerSkel = skeletonOf(follower);
      if (!slot || !follower.isValid || !followerSkel) return;
      const memberLanding = this.landingSample(entry, i + 1);
      follower.active = node.active && i < entry.members - 1 && memberLanding.visible;
      const pos = node.position;
      // 站位以「面向的後方」為準，所以 x 要跟著朝向翻面
      // pos 已含抖動偏移與帶頭者起伏；起伏換成隊員自己相位的，才是錯開的集體走路
      const followerBob = walking ? stepBobOffset(entry.stepClock, slot.phase * state.clip.duration, gait.bobPx, gait.footfallIntervalSec) - leaderBob : 0;
      // 漂流：隊員各自錯開相位，沉浮不同步才像一群人在水裡掙扎；pos 已含帶頭者的沉浮，這裡換成自己的
      const memberDrift = entry.drift ? floodDriftSample(entry.drift.t, slot.phase + 0.25 * (i + 1)) : null;
      follower.setPosition(pos.x - slot.x * state.facing, pos.y + slot.y + followerBob - landing.dy + memberLanding.dy + (memberDrift ? memberDrift.dy - (drift?.dy ?? 0) : 0), 0);
      const memberTilt = memberDrift?.angle ?? 0;
      setTilt(follower, memberTilt);
      if (flashChanged) this.setSkeletonFlash(followerSkel, flash, baseColorOf(entry.config));
      follower.setScale(entry.config.displayScale * state.facing * memberLanding.scaleX, entry.config.displayScale * memberLanding.scaleY, 1);
      if (skinChanged) followerSkel.setSkin(skin);
      if (clipChanged && hasClip) {
        // PROG-2-9412：帶頭者一次性動作播完回待機時，隊員因為晚開始還沒播完；接在後面播待機，不要硬切斷
        const current = followerSkel.getCurrent(0);
        if (state.action === 'idle' && current?.animation && !current.loop && current.trackTime < current.animationEnd) {
          followerSkel.addAnimation(0, name, state.clip.loop, 0);
          followerSkel.timeScale = speed;
          return;
        }
        const track = followerSkel.setAnimation(0, name, state.clip.loop);
        if (track) {
          // 循環動作錯開起始時間；一次性動作（攻擊、受擊、倒地）改用延後開始，才會依序出手
          if (state.clip.loop) track.trackTime = slot.phase * state.clip.duration;
          else track.delay = slot.phase * SQUAD_ONE_SHOT_STAGGER_SEC;
        }
      }
      followerSkel.timeScale = speed;
    });
  }

  /** 第 member 名士兵（0 = 帶頭者）目前的落地姿態；沒有落地演出時是正常站姿。 */
  private landingSample(entry: Entry, member: number): DeployLandingSample {
    return entry.deploy ? sampleDeployLanding(entry.deploy.t - memberDeployDelay(member)) : sampleDeployLanding(Infinity);
  }

  /** 推進落地時鐘；回傳推進前的時間（沒有落地演出或素材未載好時回 null）。整隊落完就清掉。 */
  private advanceDeploy(entry: Entry, dt: number): number | null {
    const deploy = entry.deploy;
    if (!deploy || !entry.node?.isValid) return null;
    const prev = deploy.t;
    deploy.t += Math.max(0, dt);
    if (deploy.t >= deployLandingTotalSec(Math.max(1, Math.min(entry.members, entry.followers.length + 1)))) entry.deploy = null;
    return prev;
  }

  /** 每名士兵跨過落地瞬間時通知一次（揚塵、落地聲由呼叫端決定）；藏起來的隊員不通知。 */
  private emitLandings(id: string, entry: Entry, state: UnitPresentationState, prev: number): void {
    if (!this.onLanding || !entry.visible) return;
    const now = entry.deploy ? entry.deploy.t : Infinity;
    const { x, y } = state.foot;
    if (landingCrossed(prev, now)) this.onLanding(id, x, y, true);
    entry.followers.forEach((follower, i) => {
      const slot = entry.config.squad?.[i];
      if (!slot || i >= entry.members - 1) return;
      const delay = memberDeployDelay(i + 1);
      if (landingCrossed(prev - delay, now - delay)) this.onLanding?.(id, x - slot.x * state.facing, y + slot.y, false);
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
    const interval = entry.config.footfallIntervalSec;
    if (dustBeatsFor(prev, state.animationSpeed, dt, 0, interval) > 0) this.onFootfall(id, x, y, state.facing, true);
    entry.followers.forEach((follower, i) => {
      const slot = entry.config.squad?.[i];
      if (!slot || !follower.isValid || !follower.active) return;
      if (dustBeatsFor(prev, state.animationSpeed, dt, slot.phase * state.clip.duration, interval) > 0) {
        this.onFootfall?.(id, x - slot.x * state.facing, y + slot.y, state.facing, false);
      }
    });
  }

  private readonly flashColor = new Color();
  private readonly flashVec = new Vec4();

  /** 把閃色強度畫到帶頭者骨架上；強度沒變就不動。回傳是否有變，讓 apply 的隊員迴圈跟著畫。 */
  private paintFlash(skeleton: sp.Skeleton, entry: Entry, strength: number): boolean {
    if (strength === entry.flashPainted) return false;
    this.setSkeletonFlash(skeleton, strength, baseColorOf(entry.config));
    entry.flashPainted = strength;
    return true;
  }

  private setSkeletonFlash(skeleton: sp.Skeleton, strength: number, base: Color = Color.WHITE): void {
    // PROG-2-9412：閃白材質已套上時，直接改 shader 的閃白強度（真正的白光）；
    // 每具骨架依混合模式各有自己的材質實例，逐一寫入。材質還沒載好才退回下面的相乘暖色。
    if (hitFlashMaterial && skeleton.customMaterial === hitFlashMaterial) {
      this.flashVec.set(strength, 0, 0, 0);
      const cache = (skeleton as unknown as { _materialCache?: Record<string, { setProperty(name: string, value: Vec4): void }> })._materialCache;
      if (cache) for (const key of Object.keys(cache)) cache[key].setProperty('u_flash', this.flashVec);
      return;
    }
    const t = HIT_FLASH_TINT;
    this.flashColor.set(base.r * (255 - (255 - t.r) * strength) / 255, base.g * (255 - (255 - t.g) * strength) / 255,
      base.b * (255 - (255 - t.b) * strength) / 255, 255);
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
      const node = this.createNode(entry.config.path, parent, `SpineUnit_${id}`, data);
      entry.node = node;
      // 隊員直接沿用同一份 data（Cocos 對同一路徑只留一份骨架與貼圖），所以多兩個人只多節點與動畫狀態
      for (let i = 0; i < (entry.config.squad?.length ?? 0); i += 1) {
        entry.followers.push(this.createNode(entry.config.path, parent, `SpineUnit_${id}_m${i + 1}`, data));
      }
      // 基礎染色（敵方騎兵紅色調）：池內節點取出時已被重設成白，這裡改回本單位的基礎色
      for (const n of [node, ...entry.followers]) {
        const skel = n.isValid ? n.getComponent(sp.Skeleton) : null;
        if (skel) skel.color = baseColorOf(entry.config);
      }
      // 受擊閃白材質：載好就套到帶頭者與隊員；閃色強度歸零重畫，避免先前寫過的相乘暖色殘留
      ensureHitFlashMaterial(() => {
        // 單位已移除（節點可能已回收給別的單位）就不要再碰，否則會誤改別人的顏色
        if (this.entries.get(id) !== entry) return;
        for (const n of [node, ...entry.followers]) {
          const skel = n.isValid ? n.getComponent(sp.Skeleton) : null;
          if (!skel) continue;
          if (skel.customMaterial !== hitFlashMaterial) skel.customMaterial = hitFlashMaterial; // 池內重用的節點已套過，不重設以免重建材質實例
          skel.color = baseColorOf(entry.config);
        }
        entry.flashPainted = -1;
      });
      this.apply(entry, entry.core.snapshot());
      this.finishLoading(entry, true);
    });
  }
}
