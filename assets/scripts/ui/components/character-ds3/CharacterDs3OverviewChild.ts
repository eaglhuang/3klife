import { Color, Sprite, UITransform } from 'cc';
import { ChildPanelBase } from '../../core/ChildPanelBase';
import { UCUFLogger, LogCategory } from '../../../core/utils/UCUFLogger';
import type { GeneralDetailOverviewContentState } from '../GeneralDetailOverviewMapper';

type Ds3StatKey = 'str' | 'lea' | 'cha' | 'int' | 'pol' | 'luk';

interface Ds3SummaryLineSlot {
    row: string;
    text: string;
}

const CORE_STAT_LABELS: Record<Ds3StatKey, string> = {
    str: 'CharacterDs3TabOverview_span_12',
    lea: 'CharacterDs3TabOverview_span_14',
    cha: 'CharacterDs3TabOverview_span_16',
    int: 'CharacterDs3TabOverview_span_18',
    pol: 'CharacterDs3TabOverview_span_20',
    luk: 'CharacterDs3TabOverview_span_22',
};

const ROLE_LINE_SLOTS: Ds3SummaryLineSlot[] = [
    {
        row: 'CharacterDs3TabOverview_div_22',
        text: 'CharacterDs3TabOverview_span_26',
    },
    {
        row: 'CharacterDs3TabOverview_div_23',
        text: 'CharacterDs3TabOverview_span_28',
    },
];

const TRAIT_LINE_SLOTS: Ds3SummaryLineSlot[] = [
    {
        row: 'CharacterDs3TabOverview_div_27',
        text: 'CharacterDs3TabOverview_span_32',
    },
    {
        row: 'CharacterDs3TabOverview_div_28',
        text: 'CharacterDs3TabOverview_span_34',
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

const ACTIVE_STAR_COLOR = new Color(212, 175, 55, 255);
const INACTIVE_STAR_COLOR = new Color(77, 70, 53, 255);

export class CharacterDs3OverviewChild extends ChildPanelBase {
    override dataSource = 'overview';
    private static readonly ROOT_PATH = 'CharacterDs3Main_div_8';

    public override async onMount(_spec: Record<string, unknown>): Promise<void> {
        UCUFLogger.info(LogCategory.LIFECYCLE, '[CharacterDs3OverviewChild] onMount', { rootPath: CharacterDs3OverviewChild.ROOT_PATH });
        if (!this.binder.getLabel('CharacterDs3TabOverview_span_1')) {
            throw new Error('[CharacterDs3OverviewChild] 缺少正式 Overview 人物名稱節點');
        }
    }

    public override onDataUpdate(data: unknown): void {
        if (!data || typeof data !== 'object') {
            return;
        }

        const state = data as GeneralDetailOverviewContentState;
        this._lastData = state;

        this._setLabelText('CharacterDs3TabOverview_span_1', state.headerName);
        this._setLabelText('CharacterDs3TabOverview_span_2', state.headerTitle);
        this._setLabelText('CharacterDs3TabOverview_div_5', state.headerMeta);
        this._setLabelText('CharacterDs3TabOverview_span_3', state.rarityLabel);
        this._setLabelText('CharacterDs3TabOverview_div_45', state.biographyBody);
        this._setLabelText('CharacterDs3TabOverview_span_37', state.crestTitle);
        this._setLabelText('CharacterDs3TabOverview_div_36', state.bloodlineName);
        this._setLabelText('CharacterDs3TabOverview_span_39', `${Math.round(state.awakeningProgress)}%`);
        this._setLabelText('CharacterDs3TabOverview_span_41', state.crestHint);
        this._setLabelText('CharacterDs3TabOverview_span_43', state.personalityValue);
        this._setLabelText('CharacterDs3TabOverview_div_46', state.footerTitle);

        this._applyCoreStats(state);
        this._applySummaryLines(state.roleValue, ROLE_LINE_SLOTS, '—');
        this._applySummaryLines(state.traitValue, TRAIT_LINE_SLOTS, '—');
        this._applyRarityPill(state.rarityTier);
        this._applyRarityStars(state.rarityTier);
        this._applyAwakeningProgress(state.awakeningProgress);

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
            this._setLabelText(slot.text, line);
        }
    }

    private _applyRarityStars(tier: GeneralDetailOverviewContentState['rarityTier']): void {
        const root = this.binder.getNode('CharacterDs3TabOverview_div_7');
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
        const pillNode = this.binder.getNode('CharacterDs3TabOverview_div_6');
        const pillSprite = pillNode?.getComponent(Sprite) ?? null;
        const pillLabel = this.binder.getLabel('CharacterDs3TabOverview_span_3');

        if (pillSprite) {
            pillSprite.color = this._toColor(DS3_RARITY_PILL_BG[tier]);
        }

        if (pillLabel) {
            pillLabel.color = this._toColor(DS3_RARITY_PILL_TEXT[tier]);
        }
    }

    private _applyAwakeningProgress(progress: number): void {
        const trackNode = this.binder.getNode('CharacterDs3TabOverview_div_38');
        const fillNode = this.binder.getNode('CharacterDs3TabOverview_div_39');
        const trackTransform = trackNode?.getComponent(UITransform) ?? null;
        const fillTransform = fillNode?.getComponent(UITransform) ?? null;
        if (!trackTransform || !fillTransform) {
            return;
        }

        const ratio = Math.max(0, Math.min(1, progress / 100));
        fillTransform.width = Math.round(trackTransform.width * ratio);
    }

    private _setLabelText(nodeName: string, text: string): void {
        const label = this.binder.getLabel(nodeName);
        if (!label) {
            throw new Error(`[CharacterDs3OverviewChild] 缺少資料欄位 ${nodeName}`);
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
