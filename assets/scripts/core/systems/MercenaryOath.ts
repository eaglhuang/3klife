// @spec-source → 傭兵系統（試用）doc_spec_0029 §D 文案表／§C 結義資源需求；六日結義 doc_spec_0583 §4；稀缺貨幣錢包 doc_spec_0626 §2（BOND_POINTS 上限 50000）；動態人際關係 doc_spec_0576 §3.1（義兄弟同陣士氣 +20）；PROG-2-10201
/**
 * MercenaryOath — 大廳「傭兵結義」的條件清單、儀式步驟、文案與義兄弟預覽（純邏輯，不依賴 cc）。
 *
 * 職責：
 *   - oathText：結義相關文案一律走 i18n（key 為 oath.<name>），查不到才用這裡的 zh-TW 預設
 *   - evaluateOath：把「試用滿六日／好感滿門檻／結義點數足夠」三個條件攤開，面板逐項顯示 ✓／○
 *   - buildOathRitual：結義成功後的儀式步驟（焚香→對飲→立誓），由大廳依序播放
 *   - swornMoraleBonus：義兄弟同陣的士氣上限加成（規格數值），只提供純函式，戰場端接線不在本檔
 *   - clampBondPoints：結義點數錢包上限與防負數（規格 ECO-03）
 *
 * Unity 對照：像一份 LocalizationTable + 條件檢查表，畫面層只拿字串與布林值。
 */
import { TRIAL_DAYS, type MercenaryState } from './MercenaryBond';
import { AFFECTION_CAP } from './MercenaryAffection';

/** 結義點數錢包上限（ECO-03）。 */
export const BOND_POINTS_MAX_CAP = 50000;
/** 義兄弟同陣出征的士氣上限加成（動態關係規格 §3.1）。 */
export const SWORN_MORALE_BONUS = 20;

/** i18n 查詢函式：查不到時回傳 key 本身（services().i18n.t 的行為）。 */
export type OathTextLookup = (key: string, ...args: Array<string | number>) => string;

/** zh-TW 預設文案（i18n 缺字時的後備）。{0}{1}{2} 為參數。 */
export const OATH_TEXTS = {
    panelTitle: '傭兵・結義',
    close: '關閉',
    countdown: '結義倒數：{0} 日',
    progress: '結義進度：{0}/{1}',
    illustration: '插畫 {0}/{1}',
    nametag: '原主：{0}',
    confirm: '消耗 {0} 結義點數，將 {1} 納為永久武將？',
    farewell: '{0} 已離隊。六日情緣，且作追憶。',
    affection: '好感：{0}/{1}',
    points: '結義點數：持有 {0}／需要 {1}',
    condHeading: '結義條件',
    condTrial: '試用滿六日（{0}/{1}）',
    condAffection: '好感達 {0}（目前 {1}）',
    condPoints: '結義點數達 {0}（目前 {1}）',
    condDone: '已結義',
    swornPartner: '義兄弟：{0}　同陣出征士氣上限 +{1}',
    swornPending: '結義後將與出戰主將結為義兄弟（同陣士氣上限 +{0}）',
    bondButton: '結義（{0} 點）',
    bondButtonIdle: '結義',
    selecting: '檢視中',
    select: '選取',
    empty: '目前沒有傭兵',
    hireButton: '試用招募（試用券 {0}）',
    noteNoPoints: '結義點數不足',
    noteNotReady: '尚未滿足結義條件，請看條件清單',
    noteBondFailed: '結義失敗，請稍後再試',
    noteNoTicket: '試用券不足',
    noteNoCandidate: '目前沒有可試用的武將',
    noteFemaleEmpty: '本批女將已招完',
    noteHired: '{0} 願為主公效力六日',
    bondFailedToast: '無法結義此傭兵',
    bondedLine: '{0} 願誓死追隨主公！桃園之義，永世不渝！',
    dayThreeLine: '{0}：與主公並肩三日，已知主公非凡人。',
    trustLine: '{0}：主公，我相信你了。',
    farewellLine: '六日之約已盡，{0} 含淚辭別…',
    ritualTitle: '桃園結義',
    ritualIncense: '焚香祭天，{0} 與 {1} 並肩立於桃林之下。',
    ritualIncenseSolo: '焚香祭天，{0} 立於主公座前。',
    ritualCups: '斟滿酒盞，對飲三巡。',
    ritualDone: '結義完成：{0} 成為永久武將',
    ritualSkip: '點擊略過',
} as const;

export type OathTextKey = keyof typeof OATH_TEXTS;

/** 把 {0}{1}… 換成參數（找不到對應參數就保留原樣）。 */
export function fillOathArgs(template: string, args: ReadonlyArray<string | number>): string {
    return template.replace(/\{(\d+)\}/g, (whole, index) => {
        const value = args[Number(index)];
        return value === undefined ? whole : String(value);
    });
}

