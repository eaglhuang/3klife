// @spec-source → 見 docs/cross-reference-index.md；主戰場UI規格書 §3.2 頭頂狀態圖示（PROG-2-9399）
/**
 * UnitStatusIconBar — 單位頭頂資訊列右側的 buff／debuff 小圖示（View 層）。
 *
 * - 圖示以程式繪製：圓底＋一個中文字；增益金邊、減益紅紫邊，日後可換美術圖。
 * - 每個單位名牌只配 4 格圖示槽＋1 個「+N」標籤，需要時才建立，之後重用，不每幀 new。
 * - 只在狀態簽名改變時重畫；新增圖示時播放「放大再回彈」（約 0.2 秒）。
 * - StatusHaloPool：腳下光環（約 0.5 秒淡出）的節點池，全場共用。
 *
 * Unity 對照：Buff 圖示列的 HorizontalLayoutGroup＋對象池。
 */
import { Color, Graphics, Label, Layers, Node, tween, Tween, UIOpacity, UITransform, Vec3, isValid } from 'cc';
import {
  STATUS_ICON_MAX_VISIBLE,
  type StatusIconEntry,
  type UnitStatusIconList,
} from '../shared/UnitStatusIcons';

/**
 * 圖示邊長（名牌座標）。名牌本身縮 0.7、再乘戰場透視，36 實際只剩約 22px、手機約 9px 看不清，
 * PROG-2-9436 放大到 48（實際約 30px）；名牌寬 180 只容得下 3 格，超過顯示「+N」。
 */
export const STATUS_ICON_SIZE = 48;
const ICON_SIZE = STATUS_ICON_SIZE;
const ICON_GAP = 3;
/** 圖示字：粗體加深色描邊，在草地、石板、雪地上都看得清楚 */
const GLYPH_FONT_SIZE = 32;
const GLYPH_OUTLINE = new Color(20, 10, 20, 255);
/** 彈出動畫：放大到 1.35 再回彈到 1，共約 0.2 秒 */
const POP_UP_SEC = 0.09;
const POP_BACK_SEC = 0.11;
/** 光環：約 0.5 秒淡出 */
const HALO_SEC = 0.5;
const HALO_POOL_MAX = 8;

const BUFF_FILL = new Color(40, 60, 40, 235);
const BUFF_EDGE = new Color(255, 215, 90, 255);
const BUFF_TEXT = new Color(255, 240, 170, 255);
const DEBUFF_FILL = new Color(60, 24, 70, 235);
const DEBUFF_EDGE = new Color(200, 60, 80, 255);
const DEBUFF_TEXT = new Color(255, 170, 200, 255);

/**
 * 畫一個狀態圖示的圓底（增益金邊、減益紅紫邊）。頭頂圖示列與棋盤 buff 格（PROG-2-9411）共用，
 * 兩邊看起來才是同一套圖示。
 */
export function drawStatusIconDisc(g: Graphics, radius: number, isDebuff: boolean): void {
  g.fillColor = isDebuff ? DEBUFF_FILL : BUFF_FILL;
  g.circle(0, 0, radius - 1);
  g.fill();
  // 邊框隨尺寸變粗：頭頂 48px 圖示約 3px，棋盤 44px 圖示約 2.75px
  g.lineWidth = Math.max(2, radius / 8);
  g.strokeColor = isDebuff ? DEBUFF_EDGE : BUFF_EDGE;
  g.circle(0, 0, radius - 1);
  g.stroke();
}

/** 圖示中央字的顏色 */
export function statusIconTextColor(isDebuff: boolean): Color {
  return isDebuff ? DEBUFF_TEXT : BUFF_TEXT;
}

/** 光環顏色：增益金、減益紫 */
export const STATUS_HALO_BUFF = new Color(255, 214, 90, 255);
export const STATUS_HALO_DEBUFF = new Color(176, 80, 230, 255);

