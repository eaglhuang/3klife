// @spec-source → 武將人物介面規格書.md (doc_ui_0012)；PROG-2-1429 依建檔紀錄補標出處
import { Color, Label, Sprite, UITransform } from 'cc';
import { ChildPanelBase } from '../../core/ChildPanelBase';
import { ds3SetActive } from './Ds3NodeLookup';
import { UCUFLogger, LogCategory } from '../../../core/utils/UCUFLogger';
import type { GeneralDetailOverviewContentState } from '../GeneralDetailOverviewMapper';

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

const OVERVIEW_BIO_HEIGHT = 164;

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

    public override onDataUpdate(data: unknown): void {
        if (!data || typeof data !== 'object') {
            return;
        }

        const state = data as GeneralDetailOverviewContentState;
        this._lastData = state;

        this._setLabelText('OverviewName', state.headerName);
        this._setLabelText('OverviewRoleBadge', state.headerMeta);
        this._setLabelText('OverviewRarityTier', state.rarityLabel);
        this._setLabelText('OverviewBio', state.biographyBody);
        this._clampBio();
        // 逸事故事條由立繪下方的頁籤展開，這一列在 v3 沒有功能，還會超出畫面
        ds3SetActive(this.binder, this.hostNode, 'OverviewStoryExpand', false);
        this._applyRarityPill(state.rarityTier);
        this._applyCommandPanel(state);

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
            pillSprite.color = this._toColor(DS3_RARITY_PILL_BG[tier]);
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

    /** 小傳長度因人而異，卡片高度固定，超過的部分裁掉，不可蓋到下方區塊 */
    private _clampBio(): void {
        const label = this.binder.getLabel('OverviewBio');
        const transform = label?.node.getComponent(UITransform);
        if (!label || !transform) return;
        label.overflow = Label.Overflow.CLAMP;
        label.verticalAlign = Label.VerticalAlign.TOP;
        transform.setContentSize(transform.width, OVERVIEW_BIO_HEIGHT);
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
