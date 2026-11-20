// @spec-source → 主戰場UI規格書.md (doc_ui_0001) §3.1 頭頂數值；PROG-2-9422（Q-C1 選 A）
/**
 * AttackSurgeHighlight — 高倍率攻擊的頭頂數字提示（純資料與純函式，不依賴 cc，可直接單元測試）。
 *
 * 地格「攻擊×N」buff 是乘算疊加（使用者 11/20 裁決維持），單位可能疊到一擊秒殺主將。
 * 規則不改，改成讓玩家看得出來：
 *   - 目前攻擊 ÷ 基礎攻擊 ≥ goldRatio（預設 2）→ 頭頂攻擊數字變金。
 *   - ≥ redRatio（預設 4）→ 變紅，並在數字後方加慢速脈動光環。
 *   - 敵我單位都適用。門檻放在 data/attack-surge-highlight.json。
 *
 * Unity 對照：HUD 數值顏色分級的 ScriptableObject 設定＋判斷 helper。
 */

export type AttackSurgeTier = 'none' | 'gold' | 'red';

export interface AttackSurgeConfig {
    goldRatio: number;
    redRatio: number;
    /** 紅色光環一次放大再縮回的秒數 */
    pulsePeriodSec: number;
}

export const DEFAULT_ATTACK_SURGE_CONFIG: Readonly<AttackSurgeConfig> = {
    goldRatio: 2,
    redRatio: 4,
    pulsePeriodSec: 1.6,
};

/** 金字、紅字的顏色（避開一般增益綠 110,255,120 與減益紅 255,120,110，紅字更深更飽和） */
export const ATTACK_SURGE_GOLD = { r: 255, g: 205, b: 40, a: 255 } as const;
export const ATTACK_SURGE_RED = { r: 255, g: 45, b: 45, a: 255 } as const;

function positiveNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * 解析設定檔；欄位缺少或不合法時用預設值。
 * redRatio 必須大於 goldRatio，否則兩個門檻都退回預設（避免紅色永遠蓋過金色）。
 */
export function parseAttackSurgeConfig(raw: unknown): AttackSurgeConfig {
    const src = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
    let goldRatio = positiveNumber(src.goldRatio) ?? DEFAULT_ATTACK_SURGE_CONFIG.goldRatio;
    let redRatio = positiveNumber(src.redRatio) ?? DEFAULT_ATTACK_SURGE_CONFIG.redRatio;
    if (goldRatio <= 1 || redRatio <= goldRatio) {
        goldRatio = DEFAULT_ATTACK_SURGE_CONFIG.goldRatio;
        redRatio = DEFAULT_ATTACK_SURGE_CONFIG.redRatio;
    }
    const pulsePeriodSec = positiveNumber(src.pulsePeriodSec) ?? DEFAULT_ATTACK_SURGE_CONFIG.pulsePeriodSec;
    return { goldRatio, redRatio, pulsePeriodSec };
}

/** 目前攻擊相對基礎攻擊的倍率；基礎攻擊不合法時回 1（不提示） */
export function attackSurgeRatio(effectiveAttack: number, baseAttack: number): number {
    if (!Number.isFinite(effectiveAttack) || !Number.isFinite(baseAttack) || baseAttack <= 0) return 1;
    return effectiveAttack / baseAttack;
}

/** 依倍率分級：none（照舊綠／紅／白）、gold、red */
export function attackSurgeTier(effectiveAttack: number, baseAttack: number, config: AttackSurgeConfig = DEFAULT_ATTACK_SURGE_CONFIG): AttackSurgeTier {
    const ratio = attackSurgeRatio(effectiveAttack, baseAttack);
    if (ratio >= config.redRatio) return 'red';
    if (ratio >= config.goldRatio) return 'gold';
    return 'none';
}
