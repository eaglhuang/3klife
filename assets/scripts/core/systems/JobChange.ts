// @spec-source → 轉職與宿命系統.md §D/§F（轉職條件、副職能力）、§H（UI_JOB_CHANGE）；WBS v3 FATE-06（純邏輯）、FATE-07（畫面用的選項與文案）
/**
 * JobChange — 20 歲轉職（追加副職）純邏輯，不依賴 cc。
 *
 * 轉職令數量由呼叫端傳入（道具庫存尚未接線）。尚未接到存檔或成人禮場景；
 * FATE-07 只提供畫面要讀的選項與文案，Cocos 版面由後續工單接線。
 */

export type JobClass = 'Warrior' | 'Scholar';

export const JOB_CHANGE_MIN_AGE = 20;
/** 副職能力 = 主職能力 × 0.6（規格 §F）。 */
export const SUB_CLASS_ABILITY_RATIO = 0.6;
export const JOB_CHANGE_ORDER_COST = 1;

export interface JobChangeCandidate {
    age: number;
    primaryClass: JobClass;
    /** 目前副職；null 表示尚未轉職。 */
    subClass: JobClass | null;
    /** 主職能力值（武官看武力/統率類、文官看智識類，由呼叫端換算成單一數值）。 */
    primaryAbility: number;
}

export type JobChangeRejectReason = 'too-young' | 'no-order' | 'already-has-sub' | 'same-class';

export interface JobChangeResult {
    general: JobChangeCandidate;
    ordersAfter: number;
    ok: boolean;
    reason?: JobChangeRejectReason;
    /** 本次追加的副職能力；只有 ok 時有值。 */
    subAbility?: number;
}

export interface JobChangeChoice {
    subClass: JobClass;
    /** 畫面文案 UI_JOB_CHANGE 已代入後的內容。 */
    label: string;
    projectedSubAbility: number;
}

const JOB_CLASS_LABEL: Readonly<Record<JobClass, string>> = Object.freeze({
    Warrior: '武官',
    Scholar: '文官',
});

/** 規格 UI_JOB_CHANGE：「消耗轉職令 ×1，追加副職能：{SubClass}」 */
export function formatJobChangeText(subClass: JobClass): string {
    return `消耗轉職令 ×${JOB_CHANGE_ORDER_COST}，追加副職能：${JOB_CLASS_LABEL[subClass]}`;
}

/** 副職能力換算，向下取整，避免畫面出現小數。 */
export function projectSubClassAbility(primaryAbility: number): number {
    if (!Number.isFinite(primaryAbility) || primaryAbility < 0) throw new RangeError('主職能力必須為有限非負數');
    return Math.floor(primaryAbility * SUB_CLASS_ABILITY_RATIO);
}

/**
 * 轉職條件檢查順序：年齡 → 是否已有副職 → 副職與主職不可相同 → 轉職令。
 * 規格沒有寫「副職需與主職不同」，這裡採用：副職必須是另一職能（§A 寫的是「追加另一職能」）。
 */
export function checkJobChange(general: JobChangeCandidate, ordersOwned: number, targetSubClass: JobClass): JobChangeRejectReason | null {
    if (general.age < JOB_CHANGE_MIN_AGE) return 'too-young';
    if (general.subClass !== null) return 'already-has-sub';
    if (targetSubClass === general.primaryClass) return 'same-class';
    if (ordersOwned < JOB_CHANGE_ORDER_COST) return 'no-order';
    return null;
}

/**
 * 執行 20 歲轉職：扣轉職令 ×1，設定副職與副職能力。
 * 回傳新狀態，不改輸入、不用亂數、不寫存檔。
 */
export function applyJobChange(general: JobChangeCandidate, ordersOwned: number, targetSubClass: JobClass): JobChangeResult {
    const reason = checkJobChange(general, ordersOwned, targetSubClass);
    if (reason) return { general: { ...general }, ordersAfter: ordersOwned, ok: false, reason };
    const subAbility = projectSubClassAbility(general.primaryAbility);
    return {
        general: { ...general, subClass: targetSubClass },
        ordersAfter: ordersOwned - JOB_CHANGE_ORDER_COST,
        ok: true,
        subAbility,
    };
}

/** FATE-07 畫面：列出可選的副職（排除與主職相同者），附文案與預估能力。 */
export function buildJobChangeChoices(general: JobChangeCandidate): JobChangeChoice[] {
    const classes: JobClass[] = ['Warrior', 'Scholar'];
    return classes
        .filter(cls => cls !== general.primaryClass)
        .map(cls => ({
            subClass: cls,
            label: formatJobChangeText(cls),
            projectedSubAbility: projectSubClassAbility(general.primaryAbility),
        }));
}
