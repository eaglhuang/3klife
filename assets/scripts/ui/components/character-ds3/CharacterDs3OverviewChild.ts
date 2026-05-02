import { Color, Node, Sprite, UITransform } from 'cc';
import { ChildPanelBase } from '../../core/ChildPanelBase';
import { UCUFLogger, LogCategory } from '../../core/UCUFLogger';
import type { GeneralDetailOverviewContentState } from '../GeneralDetailOverviewMapper';

type Ds3StatKey = 'str' | 'lea' | 'cha' | 'int' | 'pol' | 'luk';

interface Ds3SummaryLineSlot {
    row: string;
    bullet: string;
    text: string;
}

const CORE_STAT_LABELS: Record<Ds3StatKey, string> = {
    str: 'CharacterDs3Main_span_16',
    lea: 'CharacterDs3Main_span_18',
    cha: 'CharacterDs3Main_span_20',
    int: 'CharacterDs3Main_span_22',
    pol: 'CharacterDs3Main_span_24',
    luk: 'CharacterDs3Main_span_26',
};

const ROLE_LINE_SLOTS: Ds3SummaryLineSlot[] = [
    {
        row: 'CharacterDs3Main_div_28',
        bullet: 'CharacterDs3Main_span_29',
        text: 'CharacterDs3Main_span_30',
    },
    {
        row: 'CharacterDs3Main_div_29',
        bullet: 'CharacterDs3Main_span_31',
        text: 'CharacterDs3Main_span_32',
    },
];

const TRAIT_LINE_SLOTS: Ds3SummaryLineSlot[] = [
    {
        row: 'CharacterDs3Main_div_33',
        bullet: 'CharacterDs3Main_span_35',
        text: 'CharacterDs3Main_span_36',
    },
    {
        row: 'CharacterDs3Main_div_34',
        bullet: 'CharacterDs3Main_span_37',
        text: 'CharacterDs3Main_span_38',
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
        this._setLabelText('CharacterDs3Main_span_41', state.crestTitle);
        this._setLabelText('CharacterDs3Main_div_42', state.bloodlineName);
        this._setLabelText('CharacterDs3Main_span_43', `${Math.round(state.awakeningProgress)}%`);
        this._setLabelText('CharacterDs3Main_span_45', state.crestHint);
        this._setLabelText('CharacterDs3Main_span_47', state.personalityValue);
        this._setLabelText('CharacterDs3Main_div_52', state.footerTitle);

        this._applyCoreStats(state);
        this._applySummaryLines(state.roleValue, ROLE_LINE_SLOTS, '定位未定');
        this._applySummaryLines(state.traitValue, TRAIT_LINE_SLOTS, '氣質描述待補');
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
        const pillNode = this.binder.getNode('CharacterDs3Main_div_12_pill');
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
        const trackNode = this.binder.getNode('CharacterDs3Main_div_44');
        const fillNode = this.binder.getNode('CharacterDs3Main_div_45');
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