interface IconSlot {
  node: Node;
  graphics: Graphics;
  label: Label;
  /** 目前畫的是哪一種；用來避免重複重畫 */
  drawnKey: string;
}

export interface StatusBarApplyResult {
  /** 是否有內容變動（簽名不同） */
  changed: boolean;
}

export class UnitStatusIconBar {
  private root: Node | null = null;
  private readonly slots: IconSlot[] = [];
  private overflowLabel: Label | null = null;
  private lastSignature = '';
  /** 目前實際顯示中的 slot 對應種類，供彈出動畫找節點 */
  private shownKinds: string[] = [];

  /**
   * @param parent 名牌節點（labelNode）
   * @param startX 圖示列起點 x（名牌右緣之外）
   * @param y 圖示列中心 y
   */
  constructor(private readonly parent: Node, private readonly startX: number, private readonly y: number) {}

  /** 依新清單更新圖示；簽名相同直接略過（事件驅動，不重畫） */
  public apply(list: UnitStatusIconList): StatusBarApplyResult {
    if (list.signature === this.lastSignature) return { changed: false };
    this.lastSignature = list.signature;

    if (list.icons.length === 0 && !this.root) return { changed: true };
    const root = this.ensureRoot();
    root.active = list.icons.length > 0;

    this.shownKinds = [];
    for (let i = 0; i < STATUS_ICON_MAX_VISIBLE; i++) {
      const entry = list.icons[i];
      const slot = this.ensureSlot(i);
      if (!entry) { slot.node.active = false; continue; }
      slot.node.active = true;
      this.drawSlot(slot, entry);
      this.shownKinds[i] = entry.kind;
    }

    const label = this.ensureOverflowLabel();
    if (list.overflow > 0) {
      label.string = list.overflowText;
      label.node.active = true;
      const x = this.startX + list.icons.length * (ICON_SIZE + ICON_GAP) + 8;
      label.node.setPosition(x, this.y, 0);
    } else {
      label.node.active = false;
    }
    return { changed: true };
  }

  /** 讓指定種類（或全部）的圖示做「放大再回彈」；種類不在畫面上時略過 */
  public pop(kinds: readonly string[] | null): void {
    for (let i = 0; i < this.shownKinds.length; i++) {
      const kind = this.shownKinds[i];
      if (!kind) continue;
      if (kinds && kinds.indexOf(kind) < 0) continue;
      const node = this.slots[i]?.node;
      if (!node || !isValid(node)) continue;
      Tween.stopAllByTarget(node);
      node.setScale(0.3, 0.3, 1);
      tween(node)
        .to(POP_UP_SEC, { scale: new Vec3(1.35, 1.35, 1) })
        .to(POP_BACK_SEC, { scale: new Vec3(1, 1, 1) })
        .start();
    }
  }

  private ensureRoot(): Node {
    if (this.root && isValid(this.root)) return this.root;
    const node = new Node('StatusIcons');
    node.layer = this.parent.layer;
    this.parent.addChild(node);
    this.root = node;
    return node;
  }

  private ensureSlot(index: number): IconSlot {
    const existing = this.slots[index];
    if (existing) return existing;
    const root = this.ensureRoot();
    const node = new Node(`StatusIcon_${index}`);
    node.layer = this.parent.layer;
    root.addChild(node);
    node.addComponent(UITransform).setContentSize(ICON_SIZE, ICON_SIZE);
    node.setPosition(this.startX + ICON_SIZE / 2 + index * (ICON_SIZE + ICON_GAP), this.y, 0);
    const graphics = node.addComponent(Graphics);

    const textNode = new Node('Glyph');
    textNode.layer = this.parent.layer;
    node.addChild(textNode);
    textNode.addComponent(UITransform).setContentSize(ICON_SIZE, ICON_SIZE);
    const label = textNode.addComponent(Label);
    label.fontSize = GLYPH_FONT_SIZE;
    label.lineHeight = ICON_SIZE;
    label.isBold = true;
    label.enableOutline = true;
    label.outlineColor = GLYPH_OUTLINE;
    label.outlineWidth = 2;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.NONE;

    const slot: IconSlot = { node, graphics, label, drawnKey: '' };
    this.slots[index] = slot;
    return slot;
  }

