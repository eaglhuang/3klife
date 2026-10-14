// @spec-source → 教官系統（支援卡）.md (doc_spec_0027) §I Schema（Source）、養成系統與教官來源定義.md (doc_spec_0151)
/**
 * MentorSources — 教官卡五來源標記與持有清單（純邏輯，不依賴 cc）
 *
 * 五種來源各自的獲取入口由其他系統負責（抽卡、5 歲分流、退役、戰場俘虜、傭兵結義）；
 * 本檔只負責「拿到的教官卡要貼上哪個來源標記，並放進持有清單」。
 *
 * 規格：同一位武將（同 uid）只會有一張教官卡；重複拿到時以新來源覆蓋舊標記的話會丟失原來源，
 * 所以這裡保留既有來源，只在第一次獲取時寫入。
 *
 * Unity 對照：像一個 Inventory 的 AddItem，依來源寫入 ScriptableObject 的 source 欄位，重複 uid 不新增。
 */
import { MENTOR_SOURCES } from '../models/MentorCard';
import type { MentorCard, MentorSource } from '../models/MentorCard';

export function isMentorSource(value: unknown): value is MentorSource {
    return typeof value === 'string' && (MENTOR_SOURCES as readonly string[]).includes(value);
}

/** 回傳帶有來源標記的新卡（不改傳入物件）；已有來源時保留原來源 */
export function tagMentorSource(card: MentorCard, source: MentorSource): MentorCard {
    if (!isMentorSource(source)) throw new RangeError(`未知的教官來源：${String(source)}`);
    return { ...card, source: card.source ?? source };
}

/**
 * 把一張教官卡放進持有清單：同 uid 已存在則保留舊卡（含舊來源），不重複新增。
 * 回傳新陣列，不改傳入的清單。
 */
export function addMentorToHoldings(holdings: readonly MentorCard[], card: MentorCard, source: MentorSource): MentorCard[] {
    if (holdings.some((held) => held.uid === card.uid)) return [...holdings];
    return [...holdings, tagMentorSource(card, source)];
}
