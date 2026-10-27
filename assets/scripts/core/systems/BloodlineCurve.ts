// @spec-source → 血統樹14人UI規格書 §2.3 連線機制（Dynamic Connections，bezierCurveTo 動態連線）（PROG-2-1300，BUI-04）
/**
 * BloodlineCurve — 血統樹父子連線的貝茲曲線計算（純邏輯，不依賴 cc）
 *
 * - bloodlineCurveBetween：父卡與子卡的兩個節點座標 → 三次貝茲的四個控制點（上下方向的 S 形）。
 * - sampleCubicBezier：把曲線取樣成折線點，交給 Graphics 逐段 lineTo 畫出來。
 * - 座標含 NaN / Infinity 時回傳空陣列，不畫出破圖的線（§3.4 防呆）。
 *
 * Unity 對照：像 LineRenderer 的 Bezier 點列計算，先在純資料算好點，畫線的元件只負責顯示。
 */

export interface CurvePoint {
    x: number;
    y: number;
}

export interface CubicCurve {
    p0: CurvePoint;
    p1: CurvePoint;
    p2: CurvePoint;
    p3: CurvePoint;
}

/** 控制點離端點的垂直比例；0.5 為規格預設的柔和 S 形 */
export const DEFAULT_BEND_RATIO = 0.5;

function isFinitePoint(point: CurvePoint): boolean {
    return Number.isFinite(point.x) && Number.isFinite(point.y);
}

/**
 * 父卡（from）到子卡（to）的三次貝茲。控制點沿垂直方向各推出 bendRatio × 高度差，
 * 讓線條從父卡底部順暢流到子卡頂部。座標無效時回傳 null。
 */
export function bloodlineCurveBetween(
    from: CurvePoint,
    to: CurvePoint,
    bendRatio: number = DEFAULT_BEND_RATIO,
): CubicCurve | null {
    if (!isFinitePoint(from) || !isFinitePoint(to) || !Number.isFinite(bendRatio)) return null;
    const dy = to.y - from.y;
    return {
        p0: { x: from.x, y: from.y },
        p1: { x: from.x, y: from.y + dy * bendRatio },
        p2: { x: to.x, y: to.y - dy * bendRatio },
        p3: { x: to.x, y: to.y },
    };
}

/**
 * 把曲線取樣為 segments + 1 個點（含兩端）。segments 小於 1 時視為 1。
 * 曲線為 null 時回傳空陣列。
 */
export function sampleCubicBezier(curve: CubicCurve | null, segments: number): CurvePoint[] {
    if (!curve) return [];
    const count = Math.max(1, Math.floor(segments));
    const points: CurvePoint[] = [];
    for (let i = 0; i <= count; i++) {
        const t = i / count;
        const u = 1 - t;
        const a = u * u * u;
        const b = 3 * u * u * t;
        const c = 3 * u * t * t;
        const d = t * t * t;
        points.push({
            x: a * curve.p0.x + b * curve.p1.x + c * curve.p2.x + d * curve.p3.x,
            y: a * curve.p0.y + b * curve.p1.y + c * curve.p2.y + d * curve.p3.y,
        });
    }
    return points;
}
