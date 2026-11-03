// @spec-source → 見 docs/cross-reference-index.md
/**
 * RadarSvgConfig — 把 HTML 轉換器輸出的 SVG 雷達圖幾何（svgMeta）轉成引擎中立的 RadarChartConfig。
 *
 * 純函式、不依賴引擎：Cocos／Unity 的 ICompositeRenderer 各自負責繪製。
 * 數值取自原稿 SVG 的資料多邊形（頂點到中心距離 ÷ 外框半徑），顏色取自原稿各元素。
 */
import type { RadarChartConfig, RadarPoint, RadarSourceSvgGeometry } from './interfaces/ICompositeRenderer';

export function radarConfigFromSourceSvg(
    meta: RadarSourceSvgGeometry | null | undefined,
    width: number,
    height: number,
): RadarChartConfig | null {
    if (!meta || meta.kind !== 'radar-chart' || !meta.viewBox || !(meta.viewBox.width > 0)) return null;
    const center: RadarPoint = meta.center ?? {
        x: meta.viewBox.x + meta.viewBox.width / 2,
        y: meta.viewBox.y + meta.viewBox.height / 2,
    };
    const outerRadius = meta.outerRadius ?? 0;
    const valuePoints = meta.valuePolygon?.points ?? [];
    const labels = meta.labels ?? [];
    const axisCount = labels.length || valuePoints.length;
    if (axisCount <= 0 || outerRadius <= 0) return null;

    // 原稿 viewBox 縮放到節點尺寸（preserveAspectRatio meet：取較小比例）
    const scale = Math.min(width / meta.viewBox.width, height / meta.viewBox.height);
    const values = Array.from({ length: axisCount }, (_, i) => {
        const p = valuePoints[i];
        return p ? Math.max(0, Math.min(1, Math.hypot(p.x - center.x, p.y - center.y) / outerRadius)) : 0;
    });
    const firstGrid = meta.gridPolygons?.[0];
    const firstAxis = meta.axisLines?.[0];

    return {
        axes: Array.from({ length: axisCount }, (_, i) => labels[i]?.text ?? ''),
        layers: [{
            values,
            color: meta.valuePolygon?.stroke ?? '#8CCFC4',
            opacity: parseAlpha(meta.valuePolygon?.fill) ?? 0.18,
        }],
        size: outerRadius * scale,
        gridColor: firstGrid?.stroke,
        gridRings: meta.gridPolygons?.length || undefined,
        gridLineWidth: firstGrid?.strokeWidth,
        axisLineWidth: firstAxis?.strokeWidth,
        outlineWidth: meta.valuePolygon?.strokeWidth,
        labelFontSize: labels[0]?.fontSize,
        axisLabelColors: labels.map(label => label.fill ?? '#FFFFFF'),
        markerColors: (meta.markers ?? []).map(marker => marker.fill ?? '#FFFFFF'),
        markerRadius: meta.markers?.[0]?.r,
        canvasWidth: width,
        canvasHeight: height,
        sourceSvg: meta,
    };
}

function parseAlpha(css: string | undefined): number | null {
    const match = String(css ?? '').match(/rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/i);
    return match ? Number(match[1]) : null;
}
