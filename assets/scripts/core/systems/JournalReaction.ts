// @spec-source → NPC人性化規格書.md §F-2 對話生成模式（STATIC_TEMPLATE、JOURNAL_REACTION、FALLBACK_LINE）、§F-3 生成台詞檢查；WBS NPC-04；PROG-2-1013
/**
 * JournalReaction — 日誌條目的一句武將反應（離線模板，純邏輯，不依賴 cc）。
 *
 * - 依日誌類別挑一句模板，填入武將名稱，產生 20~60 字的反應台詞（晨報、派遣結果共用）。
 * - 挑選索引由呼叫端傳入 pick，不呼叫 Random，同樣輸入同樣輸出，方便重播與測試。
 * - 台詞不合格（長度不符、有未填的 slot、沒有武將名）時回退 FALLBACK_LINE，不丟例外。
 *
 * 暫定（規格未定稿）：模板文案由工程先寫，正式台詞待企劃定稿；persona card 尚未存在，不依人格調整語氣。
 * Unity 對照：像 Localization 的 Template 表加 Fallback 字串，取不到就顯示預設句，不讓 UI 空白。
 */
import type { JournalCategory, JournalEntry } from './JournalLog';

export const JOURNAL_REACTION_MIN_CHARS = 20;
export const JOURNAL_REACTION_MAX_CHARS = 60;
export const JOURNAL_REACTION_FALLBACK = '此事容我再想想。';

export const JOURNAL_REACTION_TEMPLATES: Readonly<Record<JournalCategory, readonly string[]>> = Object.freeze({
    BATTLE: [
        '{name}：戰報已記入案頭，此役得失，我與你都該再想想。',
        '{name}：刀兵之事不可輕忽，這一仗的教訓請記在心裡。',
    ],
    DISPATCH: [
        '{name}：派遣已回，勞煩主公過目，差事大致妥當。',
        '{name}：外出辦事回來了，路上所見，容我慢慢說與主公聽。',
    ],
    INTERACTION: [
        '{name}：多謝主公今日掛念，這份心意我記下了。',
        '{name}：昨日的閒談還在心頭，若有空，再來坐坐如何。',
    ],
    GROWTH: [
        '{name}：近來功課略有長進，雖未敢自滿，也算不負期許。',
        '{name}：身子與心志都比先前更穩，這是主公栽培之功。',
    ],
    SYSTEM: [
        '{name}：府中諸事已安頓，主公可安心歇息片刻。',
        '{name}：今日的記事已整理妥當，請主公隨時翻閱。',
    ],
});

export type JournalReactionSource = 'TEMPLATE' | 'FALLBACK';

export interface JournalReaction {
    text: string;
    source: JournalReactionSource;
}

/** 字數以 Unicode 字元計（中文一字一個），含標點。 */
function charCount(text: string): number {
    return [...text].length;
}

/** 台詞檢查：長度在 20~60 字之間，且不含未填的 slot 括號。 */
export function canAcceptReactionLine(text: string): boolean {
    const length = charCount(text);
    if (length < JOURNAL_REACTION_MIN_CHARS || length > JOURNAL_REACTION_MAX_CHARS) return false;
    return !/[{}]/.test(text);
}

/** 依 pick 取模板索引；非有限數視為 0，負數也會落在範圍內。 */
function templateIndex(pick: number, count: number): number {
    const safe = Number.isFinite(pick) ? Math.floor(pick) : 0;
    return ((safe % count) + count) % count;
}

/**
 * 為一筆日誌條目產生一句反應。
 * generalName 為空字串或只有空白時直接回退，避免台詞出現空的稱呼。
 */
export function journalReactionLine(
    entry: Readonly<Pick<JournalEntry, 'category'>>,
    generalName: string,
    pick: number,
): JournalReaction {
    const name = generalName.trim();
    const templates = JOURNAL_REACTION_TEMPLATES[entry.category];
    if (name.length === 0 || !templates) return { text: JOURNAL_REACTION_FALLBACK, source: 'FALLBACK' };
    const text = templates[templateIndex(pick, templates.length)].split('{name}').join(name);
    if (!canAcceptReactionLine(text)) return { text: JOURNAL_REACTION_FALLBACK, source: 'FALLBACK' };
    return { text, source: 'TEMPLATE' };
}
