// @spec-source → 大廳任務規格 doc_spec_1178 §7.3(5)（進行中任務置頂：小頭像＋剩餘季數）；PROG-2-9966
/**
 * HallActiveMissionStrip — 大廳任務牆下緣的「進行中」置頂列：最多 3 個小頭像＋「還有 N 季」，多的收成「+N」。
 *
 * - 全程式建構、不依賴圖集（省 CHAR 圖集與記憶體）：3 個晶片節點重複使用，換資料只改字與頭像。
 * - 掛在牆節點的父層（不是牆的子節點），所以不影響牆面「牆頭／任務列／頁尾」的節點順序與排版。
 * - 點晶片開該任務詳情（onTap）；晶片擋掉冒泡，不會同時觸發整面牆的點擊。
 */
import { Color, Graphics, Label, Node, Sprite, SpriteFrame, UITransform, Vec3 } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { PINNED_MISSION_MAX, type PinnedMissionView } from '../../core/mission/MissionReactionCards';
import { loadGeneralAvatar } from '../core/GeneralAvatarLoader';

const CHIP_W = 118;
const CHIP_H = 54;
const GAP = 8;
const AVATAR = 44;
/** 牆下緣要留給頁尾（「展開軍務牆」鈕）的高度：晶片放在頁尾正上方 */
const FOOTER_INSET = 70;
const FILL = new Color(28, 22, 16, 220);
const BORDER = new Color(214, 178, 96, 255);
const TEXT = new Color(250, 240, 214, 255);
const MORE = new Color(214, 178, 96, 255);

interface Chip { node: Node; avatar: Sprite; label: Label; missionId: string; generalId: string }

export class HallActiveMissionStrip {
    public readonly node: Node;
    private readonly _chips: Chip[] = [];
    private readonly _more: Label;
    private _frames = new Map<string, SpriteFrame | null>();

    constructor(private readonly _wall: Node, private readonly _onTap: (missionId: string) => void) {
        const layer = _wall.layer;
        this.node = new Node('HallActiveMissionStrip');
        this.node.layer = layer;
        this.node.addComponent(UITransform).setContentSize(CHIP_W * PINNED_MISSION_MAX + GAP * PINNED_MISSION_MAX + 60, CHIP_H);
        for (let i = 0; i < PINNED_MISSION_MAX; i += 1) this._chips.push(this._buildChip(layer, i));
        const moreNode = new Node('More');
        moreNode.layer = layer;
        moreNode.addComponent(UITransform).setContentSize(60, CHIP_H);
        this._more = moreNode.addComponent(Label);
        this._more.fontSize = 24;
        this._more.lineHeight = 30;
        this._more.color = MORE;
        moreNode.setPosition(this._chipX(PINNED_MISSION_MAX) + 20, 0, 0);
        this.node.addChild(moreNode);
        this.node.active = false;
        const parent = _wall.parent;
        if (parent) {
            parent.addChild(this.node);
            this.node.setSiblingIndex(_wall.getSiblingIndex() + 1);
        }
    }

    private _chipX(i: number): number {
        const total = CHIP_W * PINNED_MISSION_MAX + GAP * (PINNED_MISSION_MAX - 1);
        return -total / 2 + CHIP_W / 2 + i * (CHIP_W + GAP);
    }

    private _buildChip(layer: number, index: number): Chip {
        const node = new Node(`Chip${index}`);
        node.layer = layer;
        node.addComponent(UITransform).setContentSize(CHIP_W, CHIP_H);
        const g = node.addComponent(Graphics);
        g.fillColor = FILL;
        g.strokeColor = BORDER;
        g.lineWidth = 2;
        g.roundRect(-CHIP_W / 2, -CHIP_H / 2, CHIP_W, CHIP_H, 10);
        g.fill();
        g.stroke();
        const avatarNode = new Node('Avatar');
        avatarNode.layer = layer;
        avatarNode.addComponent(UITransform).setContentSize(AVATAR, AVATAR);
        const avatar = avatarNode.addComponent(Sprite);
        avatar.sizeMode = Sprite.SizeMode.CUSTOM;
        avatarNode.setPosition(-CHIP_W / 2 + AVATAR / 2 + 5, 0, 0);
        node.addChild(avatarNode);
        const labelNode = new Node('Text');
        labelNode.layer = layer;
        const labelUi = labelNode.addComponent(UITransform);
        labelUi.setContentSize(CHIP_W - AVATAR - 14, CHIP_H - 8);
        const label = labelNode.addComponent(Label);
        label.fontSize = 18;
        label.lineHeight = 22;
        label.color = TEXT;
        label.overflow = Label.Overflow.SHRINK;
        label.enableWrapText = true;
        label.horizontalAlign = Label.HorizontalAlign.LEFT;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        labelNode.setPosition(AVATAR / 2 + 2, 0, 0);
        node.addChild(labelNode);
        node.setPosition(this._chipX(index), 0, 0);
        node.active = false;
        const chip: Chip = { node, avatar, label, missionId: '', generalId: '' };
        node.on(Node.EventType.TOUCH_END, (event?: { propagationStopped?: boolean }) => {
            if (event) event.propagationStopped = true;
            if (chip.missionId) this._onTap(chip.missionId);
        });
        this.node.addChild(node);
        return chip;
    }

    /** 放到牆節點下緣（牆內容沒排滿的空白處）；牆尺寸或位置變了再呼叫一次即可 */
    place(): void {
        const ui = this._wall.getComponent(UITransform);
        if (!ui) return;
        const p = this._wall.position;
        this.node.setPosition(new Vec3(p.x + ui.width * (0.5 - ui.anchorX), p.y - ui.height * ui.anchorY + CHIP_H / 2 + FOOTER_INSET, 0));
    }

    /** 換資料；沒有進行中任務時整列收起 */
    set(view: PinnedMissionView): void {
        const t = (key: string, ...args: Array<string | number>) => services().i18n.t(key, ...args);
        this.node.active = view.items.length > 0;
        this._chips.forEach((chip, i) => {
            const item = view.items[i];
            chip.node.active = !!item;
            if (!item) { chip.missionId = ''; return; }
            chip.missionId = item.missionId;
            chip.label.string = `${item.generalName}\n${t('ui.hallMission.pinned.label')}${t('ui.hallMission.pinned.seasons', item.seasonsLeft)}`;
            if (chip.generalId !== item.generalId) {
                chip.generalId = item.generalId;
                chip.avatar.spriteFrame = null;
                void this._frameOf(item.generalId).then((frame) => {
                    if (frame && chip.generalId === item.generalId && chip.avatar.isValid) chip.avatar.spriteFrame = frame;
                });
            }
        });
        this._more.string = view.more > 0 ? t('ui.hallMission.pinned.more', view.more) : '';
        this.place();
    }

    /** 某任務的晶片節點（派出泡泡用來定位）；沒置頂回 null */
    chipNodeOf(missionId: string): Node | null {
        return this._chips.find((c) => c.missionId === missionId && c.node.active)?.node ?? null;
    }

    private async _frameOf(generalId: string): Promise<SpriteFrame | null> {
        if (this._frames.has(generalId)) return this._frames.get(generalId) ?? null;
        const frame = await loadGeneralAvatar(generalId).catch(() => null);
        this._frames.set(generalId, frame);
        return frame;
    }
}
