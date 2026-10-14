// @spec-source → 大廳系統 E-3 / F-2（自告奮勇彩蛋判定）；武將人物介面規格補遺 §4.1（成功率 +50%，採用此版）（PROG-2-0454，暫定）
/**
 * HallVolunteer — 大廳「自告奮勇」彩蛋的判定、排序與成功率加成，純 TS，不依賴 cc。
 *
 * 判定（F-2）：任務標籤與武將 roleTags 有交集、武將情緒為 EAGER、任務尚未演過一次。
 * 演出只做一次：演過後任務加上 VOLUNTEER_SHOWN 旗標，之後不再觸發。
 * 加成：自告奮勇成功率 +50%（暫定解讀為加 0.5 個百分點），結果夾在 0~1。
 * Unity 對照：像一個只會 Play 一次的 Animator 狀態，播過就寫進存檔的旗標，不會每次進場都重播。
 */

export const VOLUNTEER_SHOWN_FLAG = 'VOLUNTEER_SHOWN';
export const VOLUNTEER_EAGER_MOOD = 'EAGER';
/** 暫定：+50% 解讀為加 0.5 個百分點；若企劃定為乘法，只改這裡與 applyVolunteerBonus。 */
export const VOLUNTEER_SUCCESS_BONUS = 0.5;

export interface HallVolunteerTask {
    id: string;
    tags: readonly string[];
    flags: readonly string[];
}

export interface HallVolunteerGeneral {
    id: string;
    roleTags: readonly string[];
    mood: string;
}

/** F-2 判定：標籤有交集、情緒為 EAGER、任務尚未演過自告奮勇。 */
export function shouldShowVolunteerEvent(task: Readonly<HallVolunteerTask>, general: Readonly<HallVolunteerGeneral>): boolean {
    const tagMatch = task.tags.some(tag => general.roleTags.includes(tag));
    return tagMatch && general.mood === VOLUNTEER_EAGER_MOOD && !task.flags.includes(VOLUNTEER_SHOWN_FLAG);
}

/** 一次性演出：回傳加上 VOLUNTEER_SHOWN 旗標的新任務物件；已有旗標時回傳同一份內容的新物件。不改輸入。 */
export function markVolunteerShown<T extends HallVolunteerTask>(task: Readonly<T>): T {
    if (task.flags.includes(VOLUNTEER_SHOWN_FLAG)) return { ...task, flags: [...task.flags] } as T;
    return { ...task, flags: [...task.flags, VOLUNTEER_SHOWN_FLAG] } as T;
}

/**
 * 下拉清單排序：會自告奮勇的武將排在前面，其餘保持原順序（穩定排序）。
 * 不改輸入陣列。
 */
export function sortVolunteersFirst<T extends HallVolunteerGeneral>(candidates: readonly T[], task: Readonly<HallVolunteerTask>): T[] {
    const volunteers: T[] = [];
    const others: T[] = [];
    for (const general of candidates) {
        if (shouldShowVolunteerEvent(task, general)) volunteers.push(general);
        else others.push(general);
    }
    return [...volunteers, ...others];
}

/** 成功率加成：自告奮勇者 +0.5（暫定），結果夾在 0~1；非自告奮勇者原值回傳。 */
export function applyVolunteerBonus(baseRate: number, volunteered: boolean): number {
    const clamped = Number.isFinite(baseRate) ? Math.min(1, Math.max(0, baseRate)) : 0;
    if (!volunteered) return clamped;
    return Math.min(1, clamped + VOLUNTEER_SUCCESS_BONUS);
}
