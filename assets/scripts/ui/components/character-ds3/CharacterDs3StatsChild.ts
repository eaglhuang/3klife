// @spec-source → 武將人物介面規格書.md (doc_ui_0012)；PROG-2-1429 依建檔紀錄補標出處
import { Color, Label, Layout, Node, Sprite, UITransform } from 'cc';
import { ChildPanelBase } from '../../core/ChildPanelBase';
import { GradientBackground } from '../../components/GradientBackground';
import { RoundedRectBackground } from '../../components/RoundedRectBackground';
import { SolidBackground } from '../../components/SolidBackground';
import type { GeneralConfig, GeneralStatsConfig, GeneralTalentRevealLevel } from '../../../core/models/GeneralUnit';
import type { RadarChartConfig } from '../../core/interfaces/ICompositeRenderer';
import { resolveStat } from '../general-detail/GeneralDetailFormatters';
import { UCUFLogger, LogCategory } from '../../../core/utils/UCUFLogger';
import { services } from '../../../core/managers/ServiceLoader';
import { describeVitality } from '../../core/LifeVitalityPresenter';
import { loyaltyGaugeOf, type LoyaltyTier } from '../../../core/systems/LoyaltyGauge';
import { placeDs3BarFill } from './Ds3BarFill';

/** 忠誠度條（HUM-04）顏色：正常沿用金色，低於 60 橙色、低於 30 紅色 */
const LOYALTY_TIER_HEX: Record<LoyaltyTier, string> = {
    normal: '#FFE088',
    warn: '#F0A040',
    danger: '#E05050',
};
/** 忠誠度條與精力條之間的間距、條高與數字行高（執行期建立，版位由 Codex 實機微調） */
const LOYALTY_ROW_GAP = 8;
const LOYALTY_BAR_HEIGHT = 8;
const LOYALTY_LABEL_HEIGHT = 16;

type StatKey = keyof GeneralStatsConfig;

interface StatRowDefinition {
    key: StatKey;
    colorToken: string;
}

interface StatRowBinding {
    current: Label;
    prowess: Label;
    max: Label | null;
    barTrack: Node;
    barFill: Node;
}

interface VitalBinding {
    value: Label;
    max: Label;
    barTrack: Node;
    barFill: Node;
}

export interface Ds3StatRowView {
    talent: string;
    prowess: string;
    max: string;
    barRatio: number;
    /** 未完整揭露時條的顏色（v3 tabs.jsx）；null 表示用該屬性的代表色 */
    barColor: string | null;
}

const STAT_DEFS: StatRowDefinition[] = [
    { key: 'str', colorToken: 'gdv3StatStr' },
    { key: 'int', colorToken: 'gdv3StatInt' },
    { key: 'lea', colorToken: 'gdv3StatLea' },
    { key: 'pol', colorToken: 'gdv3StatPol' },
    { key: 'cha', colorToken: 'gdv3StatCha' },
    { key: 'luk', colorToken: 'gdv3StatLuk' },
];

const PROWESS_MAX = 2000;
const TAG_SLOT_COUNT = 2;
const BAR_GRADIENT_START_ALPHA = 136;
const BAR_CORNER_RADIUS = 3;

const RADAR_AXIS_LABELS: Record<StatKey, string> = {
    str: '武力',
    int: '智力',
    lea: '統率',
    pol: '政治',
    cha: '魅力',
    luk: '運氣',
};

/** 依揭露階段決定顯示內容（v3 §6.2.1）：未揭露時不露數值，條長歸零 */
export function buildDs3StatRow(level: GeneralTalentRevealLevel | undefined, talent: number, prowess: number): Ds3StatRowView {
    const clampedRatio = Math.max(0, Math.min(1, prowess / PROWESS_MAX));
    switch (level) {
    case 'HIDDEN':
        return { talent: '?', prowess: '?', max: '', barRatio: 0, barColor: '#4D4635' };
    case 'TENDENCY':
        return { talent: '傾', prowess: '待', max: '', barRatio: 0, barColor: '#B0A880' };
    case 'RANGE':
        return { talent: `${talent}`, prowess: '~', max: '', barRatio: clampedRatio, barColor: '#C8B060' };
    default:
        return { talent: `${talent}`, prowess: prowess.toLocaleString(), max: `/${PROWESS_MAX}`, barRatio: clampedRatio, barColor: null };
    }
}

