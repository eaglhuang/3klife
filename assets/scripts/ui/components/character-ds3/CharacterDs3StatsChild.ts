import { Color, Label, Node, Sprite, UITransform } from 'cc';
import { ChildPanelBase } from '../../core/ChildPanelBase';
import { SolidBackground } from '../../components/SolidBackground';
import type { GeneralConfig, GeneralStatsConfig } from '../../../core/models/GeneralUnit';
import type { RadarChartConfig } from '../../core/interfaces/ICompositeRenderer';
import { resolveStat } from '../general-detail/GeneralDetailFormatters';
import { UCUFLogger, LogCategory } from '../../../core/utils/UCUFLogger';
import { services } from '../../../core/managers/ServiceLoader';

type StatKey = keyof GeneralStatsConfig;

interface StatRowDefinition {
    key: StatKey;
    currentLabel: string;
    prowessLabel: string;
    barTrack: string;
    barFill: string;
    colorToken: string;
}

interface StatRowBinding {
    current: Label;
    prowess: Label;
    barTrack: Node;
    barFill: Node;
}

interface VitalBinding {
    value: Label;
    max: Label;
    barTrack: Node;
    barFill: Node;
}

const STAT_DEFS: StatRowDefinition[] = [
    {
        key: 'str',
        currentLabel: 'CharacterDs3TabStats_span_4',
        prowessLabel: 'CharacterDs3TabStats_span_6',
        barTrack: 'CharacterDs3TabStats_div_10',
        barFill: 'CharacterDs3TabStats_div_11',
        colorToken: 'gdv3StatStr',
    },
    {
        key: 'int',
        currentLabel: 'CharacterDs3TabStats_span_9',
        prowessLabel: 'CharacterDs3TabStats_span_11',
        barTrack: 'CharacterDs3TabStats_div_16',
        barFill: 'CharacterDs3TabStats_div_17',
        colorToken: 'gdv3StatInt',
    },
    {
        key: 'lea',
        currentLabel: 'CharacterDs3TabStats_span_14',
        prowessLabel: 'CharacterDs3TabStats_span_16',
        barTrack: 'CharacterDs3TabStats_div_22',
        barFill: 'CharacterDs3TabStats_div_23',
        colorToken: 'gdv3StatLea',
    },
    {
        key: 'pol',
        currentLabel: 'CharacterDs3TabStats_span_19',
        prowessLabel: 'CharacterDs3TabStats_span_21',
        barTrack: 'CharacterDs3TabStats_div_28',
        barFill: 'CharacterDs3TabStats_div_29',
        colorToken: 'gdv3StatPol',
    },
    {
        key: 'cha',
        currentLabel: 'CharacterDs3TabStats_span_24',
        prowessLabel: 'CharacterDs3TabStats_span_26',
        barTrack: 'CharacterDs3TabStats_div_34',
        barFill: 'CharacterDs3TabStats_div_35',
        colorToken: 'gdv3StatCha',
    },
    {
        key: 'luk',
        currentLabel: 'CharacterDs3TabStats_span_29',
        prowessLabel: 'CharacterDs3TabStats_span_31',
        barTrack: 'CharacterDs3TabStats_div_40',
        barFill: 'CharacterDs3TabStats_div_41',
        colorToken: 'gdv3StatLuk',
    },
];

const VITAL_BINDINGS = {
    hp: {
        value: 'CharacterDs3TabStats_span_38',
        max: 'CharacterDs3TabStats_div_51',
        barTrack: 'CharacterDs3TabStats_div_49',
        barFill: 'CharacterDs3TabStats_div_50',
    },
    sp: {
        value: 'CharacterDs3TabStats_span_40',
        max: 'CharacterDs3TabStats_div_56',
        barTrack: 'CharacterDs3TabStats_div_54',
        barFill: 'CharacterDs3TabStats_div_55',
    },
    vitality: {
        value: 'CharacterDs3TabStats_span_42',
        max: 'CharacterDs3TabStats_div_61',
        barTrack: 'CharacterDs3TabStats_div_59',
        barFill: 'CharacterDs3TabStats_div_60',
    },
} as const;

