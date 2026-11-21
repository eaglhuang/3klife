// @spec-source → 主戰場UI規格書.md (doc_ui_0001) §3.2；PROG-2-9401 受擊表現與跳傷害字
/**
 * FloatTextStyle — 飄字樣式表與錯開位移（純資料與純函式，不依賴 cc 引擎，可直接單元測試）。
 *
 * 規格（2026-11-18 使用者選定）：
 *   - 一般傷害：白字往上飄。
 *   - 爆擊：金色大字，放大後回彈。
 *   - 治療：綠字。
 *   - 閃避：灰字。
 *   - 數字要清楚（描邊）；同一單位短時間連續跳字要錯開，不能疊在一起。
 *
 * Unity 對照：DamagePopup 的 ScriptableObject 樣式表 + 同一目標的堆疊偏移計算。
 */

/**
 * 飄字類型 — 決定外觀（顏色/大小/動畫速度）。
 * 擴充方式：在此新增類型名稱，並在 FLOAT_TEXT_STYLES 加入對應設定。
 */
export type FloatTextType =
    | 'dmg_player'  // 我方單位受傷（白）
    | 'dmg_enemy'   // 敵方單位受傷（白）
    | 'dmg_crit'    // 暴擊傷害（金色大字，放大後回彈）
    | 'dmg_heavy'   // 重擊（非暴擊但一下打掉大量兵力；橘色中大字，PROG-2-9412）
    | 'dmg_miss'    // 閃避（灰）
    | 'heal'        // 治療量（綠）
    | 'status'      // 狀態效果（中毒/暈眩/Buff，水藍）
    | 'hint'        // 場景提示 / Debug 用（半透明白）
    | 'loot';       // 掠奪資源（金色，戰法系統 §H-3）

/** 純資料色彩（避免依賴 cc.Color，才能在單元測試直接比對）。 */
export interface FloatRgba { r: number; g: number; b: number; a: number }

export interface FloatTextStyle {
    color: FloatRgba;
    fontSize: number;
    isBold: boolean;
    durationMs: number;    // 飄字存在總時長（毫秒）
    risePixels: number;    // 向上飄動的像素距離
    /** 出現時的起始縮放（< 1 = 由小彈出）。 */
    startScale: number;
    /** 彈出峰值縮放；與 startScale、1 組成「起始 → 峰值 → 回彈到 1」三段。 */
    peakScale: number;
    /** 起始 → 峰值 的秒數；0 表示沒有放大段（沿用舊的「由大縮回」）。 */
    popInSec: number;
    /** 峰值 → 1 的回彈秒數（使用 backOut 緩動，產生回彈感）。 */
    settleSec: number;
    maxConcurrent: number; // 同類型同時存在上限；超過時強制回收最舊節點
    randomOffsetX: number; // ±隨機水平偏移（小幅；主要的錯開由 floatStaggerOffset 負責）
    /** 描邊（系統字型才生效；BMFont 的描邊已烘在貼圖裡）。 */
    outlineColor: FloatRgba;
    outlineWidth: number;
}

const OUTLINE_DARK: FloatRgba = { r: 20, g: 20, b: 30, a: 255 };

/** 沒有特別設計彈出的舊類型：保持「一出現就是大字、0.15 秒縮回 1」的原行為。 */
function legacyPop(scalePop: number): Pick<FloatTextStyle, 'startScale' | 'peakScale' | 'popInSec' | 'settleSec'> {
    return { startScale: scalePop, peakScale: scalePop, popInSec: 0, settleSec: 0.15 };
}

/**
 * 各類型外觀設定一覽 — 視覺調整只需改這裡，程式邏輯不要動。
 */
