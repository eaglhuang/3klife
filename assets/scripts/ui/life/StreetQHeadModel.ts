// @spec-source → 武將生活系統 QLIFE-01／QSOC-01 第 4 章；PROG-2-10258（市井大街 Q 頭生活雛形）
/**
 * StreetQHeadModel — 市井大街 Q 頭雛形的純邏輯（不依賴 cc，可直接在 tests 跑）
 *
 * 職責：
 *  1. 行走遮罩（mkt_walkmask.png）預先轉成「橫向走道＋縱向連通巷」放進 JSON；這裡只做走道上的路徑規劃與前進；
 *  2. 兩人相遇判斷、對話劇本挑選（指定搭檔優先，其餘輪流，不連續重複）；
 *  3. 對話泡泡排版：互不重疊、不超出畫面（依優先序逐個找空位）。
 * 座標：街道座標＝全景圖像素（原點左上、x 向右、y 向下，4096×1536）；泡泡排版用螢幕座標（原點中心、y 向上）。
 */

export interface StreetPoint { x: number; y: number }

export interface StreetLane { id: string; y: number }

export interface StreetVenuePoint { lane: number; x: number }

export interface StreetCastEntry {
    id: string;
    avatar: string;
    nameKey: string;
    /** 頭像放大倍率與垂直位移（比例，讓臉填滿圓框） */
    crop: { scale: number; dy: number };
    /** 展示劇本：硬指定場景（讓影片一定看得到喝酒、跳躍）；沒寫就用作息引擎挑的場景 */
    forceVenue?: string;
    /** 展示劇本：開場先走去的店面（讓兩位散步者一開始就會碰面） */
    firstGoto?: string;
    /** 展示劇本：站定後的行為 */
    role?: 'drinker' | 'jumper' | 'stroller';
}

export interface StreetDialogue {
    id: string;
    /** 指定搭檔（順序＝第 0 位、第 1 位發言者）；沒寫＝通用，誰都能用 */
    pair?: [string, string];
    lines: Array<{ who: 0 | 1; key: string }>;
}

export interface StreetQHeadConfig {
    schema: string;
    world: { width: number; height: number; maskScale: number; leftTex: string; rightTex: string };
    head: { sizePx: number; lift: number; bodyScale: number };
    lanes: StreetLane[];
    connectorsX: number[];
    xMin: number;
    xMax: number;
    venues: Record<string, StreetVenuePoint>;
    plazaVenue: string;
    speed: { stroll: number; transit: number };
    stroll: { idleMinSec: number; idleMaxSec: number; spreadPx: number };
    drink: { sipEverySec: number; symbolActivity: string };
    jump: { everySecMin: number; everySecMax: number; clip: string };
    talk: { meetDistPx: number; lineSec: number; cooldownSec: number; startDelaySec: number };
    bubble: { widthPx: number; fontPx: number; padPx: number; gapPx: number; tailPx: number; maxLinesCjk: number };
    camera: { startVenue: string; autoNudgePx: number };
    cast: StreetCastEntry[];
    dialogues: StreetDialogue[];
}

// ───────────────────────────── 座標與路徑 ─────────────────────────────

/** 遮罩座標（1024×384）→ 街道座標（全景像素） */
export function maskToStreet(cfg: StreetQHeadConfig, mx: number, my: number): StreetPoint {
    return { x: mx * cfg.world.maskScale, y: my * cfg.world.maskScale };
}

export function laneYpx(cfg: StreetQHeadConfig, lane: number): number {
    const l = cfg.lanes[Math.max(0, Math.min(cfg.lanes.length - 1, lane))];
    return l.y * cfg.world.maskScale;
}

/** 場景（venue）→ 站位點（街道座標）。找不到場景就退回廣場 */
export function venuePoint(cfg: StreetQHeadConfig, sceneId: string): { lane: number; x: number; y: number } {
    const v = cfg.venues[sceneId] ?? cfg.venues[cfg.plazaVenue];
    return { lane: v.lane, x: v.x * cfg.world.maskScale, y: laneYpx(cfg, v.lane) };
}

/** 把 x 夾回走道可走範圍 */
export function clampWalkX(cfg: StreetQHeadConfig, x: number): number {
    const s = cfg.world.maskScale;
    return Math.max(cfg.xMin * s, Math.min(cfg.xMax * s, x));
}

