// @spec-source → docs/agent-briefs/tasks/PROG/PROG-2-9411.md（buff 格統一）
/**
 * TileBuffMarkers — 棋盤 buff 格的標記與拾取飛入（PROG-2-9411，View 層）。
 *
 * 每個 buff 格：地面一塊淡色光板（增益金、減益紫）＋上方一個與頭頂狀態圖示同款的圓底一字（攻／命），
 * 旁邊寫倍數（×3、÷5）；稀有格圖示外再加一圈金環。圖示慢慢上下浮、光板跟著呼吸。
 * 吃到時圖示從格子飛到單位頭頂，抵達時由呼叫端讓頭頂圖示列彈出。
 *
 * 記憶體：格子標記與飛行圖示都放進池子重用，buff 格消失只是隱藏，不每回合 new／destroy。
 * 動畫進度由 update(dt) 推進，跟著戰場時間（x2 加速、QA 慢動作、暫停）一起走。
 *
 * Unity 對照：一個掛在 UI Overlay 上的 Marker Pool，外加一個「飛向 HUD」的小型 Tween 系統。
 */
import { Color, Graphics, Label, Node, UIOpacity, UITransform, Vec3, isValid } from 'cc';
import {
  TILE_BUFF_PICKUP,
  sampleTileBuffIdle,
  sampleTileBuffPickup,
  tileBuffBadgeOf,
  type TileBuffBadge,
  type TileBuffSource,
} from '../shared/TileBuffBadge';
import { drawStatusIconDisc, statusIconTextColor } from './UnitStatusIconBar';

/** 圖示比頭頂的（36）大一點：棋盤上是要讓玩家「找得到」的目標 */
const ICON_RADIUS = 22;
const ICON_Y = 38;
const RARE_RING_RADIUS = 28;
const PLATE_RX = 60;
const PLATE_RY = 22;
const AMOUNT_GAP = 6;
const FLY_POOL_MAX = 4;

const PLATE_BUFF = new Color(255, 214, 90, 255);
const PLATE_DEBUFF = new Color(176, 80, 230, 255);
const RARE_RING = new Color(255, 225, 110, 255);
const AMOUNT_BUFF = new Color(255, 236, 150, 255);
const AMOUNT_DEBUFF = new Color(255, 160, 200, 255);
const AMOUNT_OUTLINE = new Color(30, 18, 8, 255);

/** 格子位置：lane,depth */
export interface TileBuffCell { lane: number; depth: number }

interface MarkerView {
  root: Node;
  plate: Graphics;
  plateOpacity: UIOpacity;
  icon: Node;
  iconGraphics: Graphics;
  glyph: Label;
  amount: Label;
  lane: number;
  depth: number;
  rare: boolean;
  /** 目前畫的內容；相同就不重畫 */
  drawnKey: string;
  /** 每格錯開相位，避免整片同步浮動 */
  phase: number;
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
  private time = 0;
  private readonly flyPos = new Vec3();

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
        view.phase = ((buff.lane * 7 + buff.depth * 3) % 10) / 10;
        view.drawnKey = '';
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

  /** 每幀：跟著格子重新投影、播放待機浮動、推進飛行圖示 */
  public update(dt: number): void {
    const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
    this.time += step;
    this.markers.forEach(view => {
      this.place(view, view.root);
      const idle = sampleTileBuffIdle(this.time + view.phase * 1.4, view.rare);
      view.icon.setPosition(0, ICON_Y + idle.dy, 0);
      view.icon.setScale(idle.scale, idle.scale, 1);
      view.plateOpacity.opacity = idle.plateAlpha;
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
    const key = `${badge.kind}|${badge.amountText}|${badge.rare ? 1 : 0}`;
    if (view.drawnKey === key) return;
    view.drawnKey = key;
    view.rare = badge.rare;

    const tone = badge.isDebuff ? PLATE_DEBUFF : PLATE_BUFF;
    const plate = view.plate;
    plate.clear();
    plate.fillColor = new Color(tone.r, tone.g, tone.b, 110);
    plate.ellipse(0, 0, PLATE_RX, PLATE_RY);
    plate.fill();
    plate.lineWidth = 3;
    plate.strokeColor = tone;
    plate.ellipse(0, 0, PLATE_RX, PLATE_RY);
    plate.stroke();

    const g = view.iconGraphics;
    g.clear();
    if (badge.rare) {
      g.lineWidth = 3;
      g.strokeColor = RARE_RING;
      g.circle(0, 0, RARE_RING_RADIUS);
      g.stroke();
    }
    drawStatusIconDisc(g, ICON_RADIUS, badge.isDebuff);
    view.glyph.string = badge.glyph;
    view.glyph.color = statusIconTextColor(badge.isDebuff);
    view.amount.string = badge.amountText;
    view.amount.color = badge.isDebuff ? AMOUNT_DEBUFF : AMOUNT_BUFF;
  }

  private createMarker(root: Node): MarkerView {
    const node = new Node('TileBuffMarker');
    node.layer = root.layer;
    node.addComponent(UITransform).setContentSize(PLATE_RX * 2 + 20, ICON_Y * 2 + 40);
    root.addChild(node);
    node.setSiblingIndex(0); // 壓在單位名牌與跳字之下

    const plateNode = new Node('Plate');
    plateNode.layer = root.layer;
    plateNode.addComponent(UITransform).setContentSize(PLATE_RX * 2, PLATE_RY * 2);
    const plate = plateNode.addComponent(Graphics);
    const plateOpacity = plateNode.addComponent(UIOpacity);
    node.addChild(plateNode);

    const icon = new Node('Icon');
    icon.layer = root.layer;
    icon.addComponent(UITransform).setContentSize(RARE_RING_RADIUS * 2, RARE_RING_RADIUS * 2);
    const iconGraphics = icon.addComponent(Graphics);
    icon.setPosition(0, ICON_Y, 0);
    node.addChild(icon);
    const glyph = this.makeLabel(icon, 'Glyph', ICON_RADIUS * 2, 28, Label.HorizontalAlign.CENTER);

    const amountNode = new Node('Amount');
    amountNode.layer = root.layer;
    const amountTf = amountNode.addComponent(UITransform);
    amountTf.setContentSize(70, 34);
    amountTf.setAnchorPoint(0, 0.5);
    amountNode.setPosition(RARE_RING_RADIUS + AMOUNT_GAP, 0, 0);
    icon.addChild(amountNode);
    const amount = amountNode.addComponent(Label);
    amount.fontSize = 26;
    amount.lineHeight = 30;
    amount.isBold = true;
    amount.horizontalAlign = Label.HorizontalAlign.LEFT;
    amount.verticalAlign = Label.VerticalAlign.CENTER;
    amount.enableOutline = true;
    amount.outlineColor = AMOUNT_OUTLINE;
    amount.outlineWidth = 3;

    return { root: node, plate, plateOpacity, icon, iconGraphics, glyph, amount, lane: 0, depth: 0, rare: false, drawnKey: '', phase: 0 };
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
