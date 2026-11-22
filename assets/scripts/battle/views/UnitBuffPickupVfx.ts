// @spec-source → docs/agent-briefs/tasks/PROG/PROG-2-9734.md（buff 格靜態光圈＋部隊吃到 buff 腳下特效）
/**
 * UnitBuffPickupVfx — 部隊吃到 buff 格的當下，在部隊腳下播一個大特效，循環 2.5 秒後淡出（View 層）。
 *
 * - 「吃到」的事件：BattleScene 的 TileBuffConsumed → BattleUIBridge._onTileBuffConsumed → UnitRenderer.playTileBuffPickup，
 *   在格子被吃掉的那一刻呼叫 play()；一個部隊一份（不是每個小兵各播），同一部隊連續吃到只重啟不疊加。
 * - 每份特效 2 個 Graphics 節點：地面層（放進格子地面容器，壓在單位下）與火星層（放在 UI 根最上，單位上方看得到）。
 * - 節點池：最多 poolMax 份，滿了回收播最久的；到期隱藏並留著重用，不 new／destroy，不新增貼圖。
 * - 每幀重畫只發生在特效播放中；沒有特效時 update 幾乎不花時間。
 *
 * Unity 對照：一個 ParticleSystem 池＋「跟隨目標」的 Follow 元件；PickupSlotTable 是誰在用哪一個的登記簿。
 */
import { Graphics, Node, UITransform, isValid } from 'cc';
import { PickupSlotTable, tileBuffTierIndex, type PickupSlot } from '../shared/TileBuffVfxMath';
import { drawPickupFrame, getTileBuffVfxConfig, type TileBuffVfxKind } from './TileBuffVfx';

interface PickupView {
  ground: Node;
  groundG: Graphics;
  spark: Node;
  sparkG: Graphics;
  kind: TileBuffVfxKind;
  isDebuff: boolean;
  /** 層級（stackTiers 的索引）：由吃到的倍率決定，×2／×3／×5 分三級 */
  tierIndex: number;
  getFoot: () => { x: number; y: number } | null;
  lastX: number;
  lastY: number;
}

export class UnitBuffPickupVfx {
  private table: PickupSlotTable | null = null;
  private readonly views: (PickupView | undefined)[] = [];
  private readonly expiredBuf: PickupSlot[] = [];

  /**
   * @param getRoot UI 根節點（火星層放這裡）
   * @param getGroundParent 格子地面容器（地面層放這裡，沒有就退回根節點）
   * @param getLayer 節點 layer
   */
  constructor(
    private readonly getRoot: () => Node | null,
    private readonly getGroundParent: () => Node | null,
    private readonly getLayer: () => number,
  ) {
    // QA 讀取點：累計開始／到期回收次數與目前播放中的份數
    (globalThis as { __buffPickupVfxStats?: () => unknown }).__buffPickupVfxStats = () => this.stats();
  }

  public stats(): { started: number; expired: number; active: number } {
    const t = this.table;
    return { started: t?.started ?? 0, expired: t?.expired ?? 0, active: t?.activeCount() ?? 0 };
  }

  /**
   * 吃到 buff 當下呼叫。設定檔還沒讀到時略過（戰鬥一開始就會載入，實務上不會發生）
   * @param factor 倍數（×3、÷5 的 3、5）；依 stackTiers 的 minFactor 選層級
   */
  public play(unitKey: string, getFoot: () => { x: number; y: number } | null, kind: TileBuffVfxKind, isDebuff: boolean, factor: number): void {
    const cfg = getTileBuffVfxConfig();
    const root = this.getRoot();
    if (!cfg || !root || !isValid(root)) return;
    if (!this.table) this.table = new PickupSlotTable(cfg.pickup.poolMax, cfg.pickup.durationSec);
    const slot = this.table.start(unitKey);
    const view = this.views[slot.index] ?? (this.views[slot.index] = this.createView(root));
    view.kind = kind;
    view.isDebuff = isDebuff;
    view.tierIndex = tileBuffTierIndex(cfg.stackTiers, factor);
    view.getFoot = getFoot;
    const foot = getFoot();
    if (foot) { view.lastX = foot.x; view.lastY = foot.y; }
    const groundParent = this.getGroundParent() ?? root;
    if (view.ground.parent !== groundParent) groundParent.addChild(view.ground);
    if (view.spark.parent !== root) root.addChild(view.spark);
    view.ground.setPosition(view.lastX, view.lastY, 0);
    view.spark.setPosition(view.lastX, view.lastY, 0);
    view.ground.active = true;
    view.spark.active = true;
    view.spark.setSiblingIndex(view.spark.parent ? view.spark.parent.children.length - 1 : 0);
    drawPickupFrame(view.groundG, view.sparkG, cfg, kind, isDebuff, view.tierIndex, 0);
  }

  /** 每幀：跟著部隊腳下移動並重畫；到期的隱藏回收 */
  public update(dt: number): void {
    const table = this.table;
    if (!table || table.activeCount() === 0) return;
    const cfg = getTileBuffVfxConfig();
    if (!cfg) return;
    const expired = table.step(dt, this.expiredBuf);
    for (const slot of table.slots) {
      const view = this.views[slot.index];
      if (!slot.busy || !view) continue;
      const foot = view.getFoot();
      if (foot) { view.lastX = foot.x; view.lastY = foot.y; }
      view.ground.setPosition(view.lastX, view.lastY, 0);
      view.spark.setPosition(view.lastX, view.lastY, 0);
      drawPickupFrame(view.groundG, view.sparkG, cfg, view.kind, view.isDebuff, view.tierIndex, slot.elapsed);
    }
    for (const slot of expired) this.hide(this.views[slot.index]);
  }

  /** 換場／重開戰鬥：全部收起來（節點保留重用） */
  public clear(): void {
    this.table?.releaseAll();
    for (const view of this.views) this.hide(view);
  }

  private hide(view: PickupView | undefined): void {
    if (!view) return;
    view.getFoot = () => null;
    if (isValid(view.ground)) { view.groundG.clear(); view.ground.active = false; }
    if (isValid(view.spark)) { view.sparkG.clear(); view.spark.active = false; }
  }

  private createView(root: Node): PickupView {
    const layer = this.getLayer();
    const make = (name: string, parent: Node): { node: Node; g: Graphics } => {
      const node = new Node(name);
      node.layer = layer;
      node.addComponent(UITransform).setContentSize(160, 60);
      const g = node.addComponent(Graphics);
      parent.addChild(node);
      return { node, g };
    };
    const ground = make('BuffPickupGround', this.getGroundParent() ?? root);
    const spark = make('BuffPickupSparks', root);
    return { ground: ground.node, groundG: ground.g, spark: spark.node, sparkG: spark.g, kind: 'attack', isDebuff: false, tierIndex: 0, getFoot: () => null, lastX: 0, lastY: 0 };
  }
}
