// @spec-source → docs/agent-briefs/tasks/PROG/PROG-2-9411.md（buff 格統一）
/**
 * TileBuffMarkers — 棋盤 buff 格的標記與拾取飛入（PROG-2-9411，View 層）。
 *
 * 每個 buff 格：地面一圈靜態淡光圈（增益金／翠、減益紫，層數越高圈越多越亮；PROG-2-9731）加一個小圓章（攻／命），
 * 旁邊寫倍數（×3、÷5）；稀有格圓章外再加一圈金環。畫面只在種類或倍數改變時重畫，平常完全不動、不逐幀重畫。
 * 吃到時圖示從格子飛到單位頭頂，抵達時由呼叫端讓頭頂圖示列彈出；部隊腳下的 2.5 秒大特效由 UnitBuffPickupVfx 負責。
 *
 * 記憶體：格子標記與飛行圖示都放進池子重用，buff 格消失只是隱藏，不每回合 new／destroy。
 * 動畫進度由 update(dt) 推進，跟著戰場時間（x2 加速、QA 慢動作、暫停）一起走。
 *
 * Unity 對照：一個掛在 UI Overlay 上的 Marker Pool，外加一個「飛向 HUD」的小型 Tween 系統。
 */
import { Color, Graphics, Label, Node, UITransform, Vec3, isValid } from 'cc';
import {
  TILE_BUFF_PICKUP,
  sampleTileBuffPickup,
  tileBuffBadgeOf,
  type TileBuffBadge,
  type TileBuffSource,
} from '../shared/TileBuffBadge';
import { drawStatusIconDisc, statusIconTextColor } from './UnitStatusIconBar';
import type { FloatAvoidRect } from '../../core/systems/FloatTextStyle';
import { tileBuffFactorFromText } from '../shared/TileBuffVfxMath';
import { drawTileStatic, getTileBuffVfxConfig, tileBuffVfxGlyphColor } from './TileBuffVfx';

/** 圖示比頭頂的（36）大一點：棋盤上是要讓玩家「找得到」的目標 */
const ICON_RADIUS = 22;
const RARE_RING_RADIUS = 28;
const PLATE_RX = 60;
const PLATE_RY = 22;
const AMOUNT_GAP = 6;
const FLY_POOL_MAX = 4;
/** 倍數字（×3、÷5）每個字約佔的寬度（字級 30 粗體），給跳字避讓估算用 */
const AMOUNT_EST_WIDTH_PER_CHAR = 19;

const AMOUNT_BUFF = new Color(255, 236, 150, 255);
const AMOUNT_DEBUFF = new Color(255, 160, 200, 255);
const AMOUNT_OUTLINE = new Color(30, 18, 8, 255);

/** 格子位置：lane,depth */
export interface TileBuffCell { lane: number; depth: number }

interface MarkerView {
  root: Node;
  /** 地面光圈＋圓章底（一個 Graphics 畫完） */
  plate: Graphics;
  icon: Node;
  glyph: Label;
  amount: Label;
  lane: number;
  depth: number;
  /** 要顯示的內容；設定檔還沒載入時先留著，載入後在 update 補畫 */
  badge: TileBuffBadge | null;
  /** 目前畫的內容；相同就不重畫 */
  drawnKey: string;
}

interface FlyView {
  node: Node;
  graphics: Graphics;
  glyph: Label;
  from: Vec3;
  getTarget: () => Vec3 | null;
  elapsed: number;
  onArrive: (() => void) | null;
  busy: boolean;
}

export class TileBuffMarkers {
  private readonly markers = new Map<string, MarkerView>();
  private readonly spare: MarkerView[] = [];
  private readonly flies: FlyView[] = [];
  private readonly flyPos = new Vec3();
  /** 給跳字避讓用的矩形；物件重用，不每次配置（PROG-2-9415） */
  private readonly avoidRects: FloatAvoidRect[] = [];
  private readonly avoidPool: FloatAvoidRect[] = [];
  /** 所有格子標記的地面層容器：固定在根節點最底，單位疊層排序後會送回最底（PROG-2-9708） */
  private groundLayer: Node | null = null;

  /**
   * @param getRoot 標記掛載的 UI 根節點（單位名牌同一層）
   * @param place 把節點放到某格地面的 UI 座標（呼叫端負責 3D → UI 投影）
   */
  constructor(
    private readonly getRoot: () => Node | null,
    private readonly place: (cell: TileBuffCell, node: Node) => void,
  ) {}

