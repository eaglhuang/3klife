import {
    Color,
    Graphics,
    HorizontalTextAlignment,
    Label,
    Layout,
    Node,
    UITransform,
    VerticalTextAlignment,
} from 'cc';
import type { NodeHandle } from '../../core/interfaces/INodeFactory';
import type {
    GridConfig,
    ICompositeRenderer,
    ProgressBarConfig,
    RadarChartConfig,
    RadarPoint,
    RadarSourceLabel,
    RadarSourceSvgGeometry,
} from '../../core/interfaces/ICompositeRenderer';
import { SolidBackground } from '../../components/SolidBackground';

function cssToColor(input: string | undefined | null, defaultAlpha = 255): Color {
    const raw = String(input || '').trim();
    if (!raw) return new Color(255, 255, 255, defaultAlpha);
    const hex = raw.replace('#', '');
    if (/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(hex)) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) : defaultAlpha;
        return new Color(r, g, b, a);
    }
    const rgba = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if (rgba) {
        const alpha = rgba[4] != null ? Math.round(Math.max(0, Math.min(1, parseFloat(rgba[4]))) * 255) : defaultAlpha;
        return new Color(
            Math.max(0, Math.min(255, parseInt(rgba[1], 10))),
            Math.max(0, Math.min(255, parseInt(rgba[2], 10))),
            Math.max(0, Math.min(255, parseInt(rgba[3], 10))),
            alpha,
        );
    }
    return new Color(255, 255, 255, defaultAlpha);
}

function ensureUITransform(node: Node, width: number, height: number): UITransform {
    let transform = node.getComponent(UITransform);
    if (!transform) transform = node.addComponent(UITransform);
    transform.setContentSize(width, height);
    return transform;
}

type RadarLabelBox = { width: number; height: number };
type RadarLayoutMetrics = {
    canvasWidth: number;
    canvasHeight: number;
    labelBoxes: RadarLabelBox[];
};

export class CocosCompositeRenderer implements ICompositeRenderer {
    async drawRadarChart(parent: NodeHandle, config: RadarChartConfig): Promise<NodeHandle> {
        const parentNode = parent as Node;
        const size = config.size ?? 120;
        const metrics = this._resolveRadarLayoutMetrics(parentNode, config, size);

        const container = new Node('RadarChart');
        container.layer = parentNode.layer;
        ensureUITransform(container, metrics.canvasWidth, metrics.canvasHeight);
        parentNode.addChild(container);

        const gfxNode = new Node('RadarGfx');
        gfxNode.layer = parentNode.layer;
        ensureUITransform(gfxNode, metrics.canvasWidth, metrics.canvasHeight);
        container.addChild(gfxNode);

        const gfx = gfxNode.addComponent(Graphics);
        this._drawRadarInternal(gfx, config, size);
        this._syncRadarAxisLabels(container, config, size, metrics.labelBoxes);

        return container;
    }

    updateRadarChart(chartNode: NodeHandle, config: RadarChartConfig): void {
        const container = chartNode as Node;
        const size = config.size ?? 120;
        const metrics = this._resolveRadarLayoutMetrics(container.parent ?? container, config, size);
        ensureUITransform(container, metrics.canvasWidth, metrics.canvasHeight);

        const gfxNode = container.getChildByName('RadarGfx');
        if (!gfxNode) return;
        ensureUITransform(gfxNode, metrics.canvasWidth, metrics.canvasHeight);

        const gfx = gfxNode.getComponent(Graphics);
        if (!gfx) return;

        gfx.clear();
        this._drawRadarInternal(gfx, config, size);
        this._syncRadarAxisLabels(container, config, size, metrics.labelBoxes);
    }