/** 資料未提供評等時，由最高能力值推算；門檻待規格定案 */
export function deriveDs3Rank(rawRank: unknown, stats: number[]): string {
    if (typeof rawRank === 'string' && rawRank.trim().length > 0) return rawRank.trim().toUpperCase();
    if (typeof rawRank === 'number') return `${Math.round(rawRank)}`;
    const top = Math.max(0, ...stats);
    if (top >= 98) return 'SS';
    if (top >= 90) return 'S';
    if (top >= 75) return 'A';
    if (top >= 60) return 'B';
    return 'C';
}

export class CharacterDs3StatsChild extends ChildPanelBase {
    override dataSource = 'config';
    private static readonly ROOT_PATH = 'ContentSlot';

    private _radarChartNode: Node | null = null;
    private _statRows: StatRowBinding[] = [];
    private _hp!: VitalBinding;
    private _sp!: VitalBinding;
    private _vitality!: VitalBinding;
    private _loyaltyTrack: Node | null = null;
    private _loyaltyFill: Node | null = null;
    private _loyaltyLabel: Label | null = null;
    private _roleComment: Label | null = null;
    private _gradeBadge: Label | null = null;
    private _totalRankBadge: Label | null = null;
    private _totalRankText: Label | null = null;
    private _tokenColors: Record<string, string> = {};
    private _latestConfig: GeneralConfig | null = null;
    private _metrics = {
        radarSize: 90,
        radarAxisLabelRadiusOffset: 18,
        radarAxisLabelOffsetY: 5,
        radarFillOpacity: 0.18,
        radarGridRings: 4,
        radarGridLineWidth: 0.7,
        radarAxisLineWidth: 0.7,
        radarOutlineWidth: 2,
        radarMarkerRadius: 4,
        prowessScaleFactor: 17,
    };

    public override async onMount(_spec: Record<string, unknown>): Promise<void> {
        await this._loadTokenColors();
        this._radarChartNode = this._node('StatsRadar');
        this._statRows = STAT_DEFS.map((def) => this._bindStatRow(def.key));
        this._normalizeStatRows();
        this._hp = this._bindVital('hp');
        this._sp = this._bindVital('sp');
        this._vitality = this._bindVital('vitality');
        this._ensureLoyaltyRow();
        this._roleComment = this._findLabel('StatsRoleComment');
        this._gradeBadge = this._findLabel('StatsGradeBadge');
        this._totalRankBadge = this._findLabel('StatsRankBadge');
        this._totalRankText = this._findLabel('StatsRankText');
        // 教官群目前只有設計稿範例，沒有武將資料可接，先不顯示
        this._setActive('StatsMentorTitle', false);
        this._setActive('StatsMentorGrid', false);

        UCUFLogger.info(LogCategory.LIFECYCLE, '[CharacterDs3StatsChild] onMount', {
            rootPath: CharacterDs3StatsChild.ROOT_PATH,
            boundRows: this._statRows.length,
        });

        if (this._latestConfig) {
            this.onDataUpdate(this._latestConfig);
        }
    }

    public override onDataUpdate(data: unknown): void {
        if (!data || typeof data !== 'object') {
            return;
        }

        const cfg = data as GeneralConfig;
        this._latestConfig = cfg;
        void this._syncRadar(cfg);
        this._syncStatsRows(cfg);
        this._syncVitals(cfg);
        this._syncLoyalty(cfg.id);
        this._syncHeader(cfg);
    }

    public override validateDataFormat(data: unknown): string | null {
        if (!data || typeof data !== 'object') {
            return 'CharacterDs3StatsChild expects a GeneralConfig-like object';
        }
        return null;
    }

    public override onUnmount(): void {
        this._radarChartNode = null;
        this._statRows = [];
    }

    private _bindStatRow(key: StatKey): StatRowBinding {
        return {
            current: this._label(`Stats_${key}_current`),
            prowess: this._label(`Stats_${key}_prowess`),
            max: this._findLabel(`Stats_${key}_max`),
            barTrack: this._node(`Stats_${key}_track`),
            barFill: this._node(`Stats_${key}_fill`),
        };
    }