  private ensureOverflowLabel(): Label {
    if (this.overflowLabel && isValid(this.overflowLabel.node)) return this.overflowLabel;
    const root = this.ensureRoot();
    const node = new Node('StatusOverflow');
    node.layer = this.parent.layer;
    root.addChild(node);
    node.addComponent(UITransform).setContentSize(40, ICON_SIZE);
    const label = node.addComponent(Label);
    label.fontSize = 28;
    label.lineHeight = ICON_SIZE;
    label.isBold = true;
    label.enableOutline = true;
    label.outlineColor = GLYPH_OUTLINE;
    label.outlineWidth = 2;
    label.color = new Color(255, 255, 255, 255);
    label.horizontalAlign = Label.HorizontalAlign.LEFT;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.NONE;
    node.active = false;
    this.overflowLabel = label;
    return label;
  }

  private drawSlot(slot: IconSlot, entry: StatusIconEntry): void {
    const key = `${entry.kind}`;
    if (slot.drawnKey === key) return;
    slot.drawnKey = key;
    slot.graphics.clear();
    drawStatusIconDisc(slot.graphics, ICON_SIZE / 2, entry.isDebuff);
    slot.label.string = entry.glyph;
    slot.label.color = statusIconTextColor(entry.isDebuff);
  }
}

/** 腳下光環節點池：增益金、減益紫；播完回收，不反覆 new／destroy */
export class StatusHaloPool {
  private readonly free: Node[] = [];
  private active = 0;

  constructor(private readonly getRoot: () => Node | null, private readonly getLayer: () => number = () => Layers.Enum.UI_2D) {}

  /** 在 UI 根節點座標 (x, y) 放一圈光環 */
  public play(x: number, y: number, isDebuff: boolean): void {
    const root = this.getRoot();
    if (!root || !isValid(root)) return;
    if (this.active >= HALO_POOL_MAX) return; // 同時太多就略過，避免低階手機負擔
    const node = this.acquire(root);
    const color = isDebuff ? STATUS_HALO_DEBUFF : STATUS_HALO_BUFF;
    const g = node.getComponent(Graphics)!;
    g.clear();
    g.lineWidth = 4;
    g.strokeColor = color;
    g.ellipse(0, 0, 34, 14);
    g.stroke();
    g.fillColor = new Color(color.r, color.g, color.b, 60);
    g.ellipse(0, 0, 34, 14);
    g.fill();

    const opacity = node.getComponent(UIOpacity)!;
    opacity.opacity = 255;
    node.setPosition(x, y, 0);
    node.setScale(0.6, 0.6, 1);
    node.active = true;
    node.setSiblingIndex(0); // 壓在名牌與圖示之下
    this.active++;

    Tween.stopAllByTarget(node);
    Tween.stopAllByTarget(opacity);
    tween(node).to(HALO_SEC, { scale: new Vec3(1.4, 1.4, 1) }, { easing: 'quadOut' }).start();
    tween(opacity)
      .to(HALO_SEC, { opacity: 0 })
      .call(() => this.release(node))
      .start();
  }

  private acquire(root: Node): Node {
    const reuse = this.free.pop();
    if (reuse && isValid(reuse)) {
      if (reuse.parent !== root) root.addChild(reuse);
      return reuse;
    }
    const node = new Node('StatusHalo');
    node.layer = this.getLayer();
    root.addChild(node);
    node.addComponent(UITransform).setContentSize(80, 40);
    node.addComponent(Graphics);
    node.addComponent(UIOpacity);
    return node;
  }

  private release(node: Node): void {
    this.active = Math.max(0, this.active - 1);
    if (!isValid(node)) return;
    node.active = false;
    this.free.push(node);
  }
}