/** 找出離 (x) 最近的所在走道（依 y） */
export function nearestLane(cfg: StreetQHeadConfig, y: number): number {
    let best = 0;
    let bd = Infinity;
    cfg.lanes.forEach((l, i) => {
        const d = Math.abs(l.y * cfg.world.maskScale - y);
        if (d < bd) { bd = d; best = i; }
    });
    return best;
}

/**
 * 路徑規劃：同一走道直走；不同走道就沿走道走到最順路的連通巷，穿巷到目標走道，再走到目標 x。
 * 回傳的點序列不含起點。
 */
export function planPath(cfg: StreetQHeadConfig, from: StreetPoint, toLane: number, toX: number): StreetPoint[] {
    const s = cfg.world.maskScale;
    const fromLane = nearestLane(cfg, from.y);
    const ty = laneYpx(cfg, toLane);
    const tx = clampWalkX(cfg, toX);
    if (fromLane === toLane) return [{ x: tx, y: ty }];
    let bestX = cfg.connectorsX[0] * s;
    let bd = Infinity;
    for (const c of cfg.connectorsX) {
        const cx = c * s;
        const d = Math.abs(from.x - cx) + Math.abs(cx - tx);
        if (d < bd) { bd = d; bestX = cx; }
    }
    const fy = laneYpx(cfg, fromLane);
    const path: StreetPoint[] = [];
    if (Math.abs(from.y - fy) > 1) path.push({ x: from.x, y: fy });
    path.push({ x: bestX, y: fy });
    path.push({ x: bestX, y: ty });
    path.push({ x: tx, y: ty });
    return path;
}

export interface Walker {
    x: number;
    y: number;
    path: StreetPoint[];
    /** 水平面向：1＝右、-1＝左 */
    dir: 1 | -1;
}

export function createWalker(x: number, y: number): Walker {
    return { x, y, path: [], dir: 1 };
}

/** 沿路徑前進；回傳 true＝這一步走完整條路徑 */
export function stepWalker(w: Walker, dt: number, speed: number): boolean {
    let remain = speed * dt;
    while (remain > 0 && w.path.length > 0) {
        const t = w.path[0];
        const dx = t.x - w.x;
        const dy = t.y - w.y;
        const d = Math.hypot(dx, dy);
        if (Math.abs(dx) > 0.5) w.dir = dx > 0 ? 1 : -1;
        if (d <= remain) {
            w.x = t.x;
            w.y = t.y;
            w.path.shift();
            remain -= d;
        } else {
            w.x += (dx / d) * remain;
            w.y += (dy / d) * remain;
            remain = 0;
        }
    }
    return w.path.length === 0;
}

// ───────────────────────────── 相遇與劇本 ─────────────────────────────

/** 兩人是否近到可以停下來聊天（同一走道、水平距離夠近） */
export function canMeet(cfg: StreetQHeadConfig, a: StreetPoint, b: StreetPoint): boolean {
    return Math.abs(a.y - b.y) < 40 && Math.abs(a.x - b.x) <= cfg.talk.meetDistPx;
}

/** 挑對話：指定搭檔優先；其餘通用劇本依 seed 輪流，避開最近用過的那一組 */
export function pickDialogue(
    cfg: StreetQHeadConfig,
    idA: string,
    idB: string,
    seed: number,
    lastId: string | null,
): { dialogue: StreetDialogue; swap: boolean } {
    for (const d of cfg.dialogues) {
        if (!d.pair) continue;
        if (d.pair[0] === idA && d.pair[1] === idB) return { dialogue: d, swap: false };
        if (d.pair[0] === idB && d.pair[1] === idA) return { dialogue: d, swap: true };
    }
    const generic = cfg.dialogues.filter((d) => !d.pair);
    const pool = generic.length > 1 ? generic.filter((d) => d.id !== lastId) : generic;
    return { dialogue: pool[Math.abs(Math.floor(seed)) % pool.length], swap: false };
}

// ───────────────────────────── 泡泡排版 ─────────────────────────────

export interface BubbleRequest {
    id: string;
    /** 指向的頭頂座標（螢幕座標，y 向上） */
    ax: number;
    ay: number;
    /** 腳下座標：頭頂上方放不下時，泡泡改放腳下 */
    fx: number;
    fy: number;
    w: number;
    h: number;
}