    /** 轉換來源的範例資料有未揭露列（沒有上限文字、列較矮）；實際每列都可能完整揭露，以第一列為範本補齊 */
    private _normalizeStatRows(): void {
        const template = this._statRows[0];
        const templateMax = template?.max;
        if (!templateMax) return;
        STAT_DEFS.forEach((def, index) => {
            const binding = this._statRows[index];
            if (binding.max) return;
            const maxNode = this._node(`Stats_${def.key}_max`);
            const label = maxNode.addComponent(Label);
            label.font = templateMax.font;
            label.fontSize = templateMax.fontSize;
            label.lineHeight = templateMax.lineHeight;
            label.horizontalAlign = templateMax.horizontalAlign;
            label.overflow = templateMax.overflow;
            label.verticalAlign = templateMax.verticalAlign;
            label.color = templateMax.color;
            binding.max = label;
            this._copySize(this._node(`Stats_${STAT_DEFS[0].key}_max`), maxNode);
            this._copyHeight(template.barTrack.parent, binding.barTrack.parent);
            this._copyHeight(template.barTrack.parent?.parent ?? null, binding.barTrack.parent?.parent ?? null);
            binding.barTrack.parent?.getComponent(Layout)?.updateLayout();
            binding.barTrack.parent?.parent?.getComponent(Layout)?.updateLayout();
        });
        template.barTrack.parent?.parent?.parent?.getComponent(Layout)?.updateLayout();
    }

    private _copySize(from: Node, to: Node): void {
        const fromTransform = from.getComponent(UITransform);
        const toTransform = to.getComponent(UITransform) ?? to.addComponent(UITransform);
        if (!fromTransform) return;
        toTransform.setAnchorPoint(fromTransform.anchorX, fromTransform.anchorY);
        toTransform.setContentSize(fromTransform.width, fromTransform.height);
    }

    private _copyHeight(from: Node | null, to: Node | null): void {
        const fromTransform = from?.getComponent(UITransform);
        const toTransform = to?.getComponent(UITransform) ?? to?.addComponent(UITransform);
        if (fromTransform && toTransform) toTransform.setContentSize(toTransform.width, fromTransform.height);
    }

    private _setBarColor(fillNode: Node, hex: string): void {
        const color = this._hexToColor(hex);
        const rounded = fillNode.getComponent(RoundedRectBackground);
        if (rounded) rounded.enabled = false;
        const solid = fillNode.getComponent(SolidBackground);
        if (solid) solid.enabled = false;
        const gradient = fillNode.getComponent(GradientBackground) ?? fillNode.addComponent(GradientBackground);
        gradient.enabled = true;
        gradient.setLinearGradient(90, [
            { offset: 0, color: new Color(color.r, color.g, color.b, BAR_GRADIENT_START_ALPHA) },
            { offset: 1, color },
        ], { cornerRadius: BAR_CORNER_RADIUS });
    }

    private _bindVital(key: 'hp' | 'sp' | 'vitality'): VitalBinding {
        return {
            value: this._label(`Stats_${key}_value`),
            max: this._label(`Stats_${key}_max`),
            barTrack: this._node(`Stats_${key}_track`),
            barFill: this._node(`Stats_${key}_fill`),
        };
    }

    private async _syncRadar(cfg: GeneralConfig): Promise<void> {
        if (!this._radarChartNode || !this._services.renderer) {
            return;
        }

        const radarHostTransform = this._radarChartNode.getComponent(UITransform);
        const availableSize = Math.max(
            160,
            Math.min(
                radarHostTransform?.width ?? 220,
                radarHostTransform?.height ?? 220,
            ),
        );
        const preferredRadarSize = Math.round(this._metrics.radarSize ?? 90);
        const preferredLabelOffset = Math.round(this._metrics.radarAxisLabelRadiusOffset ?? 18);
        const radarSize = Math.max(72, Math.min(preferredRadarSize, Math.floor(availableSize * 0.41)));
        const axisLabelRadiusOffset = Math.max(16, preferredLabelOffset);
        const sourceSvg = this._readRadarSourceSvg();

        const chartConfig: RadarChartConfig = {
            axes: STAT_DEFS.map((def) => RADAR_AXIS_LABELS[def.key]),
            layers: [
                {
                    values: STAT_DEFS.map((def) => {
                        const stat = cfg.dualLayerStats?.[def.key];
                        const current = stat?.current ?? stat?.base ?? resolveStat(cfg, def.key) ?? 0;
                        return Math.max(0, Math.min(1, current / 100));
                    }),
                    label: '當前屬性',
                    color: this._tokenColor('accent.jade.crest', '#8CCFC4'),
                    opacity: this._metrics.radarFillOpacity,
                },
            ],
            size: radarSize,
            gridColor: this._tokenColor('gdv3RadarGrid', '#4D4635'),
            labelFontSize: 13,
            axisLabelColors: STAT_DEFS.map((def) => this._tokenColor(def.colorToken, '#8CCFC4')),
            axisLabelRadius: radarSize + axisLabelRadiusOffset,
            axisLabelOffsetY: Math.round(this._metrics.radarAxisLabelOffsetY ?? 5),
            showAxisLabels: true,
            gridRings: this._metrics.radarGridRings,
            gridLineWidth: this._metrics.radarGridLineWidth,
            axisLineWidth: this._metrics.radarAxisLineWidth,
            outlineWidth: this._metrics.radarOutlineWidth,
            markerColors: STAT_DEFS.map((def) => this._tokenColor(def.colorToken, '#8CCFC4')),
            markerRadius: this._metrics.radarMarkerRadius,
            sourceSvg,
        };

        this._normalizeRadarChartNode();
        if ((this._radarChartNode as Node & { __statsRadar?: boolean }).__statsRadar) {
            this._services.renderer.updateRadarChart(this._radarChartNode, chartConfig);
            return;
        }

        const chartNode = await this._services.renderer.drawRadarChart(this._radarChartNode, chartConfig);
        this._radarChartNode = chartNode as Node;
        if (sourceSvg) {
            (this._radarChartNode as Node & { __ucufRendererHint?: string }).__ucufRendererHint = 'svg-radar-chart';
            (this._radarChartNode as Node & { __ucufSvgMeta?: RadarChartConfig['sourceSvg'] }).__ucufSvgMeta = sourceSvg;
        }
        (this._radarChartNode as Node & { __statsRadar?: boolean }).__statsRadar = true;
    }

