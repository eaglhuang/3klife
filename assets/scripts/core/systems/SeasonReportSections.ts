// @spec-source → 使用者裁決 69（季報加本季行動、人口與民心變化、武將心聲）；PROG-2-9155
/**
 * SeasonReportSections — 季報的區段資料（純邏輯，不依賴 cc）
 *
 * 職責：把「本季行動紀錄、人口民心前後值、武將心智」組成區段陣列（本季行動／人口與民心／武將心聲）。
 * 沒內容的區段不產生；全部都沒有時由呼叫端顯示 SEASON_QUIET_LINE 一句。UI 只渲染，不自己拼字。
 *
 * Unity 對照：Presenter 的 ViewModel 組裝；View 只拿 sections 逐段寫進 Label。
 */

export type SeasonReportSectionId = 'actions' | 'population' | 'voices';

export interface SeasonReportSection {
    readonly id: SeasonReportSectionId;
    readonly title: string;
    readonly lines: readonly string[];
}

/** 整季都沒事時顯示的簡短一句 */
export const SEASON_QUIET_LINE = '本季風平浪靜，無事可報。';

/** 武將心聲每季最多幾則 */
export const SEASON_REPORT_MAX_VOICES = 3;

/** 季內累計的行動紀錄（GameSession 在事件發生時寫入，季結後清空） */
export interface SeasonActivityLog {
    battlesWon: number;
    battlesLost: number;
    /** 本季新入帳的武將姓名 */
    recruits: string[];
    /** 本季武將將階晉升 */
    rankUps: Array<{ name: string; title: string }>;
    /** 本季玩家官職晉升後的官職名 */
    officerPromotions: string[];
}

export function emptySeasonActivity(): SeasonActivityLog {
    return { battlesWon: 0, battlesLost: 0, recruits: [], rankUps: [], officerPromotions: [] };
}

export interface SeasonDomesticSummary {
    /** 例如「農耕」 */
    taskName: string;
    /** 例如「糧草 +120」；可省略 */
    gainText?: string;
}

export interface SeasonReportMindMood {
    readonly generalId: string;
    readonly name: string;
    readonly mood: 'EAGER' | 'HIGH' | 'NORMAL' | 'LOW';
}

/** 心聲候選：一位武將此刻想說的一句（台詞走 mind 離線模板，由 GameSession 取好傳入） */
export interface MindVoiceCandidate extends SeasonReportMindMood {
    /** 心智台詞；空字串代表沒什麼特別想說，不入選 */
    text: string;
    source: 'NONE' | 'MEMORY' | 'STREAK' | 'BOND' | 'IDLE' | 'MOOD';
    /** 本季剛發生事件（心智記憶的季數等於剛結束的季） */
    justHappened: boolean;
}

export interface SeasonReportInput {
    activity: SeasonActivityLog;
    domestic?: SeasonDomesticSummary | null;
    /** 本季到期結算的大廳任務件數；沒有時省略 */
    hallMissions?: { settled: number; succeeded: number } | null;
    population: { before: number; after: number };
    morale: { before: number; after: number };
    voices?: readonly MindVoiceCandidate[];
}

function signed(delta: number): string {
    return delta > 0 ? `+${delta.toLocaleString('en-US')}` : `${delta < 0 ? '-' : ''}${Math.abs(delta).toLocaleString('en-US')}`;
}

/** 心聲優先序分數：強烈心情與剛發生事件優先；分數 0 的（心情普通又沒事件）仍可補位，但排最後 */
function voiceScore(c: MindVoiceCandidate): number {
    let score = 0;
    if (c.justHappened) score += 3;
    if (c.mood === 'LOW' || c.mood === 'EAGER') score += 2;
    else if (c.mood === 'HIGH') score += 1;
    if (c.source === 'MEMORY' || c.source === 'STREAK' || c.source === 'BOND') score += 1;
    return score;
}

/**
 * 挑心聲：台詞非空、同將只取一則、台詞相同只留一則、最多 max 則；依分數高到低，同分依 generalId 字典序（結果可重現）。
 * 只有「心情普通且沒新事件」的武將（分數 0）不入選，避免湊數的空話。
 */
