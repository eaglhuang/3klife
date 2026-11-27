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

/**
 * 部隊框在名牌節點本地座標的外框（PROG-2-9701）：框本體之外，上方還有血條與狀態圖示列，
 * 只用框本體估算時，血條與「士／命」圖示會壓到上方的框。
 */
export interface LocalExtent {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

/** 合併兩個本地外框；b 為 null 時回傳 a */
export function unionExtent(a: LocalExtent, b: LocalExtent | null): LocalExtent {
    if (!b) return a;
    return { left: Math.min(a.left, b.left), right: Math.max(a.right, b.right), top: Math.max(a.top, b.top), bottom: Math.min(a.bottom, b.bottom) };
}

/**
 * 本地外框 → 圖層座標的避讓矩形（PROG-2-9701）。(x, y) 是名牌節點在圖層上的位置，scale 是名牌縮放；
 * padX／padY 為縮放後再加的邊距（沿用 9440：水平 0、垂直 4）。
 */
export function badgeRectFromExtent(x: number, y: number, scale: number, ext: LocalExtent, padX = 0, padY = 4): LabelRect {
    return {
        x: x + (ext.left + ext.right) / 2 * scale,
        y: y + (ext.top + ext.bottom) / 2 * scale,
        halfW: (ext.right - ext.left) / 2 * scale + padX,
        halfH: (ext.top - ext.bottom) / 2 * scale + padY,
    };
}

/** 部隊框彼此錯開時保留的間距（PROG-2-9440） */
export const BADGE_STACK_GAP = 2;
/** 剛受擊的部隊框優先顯示的秒數（PROG-2-9440） */
export const BADGE_HIT_PRIORITY_SEC = 1.5;

export interface StackBadgeEntry {
    id: string;
    rect: LabelRect;
    /** 越大越先擺（先擺的留在原位）；剛受擊的框給 1 */
    priority: number;
}

/**
 * 部隊框彼此錯開（PROG-2-9440）：同一區的框疊在一起時，玩家看不出誰被打。
 * 依優先序逐一擺放：先擺的留原位（只避開名牌），後擺的把「名牌＋已擺好的框」都當障礙物，
 * 用 plateAvoidOffsetY 找最小垂直位移。同優先序依 id 排，讓每幀結果穩定、不來回跳。
 * 回傳每個框要加的 Y 位移（未列出代表 0）。
 */
export function stackBadgeOffsets(entries: readonly StackBadgeEntry[], obstacles: readonly LabelRect[], gap: number = BADGE_STACK_GAP): Map<string, number> {
    const order = [...entries].sort((a, b) => (b.priority - a.priority) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const placed: LabelRect[] = [...obstacles];
    const out = new Map<string, number>();
    for (const e of order) {
        const dy = plateAvoidOffsetY(e.rect, placed, gap);
        placed.push({ ...e.rect, y: e.rect.y + dy });
        if (dy !== 0) out.set(e.id, dy);
    }
    return out;
}

/** 部隊框讓開武將本體後保留的間距（PROG-2-10118） */
export const BODY_AVOID_GAP = 6;
/** 讓不開（要移太遠）時改成半透明的透明度比例（0～1） */
export const BODY_FADE_ALPHA = 0.3;
/** 武將本體矩形相對 labelToFoot 的比例：本體由腳底往上到頭頂，頭頂與名牌之間留白，所以高度取 0.8 */
export const GENERAL_BODY_HEIGHT_RATIO = 0.8;
/** 本體半寬相對 labelToFoot 的比例（騎兵連馬較寬，寧可略大） */
export const GENERAL_BODY_HALF_WIDTH_RATIO = 0.3;
/** 部隊框往腳下讓開的最大位移相對 labelToFoot 的比例；超過就不移，改半透明，免得徽章離自己的兵太遠 */
export const BODY_AVOID_MAX_SHIFT_RATIO = 0.75;

/** 部隊框對武將本體的避讓結果：dy 為 Y 位移，faded 為 true 代表讓不開、改半透明 */
export interface BodyAvoidResult {
    dy: number;
    faded: boolean;
}

/**
 * 武將本體在圖層座標的矩形（PROG-2-10118）。footX／footY 是雙腳腳底中點，labelToFoot 是名牌到腳底的距離（設定值，
 * 步兵主將與騎兵共用同一套換算，不寫死像素）。
 */
export function generalBodyRect(footX: number, footY: number, labelToFoot: number): LabelRect {
    const halfH = labelToFoot * GENERAL_BODY_HEIGHT_RATIO / 2;
    return { x: footX, y: footY + halfH, halfW: labelToFoot * GENERAL_BODY_HALF_WIDTH_RATIO, halfH };
}

/**
 * 武將本體優先（PROG-2-10118）：部隊框與武將本體重疊時，先往下挪到武將腳下（逐塊本體往下找到不重疊的位置）；
 * 挪動距離超過 maxShift 就維持原位、改標記半透明。不重疊回傳 {dy:0, faded:false}。
 */
export function bodyAvoidOffsetY(badge: LabelRect, bodies: readonly LabelRect[], maxShift: number, gap: number = BODY_AVOID_GAP): BodyAvoidResult {
    const hit = (dy: number): LabelRect | null => {
        for (const body of bodies) if (overlaps(badge, body, dy)) return body;
        return null;
    };
    let dy = 0;
    for (let i = 0; i < 8; i++) {
        const body = hit(dy);
        if (!body) return dy === 0 || Math.abs(dy) <= maxShift ? { dy, faded: false } : { dy: 0, faded: true };
        dy = Math.min(dy, (body.y - body.halfH - gap) - (badge.y + badge.halfH));
    }
    return { dy: 0, faded: true };
}

/** BadgeAvoidSolver 的輸出（唯讀；有快取時多幀回傳同一份物件，呼叫端不可改動） */
export interface BadgeAvoidResult {
    /** 讓開武將本體的 Y 位移（未列出代表 0） */
    bodyDy: ReadonlyMap<string, number>;
    /** 讓不開本體、要半透明的部隊框 id */
    bodyFaded: ReadonlySet<string>;
    /** 部隊框彼此與名牌錯開的 Y 位移（未列出代表 0） */
    targets: ReadonlyMap<string, number>;
}

/**
 * 部隊框避讓求解器（PROG-2-10155）：把「先讓武將本體（10118）→ 再彼此／名牌錯開（9440）」包成一次呼叫，
 * 輸入（名牌、本體、各框外框與優先序）與上一幀完全相同就直接沿用上一幀結果，不重算、不配置。
 * 部隊站著不動時每幀輸入相同，所以平常幾乎不跑演算法；有任何數值改變就整個重算，結果與舊流程逐位相同。
 * 注意：未命中快取時會照舊把「讓開本體後」的位移寫回 entries[i].rect.y（與舊行為一致）。
 */
export class BadgeAvoidSolver {
    private prev: number[] = [];
    private cur: number[] = [];
    private prevIds: string[] = [];
    private valid = false;
    private readonly bodyDy = new Map<string, number>();
    private readonly bodyFaded = new Set<string>();
    private readonly result: { bodyDy: ReadonlyMap<string, number>; bodyFaded: ReadonlySet<string>; targets: ReadonlyMap<string, number> } = {
        bodyDy: this.bodyDy, bodyFaded: this.bodyFaded, targets: new Map<string, number>(),
    };
    /** 累計命中／未命中次數（量測與測試用） */
    public hits = 0;
    public misses = 0;

    /** 讓下一次 solve 一定重算（例如外部狀態改了但不在輸入裡） */
    public invalidate(): void { this.valid = false; }

    public solve(entries: StackBadgeEntry[], plates: readonly LabelRect[], bodies: readonly LabelRect[], maxShift: number): BadgeAvoidResult {
        const cur = this.cur;
        let n = 0;
        cur[n++] = maxShift;
        cur[n++] = plates.length;
        for (const r of plates) { cur[n++] = r.x; cur[n++] = r.y; cur[n++] = r.halfW; cur[n++] = r.halfH; }
        cur[n++] = bodies.length;
        for (const r of bodies) { cur[n++] = r.x; cur[n++] = r.y; cur[n++] = r.halfW; cur[n++] = r.halfH; }
        cur[n++] = entries.length;
        for (const e of entries) { cur[n++] = e.rect.x; cur[n++] = e.rect.y; cur[n++] = e.rect.halfW; cur[n++] = e.rect.halfH; cur[n++] = e.priority; }
        cur.length = n;
        let same = this.valid && this.prev.length === n && this.prevIds.length === entries.length;
        for (let i = 0; same && i < n; i += 1) if (cur[i] !== this.prev[i]) same = false;
        for (let i = 0; same && i < entries.length; i += 1) if (entries[i].id !== this.prevIds[i]) same = false;
        if (same) { this.hits += 1; return this.result; }
        this.misses += 1;
        // 交換緩衝：本幀簽章變成「上一幀」，舊陣列留給下一幀寫
        this.cur = this.prev; this.prev = cur;
        this.prevIds.length = entries.length;
        for (let i = 0; i < entries.length; i += 1) this.prevIds[i] = entries[i].id;
        this.valid = true;
        this.bodyDy.clear();
        this.bodyFaded.clear();
        if (bodies.length > 0) {
            for (const e of entries) {
                const r = bodyAvoidOffsetY(e.rect, bodies, maxShift);
                if (r.dy !== 0) { this.bodyDy.set(e.id, r.dy); e.rect.y += r.dy; }
                if (r.faded) this.bodyFaded.add(e.id);
            }
        }
        this.result.targets = stackBadgeOffsets(entries, plates);
        return this.result;
    }
}