    private _readRadarSourceSvg(): RadarChartConfig['sourceSvg'] | undefined {
        const node = this._radarChartNode as (Node & {
            __ucufRendererHint?: string;
            __ucufSvgMeta?: RadarChartConfig['sourceSvg'];
        }) | null;
        if (!node || node.__ucufRendererHint !== 'svg-radar-chart' || !node.__ucufSvgMeta) {
            return undefined;
        }
        return node.__ucufSvgMeta;
    }

    private _normalizeRadarChartNode(): void {
        const node = this._radarChartNode;
        if (!node || (node as Node & { __statsRadar?: boolean }).__statsRadar) {
            return;
        }

        const charts = node.children.filter((child) => child.name === 'RadarChart');
        if (charts.length === 0) {
            return;
        }

        const keep = charts[0];
        for (let index = 1; index < charts.length; index += 1) {
            charts[index].destroy();
        }
        this._radarChartNode = keep;
        (this._radarChartNode as Node & { __statsRadar?: boolean }).__statsRadar = true;
    }

    private _syncStatsRows(cfg: GeneralConfig): void {
        STAT_DEFS.forEach((def, index) => {
            const binding = this._statRows[index];
            if (!binding) {
                return;
            }

            const stat = cfg.dualLayerStats?.[def.key];
            const current = Math.round(stat?.current ?? stat?.base ?? resolveStat(cfg, def.key) ?? 0);
            const prowess = stat?.prowess != null
                ? Math.round(stat.prowess)
                : Math.round(current * this._metrics.prowessScaleFactor);

            const view = buildDs3StatRow(stat?.revelationLevel, current, prowess);
            binding.current.string = view.talent;
            binding.current.color = this._hexToColor(this._tokenColor(def.colorToken, '#8CCFC4'));
            binding.prowess.string = view.prowess;
            binding.prowess.color = this._hexToColor(this._tokenColor('gdv3NumProwess', '#E8D8A0'));
            if (binding.max) binding.max.string = view.max;
            this._setBarRatio(binding.barTrack, binding.barFill, view.barRatio);
            this._setBarColor(binding.barFill, view.barColor ?? this._tokenColor(def.colorToken, '#8CCFC4'));
        });
    }

    private _syncVitals(cfg: GeneralConfig): void {
        const currentHp = cfg.currentHp ?? cfg.hp;
        const maxHp = cfg.hp;
        const currentSp = cfg.currentSp ?? cfg.initialSp ?? cfg.maxSp ?? 0;
        const maxSp = cfg.maxSp ?? currentSp;

        this._syncVital(this._hp, currentHp, maxHp);
        this._syncVital(this._sp, currentSp, maxSp);

        // 精力條沿用 LifeVitalityPresenter 的比例與三段變色（PROG-2-0074）
        const vit = describeVitality(cfg);
        this._syncVital(this._vitality, vit.current, vit.max);
        this._setBarColorHex(this._vitality.barFill, vit.color);
    }

