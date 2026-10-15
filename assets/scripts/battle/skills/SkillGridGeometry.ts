/**
 * SkillGridGeometry — 戰法格子幾何純函式（PROG-2-0754）
 *
 * 直線判定、十字範圍、方形範圍。所有結果都裁切到棋盤內。
 * 只做幾何計算，不改戰鬥狀態；接線留給後續 PR。
 */

export interface GridCell {
    lane: number;
    depth: number;
}

function inBounds(lane: number, depth: number, laneCount: number, depthCount: number): boolean {
    return lane >= 0 && lane < laneCount && depth >= 0 && depth < depthCount;
}

/** 同一 lane 或同一 depth 才算直線（衝鋒的前提） */
export function isStraightLine(from: GridCell, to: GridCell): boolean {
    return from.lane === to.lane || from.depth === to.depth;
}

/** 中心加上四向相鄰格，裁切到棋盤內 */
export function crossCells(lane: number, depth: number, laneCount: number, depthCount: number): GridCell[] {
    const offsets: GridCell[] = [
        { lane: 0, depth: 0 },
        { lane: 1, depth: 0 },
        { lane: -1, depth: 0 },
        { lane: 0, depth: 1 },
        { lane: 0, depth: -1 },
    ];
    return offsets
        .map((o) => ({ lane: lane + o.lane, depth: depth + o.depth }))
        .filter((c) => inBounds(c.lane, c.depth, laneCount, depthCount));
}

/** 中心周圍 (2r+1)² 格，裁切到棋盤內；radius=1 即 3x3 */
export function squareCells(lane: number, depth: number, radius: number, laneCount: number, depthCount: number): GridCell[] {
    const cells: GridCell[] = [];
    for (let dl = -radius; dl <= radius; dl++) {
        for (let dd = -radius; dd <= radius; dd++) {
            const l = lane + dl;
            const d = depth + dd;
            if (inBounds(l, d, laneCount, depthCount)) {
                cells.push({ lane: l, depth: d });
            }
        }
    }
    return cells;
}