export interface BubblePlacement { id: string; cx: number; cy: number; w: number; h: number }

export interface ViewBounds { minX: number; maxX: number; minY: number; maxY: number }

/** 不准蓋住的區塊（武將本體、按鈕）：中心＋寬高 */
export type BubbleObstacle = Omit<BubblePlacement, 'id'>;

function overlaps(a: BubbleObstacle, b: BubbleObstacle, gap: number): boolean {
    return Math.abs(a.cx - b.cx) < (a.w + b.w) / 2 + gap && Math.abs(a.cy - b.cy) < (a.h + b.h) / 2 + gap;
}

function clampInto(p: BubblePlacement, b: ViewBounds): void {
    p.cx = Math.max(b.minX + p.w / 2, Math.min(b.maxX - p.w / 2, p.cx));
    p.cy = Math.max(b.minY + p.h / 2, Math.min(b.maxY - p.h / 2, p.cy));
}

/**
 * 依優先序（陣列順序＝先排的先佔位）逐個找空位：先試頭頂正上方，再往上疊、往左右錯開，
 * 再試腳下；每個候選都夾進畫面，並避開 obstacles（人物本體、按鈕）與已排好的泡泡。
 * 都衝突就掃整個畫面網格取離原位最近的空位；再不行才取重疊最少的（極端擁擠才會發生）。
 */
export function layoutBubbles(
    reqs: readonly BubbleRequest[],
    bounds: ViewBounds,
    gap: number,
    obstacles: readonly BubbleObstacle[] = [],
): BubblePlacement[] {
    const placed: BubblePlacement[] = [];
    const hits = (p: BubblePlacement): number => {
        let n = 0;
        for (const q of placed) if (overlaps(p, q, gap)) n++;
        for (const o of obstacles) if (overlaps(p, o, 2)) n++;
        return n;
    };
    for (const r of reqs) {
        const stepY = r.h + gap;
        const stepX = r.w + gap;
        const cands: Array<[number, number]> = [];
        const dxs = [0, stepX * 0.55, -stepX * 0.55, stepX * 1.1, -stepX * 1.1];
        for (let ky = 0; ky <= 2; ky++) for (const dx of dxs) cands.push([r.ax + dx, r.ay + r.h / 2 + ky * stepY]);
        for (let ky = 0; ky <= 1; ky++) for (const dx of dxs) cands.push([r.fx + dx, r.fy - r.h / 2 - ky * stepY]);
        let best: BubblePlacement | null = null;
        let bestScore = Infinity;
        for (const [cx, cy] of cands) {
            const p: BubblePlacement = { id: r.id, cx, cy, w: r.w, h: r.h };
            clampInto(p, bounds);
            const score = hits(p) * 1000 + Math.abs(p.cx - r.ax) * 0.001 + Math.abs(p.cy - r.ay) * 0.001;
            if (score < bestScore) {
                bestScore = score;
                best = p;
                if (score < 1000) break;
            }
        }
        if (bestScore >= 1000) {
            for (let cy = bounds.minY + r.h / 2; cy <= bounds.maxY - r.h / 2 + 0.01; cy += 16) {
                for (let cx = bounds.minX + r.w / 2; cx <= bounds.maxX - r.w / 2 + 0.01; cx += 24) {
                    const p: BubblePlacement = { id: r.id, cx, cy, w: r.w, h: r.h };
                    if (hits(p) > 0) continue;
                    const dist = Math.hypot(cx - r.ax, (cy - r.ay) * 1.5);
                    if (bestScore >= 1000 || dist < bestScore) { best = p; bestScore = dist; }
                }
            }
        }
        placed.push(best!);
    }
    return placed;
}

/** 估算泡泡高度（CJK 字寬≈字級；固定泡泡寬度，依字數折行） */
export function estimateBubbleSize(text: string, cfg: StreetQHeadConfig): { w: number; h: number } {
    const b = cfg.bubble;
    const inner = b.widthPx - b.padPx * 2;
    const perLine = Math.max(1, Math.floor(inner / b.fontPx));
    const lines = Math.min(b.maxLinesCjk, Math.max(1, Math.ceil(text.length / perLine)));
    return { w: b.widthPx, h: Math.round(lines * b.fontPx * 1.25 + b.padPx * 2) };
}
