// @spec-source → 見 docs/cross-reference-index.md（PROG-2-9434）
/**
 * GeneralPlateAvoidance — 部隊資訊框避開武將名牌（純邏輯，無引擎相依）
 *
 * 敵方部隊集中在上方時，部隊頭頂的資訊框（「40 騎 100／騎兵」）會壓到武將名牌（能量環、加成、將血量、精力條）。
 * 原則是名牌優先：名牌不動，與名牌重疊的部隊框往上或往下推到名牌外，取移動距離較短的方向。
 *
 * Unity 對照：像 UI 標籤的 overlap resolver，只在 Y 軸做最小位移分離（類似 Physics2D 的最小穿透向量，限制為垂直）。
 */

/** 軸對齊矩形：中心 (x, y) 與半寬半高，座標同一個 UI 圖層 */
export interface LabelRect {
    x: number;
    y: number;
    halfW: number;
    halfH: number;
}

/** 推開後與名牌保留的間距 */
export const PLATE_AVOID_GAP = 4;
/** 避讓位移的平滑速度（每秒逼近比例），避免部隊移動時資訊框瞬間跳動 */
export const PLATE_AVOID_EASE_PER_SEC = 12;

function overlaps(a: LabelRect, b: LabelRect, dy: number): boolean {
    return Math.abs(a.x - b.x) < a.halfW + b.halfW && Math.abs(a.y + dy - b.y) < a.halfH + b.halfH;
}

/**
 * 回傳部隊框要加的 Y 位移，讓它不壓到任何名牌。
 * 候選位置是「貼在某塊名牌上緣之上／下緣之下」，從不動開始逐步展開，取不重疊且位移最小者；
 * 兩塊名牌夾住、中間放不下時會自然跳到整群的上方或下方，不會來回推。
 */
export function plateAvoidOffsetY(badge: LabelRect, plates: readonly LabelRect[], gap: number = PLATE_AVOID_GAP): number {
    const hits = (dy: number): LabelRect[] => plates.filter((plate) => overlaps(badge, plate, dy));
    if (hits(0).length === 0) return 0;
    const seen = new Set<number>([0]);
    const queue: number[] = [0];
    let best: number | null = null;
    for (let i = 0; i < queue.length && i < 32; i++) {
        const dy = queue[i];
        for (const plate of hits(dy)) {
            const down = (plate.y - plate.halfH - gap) - (badge.y + badge.halfH);
            const up = (plate.y + plate.halfH + gap) - (badge.y - badge.halfH);
            for (const next of [down, up]) {
                const key = Math.round(next * 100) / 100;
                if (seen.has(key)) continue;
                seen.add(key);
                if (hits(next).length === 0) {
                    if (best === null || Math.abs(next) < Math.abs(best)) best = next;
                } else {
                    queue.push(next);
                }
            }
        }
    }
    return best ?? 0;
}

/** 目前位移往目標平滑逼近；dt 無效時直接到位 */
export function easePlateOffset(current: number, target: number, dt: number, perSec: number = PLATE_AVOID_EASE_PER_SEC): number {
    if (!(dt > 0)) return target;
    const next = current + (target - current) * Math.min(1, dt * perSec);
    return Math.abs(next - target) < 0.5 ? target : next;
}