const RADAR_AXIS_LABELS: Record<StatKey, string> = {
    str: '武力',
    int: '智力',
    lea: '統率',
    pol: '政治',
    cha: '魅力',
    luk: '運氣',
};

export class CharacterDs3StatsChild extends ChildPanelBase {
    override dataSource = 'config';
    private static readonly ROOT_PATH = 'CharacterDs3Main_div_8';

    private _radarChartNode: Node | null = null;
    private _statRows: StatRowBinding[] = [];
    private _hp!: VitalBinding;
    private _sp!: VitalBinding;
    private _vitality!: VitalBinding;
    private _age!: Label;
    private _vitalityProfile!: Label;
    private _status!: Label;
    private _level!: Label;
    private _totalRankBadge!: Label;
    private _totalRankText!: Label;
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
        this._radarChartNode = this._node('CharacterDs3TabStats_svg_1');
        this._statRows = STAT_DEFS.map((def) => this._bindStatRow(def));
        this._hp = this._bindVital(VITAL_BINDINGS.hp);
        this._sp = this._bindVital(VITAL_BINDINGS.sp);
        this._vitality = this._bindVital(VITAL_BINDINGS.vitality);
        this._age = this._label('CharacterDs3TabStats_span_46');
        this._vitalityProfile = this._label('CharacterDs3TabStats_span_48');
        this._status = this._label('CharacterDs3TabStats_span_50');
        this._level = this._label('CharacterDs3TabStats_span_52');
        this._totalRankBadge = this._label('CharacterDs3TabStats_div_43');
        this._totalRankText = this._label('CharacterDs3TabStats_span_34');

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
        this._syncProfile(cfg);
        this._syncTotalRank(cfg);
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

    private _bindStatRow(def: StatRowDefinition): StatRowBinding {
        return {
            current: this._label(def.currentLabel),
            prowess: this._label(def.prowessLabel),
            barTrack: this._node(def.barTrack),
            barFill: this._node(def.barFill),
        };
    }

