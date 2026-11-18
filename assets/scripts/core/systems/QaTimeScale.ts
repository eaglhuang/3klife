// @spec-source → docs/agent-briefs/tasks/PROG/PROG-2-9405.md（QA 慢動作與定格，PROG-2-9405）
/**
 * QaTimeScale — 僅限 QA 的慢動作／定格參數解析與計算（純邏輯，不依賴 cc）。
 *
 * 網址參數（沒有任何 qa* 參數時完全不介入，正式玩家流程零成本）：
 *   qaSlow=<倍率>   整體遊戲時間倍率，例如 0.25 = 四分之一速；夾在 0.05～1（超出範圍夾值並提示，不報錯）
 *   qaTime=1        只掛上 window.__qaTime 介面、不改倍率（0／false 視為沒帶）
 * 只要網址帶了任何 qa* 參數（qaBattle 等），也會掛上 window.__qaTime，方便截圖流程直接呼叫。
 *
 * 執行端（battle/views/QaTimeController.ts）把這裡算出的倍率乘進 director.tick 的 dt，
 * 所以 tween、Spine、粒子、scheduler 計時器一起變慢；本檔只負責「數字怎麼算」，好單元測試。
 *
 * Unity 對照：像 Time.timeScale 的參數處理器；step 對應「暫停中手動推進一幀」。
 */

/** 網址參數名稱（單一出處，文件與測試共用） */
export const QA_TIME_QUERY = {
    slow: 'qaSlow',
    time: 'qaTime',
} as const;

/** 倍率下限／上限：低於 0.05 近乎凍結（要凍結請用 pause），高於 1 是加速、不屬於慢動作 */
export const QA_TIME_SCALE_MIN = 0.05;
export const QA_TIME_SCALE_MAX = 1;

/** step 每一小段的最大秒數：大步長切成小段推進，避免一次餵太大的 dt 讓物理或 tween 跳過碰撞 */
export const QA_STEP_SLICE_SEC = 1 / 30;

/** step 單次最多毫秒數：防呼叫端手誤輸入大數字把畫面算到卡死 */
export const QA_STEP_MAX_MS = 10000;

export interface QaTimeParams {
    /** 是否要掛上 window.__qaTime（網址帶了任何 qa* 參數或 qaTime=1） */
    enabled: boolean;
    /** 初始倍率；沒帶 qaSlow 為 1 */
    scale: number;
    /** 有問題（不是數字）或被夾值時的提示，給 console.warn；沒事為空陣列 */
    warnings: string[];
}

/** 倍率夾在 0.05～1；非有限數字回 1（視為沒放慢） */
export function clampQaScale(value: number): number {
    if (!Number.isFinite(value)) return 1;
    return Math.min(QA_TIME_SCALE_MAX, Math.max(QA_TIME_SCALE_MIN, value));
}

/** 解析網址查詢字串；search 可為 undefined／空字串（非瀏覽器環境） */
export function parseQaTimeParams(search: string | undefined | null): QaTimeParams {
    const result: QaTimeParams = { enabled: false, scale: 1, warnings: [] };
    if (typeof search !== 'string' || search.length === 0) return result;
    const query = new URLSearchParams(search);

    let hasQaKey = false;
    query.forEach((_value, key) => { if (/^qa/i.test(key)) hasQaKey = true; });
    // 沒有任何 qa* 參數：完全不啟用
    if (!hasQaKey) return result;
    result.enabled = true;

    const slowRaw = query.get(QA_TIME_QUERY.slow);
    if (slowRaw !== null) {
        const text = slowRaw.trim();
        const parsed = text === '' ? Number.NaN : Number(text);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            result.warnings.push(`${QA_TIME_QUERY.slow}=${slowRaw} 不是 0 以上的數字，已忽略（倍率維持 1）`);
        } else {
            const clamped = clampQaScale(parsed);
            if (clamped !== parsed) result.warnings.push(`${QA_TIME_QUERY.slow}=${slowRaw} 超出 ${QA_TIME_SCALE_MIN}～${QA_TIME_SCALE_MAX}，已夾成 ${clamped}`);
            result.scale = clamped;
        }
    }
    return result;
}

/**
 * 把 step 的毫秒數切成每段不超過 QA_STEP_SLICE_SEC 的秒數清單（總和 = 夾值後的毫秒數 / 1000）。
 * 非有限、0 或負數回空清單；超過 QA_STEP_MAX_MS 夾成上限。
 */
export function planStepSlices(ms: number): number[] {
    if (!Number.isFinite(ms) || ms <= 0) return [];
    const total = Math.min(ms, QA_STEP_MAX_MS) / 1000;
    const slices: number[] = [];
    let remaining = total;
    while (remaining > 1e-9) {
        const slice = Math.min(QA_STEP_SLICE_SEC, remaining);
        slices.push(slice);
        remaining -= slice;
    }
    return slices;
}

/**
 * setTimeout 的延遲換算：engine dt 已經變慢，但 setTimeout 走牆上時鐘，
 * 要除以倍率才會和畫面同步變慢（0.25 倍 → 延遲變 4 倍）。倍率 >= 1 或不合法時原樣回傳。
 */
export function scaleTimerDelay(delayMs: number | undefined, scale: number): number | undefined {
    if (typeof delayMs !== 'number' || !Number.isFinite(delayMs) || delayMs <= 0) return delayMs;
    if (!Number.isFinite(scale) || scale <= 0 || scale >= 1) return delayMs;
    return delayMs / scale;
}