export function pickMindVoices(candidates: readonly MindVoiceCandidate[], max: number = SEASON_REPORT_MAX_VOICES): MindVoiceCandidate[] {
    const ordered = candidates.filter((c) => c.text && c.source !== 'NONE' && voiceScore(c) > 0);
    ordered.sort((a, b) => voiceScore(b) - voiceScore(a) || (a.generalId < b.generalId ? -1 : a.generalId > b.generalId ? 1 : 0));
    // 同將只取分數最高的一則；模板有限，兩人說一模一樣的話只留一則（排序後先到者留）
    const seenGeneral = new Set<string>();
    const seenText = new Set<string>();
    const picked: MindVoiceCandidate[] = [];
    for (const c of ordered) {
        if (seenGeneral.has(c.generalId) || seenText.has(c.text)) continue;
        seenGeneral.add(c.generalId);
        seenText.add(c.text);
        picked.push(c);
        if (picked.length >= max) break;
    }
    return picked;
}

export function buildActionLines(input: Pick<SeasonReportInput, 'activity' | 'domestic' | 'hallMissions'>): string[] {
    const { activity } = input;
    const lines: string[] = [];
    const battles = activity.battlesWon + activity.battlesLost;
    if (battles > 0) lines.push(`戰鬥：${activity.battlesWon} 勝 ${activity.battlesLost} 敗`);
    if (input.domestic) lines.push(`內政：${input.domestic.taskName}${input.domestic.gainText ? `（${input.domestic.gainText}）` : ''}`);
    if (input.hallMissions && input.hallMissions.settled > 0) {
        lines.push(`差事：完成 ${input.hallMissions.settled} 件，成功 ${input.hallMissions.succeeded} 件`);
    }
    if (activity.recruits.length > 0) lines.push(`新武將：${activity.recruits.join('、')}`);
    for (const rankUp of activity.rankUps) lines.push(`升級：${rankUp.name} 晉升${rankUp.title}`);
    for (const title of activity.officerPromotions) lines.push(`官職：晉升${title}`);
    return lines;
}

export function buildPopulationLines(input: Pick<SeasonReportInput, 'population' | 'morale'>): string[] {
    const lines: string[] = [];
    const dp = input.population.after - input.population.before;
    const dm = input.morale.after - input.morale.before;
    if (dp !== 0) lines.push(`人口：${input.population.before.toLocaleString('en-US')} → ${input.population.after.toLocaleString('en-US')}（${signed(dp)}）`);
    if (dm !== 0) lines.push(`民心：${input.morale.before} → ${input.morale.after}（${signed(dm)}）`);
    return lines;
}

/** 組季報區段；沒內容的區段不列入回傳。順序固定：本季行動、人口與民心、武將心聲。 */
export function buildSeasonReportSections(input: SeasonReportInput): SeasonReportSection[] {
    const sections: SeasonReportSection[] = [];
    const actions = buildActionLines(input);
    if (actions.length > 0) sections.push({ id: 'actions', title: '本季行動', lines: actions });
    const population = buildPopulationLines(input);
    if (population.length > 0) sections.push({ id: 'population', title: '人口與民心', lines: population });
    const voices = pickMindVoices(input.voices ?? []);
    if (voices.length > 0) sections.push({ id: 'voices', title: '武將心聲', lines: voices.map((v) => `${v.name}：「${v.text}」`) });
    return sections;
}

/** 區段轉成標籤文字：第一行標題，其後各行；沒有該區段時回空字串（畫面層隱藏） */
export function sectionText(sections: readonly SeasonReportSection[], id: SeasonReportSectionId): string {
    const section = sections.find((s) => s.id === id);
    return section && section.lines.length > 0 ? [section.title, ...section.lines].join('\n') : '';
}

/**
 * 估算文字在固定寬度標籤內折成幾行（CLAMP 標籤要靠它算高度，避免字被截或超出框）。
 * 中文字以一格計，英數半格；超過每行字數就折行。
 */
export function estimateWrappedLines(text: string, unitsPerLine: number): number {
    if (text.length === 0) return 0;
    const per = Math.max(1, unitsPerLine);
    let total = 0;
    for (const raw of text.split('\n')) {
        let units = 0;
        for (const ch of raw) units += ch.charCodeAt(0) < 0x2e80 ? 0.55 : 1;
        total += Math.max(1, Math.ceil(units / per));
    }
    return total;
}
