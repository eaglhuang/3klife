// @spec-source → 武將人物介面規格書.md (doc_ui_0012)；PROG-2-1429 依建檔紀錄補標出處
import { setSpriteFillColor } from '../SolidBackground';
import { Color, Graphics, Label, Node, Sprite, UITransform } from 'cc';
import { ChildPanelBase } from '../../core/ChildPanelBase';
import { ds3Label, ds3SetActive } from './Ds3NodeLookup';
import { UCUFLogger, LogCategory } from '../../../core/utils/UCUFLogger';
import type { GeneralDetailOverviewContentState } from '../GeneralDetailOverviewMapper';
import { TALLY_SUMMARY_CARD_TITLE, tallySummaryCardLines } from '../../../core/systems/GeneralTallySummary';
import { EVENT_NAMES } from '../../../core/config/Constants';
import { services } from '../../../core/managers/ServiceLoader';
import {
    PERSONALITY_BADGE_RADIUS,
    estimateLabelTextWidth,
    personalityBadgeOffsetX,
    type BadgeTextAlign,
    type PersonalityBadgeView,
} from '../../core/UIPersonalityBadge';

const PERSONALITY_BADGE_NODE = 'PersonalityBadge';

const DS3_RARITY_PILL_BG: Record<GeneralDetailOverviewContentState['rarityTier'], [number, number, number]> = {
    common: [76, 175, 80],
    rare: [33, 150, 243],
    epic: [156, 39, 176],
    legendary: [255, 193, 7],
    mythic: [211, 47, 47],
};

const DS3_RARITY_PILL_TEXT: Record<GeneralDetailOverviewContentState['rarityTier'], [number, number, number]> = {
    common: [255, 255, 255],
    rare: [255, 255, 255],
    epic: [255, 255, 255],
    legendary: [45, 30, 0],
    mythic: [255, 255, 255],
};

/** character_v3 將分頁身份欄節點（綁定表 ui-bind-maps/character-ds3-main.json 命名） */
const IDENTITY_LABELS: Partial<Record<keyof GeneralDetailOverviewContentState['identity'], string>> = {
    faction: 'OverviewFaction',
    role: 'OverviewRole',
    status: 'OverviewStatus',
    gender: 'OverviewGender',
    age: 'OverviewAge',
    vitality: 'OverviewVitality',
    fameValue: 'OverviewFameValue',
};

/** character_v3 統領軍勢三格，依 commandPanelRows 的 key 對應 */
const V3_COMMAND_LABELS: Partial<Record<GeneralDetailOverviewContentState['commandPanelRows'][number]['key'], string>> = {
    commandCapacity: 'OverviewCmd_commandCapacity',
    cityTroops: 'OverviewCmd_cityTroops',
    sortiePool: 'OverviewCmd_sortiePool',
    official: 'OverviewOfficial',
};

/** 統領軍勢五列的值節點，依 commandPanelRows 的 key 對應（PROG-2-1213 / TSK-06） */
const COMMAND_VALUE_NODE_PREFIX = 'CharacterDs3TabOverview_cmd_value_';

/** 人物小傳顯示高度；PROG-2-1858 加虎符戰記次卡後由 164 縮為 128，整欄才不超出畫面 */
const OVERVIEW_BIO_HEIGHT = 128;

export class CharacterDs3OverviewChild extends ChildPanelBase {
    override dataSource = 'overview';
    private static readonly ROOT_PATH = 'ContentSlot';

    public override async onMount(_spec: Record<string, unknown>): Promise<void> {
        UCUFLogger.info(LogCategory.LIFECYCLE, '[CharacterDs3OverviewChild] onMount', { rootPath: CharacterDs3OverviewChild.ROOT_PATH });
        if (!this.binder.getLabel('OverviewName')) {
            UCUFLogger.warn(LogCategory.LIFECYCLE,
                '[CharacterDs3OverviewChild] mount target missing — layout 未匯出 OverviewName，Overview 內容暫不渲染',
                { expected: 'OverviewName' });
        }
    }

    private _personalityTooltip = '';

    public override onDataUpdate(data: unknown): void {
        if (!data || typeof data !== 'object') {
            return;
        }

        const state = data as GeneralDetailOverviewContentState;
        this._lastData = state;

        this._setLabelText('OverviewName', state.headerName);
        this._setLabelText('OverviewRoleBadge', state.headerMeta);
        this._applyPersonalityBadge(state.personalityBadge ?? null);
        this._setLabelText('OverviewRarityTier', state.rarityLabel);
        this._setLabelText('OverviewBio', state.biographyBody);
        this._clampBio();
        // 逸事故事條由立繪下方的頁籤展開，這一列在 v3 沒有功能，還會超出畫面
        ds3SetActive(this.binder, this.hostNode, 'OverviewStoryExpand', false);
        this._applyRarityPill(state.rarityTier);
        this._applyCommandPanel(state);
        this._applyTallySummary(state);

        UCUFLogger.info(LogCategory.LIFECYCLE, '[CharacterDs3OverviewChild] onDataUpdate applied', {
            name: state.headerName,
            rarity: state.rarityLabel,
            role: state.roleValue,
        });
    }

    public override validateDataFormat(data: unknown): string | null {
        if (!data || typeof data !== 'object') {
            return 'CharacterDs3OverviewChild expects GeneralDetailOverviewContentState';
        }
        const state = data as Partial<GeneralDetailOverviewContentState>;
        if (typeof state.headerName !== 'string') {
            return 'overview.headerName must be a string';
        }
        if (typeof state.rarityLabel !== 'string') {
            return 'overview.rarityLabel must be a string';
        }
        return null;
    }