export const FLOAT_TEXT_STYLES: Readonly<Record<FloatTextType, FloatTextStyle>> = {
    // 一般傷害：白字，小幅彈出（0.6 → 1.3 → 1）
    dmg_player: { color: { r: 255, g: 255, b: 255, a: 255 }, fontSize: 52, isBold: true, durationMs: 900, risePixels: 90,
        startScale: 0.6, peakScale: 1.3, popInSec: 0.06, settleSec: 0.10, maxConcurrent: 12, randomOffsetX: 8,
        outlineColor: OUTLINE_DARK, outlineWidth: 3 },
    dmg_enemy: { color: { r: 255, g: 255, b: 255, a: 255 }, fontSize: 52, isBold: true, durationMs: 900, risePixels: 90,
        startScale: 0.6, peakScale: 1.3, popInSec: 0.06, settleSec: 0.10, maxConcurrent: 12, randomOffsetX: 8,
        outlineColor: OUTLINE_DARK, outlineWidth: 3 },
    // 爆擊：金色大字，放大到 2 倍後回彈到 1（backOut 會稍微過衝再收）
    dmg_crit: { color: { r: 255, g: 210, b: 40, a: 255 }, fontSize: 78, isBold: true, durationMs: 1100, risePixels: 120,
        startScale: 0.5, peakScale: 2.0, popInSec: 0.09, settleSec: 0.16, maxConcurrent: 8, randomOffsetX: 10,
        outlineColor: { r: 110, g: 45, b: 0, a: 255 }, outlineWidth: 4 },
    // 重擊（PROG-2-9412）：橘色、比一般大、比爆擊小，玩家一眼分得出「這下打得重」。
    // 避開地形適性飄字的綠 #48C774／藍 #3273DC／紅 #F14668，也不和爆擊金撞色。
    dmg_heavy: { color: { r: 255, g: 150, b: 40, a: 255 }, fontSize: 64, isBold: true, durationMs: 1000, risePixels: 105,
        startScale: 0.55, peakScale: 1.65, popInSec: 0.08, settleSec: 0.13, maxConcurrent: 10, randomOffsetX: 9,
        outlineColor: { r: 95, g: 30, b: 0, a: 255 }, outlineWidth: 4 },
    // 閃避：灰字，不彈出
    dmg_miss: { color: { r: 175, g: 175, b: 175, a: 255 }, fontSize: 40, isBold: false, durationMs: 800, risePixels: 70,
        ...legacyPop(1.0), maxConcurrent: 8, randomOffsetX: 6, outlineColor: OUTLINE_DARK, outlineWidth: 2 },
    // 治療：綠字（BMFont 貼圖本身已是綠色，這裡的色值是系統字型後備；用偏亮的綠避免相乘後變暗）
    heal: { color: { r: 190, g: 255, b: 170, a: 255 }, fontSize: 48, isBold: true, durationMs: 1000, risePixels: 85,
        startScale: 0.7, peakScale: 1.2, popInSec: 0.07, settleSec: 0.10, maxConcurrent: 10, randomOffsetX: 8,
        outlineColor: { r: 10, g: 70, b: 20, a: 255 }, outlineWidth: 3 },
    // 狀態（暈眩／定身／增減益，PROG-2-9435）：以前 30px 細字、無彈出，壓在部隊框上幾乎讀不到，
    // 改成比一般傷害小一級的粗字、小幅彈出、深色粗描邊，停留拉長，玩家看得出自己的招讓誰中了什麼狀態
    status: { color: { r: 100, g: 220, b: 255, a: 255 }, fontSize: 42, isBold: true, durationMs: 1500, risePixels: 85,
        startScale: 0.7, peakScale: 1.25, popInSec: 0.07, settleSec: 0.10, maxConcurrent: 10, randomOffsetX: 20,
        outlineColor: OUTLINE_DARK, outlineWidth: 3 },
    loot: { color: { r: 255, g: 215, b: 0, a: 255 }, fontSize: 32, isBold: true, durationMs: 1400, risePixels: 100,
        ...legacyPop(1.2), maxConcurrent: 10, randomOffsetX: 12, outlineColor: OUTLINE_DARK, outlineWidth: 2 },
    hint: { color: { r: 255, g: 255, b: 200, a: 150 }, fontSize: 22, isBold: false, durationMs: 2000, risePixels: 40,
        ...legacyPop(1.0), maxConcurrent: 6, randomOffsetX: 0, outlineColor: { r: 20, g: 20, b: 30, a: 150 }, outlineWidth: 1 },
};

/** 閃避飄字文案。miss 的 BMFont 只有小寫 i/m/s 三個字，裝不下中文，所以閃避改走系統字型（見 BattleSceneLoader）。 */
export const FLOAT_MISS_TEXT = '閃避';

/** 同一錨點（單位）在這個視窗內連續跳字視為「連續」，要錯開位置（舊式後備：未提供存活時間時使用）。 */
export const FLOAT_STAGGER_WINDOW_MS = 450;
/**
 * PROG-2-9402：前一個字存活時間的這個比例內，視為「仍佔位」，新字必須錯開。
 * 原本只看固定 450 毫秒，爆擊字存在 1100 毫秒，晚 450 毫秒以上的閃避字就疊在大字上。
 * 70% 之後字已在淡出（後半段淡出），可以回到原位。
 */