    /**
     * 依忠誠紀錄更新忠誠度條與數字（HUM-04）。轉蛋武將鎖定為 100 並顯示鎖定字樣。
     * 沒有紀錄時用開局初值，見 LoyaltyGauge。
     */
    private _syncLoyalty(generalId: string): void {
        if (!this._loyaltyTrack || !this._loyaltyFill || !this._loyaltyLabel) return;
        const view = loyaltyGaugeOf(services().session.tallyLoyalty[generalId]);
        this._setBarRatio(this._loyaltyTrack, this._loyaltyFill, view.ratio);
        this._setBarColorHex(this._loyaltyFill, LOYALTY_TIER_HEX[view.tier]);

        const valueText = view.locked
            ? `${view.value} ${this.t('ui.general.loyalty.locked')}`
            : `${view.value} / 100`;
        this._loyaltyLabel.string = `${this.t('ui.general.loyalty')} ${valueText}`;
        this._loyaltyLabel.color = this._hexToColor(LOYALTY_TIER_HEX[view.tier]);
    }

    /**
     * 在精力條正下方建立忠誠度條與數字（HUM-04）。布局 JSON 沒有這一列，所以執行期建立；
     * 位置以精力條推算，沿用精力條的寬度，填充以左緣對齊。
     */
    private _ensureLoyaltyRow(): void {
        const vitalTrack = this._vitality.barTrack;
        const parent = vitalTrack.parent;
        if (!parent || this._loyaltyTrack) return;

        const width = vitalTrack.getComponent(UITransform)?.width ?? 255;
        const trackY = vitalTrack.position.y - LOYALTY_ROW_GAP - LOYALTY_BAR_HEIGHT / 2;

        const track = new Node('LoyaltyBarTrack');
        parent.addChild(track);
        track.addComponent(UITransform).setContentSize(width, LOYALTY_BAR_HEIGHT);
        track.setPosition(vitalTrack.position.x, trackY, vitalTrack.position.z);
        track.addComponent(SolidBackground).color = new Color(0, 0, 0, 120);

        const fill = new Node('LoyaltyBarFill');
        track.addChild(fill);
        const fillTf = fill.addComponent(UITransform);
        fillTf.anchorX = 0;
        fillTf.setContentSize(0, LOYALTY_BAR_HEIGHT);
        fill.setPosition(-width / 2, 0, 0);

        const labelNode = new Node('LoyaltyValue');
        parent.addChild(labelNode);
        labelNode.setPosition(vitalTrack.position.x, trackY - LOYALTY_LABEL_HEIGHT, vitalTrack.position.z);
        const label = labelNode.addComponent(Label);
        label.fontSize = 14;
        label.lineHeight = LOYALTY_LABEL_HEIGHT;

        this._loyaltyTrack = track;
        this._loyaltyFill = fill;
        this._loyaltyLabel = label;
    }

    private _syncVital(binding: VitalBinding, value: number, max: number): void {
        const current = Math.max(0, Math.round(value));
        const total = Math.max(0, Math.round(max));
        binding.value.string = current.toLocaleString();
        binding.max.string = `/ ${total.toLocaleString()}`;
        binding.value.color = this._hexToColor(this._tokenColor('accent.gold.light', '#FFE088'));
        binding.max.color = this._hexToColor(this._tokenColor('gdv3TextMetaDim', '#807765'));
        this._setBarRatio(binding.barTrack, binding.barFill, total > 0 ? current / total : 0);
    }

    private _syncHeader(cfg: GeneralConfig): void {
        const stats = STAT_DEFS.map((def) => Math.round(resolveStat(cfg, def.key) ?? 0));
        const rank = deriveDs3Rank((cfg as { prowessRank?: unknown }).prowessRank, stats);
        if (this._gradeBadge) this._gradeBadge.string = rank;
        if (this._totalRankBadge) this._totalRankBadge.string = rank;
        if (this._totalRankText) this._totalRankText.string = this._describeRank(rank);

        const topKey = STAT_DEFS[stats.indexOf(Math.max(...stats))].key;
        const title = cfg.title?.replace(/[【】]/g, '').trim();
        if (this._roleComment) {
            this._roleComment.string = `${RADAR_AXIS_LABELS[topKey]}型${title ? ` · ${title}` : ''}`;
        }

        const tags = (cfg as { graduationTags?: string[] }).graduationTags ?? [];
        this._setActive('StatsTagRow', tags.length > 0);
        for (let index = 0; index < TAG_SLOT_COUNT; index += 1) {
            this._setActive(`StatsTag_${index}`, index < tags.length);
            const tagLabel = this._findLabel(`StatsTag_${index}`);
            if (tagLabel && index < tags.length) tagLabel.string = tags[index];
        }
    }

