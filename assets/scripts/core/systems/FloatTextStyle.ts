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
    // 閃避：灰字，不彈出
    dmg_miss: { color: { r: 175, g: 175, b: 175, a: 255 }, fontSize: 40, isBold: false, durationMs: 800, risePixels: 70,
        ...legacyPop(1.0), maxConcurrent: 8, randomOffsetX: 6, outlineColor: OUTLINE_DARK, outlineWidth: 2 },
    // 治療：綠字（BMFont 貼圖本身已是綠色，這裡的色值是系統字型後備；用偏亮的綠避免相乘後變暗）
    heal: { color: { r: 190, g: 255, b: 170, a: 255 }, fontSize: 48, isBold: true, durationMs: 1000, risePixels: 85,
        startScale: 0.7, peakScale: 1.2, popInSec: 0.07, settleSec: 0.10, maxConcurrent: 10, randomOffsetX: 8,
        outlineColor: { r: 10, g: 70, b: 20, a: 255 }, outlineWidth: 3 },
    status: { color: { r: 100, g: 220, b: 255, a: 255 }, fontSize: 30, isBold: false, durationMs: 1200, risePixels: 80,
        ...legacyPop(1.0), maxConcurrent: 10, randomOffsetX: 20, outlineColor: OUTLINE_DARK, outlineWidth: 2 },
    loot: { color: { r: 255, g: 215, b: 0, a: 255 }, fontSize: 32, isBold: true, durationMs: 1400, risePixels: 100,
        ...legacyPop(1.2), maxConcurrent: 10, randomOffsetX: 12, outlineColor: OUTLINE_DARK, outlineWidth: 2 },
    hint: { color: { r: 255, g: 255, b: 200, a: 150 }, fontSize: 22, isBold: false, durationMs: 2000, risePixels: 40,
        ...legacyPop(1.0), maxConcurrent: 6, randomOffsetX: 0, outlineColor: { r: 20, g: 20, b: 30, a: 150 }, outlineWidth: 1 },
};

/** 閃避飄字文案。miss 的 BMFont 只有小寫 i/m/s 三個字，裝不下中文，所以閃避改走系統字型（見 BattleSceneLoader）。 */
export const FLOAT_MISS_TEXT = '閃避';

/** 同一錨點（單位）在這個視窗內連續跳字視為「連續」，要錯開位置。 */
export const FLOAT_STAGGER_WINDOW_MS = 450;
/** 錯開位移循環長度：超過就回到第一格，避免一路往上堆到畫面外。 */
const FLOAT_STAGGER_CYCLE = 5;
/** 第 N 個連續飄字的水平位移（像素）：中、右、左、小右、小左，左右交錯不重疊。 */
const FLOAT_STAGGER_X: ReadonlyArray<number> = [0, 26, -26, 13, -13];
/** 每多一個連續飄字往上抬的像素。 */
const FLOAT_STAGGER_STEP_Y = 30;

/**
 * 第 index 個（0 起算）連續飄字的位移。index 0 = 不位移。純函式。
 */
export function floatStaggerOffset(index: number): { x: number; y: number } {
    const slot = ((Math.floor(index) % FLOAT_STAGGER_CYCLE) + FLOAT_STAGGER_CYCLE) % FLOAT_STAGGER_CYCLE;
    return { x: FLOAT_STAGGER_X[slot], y: slot * FLOAT_STAGGER_STEP_Y };
}

/**
 * 記錄各錨點（通常是單位 id）最近一次跳字時間，回報「這是視窗內第幾個」。
 * 只存一個時間與計數，不配置節點；過期的鍵會在數量偏多時順便清掉。
 */
export class FloatStaggerTracker {
    private readonly records = new Map<string, { lastMs: number; count: number }>();

    constructor(private readonly windowMs = FLOAT_STAGGER_WINDOW_MS) {}

    /** 回傳這次飄字的連續序號（0 = 視窗內第一個）。 */
    next(key: string, nowMs: number): number {
        const rec = this.records.get(key);
        let index = 0;
        if (rec && nowMs - rec.lastMs <= this.windowMs) index = rec.count;
        this.records.set(key, { lastMs: nowMs, count: index + 1 });
        if (this.records.size > 64) this.prune(nowMs);
        return index;
    }

    private prune(nowMs: number): void {
        for (const [key, rec] of this.records) {
            if (nowMs - rec.lastMs > this.windowMs) this.records.delete(key);
        }
    }
}