export const FLOAT_STAGGER_OCCUPY_RATIO = 0.7;
/** 錯開位移循環長度：超過就回到第一格，避免一路往下堆到畫面外。 */
const FLOAT_STAGGER_CYCLE = 5;
/** 第 N 個連續飄字的水平位移（像素）：中、右、左、小右、小左，左右交錯不重疊。 */
const FLOAT_STAGGER_X: ReadonlyArray<number> = [0, 26, -26, 13, -13];
/** 每多一個連續飄字的最小垂直間距（像素，新字往下）。 */
const FLOAT_STAGGER_STEP_Y = 30;
/**
 * PROG-2-9402：相鄰兩字的垂直間距 = 兩字「有效高度」平均 * 此係數，並不小於 FLOAT_STAGGER_STEP_Y。
 * 有效高度 = fontSize * (1 + (peakScale - 1) / 2)；峰值放大只持續約 0.25 秒就回彈到 1，
 * 所以取峰值與 1 倍的中間值。爆擊(78px, 峰值 2 倍)有效高度 117，接閃避(40px)間距約 47 像素。
 */
const FLOAT_STAGGER_GAP_RATIO = 0.6;
/** 垂直位移上限（像素，往下為負，絕對值不超過此值）：與舊版 4 格 * 30 相同，再大就會飄出單位頭頂太遠。 */
const FLOAT_STAGGER_MAX_Y = 160;

/**
 * 第 index 個（0 起算）連續飄字的位移。index 0 = 不位移。純函式。
 */
export function floatStaggerOffset(index: number): { x: number; y: number } {
    const slot = ((Math.floor(index) % FLOAT_STAGGER_CYCLE) + FLOAT_STAGGER_CYCLE) % FLOAT_STAGGER_CYCLE;
    return { x: FLOAT_STAGGER_X[slot], y: slot * FLOAT_STAGGER_STEP_Y };
}

/** 飄字的有效高度（像素），用來估算與相鄰字的垂直間距。純函式。 */
export function floatEffectiveHeight(style: Pick<FloatTextStyle, 'fontSize' | 'peakScale'>): number {
    return style.fontSize * (1 + (Math.max(1, style.peakScale) - 1) / 2);
}

/**
 * 記錄各錨點（通常是單位 id）目前被哪些飄字佔位，回報「這個字要放第幾格、位移多少」。
 * PROG-2-9402：佔位時間依「前一個字的存活時間」判斷，而不是固定視窗。
 * 只存少量數字，不配置節點；過期的鍵會在數量偏多時順便清掉。
 */
export class FloatStaggerTracker {
    private readonly records = new Map<string, { busyUntilMs: number; count: number; lastY: number; lastHeight: number }>();

    /** @param windowMs 未提供 lifeMs 時的佔位時間（毫秒）。 */
    constructor(private readonly windowMs = FLOAT_STAGGER_WINDOW_MS) {}

    /**
     * 安排一個新飄字。
     * @param lifeMs   這個字的存活時間（毫秒）；省略則用 windowMs
     * @param heightPx 這個字的有效高度（見 floatEffectiveHeight）；省略則只用最小間距
     */
    place(key: string, nowMs: number, lifeMs?: number, heightPx = 0): { index: number; x: number; y: number } {
        const rec = this.records.get(key);
        const occupied = !!rec && nowMs <= rec.busyUntilMs;
        // 循環上限：滿 FLOAT_STAGGER_CYCLE 格就回到第一格，不會一路堆出畫面
        const index = occupied ? rec!.count % FLOAT_STAGGER_CYCLE : 0;
        let y = 0;
        if (occupied && index > 0) {
            // PROG-2-9402：往「下」錯開（y 為負）。舊字會繼續往上飄，兩者只會越離越遠；
            // 若往上錯開，新字剛好落在舊字已飄高的位置而疊字。間距依兩字大小決定，大字（爆擊）後面的字壓得更低
            const gap = Math.max(FLOAT_STAGGER_STEP_Y, (rec!.lastHeight + heightPx) / 2 * FLOAT_STAGGER_GAP_RATIO);
            y = Math.max(rec!.lastY - gap, -FLOAT_STAGGER_MAX_Y);
        }
        const holdMs = (lifeMs ?? this.windowMs / FLOAT_STAGGER_OCCUPY_RATIO) * FLOAT_STAGGER_OCCUPY_RATIO;
        // 佔位到所有仍在畫面上的字都淡出為止
        const busyUntilMs = Math.max(nowMs + holdMs, occupied ? rec!.busyUntilMs : 0);
        this.records.set(key, { busyUntilMs, count: (occupied ? rec!.count : 0) + 1, lastY: y, lastHeight: heightPx });
        if (this.records.size > 64) this.prune(nowMs);
        return { index, x: FLOAT_STAGGER_X[index], y };
    }

