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
import type { GeneralPersonalityType } from '../models/GeneralUnit';

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

export type JournalReactionSource = 'TEMPLATE' | 'PERSONAL' | 'FALLBACK';

/**
 * 個人化提示（武將心智 MIND-2，PROG-2-9150）：武將最近一次可引用的經歷。
 * 有提示且類別是戰報／派遣時，反應改引用這段過去（「{cite}」是第3年夏的河北押運這類短語），沒有就維持原模板。
 */
export interface JournalReactionPersonal {
    type: GeneralPersonalityType;
    /** 引用短語，例「第3年夏的河北押運」 */
    cite: string;
    /** 那次的結果：失手帶教訓口吻，得手帶乘勢口吻 */
    outcome: 'SUCCESS' | 'FAIL';
}

type PersonalTable = Readonly<Record<GeneralPersonalityType, readonly string[]>>;

const PERSONAL_BATTLE_FAIL: PersonalTable = {
    Brave: ['{name}：{cite}那一敗我還記著，這一仗得失已記下，下回必勝。'],
    Wise: ['{name}：{cite}之失猶在心，這一仗的得失我已逐條記下。'],
    Loyal: ['{name}：{cite}辜負了主公，這一仗的結果請主公過目，我再不敢鬆懈。'],
    Playful: ['{name}：{cite}栽過一回，這仗可不能再栽了，戰報請主公過目。'],
};
const PERSONAL_BATTLE_WIN: PersonalTable = {
    Brave: ['{name}：自{cite}得手，這一仗打得更痛快，戰報已記入案頭。'],
    Wise: ['{name}：{cite}之後算得更準了，這一仗的得失已記入案頭。'],
    Loyal: ['{name}：{cite}承主公信任，這一仗也不敢怠慢，戰報請過目。'],
    Playful: ['{name}：{cite}贏得漂亮，這仗也不賴，戰報請主公過目。'],
};
const PERSONAL_DISPATCH_FAIL: PersonalTable = {
    Brave: ['{name}：差事辦完了。{cite}的虧某沒忘，下回還要再戰。'],
    Wise: ['{name}：差事已回報。{cite}的教訓在前，我這回處處留心。'],
    Loyal: ['{name}：差事回報主公。{cite}未能成事，我格外謹慎，願主公過目。'],
    Playful: ['{name}：差事回來啦。{cite}那回搞砸了，這回可小心多了。'],
};
const PERSONAL_DISPATCH_WIN: PersonalTable = {
    Brave: ['{name}：差事辦妥。{cite}之後越戰越勇，主公儘管再派。'],
    Wise: ['{name}：差事已回。沿用{cite}的路數，果然穩妥，請主公過目。'],
    Loyal: ['{name}：差事回報主公。承{cite}的信任，這回也幸不辱命。'],
    Playful: ['{name}：差事搞定！{cite}之後手感正好，主公還有嗎？'],
};

export const JOURNAL_REACTION_PERSONAL: Readonly<Record<'BATTLE' | 'DISPATCH', { FAIL: PersonalTable; SUCCESS: PersonalTable }>> = Object.freeze({
    BATTLE: { FAIL: PERSONAL_BATTLE_FAIL, SUCCESS: PERSONAL_BATTLE_WIN },
    DISPATCH: { FAIL: PERSONAL_DISPATCH_FAIL, SUCCESS: PERSONAL_DISPATCH_WIN },
});

export interface JournalReaction {
    text: string;
    source: JournalReactionSource;
}

/** 字數以 Unicode 字元計（中文一字一個），含標點。 */
function charCount(text: string): number {
    return Array.from(text).length;
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
    personal?: Readonly<JournalReactionPersonal>,
): JournalReaction {
    const name = generalName.trim();
    if (personal && name.length > 0 && (entry.category === 'BATTLE' || entry.category === 'DISPATCH')) {
        const list = JOURNAL_REACTION_PERSONAL[entry.category][personal.outcome][personal.type];
        const line = list[templateIndex(pick, list.length)].split('{name}').join(name).split('{cite}').join(personal.cite);
        if (canAcceptReactionLine(line)) return { text: line, source: 'PERSONAL' };
    }
    const templates = JOURNAL_REACTION_TEMPLATES[entry.category];
    if (name.length === 0 || !templates) return { text: JOURNAL_REACTION_FALLBACK, source: 'FALLBACK' };
    const text = templates[templateIndex(pick, templates.length)].split('{name}').join(name);
    if (!canAcceptReactionLine(text)) return { text: JOURNAL_REACTION_FALLBACK, source: 'FALLBACK' };
    return { text, source: 'TEMPLATE' };
}
