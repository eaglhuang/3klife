// @spec-source → 大廳任務規格 doc_spec_1178 §9（結算回報）；PROG-2-9966（回報卡一疊、可逐張點或全部略過）
/**
 * HallMissionReportStack — 季末「任務回報卡」一疊：同一季所有回報合成一疊，點一下看下一張，或一次全部略過。
 *
 * - 一張卡：武將頭像、任務名、結果標籤（依四級上色）、獎勵／友誼變化、連鎖標示、一句武將台詞。
 * - 大成功：卡片四周迸一圈小星星（Tween，一次性，結束即銷毀節點）。
 * - 全程式建構，只用一組節點重複換內容（不隨卡數增減節點）；頭像只載當張那一位。
 * - 回傳的 Promise 在最後一張看完、或按「全部略過」時完成；呼叫端接著開季報。
 */
import { Color, Graphics, Label, Node, Sprite, SpriteFrame, Tween, tween, UITransform, Vec3, view } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { chainTagText } from '../../core/mission/MissionChain';
import { friendshipText, rewardParts, type HallMissionReportCardWithLine } from '../../core/mission/MissionReactionCards';
import type { MissionTier } from '../../core/mission/MissionTypes';
import { loadGeneralAvatar } from '../core/GeneralAvatarLoader';

const CARD_W = 560;
const CARD_H = 380;
const FILL = new Color(34, 26, 18, 245);
const BORDER = new Color(214, 178, 96, 255);
const TEXT = new Color(250, 240, 214, 255);
const SUB = new Color(206, 190, 160, 255);
const TIER_COLOR: Record<MissionTier, Color> = {
    critical: new Color(255, 214, 90, 255),
    success: new Color(132, 214, 120, 255),
    fail: new Color(236, 150, 90, 255),
    disaster: new Color(228, 84, 84, 255),
};
const STAR_COUNT = 10;

type StopEvent = { propagationStopped?: boolean };

function makeLabel(parent: Node, name: string, size: number, color: Color, w: number, h: number, x: number, y: number, align = Label.HorizontalAlign.LEFT): Label {
    const node = new Node(name);
    node.layer = parent.layer;
    node.addComponent(UITransform).setContentSize(w, h);
    const label = node.addComponent(Label);
    label.fontSize = size;
    label.lineHeight = Math.round(size * 1.3);
    label.color = color;
    label.overflow = Label.Overflow.SHRINK;
    label.enableWrapText = true;
    label.horizontalAlign = align;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    const font = services().i18n.getFont('body');
    if (font) label.font = font;
    node.setPosition(x, y, 0);
    parent.addChild(node);
    return label;
}

export class HallMissionReportStack {
    private _root: Node | null = null;
    private _card!: Node;
    private _avatar!: Sprite;
    private _title!: Label;
    private _tier!: Label;
    private _body!: Label;
    private _chain!: Label;
    private _quote!: Label;
    private _progress!: Label;
    private _next!: Label;
    /** 卡片下方的操作提示：點任意處看下一張／最後一張點了收起 */
    private _tapHint!: Label;
    private _skip!: Node;
    private _skipLabel!: Label;
    private _backs: Node[] = [];
    private _index = 0;
    private _cards: HallMissionReportCardWithLine[] = [];
    private _resolve: (() => void) | null = null;

    /** 掛在 host（一般傳 Canvas 節點）最上層顯示；同時只會有一疊 */
    show(host: Node, cards: readonly HallMissionReportCardWithLine[]): Promise<void> {
        if (cards.length === 0) return Promise.resolve();
        this.dispose();
        this._cards = [...cards];
        this._index = 0;
        this._build(host);
        this._render();
        return new Promise<void>((resolve) => { this._resolve = resolve; });
    }

    get active(): boolean { return !!this._root?.isValid; }

    dispose(): void {
        if (this._card?.isValid) Tween.stopAllByTarget(this._card);
        if (this._root?.isValid) this._root.destroy();
        this._root = null;
        const done = this._resolve;
        this._resolve = null;
        done?.();
    }

