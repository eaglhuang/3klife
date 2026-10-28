// @spec-source → 血脈命鏡LoadingTips補遺_2026-04-04（doc_ui_0007）§正式規則 1–4；PROG-2-1378（LT-02）
/**
 * LoadingTips — 血脈命鏡載入提示的挑選（純邏輯，不依賴 cc）。
 *
 * - 文案分四池：系統提示（system）、歷史趣聞（history）、血脈傳聞（bloodline）、角色誘惑（tease）。
 * - 挑選：先依持有狀態取分池權重，再從該池抽一條；同一次不重複抽同一條。
 * - 未持有角色提高 tease 權重；已持有提高 system 與 bloodline 權重（權重在資料檔裡）。
 * - count 限制在 1～2 條（規格「每次顯示 1~2 條」）。
 *
 * Unity 對照：像 WeightedRandom 抽獎：先抽稀有度池（分類權重），再從池裡抽一張卡，抽過的不放回。
 */

export type LoadingTipCategory = 'system' | 'history' | 'bloodline' | 'tease';

export const LOADING_TIP_CATEGORIES: readonly LoadingTipCategory[] = ['system', 'history', 'bloodline', 'tease'];

/** 資料檔路徑（resources 相對路徑，不含副檔名） */
export const BLOODLINE_MIRROR_LOADING_TIPS_PATH = 'ui-spec/content/bloodline-mirror-loading-tips-v1';

export const LOADING_TIP_MIN_COUNT = 1;
export const LOADING_TIP_MAX_COUNT = 2;

export type LoadingTipWeights = Readonly<Record<LoadingTipCategory, number>>;

export interface LoadingTipsContent {
    categories: Readonly<Record<LoadingTipCategory, readonly string[]>>;
    weights: {
        owned: LoadingTipWeights;
        unowned: LoadingTipWeights;
    };
}

export interface PickLoadingTipsOptions {
    /** 是否已持有該角色；決定用哪一組權重 */
    owned: boolean;
    /** 要抽幾條；會限制在 LOADING_TIP_MIN_COUNT～LOADING_TIP_MAX_COUNT */
    count: number;
    /** 回傳 [0, 1) 的亂數來源；測試時可換成固定序列 */
    random: () => number;
}

function clampCount(count: number): number {
    if (!Number.isFinite(count)) return LOADING_TIP_MIN_COUNT;
    return Math.min(LOADING_TIP_MAX_COUNT, Math.max(LOADING_TIP_MIN_COUNT, Math.floor(count)));
}

/** 把亂數限制在 [0, 1)，避免 random 回傳 1 或非有限值時越界 */
function unit(random: () => number): number {
    const value = random();
    return Number.isFinite(value) ? Math.min(Math.max(value, 0), 0.999999) : 0;
}

/** 挑出 1～2 條不重複的提示文字；某池抽完或權重總和為 0 時提早結束，不會回傳空字串。 */
export function pickLoadingTips(content: LoadingTipsContent, options: PickLoadingTipsOptions): string[] {
    const weights = options.owned ? content.weights.owned : content.weights.unowned;
    const remaining: Record<LoadingTipCategory, string[]> = {
        system: [...content.categories.system],
        history: [...content.categories.history],
        bloodline: [...content.categories.bloodline],
        tease: [...content.categories.tease],
    };
    const picked: string[] = [];

    for (let i = 0; i < clampCount(options.count); i++) {
        const pools = LOADING_TIP_CATEGORIES.filter((category) => weights[category] > 0 && remaining[category].length > 0);
        const total = pools.reduce((sum, category) => sum + weights[category], 0);
        if (pools.length === 0 || total <= 0) break;

        let roll = unit(options.random) * total;
        let chosen = pools[pools.length - 1];
        for (const category of pools) {
            if (roll < weights[category]) {
                chosen = category;
                break;
            }
            roll -= weights[category];
        }

        const pool = remaining[chosen];
        const [text] = pool.splice(Math.floor(unit(options.random) * pool.length), 1);
        picked.push(text);
    }
    return picked;
}
