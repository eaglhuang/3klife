// @spec-source → docs/agent-briefs/tasks/PROG/PROG-2-9410.md（放招手感：中央招式名橫幅）
/**
 * SkillNameBanner — 武將放招時畫面中央偏上的招式名橫幅（PROG-2-9410）。
 *
 * 位置：由 BattleBannerLayoutData 的錨點＋比例規則決定（標題列正下方、教學頁籤之上的空帶），不蓋 HUD 保留區。
 * 排隊／合併規則在 SkillBannerQueue（純邏輯）；這裡只負責畫與淡入淡出。
 * 全程只用一個節點（重複使用，不每次 new），淡入淡出走 tween，跟著戰場時間（x2 加速、QA 慢動作）一起變。
 */
import { Color, Graphics, Label, Node, Tween, UIOpacity, UITransform, tween, view } from 'cc';
import { BATTLE_BANNER_LAYOUT } from '../../core/data/BattleBannerLayoutData';
import { bannerCenterOffset } from '../../core/systems/BannerPlacement';
import { SKILL_CAST_TIMING, SkillBannerItem, SkillBannerQueue, skillBannerText } from '../shared/SkillCastPresentation';

const BANNER_NODE = 'SkillNameBanner';
const BANNER_WIDTH = 760;
const BANNER_HEIGHT = 96;
const SIDE_COLORS: Record<SkillBannerItem['side'], { text: Color; edge: Color }> = {
  player: { text: new Color(255, 226, 140, 255), edge: new Color(90, 160, 255, 255) },
  enemy: { text: new Color(255, 170, 150, 255), edge: new Color(230, 70, 60, 255) },
};

export class SkillNameBanner {
  private node: Node | null = null;
  private label: Label | null = null;
  private bg: Graphics | null = null;
  private fade: UIOpacity | null = null;
  private readonly queue = new SkillBannerQueue();

  constructor(private readonly getParent: () => Node | null) {}

  /** 要求顯示一條招式名；正在顯示同一方的就合併，否則排隊。 */
  public push(item: SkillBannerItem): void {
    const result = this.queue.push(item, this.now());
    if (result === 'queued') return;
    const showing = this.queue.showing;
    if (!showing || !this.ensureNode()) { this.queue.clear(); return; }
    this.render(showing);
    this.play(result === 'show');
  }

  public destroy(): void {
    this.queue.clear();
    if (this.fade) Tween.stopAllByTarget(this.fade);
    if (this.node?.isValid) this.node.destroy();
    this.node = null; this.label = null; this.bg = null; this.fade = null;
  }

  /** 牆上時鐘（秒）；只用來判斷合併時間窗，不影響動畫進度。 */
  private now(): number { return Date.now() / 1000; }

  private ensureNode(): boolean {
    if (this.node?.isValid && this.node.parent?.isValid) return true;
    const parent = this.getParent();
    if (!parent?.isValid) return false;
    const node = new Node(BANNER_NODE);
    node.layer = parent.layer;
    node.addComponent(UITransform).setContentSize(BANNER_WIDTH, BANNER_HEIGHT);
    this.fade = node.addComponent(UIOpacity);
    this.fade.opacity = 0;
    const bgNode = new Node(`${BANNER_NODE}Bg`);
    bgNode.layer = parent.layer;
    bgNode.addComponent(UITransform).setContentSize(BANNER_WIDTH, BANNER_HEIGHT);
    this.bg = bgNode.addComponent(Graphics);
    node.addChild(bgNode);
    const textNode = new Node(`${BANNER_NODE}Text`);
    textNode.layer = parent.layer;
    textNode.addComponent(UITransform).setContentSize(BANNER_WIDTH - 60, BANNER_HEIGHT);
    const label = textNode.addComponent(Label);
    label.fontSize = 50;
    label.lineHeight = 60;
    label.isBold = true;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    label.enableOutline = true;
    label.outlineColor = new Color(30, 18, 8, 255);
    label.outlineWidth = 3;
    this.label = label;
    node.addChild(textNode);
    parent.addChild(node);
    this.place(node);
    this.node = node;
    return true;
  }

  /** 依規則重算位置（每次顯示都算，畫面尺寸變了也跟著動） */
  private place(node: Node): void {
    const size = view.getVisibleSize();
    const o = bannerCenterOffset(BATTLE_BANNER_LAYOUT.skillBanner, size.width, size.height, BANNER_HEIGHT);
    node.setPosition(o.x, o.y, 0);
  }

  private render(item: SkillBannerItem): void {
    const colors = SIDE_COLORS[item.side];
    if (this.label) { this.label.string = skillBannerText(item); this.label.color = colors.text; }
    const g = this.bg;
    if (!g) return;
    g.clear();
    // 半透明暗帶，左右兩端各一條陣營色邊條
    g.fillColor = new Color(0, 0, 0, 170);
    g.rect(-BANNER_WIDTH / 2, -BANNER_HEIGHT / 2, BANNER_WIDTH, BANNER_HEIGHT);
    g.fill();
    g.fillColor = colors.edge;
    g.rect(-BANNER_WIDTH / 2, -BANNER_HEIGHT / 2, 8, BANNER_HEIGHT);
    g.rect(BANNER_WIDTH / 2 - 8, -BANNER_HEIGHT / 2, 8, BANNER_HEIGHT);
    g.fill();
  }

  /** fresh=true 從透明淡入；合併時直接保持全亮、重新計時停留。 */
  private play(fresh: boolean): void {
    const fade = this.fade;
    const node = this.node;
    if (!fade || !node?.isValid) return;
    Tween.stopAllByTarget(fade);
    this.place(node);
    node.setSiblingIndex(node.parent ? node.parent.children.length - 1 : 0);
    const t = SKILL_CAST_TIMING;
    if (!fresh) fade.opacity = 255;
    tween(fade)
      .to(fresh ? t.bannerFadeInSec : 0.05, { opacity: 255 })
      .delay(t.bannerHoldSec)
      .to(t.bannerFadeOutSec, { opacity: 0 })
      .call(() => {
        const next = this.queue.finish(this.now());
        if (next) { this.render(next); this.play(true); }
      })
      .start();
  }
}