    private _drawRadarInternal(gfx: Graphics, config: RadarChartConfig, size: number): void {
        const axes = config.axes ?? [];
        const layers = config.layers ?? [];
        const axisCount = axes.length;
        if (axisCount <= 0) return;

        const gridColor = cssToColor(config.gridColor ?? '#FFFFFF33');
        const gridRings = Math.max(1, Math.round(config.gridRings ?? 4));
        const gridLineWidth = config.gridLineWidth ?? 0.7;
        const axisLineWidth = config.axisLineWidth ?? 0.7;
        const outlineWidth = config.outlineWidth ?? 2;
        const markerRadius = config.markerRadius ?? 4;
        const sourceSvg = this._isRadarSourceSvgGeometry(config.sourceSvg) ? config.sourceSvg : null;
        const sourceVectors = sourceSvg ? this._resolveSourceAxisVectors(sourceSvg, axisCount) : null;

        if (sourceSvg && sourceVectors) {
            this._drawRadarSourceGrid(gfx, config, size, sourceSvg, gridColor, gridLineWidth, axisLineWidth);
        } else {
            gfx.lineWidth = gridLineWidth;
            gfx.strokeColor = gridColor;
            for (let ring = 1; ring <= gridRings; ring += 1) {
                const radius = (size / gridRings) * ring;
                gfx.moveTo(...this._radialPoint(0, radius, axisCount));
                for (let i = 1; i <= axisCount; i += 1) {
                    gfx.lineTo(...this._radialPoint(i, radius, axisCount));
                }
                gfx.stroke();
            }

            gfx.lineWidth = axisLineWidth;
            for (let i = 0; i < axisCount; i += 1) {
                const [x, y] = this._radialPoint(i, size, axisCount);
                gfx.moveTo(0, 0);
                gfx.lineTo(x, y);
                gfx.stroke();
            }
        }

        for (let layerIndex = layers.length - 1; layerIndex >= 0; layerIndex -= 1) {
            const layer = layers[layerIndex];
            const fillColor = cssToColor(layer.color ?? (layerIndex === 0 ? '#4488FF' : '#FFAA22'));
            fillColor.a = Math.round((layer.opacity ?? 0.4) * 255);

            const [firstX, firstY] = this._radarValuePoint(0, layer.values[0] * size, axisCount, sourceVectors);
            gfx.fillColor = fillColor;
            gfx.moveTo(firstX, firstY);
            for (let i = 1; i < axisCount; i += 1) {
                const [x, y] = this._radarValuePoint(i, layer.values[i] * size, axisCount, sourceVectors);
                gfx.lineTo(x, y);
            }
            gfx.close();
            gfx.fill();

            const outlineColor = cssToColor(layer.color ?? (layerIndex === 0 ? '#4488FF' : '#FFAA22'));
            outlineColor.a = 230;
            gfx.strokeColor = outlineColor;
            gfx.lineWidth = outlineWidth;
            gfx.moveTo(firstX, firstY);
            for (let i = 1; i < axisCount; i += 1) {
                const [x, y] = this._radarValuePoint(i, layer.values[i] * size, axisCount, sourceVectors);
                gfx.lineTo(x, y);
            }
            gfx.close();
            gfx.stroke();

            const markerColors = config.markerColors ?? [];
            for (let i = 0; i < axisCount; i += 1) {
                const [x, y] = this._radarValuePoint(i, layer.values[i] * size, axisCount, sourceVectors);
                gfx.fillColor = cssToColor(markerColors[i] ?? layer.color ?? '#8CCFC4');
                gfx.circle(x, y, markerRadius);
                gfx.fill();
            }
        }
    }