    /** 回傳這次飄字的連續序號（0 = 第一格）。相容舊介面。 */
    next(key: string, nowMs: number, lifeMs?: number): number {
        return this.place(key, nowMs, lifeMs).index;
    }

    private prune(nowMs: number): void {
        for (const [key, rec] of this.records) {
            if (nowMs > rec.busyUntilMs) this.records.delete(key);
        }
    }
}

// ─────────────────────────────────────────
//  避讓棋盤標記（PROG-2-9415）
// ─────────────────────────────────────────

/** 跳字要避開的矩形（UI 座標，中心＋半寬半高）。例如棋盤 buff 格的圖示與倍數。 */
export interface FloatAvoidRect { x: number; y: number; halfW: number; halfH: number }

/** 跳字與標記之間至少留的空隙（像素） */
export const FLOAT_AVOID_MARGIN = 6;
/** 最多水平挪動多少像素；再遠字就離開受擊單位，寧可維持原位 */
export const FLOAT_AVOID_MAX_SHIFT = 140;
/**
 * 大字（爆擊）光半寬就接近上限，正對標記時一定挪不開；上限至少放寬到「字的半寬＋這個距離」，
 * 讓字靠近單位的那一側邊緣最多離原中心這麼遠，字仍貼在受擊單位旁。
 */
export const FLOAT_AVOID_EDGE_REACH = 70;

/**
 * 估算跳字的半寬（像素）。數字與英文約 0.6 字寬，中日韓字約 1 字寬。純函式。
 * 用回彈後的大小（縮放 1）計算：彈出峰值只維持不到 0.1 秒、且還在起點，往上飄的大半段都是縮放 1。
 */
export function floatHalfWidth(text: string, style: Pick<FloatTextStyle, 'fontSize'>): number {
    let units = 0;
    for (const ch of text) units += ch.charCodeAt(0) > 0x2e7f ? 1 : 0.6;
    return (units * style.fontSize) / 2;
}

/**
 * 跳字往上飄的整條路徑若會蓋到任何標記，回傳最小的水平挪動量（左負右正）；不重疊或挪不開都回傳 0。純函式。
 * 挪動上限＝max(maxShift, 半寬＋FLOAT_AVOID_EDGE_REACH)。
 *
 * 路徑視為一根直立長條：x ∈ [startX ± halfW]、y 從 startY − halfH 到 startY + rise + halfH。
 * 候選位置＝每個重疊標記的左右緊貼位置；依挪動距離由小到大試，第一個完全不重疊的就用它。
 * 只用區域變數與傳入陣列，不配置物件（每次跳字呼叫一次，量很小）。
 *
 * Unity 對照：DamagePopup 生成前對 HUD 標記做一次 1D 掃描避讓。
 */
export function floatAvoidShift(
    startX: number, startY: number, halfW: number, halfH: number, rise: number,
    rects: readonly FloatAvoidRect[], margin = FLOAT_AVOID_MARGIN, maxShift = FLOAT_AVOID_MAX_SHIFT,
): number {
    const cap = Math.max(maxShift, halfW + FLOAT_AVOID_EDGE_REACH);
    const bottom = startY - halfH;
    const top = startY + rise + halfH;
    const blocked = (dx: number): boolean => {
        const left = startX + dx - halfW;
        const right = startX + dx + halfW;
        for (const r of rects) {
            if (top <= r.y - r.halfH - margin || bottom >= r.y + r.halfH + margin) continue;
            if (right <= r.x - r.halfW - margin || left >= r.x + r.halfW + margin) continue;
            return true;
        }
        return false;
    };
    if (!blocked(0)) return 0;
    let best = 0;
    let bestAbs = Infinity;
    for (const r of rects) {
        // 多 0.5 像素，避免浮點誤差剛好落在邊界上被判成重疊
        const toLeft = (r.x - r.halfW - margin - halfW - 0.5) - startX;
        const toRight = (r.x + r.halfW + margin + halfW + 0.5) - startX;
        for (let side = 0; side < 2; side++) {
            const dx = side === 0 ? toLeft : toRight;
            const abs = Math.abs(dx);
            if (abs >= bestAbs || abs > cap) continue;
            if (!blocked(dx)) { best = dx; bestAbs = abs; }
        }
    }
    return best;
}
