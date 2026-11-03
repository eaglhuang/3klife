/** Engine-neutral mapping of converted line-only SVG (connectors, dividers) into a box. */

export interface SvgLineArtLine {
    x1: number; y1: number; x2: number; y2: number;
    stroke?: string | null;
    strokeWidth?: number | null;
}

export interface SvgLineArtMeta {
    kind: 'line-art';
    viewBox: { x: number; y: number; width: number; height: number };
    preserveAspectRatio?: string;
    lines: SvgLineArtLine[];
}

/** A segment in box space: origin top-left, y down. */
export interface SvgLineArtSegment {
    x1: number; y1: number; x2: number; y2: number;
    color: string;
    /** 0–255 channels parsed from `color`; unparseable colors fall back to opaque black. */
    rgba: [number, number, number, number];
    width: number;
}

export function isSvgLineArtMeta(meta: unknown): meta is SvgLineArtMeta {
    const m = meta as SvgLineArtMeta | null;
    return !!m && m.kind === 'line-art' && Array.isArray(m.lines) && !!m.viewBox;
}

export function layoutSvgLineArt(meta: SvgLineArtMeta, boxWidth: number, boxHeight: number): SvgLineArtSegment[] {
    const vb = meta.viewBox;
    if (!(vb.width > 0) || !(vb.height > 0) || !(boxWidth > 0) || !(boxHeight > 0)) return [];
    let sx = boxWidth / vb.width;
    let sy = boxHeight / vb.height;
    let ox = 0;
    let oy = 0;
    if (String(meta.preserveAspectRatio || '').trim() !== 'none') {
        const s = Math.min(sx, sy);
        ox = (boxWidth - vb.width * s) / 2;
        oy = (boxHeight - vb.height * s) / 2;
        sx = sy = s;
    }
    return meta.lines.map(line => ({
        x1: ox + (line.x1 - vb.x) * sx,
        y1: oy + (line.y1 - vb.y) * sy,
        x2: ox + (line.x2 - vb.x) * sx,
        y2: oy + (line.y2 - vb.y) * sy,
        color: line.stroke || '#000000',
        rgba: parseHexRgba(line.stroke || '#000000'),
        width: line.strokeWidth && line.strokeWidth > 0 ? line.strokeWidth : 1,
    }));
}

export function parseHexRgba(hex: string): [number, number, number, number] {
    let h = String(hex || '').trim().replace(/^#/, '');
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(h)) return [0, 0, 0, 255];
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) : 255];
}