    private _syncRadarAxisLabels(
        container: Node,
        config: RadarChartConfig,
        size: number,
        labelBoxes: RadarLabelBox[],
    ): void {
        if (config.showAxisLabels === false) {
            const existing = container.getChildByName('RadarAxisLabels');
            if (existing) existing.destroy();
            return;
        }

        const axisCount = config.axes.length;
        const radius = config.axisLabelRadius ?? (size + 22);
        const offsetY = config.axisLabelOffsetY ?? 5;
        const fontSize = config.labelFontSize ?? 13;
        const colors = config.axisLabelColors ?? [];
        const sourceSvg = this._isRadarSourceSvgGeometry(config.sourceSvg) ? config.sourceSvg : null;

        let labelRoot = container.getChildByName('RadarAxisLabels');
        if (!labelRoot) {
            labelRoot = new Node('RadarAxisLabels');
            labelRoot.layer = container.layer;
            ensureUITransform(labelRoot, 1, 1);
            container.addChild(labelRoot);
        }

        for (let i = 0; i < axisCount; i += 1) {
            const labelName = `RadarAxisLabel-${i}`;
            let labelNode = labelRoot.getChildByName(labelName);
            if (!labelNode) {
                labelNode = new Node(labelName);
                labelNode.layer = container.layer;
                labelNode.addComponent(Label);
                labelRoot.addChild(labelNode);
            }

            const sourceLabel = sourceSvg?.labels?.[i];
            const box = labelBoxes[i] ?? this._resolveRadarLabelBox(config.axes[i] ?? '', fontSize, config, sourceLabel);
            ensureUITransform(labelNode, box.width, box.height);

            const [x, y] = sourceLabel
                ? this._mapSourcePoint({ x: sourceLabel.x, y: sourceLabel.y }, sourceSvg, size)
                : this._radialPoint(i, radius, axisCount);
            labelNode.setPosition(x, y + offsetY, 0);

            const label = labelNode.getComponent(Label);
            if (!label) continue;
            label.string = sourceLabel?.text || config.axes[i] || '';
            label.fontSize = fontSize;
            label.lineHeight = fontSize + 2;
            label.color = cssToColor(colors[i] ?? sourceLabel?.fill ?? '#8CCFC4');
            label.isBold = true;
            label.horizontalAlign = HorizontalTextAlignment.CENTER;
            label.verticalAlign = VerticalTextAlignment.CENTER;
        }

        for (let i = labelRoot.children.length - 1; i >= axisCount; i -= 1) {
            labelRoot.children[i].destroy();
        }
    }

    private _resolveRadarLayoutMetrics(parentNode: Node, config: RadarChartConfig, size: number): RadarLayoutMetrics {
        const fontSize = config.labelFontSize ?? 13;
        const labelBoxes = config.axes.map((axis, index) =>
            this._resolveRadarLabelBox(axis ?? '', fontSize, config, config.sourceSvg?.labels?.[index]),
        );

        if ((config.canvasWidth ?? 0) > 0 && (config.canvasHeight ?? 0) > 0) {
            return {
                canvasWidth: Math.ceil(config.canvasWidth as number),
                canvasHeight: Math.ceil(config.canvasHeight as number),
                labelBoxes,
            };
        }

        const parentTransform = parentNode.getComponent(UITransform);
        if ((parentTransform?.width ?? 0) > 0 && (parentTransform?.height ?? 0) > 0) {
            return {
                canvasWidth: Math.ceil(parentTransform!.width),
                canvasHeight: Math.ceil(parentTransform!.height),
                labelBoxes,
            };
        }

        const sourceSvg = this._isRadarSourceSvgGeometry(config.sourceSvg) ? config.sourceSvg : null;
        if (sourceSvg) {
            const sourceRadius = this._resolveSourceOuterRadius(sourceSvg);
            const scale = sourceRadius > 0 ? size / sourceRadius : 1;
            return {
                canvasWidth: Math.max(1, Math.ceil(sourceSvg.viewBox.width * scale)),
                canvasHeight: Math.max(1, Math.ceil(sourceSvg.viewBox.height * scale)),
                labelBoxes,
            };
        }

        const radius = config.axisLabelRadius ?? (size + 22);
        const padding = Math.max(6, Math.ceil(fontSize * 0.55));
        let minX = -size;
        let maxX = size;
        let minY = -size;
        let maxY = size;
        for (let i = 0; i < config.axes.length; i += 1) {
            const [x, y] = this._radialPoint(i, radius, config.axes.length);
            const box = labelBoxes[i];
            const halfW = (box?.width ?? 0) / 2;
            const halfH = (box?.height ?? 0) / 2;
            minX = Math.min(minX, x - halfW);
            maxX = Math.max(maxX, x + halfW);
            minY = Math.min(minY, y - halfH);
            maxY = Math.max(maxY, y + halfH);
        }
        return {
            canvasWidth: Math.max(1, Math.ceil(maxX - minX + padding * 2)),
            canvasHeight: Math.max(1, Math.ceil(maxY - minY + padding * 2)),
            labelBoxes,
        };
    }

