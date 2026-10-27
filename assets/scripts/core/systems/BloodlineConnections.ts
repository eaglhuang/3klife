// @spec-source → 血統樹14人UI規格書 §2.2 LineGraphics、§3 技術實作（動態貝茲連線，不使用長條 Image 湊合，連線跟隨卡片實際位置）；WBS BUI-04；PROG-2-1071
/**
 * BloodlineConnections — 血統樹先祖連線的幾何計算（純邏輯，不依賴 cc）。
 *
 * - 每位先祖（與子代 ''）連到其父母：F／M 連到子代，FF 連到 F，FFF 連到 FF，依此類推，共 14 條。
 * - 連線為三次貝茲曲線，控制點沿垂直方向內縮，形成上下對接的 S 型。
 * - 座標為正規化值（0..1，相對 TreeArea），不寫死像素，螢幕比例改變時連線跟著卡片位置走，不破圖。
 * - 缺少任一端位置的連線直接略過，不拋例外。
 *
 * Unity 對照：像 LineRenderer 的 Bezier 工具，輸入是兩個 Transform 的位置，每幀依位置重算曲線點，不是固定貼圖。
 */
import { PEDIGREE_SLOTS, type PedigreeSlot } from '../services/BloodlineGraph';

/** 連線端點：先祖位置代碼，或子代（空字串） */
export type ConnectionNode = PedigreeSlot | '';

export interface Point {
    x: number;
    y: number;
}

export interface ConnectionEdge {
    child: PedigreeSlot;
    parent: ConnectionNode;
}

/** 14 條連線：每位先祖指向父母，父母指向子代（空字串）。 */
export function bloodlineEdges(): ConnectionEdge[] {
    return PEDIGREE_SLOTS.map((slot) => ({ child: slot, parent: slot.slice(0, -1) as ConnectionNode }));
}

export interface CubicBezier {
    start: Point;
    control1: Point;
    control2: Point;
    end: Point;
}

/** 兩端之間的 S 型控制點，沿 y 方向內縮；bend 為內縮比例（0..1），預設 0.5。不分起訖方向，呼叫端決定 from／to。 */
export function bezierBetween(from: Point, to: Point, bend = 0.5): CubicBezier {
    const dy = to.y - from.y;
    return {
        start: { x: from.x, y: from.y },
        control1: { x: from.x, y: from.y + dy * bend },
        control2: { x: to.x, y: to.y - dy * bend },
        end: { x: to.x, y: to.y },
    };
}

/** 依等距參數取樣曲線，回傳 steps 個點（至少 2 點，含起點與終點）。 */
export function sampleBezier(curve: CubicBezier, steps: number): Point[] {
    const count = Math.max(2, Math.floor(steps));
    const points: Point[] = [];
    for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const u = 1 - t;
        const a = u * u * u;
        const b = 3 * u * u * t;
        const c = 3 * u * t * t;
        const d = t * t * t;
        points.push({
            x: a * curve.start.x + b * curve.control1.x + c * curve.control2.x + d * curve.end.x,
            y: a * curve.start.y + b * curve.control1.y + c * curve.control2.y + d * curve.end.y,
        });
    }
    return points;
}

export interface ConnectionPath {
    child: PedigreeSlot;
    parent: ConnectionNode;
    points: Point[];
}

/**
 * 依各節點的位置算出所有連線的取樣點。缺少任一端位置的連線略過。
 * positions 的 key 為位置代碼，子代以空字串表示。
 */
export function buildConnectionPaths(
    positions: Partial<Record<ConnectionNode, Point>>,
    steps = 16,
): ConnectionPath[] {
    const paths: ConnectionPath[] = [];
    for (const edge of bloodlineEdges()) {
        const from = positions[edge.child];
        const to = positions[edge.parent];
        if (!from || !to) continue;
        paths.push({ child: edge.child, parent: edge.parent, points: sampleBezier(bezierBetween(from, to), steps) });
    }
    return paths;
}
