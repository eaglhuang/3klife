// @spec-source → 武將壽命系統.md (doc_spec_0018) §G 劇本相關、§H 字串內容相關
/**
 * LifeScriptCopy — 壽命與階段劇本文案的 Key 與參數（LIFE-13，純邏輯，不依賴 cc）
 *
 * 只產出「字串 Key + 位置參數」，真正的翻譯交給 I18nSystem.t(key, ...args)。
 * 這樣文案的對應關係可以不開場景就測試。
 *
 * Unity 對照：像一個只回傳 (LocalizationKey, args) 的 Presenter，
 * 由 View 呼叫 Localization.Get(key, args) 顯示。
 *
 * 參數順序以 zh-TW.json 的 {0}、{1} 為準。
 */

export type LifePhaseId = 'youth' | 'prime' | 'peak' | 'elder';

export type LifeScriptEvent = 'grow-up' | 'prime' | 'elder' | 'retire' | 'death' | 'afterlife';

export interface LifeCopyRequest {
    key: string;
    args: string[];
}

export const LIFE_PHASE_KEYS: Readonly<Record<LifePhaseId, string>> = {
    youth: 'life.phase.youth',
    prime: 'life.phase.prime',
    peak: 'life.phase.peak',
    elder: 'life.phase.elder',
};

/** 劇本事件對應的 Key；參數：{0}=武將名（death 另有 {1}=享年） */
export const LIFE_SCRIPT_KEYS: Readonly<Record<LifeScriptEvent, string>> = {
    'grow-up': 'life.script.grow_up',
    prime: 'life.script.prime',
    elder: 'life.script.elder',
    retire: 'life.script.retire',
    death: 'life.script.death',
    afterlife: 'life.script.afterlife',
};

/** 每個劇本 Key 需要的參數個數，測試用來核對 zh-TW.json 的佔位符 */
export const LIFE_SCRIPT_ARG_COUNT: Readonly<Record<LifeScriptEvent, number>> = {
    'grow-up': 1,
    prime: 1,
    elder: 1,
    retire: 1,
    death: 2,
    afterlife: 1,
};

export const LIFE_DEATH_NOTIFY_KEY = 'life.death_notify';
export const LIFE_AGE_DISPLAY_KEY = 'life.age_display';
export const LIFE_LIFESPAN_BAR_KEY = 'life.lifespan_bar';

/** 顯示用的整數歲數（增齡以 0.25 歲為單位，顯示時無條件捨去） */
function displayAge(age: number): string {
    return String(Math.max(0, Math.floor(age)));
}

export function lifePhaseCopy(phase: LifePhaseId): LifeCopyRequest {
    return { key: LIFE_PHASE_KEYS[phase], args: [] };
}

/** 劇本事件文案；death 需要享年，其他事件只需要武將名 */
export function lifeScriptCopy(event: LifeScriptEvent, name: string, age?: number): LifeCopyRequest {
    if (event === 'death') {
        return { key: LIFE_SCRIPT_KEYS.death, args: [name, displayAge(age ?? 0)] };
    }
    return { key: LIFE_SCRIPT_KEYS[event], args: [name] };
}

/** 死亡通知（UI_DEATH_NOTIFY）：「{Name} 辭世，享年 {Age} 歲」 */
export function lifeDeathNotifyCopy(name: string, age: number): LifeCopyRequest {
    return { key: LIFE_DEATH_NOTIFY_KEY, args: [name, displayAge(age)] };
}

/** 壽命條（UI_LIFESPAN_BAR）：「壽命：{Age}/{Max_Lifespan}」 */
export function lifespanBarCopy(age: number, maxLifespan: number): LifeCopyRequest {
    return { key: LIFE_LIFESPAN_BAR_KEY, args: [displayAge(age), displayAge(maxLifespan)] };
}

/** 年齡顯示（UI_AGE_DISPLAY）：「{Name}（{Age} 歲）」 */
export function ageDisplayCopy(name: string, age: number): LifeCopyRequest {
    return { key: LIFE_AGE_DISPLAY_KEY, args: [name, displayAge(age)] };
}