    private _bindVital(binding: typeof VITAL_BINDINGS.hp): VitalBinding {
        return {
            value: this._label(binding.value),
            max: this._label(binding.max),
            barTrack: this._node(binding.barTrack),
            barFill: this._node(binding.barFill),
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

            binding.current.string = `${current}`;
            binding.current.color = this._hexToColor(this._tokenColor(def.colorToken, '#8CCFC4'));
            binding.prowess.string = prowess.toLocaleString();
            binding.prowess.color = this._hexToColor(this._tokenColor('gdv3NumProwess', '#E8D8A0'));
            this._setBarRatio(binding.barTrack, binding.barFill, prowess / 2000, def.colorToken, 5, 232);
        });
    }

    private _syncVitals(cfg: GeneralConfig): void {
        const currentHp = cfg.currentHp ?? cfg.hp;
        const maxHp = cfg.hp;
        const currentSp = cfg.currentSp ?? cfg.initialSp ?? cfg.maxSp ?? 0;
        const maxSp = cfg.maxSp ?? currentSp;
        const vitality = cfg.vitality ?? cfg.maxVitality ?? 0;
        const maxVitality = cfg.maxVitality ?? cfg.vitality ?? 0;

        this._syncVital(this._hp, currentHp, maxHp, 'gdv3StatLea');
        this._syncVital(this._sp, currentSp, maxSp, 'gdv3StatStr');
        this._syncVital(this._vitality, vitality, maxVitality, 'accent.gold.light');
    }

    private _syncVital(binding: VitalBinding, value: number, max: number, colorToken: string): void {
        const current = Math.max(0, Math.round(value));
        const total = Math.max(0, Math.round(max));
        binding.value.string = current.toLocaleString();
        binding.max.string = `/ ${total.toLocaleString()}`;
        binding.value.color = this._hexToColor(this._tokenColor('accent.gold.light', '#FFE088'));
        binding.max.color = this._hexToColor(this._tokenColor('gdv3TextMetaDim', '#807765'));
        this._setBarRatio(binding.barTrack, binding.barFill, total > 0 ? current / total : 0, colorToken, 8, 255);
    }

    private _syncProfile(cfg: GeneralConfig): void {
        const vitality = cfg.vitality ?? cfg.maxVitality ?? 0;
        const maxVitality = cfg.maxVitality ?? cfg.vitality ?? 0;
        const level = typeof (cfg as { level?: unknown }).level === 'number'
            ? Math.round((cfg as { level?: number }).level ?? 0)
            : null;
        const maxLevel = typeof (cfg as { maxLevel?: unknown }).maxLevel === 'number'
            ? Math.round((cfg as { maxLevel?: number }).maxLevel ?? 0)
            : null;

        this._age.string = cfg.age != null ? `${cfg.age} 歲` : '--';
        this._vitalityProfile.string = `${Math.max(0, Math.round(vitality))} / ${Math.max(0, Math.round(maxVitality))}`;
        this._status.string = cfg.status?.trim() ? cfg.status : '--';
        this._level.string = level != null
            ? `${level}${maxLevel != null ? ` / ${maxLevel}` : ''}`
            : '--';
    }

    private _syncTotalRank(cfg: GeneralConfig): void {
        const rankRaw = (cfg as { prowessRank?: unknown }).prowessRank;
        const rank = typeof rankRaw === 'string' && rankRaw.trim().length > 0
            ? rankRaw.trim().toUpperCase()
            : typeof rankRaw === 'number'
                ? `${Math.round(rankRaw)}`
                : 'S';
        this._totalRankBadge.string = rank;
        this._totalRankText.string = this._describeRank(rank);
    }

    private async _loadTokenColors(): Promise<void> {
        const designTokens = await services().specLoader.loadDesignTokens() as {
            colors?: Record<string, string>;
            generalDetailStats?: Partial<typeof this._metrics>;
        };
        this._tokenColors = designTokens?.colors && typeof designTokens.colors === 'object'
            ? designTokens.colors
            : {};
        if (designTokens?.generalDetailStats && typeof designTokens.generalDetailStats === 'object') {
            this._metrics = { ...this._metrics, ...designTokens.generalDetailStats };
        }
    }

    private _setBarRatio(trackNode: Node, fillNode: Node, ratio: number, colorToken: string, height: number, alpha: number): void {
        const trackTransform = trackNode.getComponent(UITransform) ?? trackNode.addComponent(UITransform);
        const fillTransform = fillNode.getComponent(UITransform) ?? fillNode.addComponent(UITransform);
        const safeRatio = Math.max(0, Math.min(1, ratio));
        fillTransform.setContentSize(Math.round(trackTransform.width * safeRatio), height);
        const color = this._hexToColor(this._tokenColor(colorToken, '#8CCFC4'));
        color.a = Math.max(0, Math.min(255, alpha));

        const sprite = fillNode.getComponent(Sprite);
        if (sprite) {
            sprite.color = color;
            return;
        }

        const solidBackground = fillNode.getComponent(SolidBackground);
        if (solidBackground) {
            solidBackground.color = color;
        }
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
        const direct = this.binder.getLabel(name);
        if (direct) {
            return direct;
        }
        const label = this._findDescendantByName(this.hostNode, name)?.getComponent(Label) ?? null;
        if (!label) {
            UCUFLogger.error(LogCategory.LIFECYCLE, `[CharacterDs3StatsChild] missing label ${name}`);
            throw new Error(`[CharacterDs3StatsChild] missing label ${name}`);
        }
        return label;
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