    private _resolveRadarLabelBox(
        text: string,
        fontSize: number,
        config: RadarChartConfig,
        sourceLabel?: RadarSourceLabel,
    ): RadarLabelBox {
        const sourceWidth = sourceLabel?.box?.width;
        const sourceHeight = sourceLabel?.box?.height;
        if ((sourceWidth ?? 0) > 0 && (sourceHeight ?? 0) > 0) {
            return { width: Math.ceil(sourceWidth as number), height: Math.ceil(sourceHeight as number) };
        }

        const paddingX = config.labelBoxPaddingX ?? Math.max(4, Math.round(fontSize * 0.45));
        const paddingY = config.labelBoxPaddingY ?? Math.max(3, Math.round(fontSize * 0.25));
        const minWidth = config.labelBoxMinWidth ?? Math.max(24, Math.round(fontSize * 1.8));
        const minHeight = config.labelBoxMinHeight ?? Math.max(18, Math.round(fontSize + paddingY * 2 + 2));
        const rawWidth = this._estimateLabelTextWidth(text, fontSize);

        return {
            width: Math.max(minWidth, Math.ceil(rawWidth + paddingX * 2)),
            height: Math.max(minHeight, Math.ceil(fontSize + 2 + paddingY * 2)),
        };
    }

    private _estimateLabelTextWidth(text: string, fontSize: number): number {
        let width = 0;
        for (const ch of String(text || '')) {
            if (/\s/.test(ch)) width += fontSize * 0.32;
            else if (/[\u3400-\u9FFF\uF900-\uFAFF]/.test(ch)) width += fontSize;
            else if (/[A-Z0-9]/.test(ch)) width += fontSize * 0.68;
            else if (/[a-z]/.test(ch)) width += fontSize * 0.58;
            else width += fontSize * 0.5;
        }
        return width;
    }

    private _drawRadarSourceGrid(
        gfx: Graphics,
        config: RadarChartConfig,
        size: number,
        sourceSvg: RadarSourceSvgGeometry,
        fallbackGridColor: Color,
        fallbackGridLineWidth: number,
        fallbackAxisLineWidth: number,
    ): void {
        for (const polygon of sourceSvg.gridPolygons ?? []) {
            if (!polygon.points || polygon.points.length < 3) continue;
            gfx.lineWidth = polygon.strokeWidth ?? fallbackGridLineWidth;
            gfx.strokeColor = polygon.stroke ? cssToColor(polygon.stroke) : fallbackGridColor;
            const [firstX, firstY] = this._mapSourcePoint(polygon.points[0], sourceSvg, size);
            gfx.moveTo(firstX, firstY);
            for (let i = 1; i < polygon.points.length; i += 1) {
                const [x, y] = this._mapSourcePoint(polygon.points[i], sourceSvg, size);
                gfx.lineTo(x, y);
            }
            gfx.close();
            gfx.stroke();
        }

        for (const line of sourceSvg.axisLines ?? []) {
            gfx.lineWidth = line.strokeWidth ?? fallbackAxisLineWidth;
            gfx.strokeColor = line.stroke ? cssToColor(line.stroke) : fallbackGridColor;
            const [x1, y1] = this._mapSourcePoint({ x: line.x1, y: line.y1 }, sourceSvg, size);
            const [x2, y2] = this._mapSourcePoint({ x: line.x2, y: line.y2 }, sourceSvg, size);
            gfx.moveTo(x1, y1);
            gfx.lineTo(x2, y2);
            gfx.stroke();
        }

        if ((sourceSvg.gridPolygons?.length ?? 0) === 0 && (sourceSvg.axisLines?.length ?? 0) === 0) {
            gfx.lineWidth = config.gridLineWidth ?? 0.7;
            gfx.strokeColor = fallbackGridColor;
            const axisCount = config.axes.length;
            const gridRings = Math.max(1, Math.round(config.gridRings ?? 4));
            for (let ring = 1; ring <= gridRings; ring += 1) {
                const radius = (size / gridRings) * ring;
                gfx.moveTo(...this._radialPoint(0, radius, axisCount));
                for (let i = 1; i <= axisCount; i += 1) {
                    gfx.lineTo(...this._radialPoint(i, radius, axisCount));
                }
                gfx.stroke();
            }
        }
    }