/** 取結義文案：先查 i18n（oath.<key>），查不到用 zh-TW 預設，參數都會代入。 */
export function oathText(lookup: OathTextLookup | undefined, key: OathTextKey, ...args: Array<string | number>): string {
    const i18nKey = `oath.${key}`;
    const found = lookup ? lookup(i18nKey, ...args) : i18nKey;
    return found && found !== i18nKey ? fillOathArgs(found, args) : fillOathArgs(OATH_TEXTS[key], args);
}

export type OathConditionId = 'trial' | 'affection' | 'points';

export interface OathCondition {
    id: OathConditionId;
    ok: boolean;
    text: string;
}

export interface OathEvaluation {
    conditions: OathCondition[];
    /** 三個條件全部滿足。 */
    allMet: boolean;
}

export interface OathEvaluationInput {
    /** 結義所需點數（依稀有度，BOND_POINT_COST）。 */
    cost: number;
    /** 目前持有的結義點數。 */
    bondPoints: number;
    lookup?: OathTextLookup;
}

/**
 * 結義條件判定：試用倒數歸零、好感滿 60（PM 裁定 2026-10-13）、結義點數足夠。
 * 已結義或已離隊者只回傳「已結義」單一項（allMet=false，不能再結義）。
 */
export function evaluateOath(state: Readonly<MercenaryState>, input: Readonly<OathEvaluationInput>): OathEvaluation {
    if (state.status !== 'Trial') {
        return {
            conditions: state.status === 'Bonded' ? [{ id: 'trial', ok: true, text: oathText(input.lookup, 'condDone') }] : [],
            allMet: false,
        };
    }
    const affection = state.affection ?? 0;
    const conditions: OathCondition[] = [
        { id: 'trial', ok: state.daysLeft === 0, text: oathText(input.lookup, 'condTrial', TRIAL_DAYS - state.daysLeft, TRIAL_DAYS) },
        { id: 'affection', ok: affection >= AFFECTION_CAP, text: oathText(input.lookup, 'condAffection', AFFECTION_CAP, affection) },
        { id: 'points', ok: input.bondPoints >= input.cost, text: oathText(input.lookup, 'condPoints', input.cost, input.bondPoints) },
    ];
    return { conditions, allMet: conditions.every((c) => c.ok) };
}

/** 條件清單的多行文字：每行「✓ 」或「○ 」開頭。 */
export function oathConditionLines(evaluation: Readonly<OathEvaluation>): string {
    return evaluation.conditions.map((c) => `${c.ok ? '✓' : '○'} ${c.text}`).join('\n');
}

export interface OathRitualStep {
    text: string;
    /** 這一步停留毫秒數（含淡入淡出）。 */
    ms: number;
}

/**
 * 結義儀式步驟：焚香（有義兄弟時點名）→ 對飲 → 立誓 → 完成。
 * 總長約 6 秒，大廳可點擊略過；略過不影響已寫入的結果。
 */
export function buildOathRitual(generalName: string, partnerName: string | null, lookup?: OathTextLookup): OathRitualStep[] {
    return [
        {
            text: partnerName
                ? oathText(lookup, 'ritualIncense', generalName, partnerName)
                : oathText(lookup, 'ritualIncenseSolo', generalName),
            ms: 1700,
        },
        { text: oathText(lookup, 'ritualCups'), ms: 1500 },
        { text: oathText(lookup, 'bondedLine', generalName), ms: 1900 },
        { text: oathText(lookup, 'ritualDone', generalName), ms: 1400 },
    ];
}

export interface OathPartnerRelation {
    uidA: string;
    uidB: string;
    type: string;
}

/** 找出武將的義兄弟（DYNAMIC_SWORN 或史實 SWORN）的另一端 uid；沒有回傳 null。 */
export function swornPartnerOf(generalId: string, relations: ReadonlyArray<OathPartnerRelation>): string | null {
    for (const r of relations) {
        if (r.type !== 'DYNAMIC_SWORN' && r.type !== 'SWORN') continue;
        if (r.uidA === generalId) return r.uidB;
        if (r.uidB === generalId) return r.uidA;
    }
    return null;
}

/**
 * 義兄弟同陣士氣上限加成（動態關係規格 §3.1：+20）。
 * 出征名單裡任兩人互為義兄弟就加一次，不疊加。純函式，戰場端要不要接由戰場專家決定。
 */
export function swornMoraleBonus(lineupIds: ReadonlyArray<string>, relations: ReadonlyArray<OathPartnerRelation>): number {
    const inLineup = new Set(lineupIds);
    const hasPair = relations.some(
        (r) => (r.type === 'DYNAMIC_SWORN' || r.type === 'SWORN') && r.uidA !== r.uidB && inLineup.has(r.uidA) && inLineup.has(r.uidB),
    );
    return hasPair ? SWORN_MORALE_BONUS : 0;
}

/** 結義點數入帳夾制（ECO-03）：非有限數或負數視為 0，超過 50000 夾到上限，小數捨去。 */
export function clampBondPoints(value: number): number {
    if (!Number.isFinite(value) || value < 0) return 0;
    return Math.min(BOND_POINTS_MAX_CAP, Math.floor(value));
}
