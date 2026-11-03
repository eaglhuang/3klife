// @spec-source → 武將人物介面規格書.md (doc_ui_0012)；PROG-2-1429 依建檔紀錄補標出處
import { Color, Sprite, UITransform } from 'cc';
import { ChildPanelBase } from '../../core/ChildPanelBase';
import { placeDs3BarFill } from './Ds3BarFill';
import { UCUFLogger, LogCategory } from '../../../core/utils/UCUFLogger';
import type { GeneralDetailOverviewContentState } from '../GeneralDetailOverviewMapper';

type Ds3StatKey = 'str' | 'lea' | 'cha' | 'int' | 'pol' | 'luk';

interface Ds3SummaryLineSlot {
    row: string;
    bullet: string;
    text: string;
}

const CORE_STAT_LABELS: Record<Ds3StatKey, string> = {
    str: 'OverviewStat_str',
    lea: 'OverviewStat_lea',
    cha: 'OverviewStat_cha',
    int: 'OverviewStat_int',
    pol: 'OverviewStat_pol',
    luk: 'OverviewStat_luk',
};

const ROLE_LINE_SLOTS: Ds3SummaryLineSlot[] = [
    {
        row: 'OverviewRoleRow0',
        bullet: 'OverviewRoleBullet0',
        text: 'OverviewRoleText0',
    },
    {
        row: 'OverviewRoleRow1',
        bullet: 'OverviewRoleBullet1',
        text: 'OverviewRoleText1',
    },
];

const TRAIT_LINE_SLOTS: Ds3SummaryLineSlot[] = [
    {
        row: 'OverviewTraitRow0',
        bullet: 'OverviewTraitBullet0',
        text: 'OverviewTraitText0',
    },
    {
        row: 'OverviewTraitRow1',
        bullet: 'OverviewTraitBullet1',
        text: 'OverviewTraitText1',
    },
];

const RARITY_STAR_COUNT: Record<GeneralDetailOverviewContentState['rarityTier'], number> = {
    common: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
    mythic: 5,
};

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

/** 統領軍勢五列的值節點，依 commandPanelRows 的 key 對應（PROG-2-1213 / TSK-06） */
const COMMAND_VALUE_NODE_PREFIX = 'CharacterDs3TabOverview_cmd_value_';

const ACTIVE_STAR_COLOR = new Color(212, 175, 55, 255);
const INACTIVE_STAR_COLOR = new Color(77, 70, 53, 255);

export class CharacterDs3OverviewChild extends ChildPanelBase {
    override dataSource = 'overview';
    private static readonly ROOT_PATH = 'CharacterDs3Main_div_8';

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
        this._setLabelText('OverviewEpithet', state.headerTitle ?? '');
        this._setLabelText('OverviewRarityTier', state.rarityLabel);
        this._setLabelText('OverviewBio', state.biographyBody);
        this._setLabelText('OverviewCrestTitle', state.crestTitle);
        this._setLabelText('OverviewBloodlineName', state.bloodlineName);
        this._setLabelText('OverviewAwakeningPercent', `${Math.round(state.awakeningProgress)}%`);
        this._setLabelText('OverviewCrestHint', state.crestHint);
        this._setLabelText('OverviewPersonality', state.personalityValue);
        this._setLabelText('OverviewFooterTitle', state.footerTitle);

        this._applyCoreStats(state);
        this._applySummaryLines(state.roleValue, ROLE_LINE_SLOTS, '定位未定');
        this._applySummaryLines(state.traitValue, TRAIT_LINE_SLOTS, '氣質描述待補');
        this._applyRarityPill(state.rarityTier);
        this._applyRarityStars(state.rarityTier);
        this._applyAwakeningProgress(state.awakeningProgress);
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

    private _applyCoreStats(state: GeneralDetailOverviewContentState): void {
        const keys = Object.keys(CORE_STAT_LABELS) as Ds3StatKey[];
        for (const key of keys) {
            const value = state.dualLayerStats[key]?.talent.base ?? state.dualLayerStats[key]?.talent.current;
            this._setLabelText(CORE_STAT_LABELS[key], this._formatNumber(value));
        }
    }

    private _applySummaryLines(value: string, slots: Ds3SummaryLineSlot[], fallback: string): void {
        const lines = this._splitSummaryLines(value, fallback);
        for (let index = 0; index < slots.length; index += 1) {
            const slot = slots[index];
            const line = lines[index] ?? '';
            const active = line.length > 0;
            this._setNodeActive(slot.row, active);
            if (!active) {
                continue;
            }
            this._setLabelText(slot.bullet, '•');
            this._setLabelText(slot.text, line);
        }
    }

    private _applyRarityStars(tier: GeneralDetailOverviewContentState['rarityTier']): void {
        const root = this.binder.getNode('OverviewRarityStars');
        if (!root) {
            return;
        }

        const starCount = RARITY_STAR_COUNT[tier] ?? 0;
        const stars = root.children;
        for (let index = 0; index < stars.length; index += 1) {
            const star = stars[index];
            if (!star) {
                continue;
            }
            star.active = true;
            const label = this.binder.getLabel(star.name);
            if (label) {
                label.color = (index < starCount ? ACTIVE_STAR_COLOR : INACTIVE_STAR_COLOR).clone();
            }
        }
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

    private _applyAwakeningProgress(progress: number): void {
        const trackNode = this.binder.getNode('OverviewAwakeningTrack');
        const fillNode = this.binder.getNode('OverviewAwakeningFill');
        const trackTransform = trackNode?.getComponent(UITransform) ?? null;
        const fillTransform = fillNode?.getComponent(UITransform) ?? null;
        if (!trackTransform || !fillTransform) {
            return;
        }

        const placement = placeDs3BarFill(trackTransform.width, trackTransform.anchorX, fillTransform.anchorX, progress / 100);
        fillTransform.width = placement.width;
        fillNode!.setPosition(placement.x, fillNode!.position.y, fillNode!.position.z);
    }

    private _applyCommandPanel(state: GeneralDetailOverviewContentState): void {
        for (const row of state.commandPanelRows) {
            this._setLabelText(`${COMMAND_VALUE_NODE_PREFIX}${row.key}`, row.value);
        }
    }

    private _setLabelText(nodeName: string, text: string): void {
        const label = this.binder.getLabel(nodeName);
        if (!label) {
            return;
        }
        label.string = text?.trim() ?? '';
    }

    private _setNodeActive(nodeName: string, active: boolean): void {
        const node = this.binder.getNode(nodeName);
        if (!node) {
            return;
        }
        node.active = active;
    }

    private _splitSummaryLines(value: string | undefined, fallback: string): string[] {
        const lines = (value ?? '')
            .split(/\n+/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        if (lines.length === 0) {
            return [fallback];
        }

        return lines.slice(0, 2);
    }

    private _formatNumber(value: number | null | undefined): string {
        if (value === null || value === undefined) {
            return '--';
        }
        return `${value}`;
    }

    private _toColor(rgb: [number, number, number]): Color {
        return new Color(rgb[0], rgb[1], rgb[2], 255);
    }
}