    private async _loadTokenColors(): Promise<void> {
        const defaultMetrics = this._metrics;
        const designTokens = await services().specLoader.loadDesignTokens() as {
            colors?: Record<string, string>;
            generalDetailStats?: Partial<typeof defaultMetrics>;
        };
        this._tokenColors = designTokens?.colors && typeof designTokens.colors === 'object'
            ? designTokens.colors
            : {};
        if (designTokens?.generalDetailStats && typeof designTokens.generalDetailStats === 'object') {
            this._metrics = { ...this._metrics, ...designTokens.generalDetailStats };
        }
    }

    /** 條的寬度已由 _syncVital 依比例設定，這裡只換成 LifeVitalityPresenter 給的三段色 */
    private _setBarColorHex(fillNode: Node, hex: string): void {
        const color = this._hexToColor(hex);
        const solidBackground = fillNode.getComponent(SolidBackground);
        if (solidBackground) {
            solidBackground.color = color;
            return;
        }
        const sprite = fillNode.getComponent(Sprite);
        if (sprite) {
            sprite.color = color;
        }
    }

    private _setBarRatio(trackNode: Node, fillNode: Node, ratio: number): void {
        const trackTransform = trackNode.getComponent(UITransform) ?? trackNode.addComponent(UITransform);
        const fillTransform = fillNode.getComponent(UITransform) ?? fillNode.addComponent(UITransform);
        const placement = placeDs3BarFill(trackTransform.width, trackTransform.anchorX, fillTransform.anchorX, ratio);
        fillTransform.setContentSize(placement.width, fillTransform.height || trackTransform.height);
        fillNode.setPosition(placement.x, fillNode.position.y, fillNode.position.z);
    }

    private _describeRank(rank: string): string {
        switch (rank) {
        case 'SS':
            return '冠絕群倫';
        case 'S':
            return '良才美質';
        case 'A':
            return '獨當一面';
        case 'B':
            return '可堪重任';
        default:
            return '尚可培養';
        }
    }

    private _label(name: string): Label {
        const label = this._findLabel(name);
        if (!label) {
            UCUFLogger.error(LogCategory.LIFECYCLE, `[CharacterDs3StatsChild] missing label ${name}`);
            throw new Error(`[CharacterDs3StatsChild] missing label ${name}`);
        }
        return label;
    }

    /** 有底色的文字會被轉成「面板＋文字」兩層，名字在面板上，文字在子節點 */
    private _findLabel(name: string): Label | null {
        const node = this.binder.getNode(name) ?? this._findDescendantByName(this.hostNode, name);
        const label = this.binder.getLabel(name) ?? node?.getComponent(Label) ?? node?.getComponentInChildren(Label) ?? null;
        // 換將時字元不可預期，不佔共用字元圖集（CHAR 滿了會缺字）
        if (label && label.cacheMode === Label.CacheMode.CHAR) label.cacheMode = Label.CacheMode.NONE;
        return label;
    }

    private _setActive(name: string, active: boolean): void {
        const node = this.binder.getNode(name) ?? this._findDescendantByName(this.hostNode, name);
        if (node) node.active = active;
    }

    private _node(name: string): Node {
        const node = this.binder.getNode(name) ?? this._findDescendantByName(this.hostNode, name);
        if (!node) {
            UCUFLogger.error(LogCategory.LIFECYCLE, `[CharacterDs3StatsChild] missing node ${name}`);
            throw new Error(`[CharacterDs3StatsChild] missing node ${name}`);
        }
        return node;
    }

    private _tokenColor(tokenKey: string, fallback: string): string {
        return this._tokenColors[tokenKey] ?? fallback;
    }

    private _hexToColor(hex: string): Color {
        const raw = hex.replace('#', '');
        const r = parseInt(raw.slice(0, 2), 16);
        const g = parseInt(raw.slice(2, 4), 16);
        const b = parseInt(raw.slice(4, 6), 16);
        const a = raw.length >= 8 ? parseInt(raw.slice(6, 8), 16) : 255;
        return new Color(r, g, b, a);
    }

    private _findDescendantByName(root: Node | null, name: string): Node | null {
        if (!root) {
            return null;
        }
        if (root.name === name) {
            return root;
        }
        for (const child of root.children) {
            const match = this._findDescendantByName(child, name);
            if (match) {
                return match;
            }
        }
        return null;
    }
}
