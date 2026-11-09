// @spec-source → 家族血統關係圖鑑節點與視覺佈局規格書 (doc_spec_0330) §2（KIN-07，PROG-2-2123）
/**
 * RelationGraphView — 把關係連線樣式換算成可直接畫的線段（純邏輯，不依賴 cc）。
 *
 * 實線一段到底；鋸齒、虛線、點線都切成多段，畫面端只要逐段 moveTo / lineTo。
 * 同一對武將有多條關係時，以 relationEdgeOffset 左右錯開，避免疊成一條看不出來。
 *
 * Unity 對照：像把 LineRenderer 的 positions 算好再交給繪製端。
 */
import type { EdgeLineStyle } from './RelationGraphStyle';

export interface RelationPoint { x: number; y: number }
export interface RelationSegment { from: RelationPoint; to: RelationPoint }

/** 關係型別的畫面用語；未列出的型別直接顯示空字串由呼叫端略過。 */
export const RELATION_TYPE_LABELS: Readonly<Record<string, string>> = {
    COUPLE: '夫妻',
    SWORN: '義兄弟',
    MASTER_STUDENT: '師徒',
    RIVAL: '宿敵',
    LORD_VASSAL: '君臣',
    COMRADE: '戰友',
    DYNAMIC_SWORN: '結義',
    SPOUSE: '結緣',
    PARENT_CHILD: '親子',
};

/** 虛線與點線的實線長、間隔；鋸齒的折返距離與振幅。單位都是畫面 px。 */
const DASH_PATTERN: Readonly<Partial<Record<EdgeLineStyle, { dash: number; gap: number }>>> = {
    dashed: { dash: 12, gap: 8 },
    dotted: { dash: 2, gap: 6 },
};
const ZIGZAG_PERIOD = 14;
const ZIGZAG_AMPLITUDE = 5;
/** 同一節點多條連線之間的距離 */
const PARALLEL_GAP = 6;

function lerp(from: RelationPoint, to: RelationPoint, t: number): RelationPoint {
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

/** 第 index 條（共 count 條）連線要往法線方向錯開多少，整組以 0 為中心。 */
export function relationEdgeOffset(index: number, count: number): number {
    return (index - (count - 1) / 2) * PARALLEL_GAP;
}

/** 把兩端點沿法線方向平移 offset。 */
export function offsetRelationEdge(from: RelationPoint, to: RelationPoint, offset: number): RelationSegment {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (length === 0 || offset === 0) return { from, to };
    const nx = -(to.y - from.y) / length;
    const ny = (to.x - from.x) / length;
    return {
        from: { x: from.x + nx * offset, y: from.y + ny * offset },
        to: { x: to.x + nx * offset, y: to.y + ny * offset },
    };
}

/** 依線型切成線段；兩端重疊時回傳空陣列。 */
export function relationEdgeSegments(from: RelationPoint, to: RelationPoint, line: EdgeLineStyle): RelationSegment[] {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (length === 0) return [];
    if (line === 'zigzag') return zigzagSegments(from, to, length);
    const pattern = DASH_PATTERN[line];
    if (!pattern) return [{ from, to }];

    const segments: RelationSegment[] = [];
    for (let start = 0; start < length; start += pattern.dash + pattern.gap) {
        const end = Math.min(length, start + pattern.dash);
        segments.push({ from: lerp(from, to, start / length), to: lerp(from, to, end / length) });
    }
    return segments;
}

function zigzagSegments(from: RelationPoint, to: RelationPoint, length: number): RelationSegment[] {
    const nx = -(to.y - from.y) / length;
    const ny = (to.x - from.x) / length;
    const steps = Math.max(1, Math.floor(length / ZIGZAG_PERIOD));
    const points: RelationPoint[] = [from];
    for (let i = 1; i < steps; i += 1) {
        const base = lerp(from, to, i / steps);
        const side = i % 2 === 0 ? -ZIGZAG_AMPLITUDE : ZIGZAG_AMPLITUDE;
        points.push({ x: base.x + nx * side, y: base.y + ny * side });
    }
    points.push(to);
    return points.slice(1).map((point, i) => ({ from: points[i], to: point }));
}