    private _resolveSourceAxisVectors(sourceSvg: RadarSourceSvgGeometry, axisCount: number): RadarPoint[] | null {
        const axisLines = sourceSvg.axisLines ?? [];
        if (axisLines.length < axisCount) return null;
        const center = this._resolveSourceCenter(sourceSvg);
        const vectors: RadarPoint[] = [];
        for (let i = 0; i < axisCount; i += 1) {
            const line = axisLines[i];
            const dx = line.x2 - center.x;
            const dy = center.y - line.y2;
            const distance = Math.hypot(dx, dy);
            if (distance <= 0) return null;
            vectors.push({ x: dx / distance, y: dy / distance });
        }
        return vectors;
    }

    private _radarValuePoint(
        index: number,
        radius: number,
        axisCount: number,
        sourceVectors: RadarPoint[] | null,
    ): [number, number] {
        if (sourceVectors && sourceVectors[index]) {
            const vector = sourceVectors[index];
            return [vector.x * radius, vector.y * radius];
        }
        return this._radialPoint(index, radius, axisCount);
    }

    private _resolveSourceCenter(sourceSvg: RadarSourceSvgGeometry): RadarPoint {
        return sourceSvg.center ?? {
            x: sourceSvg.viewBox.x + sourceSvg.viewBox.width / 2,
            y: sourceSvg.viewBox.y + sourceSvg.viewBox.height / 2,
        };
    }

    private _resolveSourceOuterRadius(sourceSvg: RadarSourceSvgGeometry): number {
        if ((sourceSvg.outerRadius ?? 0) > 0) return sourceSvg.outerRadius as number;
        const center = this._resolveSourceCenter(sourceSvg);
        let radius = 0;
        for (const line of sourceSvg.axisLines ?? []) {
            radius = Math.max(radius, Math.hypot(line.x2 - center.x, line.y2 - center.y));
        }
        for (const polygon of sourceSvg.gridPolygons ?? []) {
            for (const point of polygon.points ?? []) {
                radius = Math.max(radius, Math.hypot(point.x - center.x, point.y - center.y));
            }
        }
        return radius;
    }

    private _mapSourcePoint(point: RadarPoint, sourceSvg: RadarSourceSvgGeometry | null, targetRadius: number): [number, number] {
        if (!sourceSvg) return [point.x, point.y];
        const center = this._resolveSourceCenter(sourceSvg);
        const sourceRadius = this._resolveSourceOuterRadius(sourceSvg);
        const scale = sourceRadius > 0 ? targetRadius / sourceRadius : 1;
        return [
            (point.x - center.x) * scale,
            (center.y - point.y) * scale,
        ];
    }