  /** 依目前場上的 buff 格建立／更新／隱藏標記 */
  public sync(buffs: Iterable<TileBuffSource & TileBuffCell & { text?: string }>): void {
    const root = this.getRoot();
    if (!root || !isValid(root)) return;
    const active = new Set<string>();
    for (const buff of buffs) {
      const key = `${buff.lane},${buff.depth}`;
      active.add(key);
      let view = this.markers.get(key);
      if (!view) {
        view = this.spare.pop() ?? this.createMarker(root);
        view.lane = buff.lane;
        view.depth = buff.depth;
        view.drawnKey = '';
        view.badge = null;
        view.root.active = true;
        this.markers.set(key, view);
        this.place(view, view.root);
      }
      this.draw(view, tileBuffBadgeOf(buff));
    }
    this.markers.forEach((view, key) => {
      if (active.has(key)) return;
      view.root.active = false;
      this.markers.delete(key);
      this.spare.push(view);
    });
  }

  /** 某格標記目前圖示的 UI 位置（拾取飛入的起點）；那格沒有標記時回傳 null */
  public iconPositionOf(cell: TileBuffCell, out: Vec3): Vec3 | null {
    const view = this.markers.get(`${cell.lane},${cell.depth}`);
    if (!view || !view.root.active) return null;
    const p = view.root.position;
    return out.set(p.x, p.y + view.icon.position.y, 0);
  }

  /**
   * 目前每個標記「圖示＋倍數」所佔的矩形（UI 座標，與標記同一層），給跳字避開用（PROG-2-9415）。
   * 回傳的陣列與其中物件都會被下一次呼叫覆寫，呼叫端不要保存。
   */
  public avoidRectsForFloatText(): readonly FloatAvoidRect[] {
    const out = this.avoidRects;
    out.length = 0;
    this.markers.forEach(view => {
      if (!view.root.active) return;
      const p = view.root.position;
      const iconY = p.y + view.icon.position.y;
      const amountW = view.amount.string ? AMOUNT_EST_WIDTH_PER_CHAR * view.amount.string.length : 0;
      const left = p.x - RARE_RING_RADIUS;
      const right = p.x + (RARE_RING_RADIUS + (amountW > 0 ? AMOUNT_GAP + amountW : 0));
      const rect = this.avoidPool[out.length] ?? (this.avoidPool[out.length] = { x: 0, y: 0, halfW: 0, halfH: 0 });
      rect.x = (left + right) / 2;
      rect.y = iconY;
      rect.halfW = (right - left) / 2;
      rect.halfH = RARE_RING_RADIUS;
      out.push(rect);
    });
    return out;
  }

  /**
   * 拾取：在 from 放一個同款圖示，沿弧線飛到 getTarget()（每幀重取，單位還在走也追得到），抵達時呼叫 onArrive。
   * 同時飛太多就直接呼叫 onArrive，不讓低階手機負擔。
   */
  public flyPickup(from: Vec3, badge: TileBuffBadge, getTarget: () => Vec3 | null, onArrive: () => void): void {
    const root = this.getRoot();
    const fly = root && isValid(root) ? this.acquireFly(root) : null;
    if (!fly) { onArrive(); return; }
    fly.from.set(from);
    fly.getTarget = getTarget;
    fly.elapsed = 0;
    fly.onArrive = onArrive;
    fly.graphics.clear();
    drawStatusIconDisc(fly.graphics, ICON_RADIUS, badge.isDebuff);
    fly.glyph.string = badge.glyph;
    fly.glyph.color = statusIconTextColor(badge.isDebuff);
    fly.node.setPosition(from);
    fly.node.setScale(1, 1, 1);
    fly.node.active = true;
    fly.node.setSiblingIndex(fly.node.parent ? fly.node.parent.children.length - 1 : 0);
  }

  /** 每幀：跟著格子重新投影、補畫還沒畫出來的標記、推進飛行圖示（標記本身不逐幀重畫） */
  public update(dt: number): void {
    const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
    this.markers.forEach(view => {
      this.place(view, view.root);
      if (view.drawnKey === '' && view.badge) this.render(view, view.badge);
    });
    for (const fly of this.flies) {
      if (!fly.busy) continue;
      fly.elapsed += step;
      const k = fly.elapsed / TILE_BUFF_PICKUP.flySec;
      const target = fly.getTarget() ?? fly.from;
      const p = sampleTileBuffPickup(k, fly.from, target);
      fly.node.setPosition(this.flyPos.set(p.x, p.y, 0));
      fly.node.setScale(p.scale, p.scale, 1);
      if (k >= 1) {
        fly.busy = false;
        fly.node.active = false;
        const done = fly.onArrive;
        fly.onArrive = null;
        done?.();
      }
    }
  }

  /** 換場／重開戰鬥：全部收起來（節點保留重用） */
  public clear(): void {
    this.markers.forEach(view => { view.root.active = false; this.spare.push(view); });
    this.markers.clear();
    for (const fly of this.flies) {
      fly.busy = false;
      fly.onArrive = null;
      if (isValid(fly.node)) fly.node.active = false;
    }
  }

  private draw(view: MarkerView, badge: TileBuffBadge): void {
    view.badge = badge;
    this.render(view, badge);
  }