    private _build(host: Node): void {
        const layer = host.layer;
        const size = view.getVisibleSize();
        const root = new Node('HallMissionReportStack');
        root.layer = layer;
        root.addComponent(UITransform).setContentSize(size.width, size.height);
        const mask = root.addComponent(Graphics);
        mask.fillColor = new Color(0, 0, 0, 150);
        mask.rect(-size.width / 2, -size.height / 2, size.width, size.height);
        mask.fill();
        // 遮罩吃掉點擊，避免點穿到大廳
        // 點卡片外面也翻下一張；最後一張點了就收起（_advance 處理）
        root.on(Node.EventType.TOUCH_END, (event?: StopEvent) => { if (event) event.propagationStopped = true; this._advance(); });

        // 疊在後面的卡背（最多露出兩張），暗示還有幾張
        for (let i = 2; i >= 1; i -= 1) {
            const back = new Node(`Back${i}`);
            back.layer = layer;
            back.addComponent(UITransform).setContentSize(CARD_W, CARD_H);
            const g = back.addComponent(Graphics);
            g.fillColor = new Color(24, 18, 12, 235);
            g.strokeColor = new Color(150, 124, 70, 255);
            g.lineWidth = 2;
            g.roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16);
            g.fill();
            g.stroke();
            back.setPosition(i * 14, -i * 14, 0);
            root.addChild(back);
            this._backs[i] = back;
        }