    private _radialPoint(index: number, radius: number, axisCount: number): [number, number] {
        const angle = ((2 * Math.PI * index) / axisCount) - (Math.PI / 2);
        return [radius * Math.cos(angle), -radius * Math.sin(angle)];
    }

    private _isRadarSourceSvgGeometry(value: RadarChartConfig['sourceSvg']): value is RadarSourceSvgGeometry {
        return !!value
            && value.kind === 'radar-chart'
            && !!value.viewBox
            && Number.isFinite(value.viewBox.width)
            && Number.isFinite(value.viewBox.height);
    }

    async drawGrid(parent: NodeHandle, config: GridConfig): Promise<NodeHandle> {
        const parentNode = parent as Node;
        const container = new Node('GridContainer');
        const transform = container.addComponent(UITransform);
        transform.setContentSize(0, 0);

        const layout = container.addComponent(Layout);
        layout.type = Layout.Type.GRID;
        layout.constraint = Layout.Constraint.FIXED_COL;
        layout.constraintNum = config.columns;
        layout.resizeMode = Layout.ResizeMode.CONTAINER;

        if (config.gap) {
            layout.spacingX = config.gap.x;
            layout.spacingY = config.gap.y;
        }
        if (config.cellSize) {
            layout.cellSize.width = config.cellSize.w;
            layout.cellSize.height = config.cellSize.h;
        }

        parentNode.addChild(container);
        return container;
    }

    async drawProgressBar(parent: NodeHandle, config: ProgressBarConfig): Promise<NodeHandle> {
        const parentNode = parent as Node;
        const barWidth = 240;
        const barHeight = 24;
        const rowHeight = 36;

        const container = new Node('ProgressBar');
        ensureUITransform(container, barWidth + 80, rowHeight);
        parentNode.addChild(container);

        const labelNode = new Node('PBLabel');
        ensureUITransform(labelNode, 70, rowHeight);
        labelNode.setPosition(-barWidth / 2 - 35 + 35, 0, 0);
        const label = labelNode.addComponent(Label);
        label.string = config.label;
        label.fontSize = 18;
        label.horizontalAlign = HorizontalTextAlignment.RIGHT;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        container.addChild(labelNode);

        const bgNode = new Node('PBBg');
        ensureUITransform(bgNode, barWidth, barHeight);
        bgNode.setPosition(35, 0, 0);
        const bg = bgNode.addComponent(SolidBackground);
        bg.color = cssToColor(config.bgColor ?? '#22222266');
        container.addChild(bgNode);

        const ratio = config.max > 0 ? Math.min(1, config.current / config.max) : 0;
        const fgWidth = Math.max(0, barWidth * ratio);
        const fgNode = new Node('PBFg');
        ensureUITransform(fgNode, fgWidth, barHeight);
        fgNode.setPosition(35 - barWidth / 2 + fgWidth / 2, 0, 0);
        const fg = fgNode.addComponent(SolidBackground);
        fg.color = cssToColor(config.barColor ?? '#55AAFF');
        container.addChild(fgNode);

        (container as Node & { __pbBarW?: number; __pbBgX?: number }).__pbBarW = barWidth;
        (container as Node & { __pbBarW?: number; __pbBgX?: number }).__pbBgX = 35;
        return container;
    }

    updateProgressBar(barNode: NodeHandle, current: number, max: number): void {
        const container = barNode as Node & { __pbBarW?: number; __pbBgX?: number };
        const fgNode = container.getChildByName('PBFg');
        if (!fgNode) return;

        const barWidth = container.__pbBarW ?? 240;
        const bgX = container.__pbBgX ?? 35;
        const ratio = max > 0 ? Math.min(1, current / max) : 0;
        const fgWidth = Math.max(0, barWidth * ratio);
        const transform = fgNode.getComponent(UITransform);
        if (transform) transform.setContentSize(fgWidth, transform.height);
        fgNode.setPosition(bgX - barWidth / 2 + fgWidth / 2, 0, 0);
    }
}