    private _applyRarityPill(tier: GeneralDetailOverviewContentState['rarityTier']): void {
        const pillNode = this.binder.getNode('OverviewRarityTier');
        const pillSprite = pillNode?.getComponent(Sprite) ?? null;
        const pillLabel = this.binder.getLabel('OverviewRarityTier');

        if (pillSprite) {
            setSpriteFillColor(pillSprite, this._toColor(DS3_RARITY_PILL_BG[tier]));
        }

        if (pillLabel) {
            pillLabel.color = this._toColor(DS3_RARITY_PILL_TEXT[tier]);
        }
    }

    private _applyCommandPanel(state: GeneralDetailOverviewContentState): void {
        for (const row of state.commandPanelRows) {
            this._setLabelText(`${COMMAND_VALUE_NODE_PREFIX}${row.key}`, row.value);
            const v3Label = V3_COMMAND_LABELS[row.key];
            if (v3Label) this._setLabelText(v3Label, row.value);
        }
        for (const [key, nodeName] of Object.entries(IDENTITY_LABELS) as [keyof typeof IDENTITY_LABELS, string][]) {
            this._setLabelText(nodeName, state.identity?.[key] ?? '');
        }
    }

    /** 性格圓徽（HUM-02）：貼在職能標籤文字右側，點一下用 Toast 顯示提示文案 */
    private _applyPersonalityBadge(view: PersonalityBadgeView | null): void {
        const anchor = ds3Label(this.binder, this.hostNode, 'OverviewRoleBadge');
        if (!anchor) return;
        const host = anchor.node;
        const existing = host.getChildByName(PERSONALITY_BADGE_NODE);
        if (!view) {
            if (existing) existing.active = false;
            return;
        }
        const badge = existing ?? this._createPersonalityBadge(host, anchor);
        badge.active = true;
        const graphics = badge.getComponent(Graphics)!;
        graphics.clear();
        graphics.fillColor = new Color().fromHEX(view.color);
        graphics.circle(0, 0, PERSONALITY_BADGE_RADIUS);
        graphics.fill();
        badge.getComponentInChildren(Label)!.string = view.glyph;
        this._personalityTooltip = view.tooltip;
        const transform = host.getComponent(UITransform)!;
        badge.setPosition(personalityBadgeOffsetX(
            estimateLabelTextWidth(anchor.string, anchor.fontSize, 0), // 實測：cacheMode NONE 的字型字距不生效
            transform.width,
            transform.anchorX,
            anchor.horizontalAlign as number as BadgeTextAlign,
        ), 0);
    }

    private _createPersonalityBadge(host: Node, anchor: Label): Node {
        const size = PERSONALITY_BADGE_RADIUS * 2;
        const badge = new Node(PERSONALITY_BADGE_NODE);
        badge.layer = host.layer;
        badge.addComponent(UITransform).setContentSize(size, size);
        badge.addComponent(Graphics);
        const glyphNode = new Node('Glyph');
        glyphNode.layer = host.layer;
        glyphNode.addComponent(UITransform).setContentSize(size, size);
        const glyph = glyphNode.addComponent(Label);
        glyph.font = anchor.font;
        glyph.useSystemFont = anchor.useSystemFont;
        glyph.fontSize = 16;
        glyph.lineHeight = size;
        glyph.color = Color.WHITE;
        glyph.cacheMode = Label.CacheMode.NONE;
        glyph.horizontalAlign = Label.HorizontalAlign.CENTER;
        glyph.verticalAlign = Label.VerticalAlign.CENTER;
        badge.addChild(glyphNode);
        host.addChild(badge);
        badge.on(Node.EventType.TOUCH_END, () => {
            services().event.emit(EVENT_NAMES.ShowToast, { text: this._personalityTooltip });
        });
        return badge;
    }

    /** 小傳長度因人而異，卡片高度固定，超過的部分裁掉，不可蓋到下方區塊 */
    private _clampBio(): void {
        const label = this.binder.getLabel('OverviewBio');
        const transform = label?.node.getComponent(UITransform);
        if (!label || !transform) return;
        label.overflow = Label.Overflow.CLAMP;
        label.verticalAlign = Label.VerticalAlign.TOP;
        transform.setContentSize(transform.width, OVERVIEW_BIO_HEIGHT);
    }

    /** 虎符戰記次卡（general-tally-summary，PROG-2-1858）；沒有摘要資料時整卡隱藏 */
    private _applyTallySummary(state: GeneralDetailOverviewContentState): void {
        ds3SetActive(this.binder, this.hostNode, 'OverviewTallySummary', !!state.tallySummary);
        if (!state.tallySummary) return;
        const [line0, line1] = tallySummaryCardLines(state.tallySummary);
        // 次卡節點不在綁定表內，依節點名稱找（同兵頁虎符卡）
        const texts: [string, string][] = [['OverviewTallyTitle', TALLY_SUMMARY_CARD_TITLE], ['OverviewTallyLine0', line0], ['OverviewTallyLine1', line1]];
        for (const [name, text] of texts) {
            const label = ds3Label(this.binder, this.hostNode, name);
            if (label) label.string = text;
        }
    }

    private _setLabelText(nodeName: string, text: string): void {
        const label = this.binder.getLabel(nodeName);
        if (!label) {
            return;
        }
        // 換將時字元不可預期，不佔共用字元圖集（CHAR 滿了會缺字）
        if (label.cacheMode === Label.CacheMode.CHAR) {
            label.cacheMode = Label.CacheMode.NONE;
        }
        label.string = text?.trim() ?? '';
    }

    private _toColor(rgb: [number, number, number]): Color {
        return new Color(rgb[0], rgb[1], rgb[2], 255);
    }
}