        const card = new Node('Card');
        card.layer = layer;
        card.addComponent(UITransform).setContentSize(CARD_W, CARD_H);
        const g = card.addComponent(Graphics);
        g.fillColor = FILL;
        g.strokeColor = BORDER;
        g.lineWidth = 3;
        g.roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16);
        g.fill();
        g.stroke();
        root.addChild(card);
        this._card = card;

        const top = CARD_H / 2;
        const left = -CARD_W / 2;
        const textW = CARD_W - 24 * 2 - 112 - 20;
        const textX = left + 24 + 112 + 20 + textW / 2;
        this._progress = makeLabel(card, 'Progress', 20, SUB, 300, 28, left + 24 + 150, top - 26);
        const avatarNode = new Node('Avatar');
        avatarNode.layer = layer;
        avatarNode.addComponent(UITransform).setContentSize(112, 112);
        this._avatar = avatarNode.addComponent(Sprite);
        this._avatar.sizeMode = Sprite.SizeMode.CUSTOM;
        avatarNode.setPosition(left + 24 + 56, top - 62 - 56, 0);
        card.addChild(avatarNode);
        this._title = makeLabel(card, 'Title', 28, TEXT, textW, 36, textX, top - 78);
        this._tier = makeLabel(card, 'Tier', 34, TIER_COLOR.success, textW, 44, textX, top - 124);
        this._body = makeLabel(card, 'Body', 22, TEXT, textW, 64, textX, top - 178);
        this._chain = makeLabel(card, 'Chain', 20, TIER_COLOR.critical, CARD_W - 48, 28, 0, top - 224);
        this._quote = makeLabel(card, 'Quote', 22, SUB, CARD_W - 48, 60, 0, top - 270);
        this._next = this._button(card, 'Next', 150, 46, CARD_W / 2 - 24 - 75, -top + 14 + 23, () => this._advance());
        this._skipLabel = this._button(card, 'Skip', 150, 46, CARD_W / 2 - 24 - 75 - 166, -top + 14 + 23, () => this.dispose());
        this._skip = this._skipLabel.node.parent as Node;
        // 提示放在卡片下方的遮罩上，不隨卡片彈動
        this._tapHint = makeLabel(root, 'TapHint', 24, SUB, CARD_W, 32, 0, -CARD_H / 2 - 56, Label.HorizontalAlign.CENTER);
        card.on(Node.EventType.TOUCH_END, (event?: StopEvent) => { if (event) event.propagationStopped = true; this._advance(); });
        host.addChild(root);
        root.setSiblingIndex(host.children.length - 1);
        this._root = root;
    }

    private _button(parent: Node, name: string, w: number, h: number, x: number, y: number, onTap: () => void): Label {
        const node = new Node(name);
        node.layer = parent.layer;
        node.addComponent(UITransform).setContentSize(w, h);
        const g = node.addComponent(Graphics);
        g.fillColor = new Color(120, 78, 28, 255);
        g.strokeColor = BORDER;
        g.lineWidth = 2;
        g.roundRect(-w / 2, -h / 2, w, h, 10);
        g.fill();
        g.stroke();
        node.setPosition(x, y, 0);
        const label = makeLabel(node, 'Text', 22, TEXT, w - 8, h - 8, 0, 0, Label.HorizontalAlign.CENTER);
        node.on(Node.EventType.TOUCH_END, (event?: StopEvent) => { if (event) event.propagationStopped = true; onTap(); });
        parent.addChild(node);
        return label;
    }

    private _advance(): void {
        if (!this.active) return;
        this._index += 1;
        if (this._index >= this._cards.length) { this.dispose(); return; }
        this._render();
    }

    private _render(): void {
        const t = (key: string, ...args: Array<string | number>) => services().i18n.t(key, ...args);
        const card = this._cards[this._index];
        const total = this._cards.length;
        const remain = total - this._index - 1;
        this._progress.string = `${t('ui.hallMission.report.title')}  ${t('ui.hallMission.report.progress', this._index + 1, total)}`;
        this._title.string = `${card.generalName}・${card.title}`;
        this._tier.string = t(`ui.hallMission.tier.${card.tier}`);
        this._tier.color = TIER_COLOR[card.tier];
        const parts = [...rewardParts(card, t), friendshipText(card, t)].filter((s) => s.length > 0);
        this._body.string = parts.length > 0 ? parts.join('　') : t('ui.hallMission.report.noReward');
        const chain = card.chain;
        this._chain.string = chain
            ? (chain.completed ? `${chainTagText(chain.depth, chain.total, t)}　${t('ui.hallMission.report.chainDone')}` : chainTagText(chain.depth, chain.total, t))
            : '';
        this._quote.string = card.line ? `「${card.line}」` : '';
        this._next.string = remain > 0 ? t('ui.hallMission.report.next') : t('ui.hallMission.report.done');
        this._skipLabel.string = t('ui.hallMission.report.skipAll');
        this._skip.active = remain > 0;
        this._tapHint.string = t(remain > 0 ? 'ui.hallMission.report.tapNext' : 'ui.hallMission.report.tapClose');
        if (this._backs[1]) this._backs[1].active = remain >= 1;
        if (this._backs[2]) this._backs[2].active = remain >= 2;
        this._avatar.spriteFrame = null;
        const idx = this._index;
        void loadGeneralAvatar(card.generalId).then((frame: SpriteFrame | null) => {
            if (frame && this.active && this._index === idx && this._avatar.isValid) this._avatar.spriteFrame = frame;
        }).catch(() => undefined);
        // 換卡彈一下；大成功再撒星星
        Tween.stopAllByTarget(this._card);
        this._card.setScale(0.92, 0.92, 1);
        tween(this._card).to(0.12, { scale: new Vec3(1, 1, 1) }).start();
        if (card.tier === 'critical') this._sparkle();
    }

    private _sparkle(): void {
        const layer = this._card.layer;
        for (let i = 0; i < STAR_COUNT; i += 1) {
            const star = new Node('Star');
            star.layer = layer;
            star.addComponent(UITransform).setContentSize(20, 20);
            const g = star.addComponent(Graphics);
            g.fillColor = TIER_COLOR.critical;
            g.moveTo(0, 10); g.lineTo(3, 3); g.lineTo(10, 0); g.lineTo(3, -3);
            g.lineTo(0, -10); g.lineTo(-3, -3); g.lineTo(-10, 0); g.lineTo(-3, 3);
            g.close();
            g.fill();
            const angle = (i / STAR_COUNT) * Math.PI * 2;
            star.setPosition(Math.cos(angle) * 40, Math.sin(angle) * 20 + 90, 0);
            star.setScale(0.3, 0.3, 1);
            this._card.addChild(star);
            tween(star)
                .to(0.5, { position: new Vec3(Math.cos(angle) * (CARD_W / 2 - 20), Math.sin(angle) * (CARD_H / 2 - 10), 0), scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' })
                .to(0.2, { scale: new Vec3(0, 0, 1) })
                .call(() => { if (star.isValid) star.destroy(); })
                .start();
        }
    }
}
