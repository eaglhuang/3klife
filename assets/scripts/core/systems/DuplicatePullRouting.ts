// @spec-source → 重複名將分流彈窗與復生重練協議規格書 (doc_spec_0331) §1~§3（SAME-03、SAME-04、SAME-05，PROG-2-2008）
/**
 * DuplicatePullRouting — 重複名將分流彈窗的選項資料、十連抽沿用選擇、五轉溢出結義點數與灌注數值包（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 抽到已持有的史實名將（同模板 ID）時強制彈窗，左【復生重練】#00D1B2、右【血脈灌注】#FFDD57。
 * - 勾選「本次批次沿用」後，同一批次後續重複卡自動套用相同選擇。
 * - 復生重練已達 5 轉：不建新本體，改給 100 結義點數。
 * - 血脈灌注：英靈卡傳承經驗 +500、專屬虎符戰鬥經驗 +150、宗族聲望 +50，並寫入 INFUSION_RECORD。
 *
 * 新本體轉數沿用 ReviveRetrain；英靈卡數值套用沿用 BloodlineInfusion。
 * 暫定：INFUSION_RECORD 的卡片 hash 由呼叫端提供；虎符經驗只在有專屬虎符時給；彈窗 UI 與 GameSession 接線另卡。
 * Unity 對照：像一個 Modal 的 ViewModel 加上批次處理的 policy 物件。
 */

import { normalizeRebirthCount } from './Rebirth';
import { reincarnationStatCap } from './ReincarnationUltModel';

export type DuplicatePullChoice = 'revive' | 'infuse';

export interface DuplicateChoiceCard {
    choice: DuplicatePullChoice;
    title: string;
    color: string;
    bullets: readonly string[];
}

export const DUPLICATE_POPUP_TITLE = '【宿命牽引・名將重逢】';

export const DUPLICATE_CHOICE_CARDS: readonly DuplicateChoiceCard[] = [
    {
        choice: 'revive', title: '【復生重練】', color: '#00D1B2',
        bullets: ['重新塑造 20 歲巔峰之軀', '轉生次數 +1（上限 5 轉）', '單項五維成長上限 +100', '完整嵌回既有英靈傳承卡'],
    },
    {
        choice: 'infuse', title: '【血脈灌注】', color: '#FFDD57',
        bullets: ['既有英靈卡獲得 500 經驗', '專屬虎符戰鬥屬性提升', '宗族聲望立即增加 50 點', '現役武將狀態完全保留'],
    },
];

export const REBIRTH_MAX_COUNT = 5;
export const REBIRTH_OVERFLOW_OATH_POINTS = 100;
export const INFUSION_SPIRIT_EXP = 500;
export const INFUSION_TALLY_EXP = 150;
export const INFUSION_CLAN_REPUTATION = 50;
/** 每次灌注全屬性 +5%（裁決 2026-11-08 第 16 項） */
export const INFUSION_STAT_RATE = 0.05;
/** 虎符層級加成的層數上限（暫定：灌注累積的層級只取前 5 層） */
export const INFUSION_TALLY_LEVEL_MAX = 5;
export const INFUSION_STAT_KEYS = ['str', 'int', 'lea', 'pol', 'cha', 'luk'] as const;

/** 抽到的卡是否觸發分流彈窗：名冊已有同模板 ID。 */
export function needsDuplicateRouting(templateId: string, ownedTemplateIds: readonly string[]): boolean {
    return ownedTemplateIds.includes(templateId);
}

/** 十連抽批次的沿用選擇狀態。 */
export interface DuplicateBatchPolicy {
    remembered: DuplicatePullChoice | null;
}

/** 玩家在彈窗按下選擇；勾選沿用時記住。 */
export function recordDuplicateChoice(policy: DuplicateBatchPolicy, choice: DuplicatePullChoice, applyToBatch: boolean): DuplicateBatchPolicy {
    return { remembered: applyToBatch ? choice : policy.remembered };
}

/** 批次中下一張重複卡：有沿用選擇就直接套用，否則要彈窗（回 null）。 */
export function autoDuplicateChoice(policy: DuplicateBatchPolicy): DuplicatePullChoice | null {
    return policy.remembered;
}

/** 復生重練的溢出判定：已達 5 轉則改給結義點數。 */
export function reviveOverflowOathPoints(currentRebirthCount: number | undefined): number {
    const c = currentRebirthCount ?? 1;
    return c >= REBIRTH_MAX_COUNT ? REBIRTH_OVERFLOW_OATH_POINTS : 0;
}

export interface InfusionRecord {
    kind: 'INFUSION_RECORD';
    templateId: string;
    cardHash: string;
    timestamp: number;
    /** 這次灌注後英靈卡的虎符層級；戰場同步讀取用 */
    linkedTallyLevel?: number;
}

export interface InfusionGrant {
    spiritExp: number;
    tallyExp: number;
    clanReputation: number;
    record: InfusionRecord;
}

/** 血脈灌注的數值包與帳本條目。 */
export function bloodlineInfusionGrant(templateId: string, hasPersonalTally: boolean, cardHash: string, timestamp: number): InfusionGrant {
    return {
        spiritExp: INFUSION_SPIRIT_EXP,
        tallyExp: hasPersonalTally ? INFUSION_TALLY_EXP : 0,
        clanReputation: INFUSION_CLAN_REPUTATION,
        record: { kind: 'INFUSION_RECORD', templateId, cardHash, timestamp },
    };
}

type InfusionStatKey = (typeof INFUSION_STAT_KEYS)[number];

/**
 * 灌注的全屬性加成：缺欄位不補；至少 +1，避免低屬性四捨五入後沒變。
 * 不超過該轉數的單項上限，但已超過上限的舊值不會被壓低。
 */
export function applyInfusionStats<T extends { rebirthCount?: number } & Partial<Record<InfusionStatKey, number>>>(general: T): T {
    const cap = reincarnationStatCap(normalizeRebirthCount(general.rebirthCount));
    const next: T = { ...general };
    for (const key of INFUSION_STAT_KEYS) {
        const value = general[key];
        if (typeof value !== 'number' || !Number.isFinite(value)) continue;
        const raised = Math.max(value + 1, Math.round(value * (1 + INFUSION_STAT_RATE)));
        (next as Partial<Record<InfusionStatKey, number>>)[key] = Math.max(value, Math.min(cap, raised));
    }
    return next;
}

/** 從帳本同步查某武將模板目前的虎符層級（0~5）；沒灌注過是 0 */
export function tallyInfusionLevelOf(records: readonly InfusionRecord[], templateId: string): number {
    let level = 0;
    for (const record of records) {
        if (record.templateId === templateId && typeof record.linkedTallyLevel === 'number') level = record.linkedTallyLevel;
    }
    return Math.max(0, Math.min(INFUSION_TALLY_LEVEL_MAX, Math.floor(level)));
}