  /** 內容（種類、倍數、稀有）沒變就不重畫；設定檔還沒載入就等下一幀 */
  private render(view: MarkerView, badge: TileBuffBadge): void {
    const cfg = getTileBuffVfxConfig();
    if (!cfg) return;
    const key = `${badge.kind}|${badge.amountText}|${badge.rare ? 1 : 0}`;
    if (view.drawnKey === key) return;
    view.drawnKey = key;
    const kind = badge.kind.startsWith('attack') ? 'attack' : 'hp';
    const cy = drawTileStatic(view.plate, cfg, kind, badge.isDebuff, badge.rare, tileBuffFactorFromText(badge.amountText));
    view.icon.setPosition(0, cy, 0);
    view.glyph.string = badge.glyph;
    view.glyph.color = tileBuffVfxGlyphColor(cfg, kind, badge.isDebuff);
    view.amount.node.setPosition(cfg.icon.radius + AMOUNT_GAP + (badge.rare ? 5 : 0), 0, 0);
    view.amount.string = badge.amountText;
    view.amount.color = badge.isDebuff ? AMOUNT_DEBUFF : AMOUNT_BUFF;
  }

  /** 地面層容器；給單位疊層排序時固定壓在單位底下（PROG-2-9708） */
  public groundNode(): Node | null {
    return this.groundLayer && isValid(this.groundLayer) ? this.groundLayer : null;
  }

  private ensureGround(root: Node): Node {
    if (this.groundLayer && isValid(this.groundLayer) && this.groundLayer.parent === root) return this.groundLayer;
    const ground = new Node('TileBuffGround');
    ground.layer = root.layer;
    ground.addComponent(UITransform);
    root.addChild(ground);
    ground.setSiblingIndex(0); // 壓在單位、名牌與跳字之下；座標系與根節點相同（原點、無縮放）
    this.groundLayer = ground;
    return ground;
  }

  private createMarker(root: Node): MarkerView {
    const node = new Node('TileBuffMarker');
    node.layer = root.layer;
    node.addComponent(UITransform).setContentSize(PLATE_RX * 2 + 20, PLATE_RY * 2 + 80);
    this.ensureGround(root).addChild(node);

    const plateNode = new Node('Plate');
    plateNode.layer = root.layer;
    plateNode.addComponent(UITransform).setContentSize(PLATE_RX * 2, PLATE_RY * 2);
    const plate = plateNode.addComponent(Graphics);
    node.addChild(plateNode);

    const icon = new Node('Icon');
    icon.layer = root.layer;
    icon.addComponent(UITransform).setContentSize(RARE_RING_RADIUS * 2, RARE_RING_RADIUS * 2);
    node.addChild(icon);
    const glyph = this.makeLabel(icon, 'Glyph', 36, 20, Label.HorizontalAlign.CENTER);

    const amountNode = new Node('Amount');
    amountNode.layer = root.layer;
    const amountTf = amountNode.addComponent(UITransform);
    amountTf.setContentSize(70, 34);
    amountTf.setAnchorPoint(0, 0.5);
    icon.addChild(amountNode);
    const amount = amountNode.addComponent(Label);
    amount.fontSize = 30;
    amount.lineHeight = 34;
    amount.isBold = true;
    amount.horizontalAlign = Label.HorizontalAlign.LEFT;
    amount.verticalAlign = Label.VerticalAlign.CENTER;
    amount.enableOutline = true;
    amount.outlineColor = AMOUNT_OUTLINE;
    amount.outlineWidth = 3;

    return { root: node, plate, icon, glyph, amount, lane: 0, depth: 0, badge: null, drawnKey: '' };
  }

  private acquireFly(root: Node): FlyView | null {
    const free = this.flies.find(f => !f.busy && isValid(f.node));
    if (free) { free.busy = true; return free; }
    if (this.flies.length >= FLY_POOL_MAX) return null;
    const node = new Node('TileBuffPickup');
    node.layer = root.layer;
    node.addComponent(UITransform).setContentSize(ICON_RADIUS * 2, ICON_RADIUS * 2);
    const graphics = node.addComponent(Graphics);
    root.addChild(node);
    const glyph = this.makeLabel(node, 'Glyph', ICON_RADIUS * 2, 28, Label.HorizontalAlign.CENTER);
    const fly: FlyView = { node, graphics, glyph, from: new Vec3(), getTarget: () => null, elapsed: 0, onArrive: null, busy: true };
    this.flies.push(fly);
    return fly;
  }

  private makeLabel(parent: Node, name: string, size: number, fontSize: number, align: number): Label {
    const node = new Node(name);
    node.layer = parent.layer;
    node.addComponent(UITransform).setContentSize(size, size);
    parent.addChild(node);
    const label = node.addComponent(Label);
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 2;
    label.isBold = true;
    label.horizontalAlign = align;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.NONE;
    return label;
  }
}
