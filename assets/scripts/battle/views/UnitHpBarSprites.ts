/**
 * UnitHpBarSprites — 部隊頭頂細血條的精靈版（PROG-2-10274）
 *
 * 舊做法：每條血條一個 Graphics，Graphics 是獨立材質，夾在合批圖層之間每條都斷一次合批（約 25 次 draw call）。
 * 新做法：底／殘影／血量三段都是徽章圖集裡一塊實心象牙色的精靈，掛在 BadgeBatchLayers 的 bg 代理下，
 * 與底框、圓章同一張貼圖，全部單位的血條併進同一個 draw call。顏色靠 Sprite.color 相乘（先除以象牙色補償）。
 * Unity 對照：把血條改成 Image 放進同一個 Atlas 的 Canvas 層。
 */
import { Color, Node, Sprite, UITransform } from "cc";
import { loadBadgeAtlasFrames, TROOP_BADGE_IVORY } from "../../ui/shared/TroopTypeBadge";
import type { UnitHpBarState } from "../shared/UnitHpBar";
import { UNIT_HP_BAR_H, UNIT_HP_BAR_W, UNIT_HP_BAR_Y } from "../shared/UnitHudLayout";

/** 象牙色底圖乘上 color 會變暗偏黃；先反除一次讓畫面色接近原設定（超過 255 夾住）。 */
export function compensateIvory(c: Color): Color {
  const k = (v: number, base: number): number => Math.min(255, Math.round(v * 255 / base));
  return new Color(k(c.r, TROOP_BADGE_IVORY.r), k(c.g, TROOP_BADGE_IVORY.g), k(c.b, TROOP_BADGE_IVORY.b), c.a);
}

const BACK_COLOR = compensateIvory(new Color(22, 15, 9, 220));
const CHIP_COLOR = compensateIvory(new Color(255, 232, 190, 235));
const TONE_COLOR = {
  player: compensateIvory(new Color(70, 150, 255, 255)),
  enemy: compensateIvory(new Color(230, 70, 60, 255)),
} as const;
const BACK_PAD = 3;

interface Part { node: Node; sprite: Sprite; }

export class UnitHpBarSprites {
  /** 邏輯節點：掛在名牌下只記位置與是否顯示（避讓計算用），本身不畫東西。 */
  readonly node: Node;
  private readonly back: Part;
  private readonly chip: Part;
  private readonly fill: Part;
  private lastW = -2;
  private lastC = -2;
  private lastTone = "";

  constructor(labelNode: Node, bgParent: Node) {
    this.node = new Node("HpBar");
    this.node.layer = labelNode.layer;
    labelNode.addChild(this.node);
    this.node.setPosition(0, UNIT_HP_BAR_Y, 0);
    this.node.active = false;
    this.back = this.makeSprite(bgParent, "HpBack", BACK_COLOR, false);
    this.chip = this.makeSprite(bgParent, "HpChip", CHIP_COLOR, true);
    this.fill = this.makeSprite(bgParent, "HpFill", TONE_COLOR.player, true);
    void loadBadgeAtlasFrames().then((frames) => {
      if (!frames) return;
      for (const p of [this.back, this.chip, this.fill]) if (p.node.isValid) p.sprite.spriteFrame = frames.solid;
    });
  }

  get isValid(): boolean {
    return this.node.isValid && this.fill.node.isValid;
  }

  private makeSprite(parent: Node, name: string, color: Color, leftAnchored: boolean): Part {
    const n = new Node(name);
    n.layer = parent.layer;
    parent.addChild(n);
    n.active = false;
    const tf = n.addComponent(UITransform);
    tf.setContentSize(UNIT_HP_BAR_W, UNIT_HP_BAR_H);
    if (leftAnchored) tf.setAnchorPoint(0, 0.5);
    n.setPosition(leftAnchored ? -UNIT_HP_BAR_W / 2 : 0, UNIT_HP_BAR_Y, 0);
    const s = n.addComponent(Sprite);
    s.type = Sprite.Type.SIMPLE;
    s.sizeMode = Sprite.SizeMode.CUSTOM;
    s.color = color;
    return { node: n, sprite: s };
  }

  private setWidth(s: Part, w: number): void {
    const tf = s.node.getComponent(UITransform)!;
    if (w <= 0) { if (s.node.active) s.node.active = false; return; }
    if (!s.node.active) s.node.active = true;
    tf.setContentSize(w, UNIT_HP_BAR_H);
  }

  /** 受傷才顯示；我方藍、敵方紅。chipRatio：掉血殘影右端（PROG-2-9412）。血量、殘影（1/4 像素精度）與色調都沒變就不動。 */
  draw(state: UnitHpBarState, chipRatio?: number): void {
    this.node.active = state.visible;
    if (!state.visible) {
      if (this.back.node.active) { this.back.node.active = false; this.chip.node.active = false; this.fill.node.active = false; }
      this.lastW = this.lastC = -2;
      return;
    }
    const BW = UNIT_HP_BAR_W;
    const chip = chipRatio !== undefined && chipRatio > state.ratio ? Math.min(1, chipRatio) : -1;
    const wPx = Math.round(state.ratio * BW * 4);
    const cPx = chip < 0 ? -1 : Math.round(chip * BW * 4);
    const wasHidden = !this.back.node.active;
    if (!wasHidden && wPx === this.lastW && cPx === this.lastC && state.tone === this.lastTone) return;
    this.lastW = wPx; this.lastC = cPx; this.lastTone = state.tone;
    if (wasHidden) this.back.node.active = true;
    this.back.node.getComponent(UITransform)!.setContentSize(BW + BACK_PAD, UNIT_HP_BAR_H + BACK_PAD);
    this.setWidth(this.chip, chip < 0 ? 0 : BW * chip);
    this.fill.sprite.color = TONE_COLOR[state.tone];
    this.setWidth(this.fill, BW * state.ratio);
  }
}
