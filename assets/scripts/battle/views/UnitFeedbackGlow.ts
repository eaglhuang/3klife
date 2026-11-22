// @spec-source → 總PM 11/22 手感審核（毒箭上身回饋、治療時序）；PROG-2-9731
/**
 * UnitFeedbackGlow — 單位身上的「一團色光」節點池（View 層）。
 *
 * 毒箭命中：紫綠光暈罩住受擊者（毒）；治療：綠白光暈由下往上升（治療光）。
 * 兩者共用同一個池：用 Graphics 畫橢圓，不新增任何貼圖；播完回收重用，不反覆 new／destroy。
 * 顏色、大小、秒數全由呼叫端從 data/battle-ui-feedback.json 傳入。
 *
 * Unity 對照：像一個共用的「Tint Flash」Prefab 物件池，參數由 ScriptableObject 餵入。
 */
import { Color, Graphics, Layers, Node, tween, Tween, UIOpacity, UITransform, Vec3, isValid } from 'cc';
import type { Rgba } from '../shared/BattleUiFeedback';

export interface UnitGlowSpec {
  fill: Rgba;
  edge: Rgba;
  /** 峰值不透明度 0~255 */
  peakAlpha: number;
  sec: number;
  radiusX: number;
  radiusY: number;
  /** 播放期間往上飄的像素 */
  rise: number;
}

const POOL_MAX = 10;

export class UnitFeedbackGlowPool {
  private readonly free: Node[] = [];
  private active = 0;
  /** 累計播放次數（QA 與測試用，不影響畫面） */
  public playCount = 0;

  constructor(private readonly getRoot: () => Node | null, private readonly getLayer: () => number = () => Layers.Enum.UI_2D) {}

  /** 在 UI 根節點座標 (x, y)（單位腳下）放一團光；同時太多就略過，避免低階手機負擔 */
  public play(x: number, y: number, spec: UnitGlowSpec): boolean {
    const root = this.getRoot();
    if (!root || !isValid(root) || this.active >= POOL_MAX) return false;
    const node = this.acquire(root);
    const g = node.getComponent(Graphics)!;
    g.clear();
    g.fillColor = new Color(spec.fill[0], spec.fill[1], spec.fill[2], 140);
    g.ellipse(0, spec.radiusY, spec.radiusX, spec.radiusY);
    g.fill();
    g.lineWidth = 4;
    g.strokeColor = new Color(spec.edge[0], spec.edge[1], spec.edge[2], 255);
    g.ellipse(0, spec.radiusY, spec.radiusX, spec.radiusY);
    g.stroke();

    const opacity = node.getComponent(UIOpacity)!;
    opacity.opacity = 0;
    node.setPosition(x, y, 0);
    node.setScale(0.85, 0.85, 1);
    node.active = true;
    this.active++;
    this.playCount++;

    const half = spec.sec * 0.3;
    Tween.stopAllByTarget(node);
    Tween.stopAllByTarget(opacity);
    tween(node).to(spec.sec, { position: new Vec3(x, y + spec.rise, 0), scale: new Vec3(1.15, 1.15, 1) }, { easing: 'quadOut' }).start();
    tween(opacity)
      .to(half, { opacity: Math.max(0, Math.min(255, spec.peakAlpha)) })
      .to(spec.sec - half, { opacity: 0 })
      .call(() => this.release(node))
      .start();
    return true;
  }

  private acquire(root: Node): Node {
    const reuse = this.free.pop();
    if (reuse && isValid(reuse)) {
      if (reuse.parent !== root) root.addChild(reuse);
      return reuse;
    }
    const node = new Node('UnitFeedbackGlow');
    node.layer = this.getLayer();
    root.addChild(node);
    node.addComponent(UITransform).setContentSize(160, 140);
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
