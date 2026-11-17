// @spec-source → 俘虜處理系統.md (doc_spec_0021) §L 我方主將被擒（使用者 2026-11-17 裁決，PROG-2-9140）；戰場端回報介面見 GeneralCaptureRecord
/**
 * GeneralCaptivity — 我方主將在戰場被擒之後，由擒獲方君主處置的純邏輯（不依賴 cc）。
 *
 * 處置順序（每一步擲一次）：
 *   1. 斬首：性格表斬首率，依邦交、名將修正後夾上下限 → 中了就是永久陣亡。
 *   2. 投降：鏡射我方勸降公式 persuadeRate（說客改成敵君主，目標改成我方被擒武將）→ 中了就變成敵國武將。
 *   3. 釋放／關押：性格表釋放率依邦交修正 → 中了當場回我方，否則關押。
 *
 * 無君主（挑戰關、找不到對應國家、該國已滅亡）、教學戰、試用傭兵：整筆忽略，只當一般戰敗，不加處罰。
 * 敵方主將被擒（capturedFaction 為 Enemy）不在這裡處理。
 *
 * 關押：武將仍屬我方，但帶著 captivity（被哪一國關、從第幾季開始）；不能出戰、不能派任務。
 * 與該國邦交 >= 60 可「索要」立刻釋放；關滿 4 季換季時自動釋放。
 *
 * Unity 對照：像戰後的 PrisonerFateResolver——把「被擒」事實餵進一張機率表，輸出處置結果，狀態寫回角色存檔。
 */
import { Faction } from '../config/Constants';
import { GENERAL_STATUS_DEAD, type RandomSource } from './GeneralAging';
import { persuadeRate, powRarityOf, PERSUADE_RATE_MAX } from './PrisonerOfWar';
import { NATION_DEFS, type NationDef, type NationProfile, type NationState } from './RivalNations';
import type { TallyHoldings } from './TigerTallyHoldings';
import type { TallyLine } from './TallyLineSpec';

// ── 戰場回報介面（與戰場專家的約定相容；core 不 import battle） ─────────────────

export type GeneralCaptureCause = 'duel-escape-failed' | 'duel-slain' | 'troop';

/** 戰場上「主將被擒」的紀錄；一場最多每個陣營一筆 */
export interface GeneralCaptureRecord {
    capturedFaction: Faction;
    capturedGeneralId: string;
    capturedTemplateId: string | null;
    captorGeneralId: string | null;
    captorTemplateId: string | null;
    cause: GeneralCaptureCause;
    tutorial: boolean;
    turn: number;
    /** 這場的遭遇戰代號（選填；對不到君主時只當一般戰敗） */
    encounterId?: string;
}

// ── 具名常數（裁決值；暫定者標註） ───────────────────────────────────────────

/** 性格 → 斬首率、釋放率（百分比）。2026-11-17 裁決：斬首率為初稿減半，釋放率照初稿 */
export const CAPTOR_PROFILE_TABLE: Readonly<Record<NationProfile, { readonly beheadRate: number; readonly releaseRate: number }>> = {
    WARLORD: { beheadRate: 17.5, releaseRate: 5 },
    RAIDER: { beheadRate: 15, releaseRate: 10 },
    MILITARIST: { beheadRate: 10, releaseRate: 10 },
    EXPANSIONIST: { beheadRate: 7.5, releaseRate: 15 },
    CAVALRY_LORD: { beheadRate: 5, releaseRate: 30 },
    GUARDIAN: { beheadRate: 4, releaseRate: 25 },
    PASSIVE: { beheadRate: 2.5, releaseRate: 40 },
    DIPLOMAT: { beheadRate: 1.5, releaseRate: 50 },
};

/** 邦交門檻：>= 友好值時斬首減半、釋放加成；<= 敵對值時斬首加重、釋放減半 */
export const CAPTURE_RELATION_FRIENDLY = 60;
export const CAPTURE_RELATION_HOSTILE = -60;
export const CAPTURE_BEHEAD_FRIENDLY_MULT = 0.5;
export const CAPTURE_RELEASE_FRIENDLY_BONUS = 20;
export const CAPTURE_BEHEAD_HOSTILE_MULT = 1.5;
export const CAPTURE_RELEASE_HOSTILE_MULT = 0.5;
/** 被擒者是最高稀有度名將：斬首率 ×0.5 */
export const CAPTURE_TOP_RARITY_BEHEAD_MULT = 0.5;
/** 最高稀有度名將的投降率加成（百分點）；2026-11-17 使用者裁決 */
export const CAPTURE_TOP_RARITY_SURRENDER_BONUS = 10;
/** 斬首率上限（百分比）；2026-11-17 使用者裁決 */
export const CAPTURE_BEHEAD_MAX = 25;
export const CAPTURE_BEHEAD_MIN = 0;
/** 釋放率上限（百分比）；暫定，建議值，待裁決 */
export const CAPTURE_RELEASE_MAX = 80;
export const CAPTURE_RELEASE_MIN = 0;
/** 關押滿幾季自動釋放 */
export const CAPTIVITY_SEASONS = 4;
/** 與關押國邦交達此值，可「索要」立刻釋放 */
export const CAPTIVITY_RANSOM_MIN_RELATION = 60;
/** 查不到敵君主五維時的保守值（魅力取君主治理預設 60、運氣 0 → 不偏向投降） */
export const CAPTURE_FALLBACK_LORD_STATS: Readonly<{ cha: number; luk: number }> = { cha: 60, luk: 0 };

// ── 關押狀態 ─────────────────────────────────────────────────────────────────

/** 武將身上的被囚紀錄（GeneralConfig.captivity）：被哪一國關、從第幾季開始（totalSeasonsElapsed） */
export interface CaptivityState {
    nationId: string;
    sinceSeason: number;
}

export function isCaptive(general: { readonly captivity?: Readonly<CaptivityState> | null } | null | undefined): boolean {
    return !!general?.captivity;
}

/** 讀檔校正：欄位不齊或壞值回傳 undefined（舊存檔沒有此欄位 = 沒人被囚） */
export function normalizeCaptivity(raw: unknown): CaptivityState | undefined {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    const { nationId, sinceSeason } = raw as Record<string, unknown>;
    if (typeof nationId !== 'string' || nationId.length === 0) return undefined;
    if (typeof sinceSeason !== 'number' || !Number.isInteger(sinceSeason) || sinceSeason < 0) return undefined;
    return { nationId, sinceSeason };
}

/** 整份名冊讀檔校正：壞的 captivity 拿掉，其餘原樣；沒有任何改動時回傳原陣列 */
export function normalizeRosterCaptivity<T extends { captivity?: unknown }>(roster: readonly T[]): T[] {
    let changed = false;
    const next = roster.map((g) => {
        if (!('captivity' in g)) return g;
        const fixed = normalizeCaptivity(g.captivity);
        if (fixed && g.captivity && JSON.stringify(fixed) === JSON.stringify(g.captivity)) return g;
        changed = true;
        const { captivity: _drop, ...rest } = g;
        return (fixed ? { ...rest, captivity: fixed } : rest) as T;
    });
    return changed ? next : (roster as T[]);
}

/** 目前這一季是否已關滿 CAPTIVITY_SEASONS 季（換季結算用） */
export function isCaptivityServed(state: Readonly<CaptivityState>, currentSeason: number): boolean {
    return currentSeason - state.sinceSeason >= CAPTIVITY_SEASONS;
}

/** 邦交夠高才能索要 */
export function canRansomCaptive(relation: number): boolean {
    return relation >= CAPTIVITY_RANSOM_MIN_RELATION;
}

// ── 機率 ─────────────────────────────────────────────────────────────────────

export interface CaptureOdds {
    /** 斬首率（百分比，已修正並夾上下限） */
    beheadRate: number;
    /** 釋放率（百分比，已修正並夾上下限；在沒斬、沒降之後才擲） */
    releaseRate: number;
    /** 投降率額外加成（百分點） */
    surrenderBonus: number;
}

const clampTo = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

/** 修正順序：先邦交 → 再名將 → 夾上下限 */
export function captureOdds(profile: NationProfile, relation: number, topRarity: boolean): CaptureOdds {
    const base = CAPTOR_PROFILE_TABLE[profile];
    let behead = base.beheadRate;
    let release = base.releaseRate;
    if (relation >= CAPTURE_RELATION_FRIENDLY) {
        behead *= CAPTURE_BEHEAD_FRIENDLY_MULT;
        release += CAPTURE_RELEASE_FRIENDLY_BONUS;
    } else if (relation <= CAPTURE_RELATION_HOSTILE) {
        behead *= CAPTURE_BEHEAD_HOSTILE_MULT;
        release *= CAPTURE_RELEASE_HOSTILE_MULT;
    }
    let surrenderBonus = 0;
    if (topRarity) {
        behead *= CAPTURE_TOP_RARITY_BEHEAD_MULT;
        surrenderBonus = CAPTURE_TOP_RARITY_SURRENDER_BONUS;
    }
    return {
        beheadRate: clampTo(behead, CAPTURE_BEHEAD_MIN, CAPTURE_BEHEAD_MAX),
        releaseRate: clampTo(release, CAPTURE_RELEASE_MIN, CAPTURE_RELEASE_MAX),
        surrenderBonus,
    };
}

export interface CaptureTarget {
    cha?: number;
    luk?: number;
    /** 我方被擒武將的忠誠度數值（0~100）；沒有時沿用勸降公式的預設 */
    loyalty?: number | null;
    rarityTier?: string;
}

/**
 * 投降率（百分比）：鏡射我方勸降 persuadeRate——
 *   20% + (敵君主 CHR − 我將 CHR) × 0.5 + 敵君主 LUK × 0.2% − 我將忠誠 × 0.3%，夾在 1%~95%，
 * 名將再加 surrenderBonus 個百分點（上限同為 95%）。
 */
export function surrenderRate(lord: { cha?: number; luk?: number }, target: CaptureTarget, surrenderBonus = 0): number {
    const base = persuadeRate(lord, { id: '', name: '', cha: target.cha, loyalty: target.loyalty });
    return Math.min(PERSUADE_RATE_MAX, base + surrenderBonus);
}

export type CaptureVerdict = 'beheaded' | 'surrendered' | 'imprisoned' | 'released';

/** 三步擲骰：斬首 → 投降 → 釋放／關押；亂數可注入（0~1），沒走到的步驟不消耗亂數 */
export function rollCaptureVerdict(odds: CaptureOdds, surrender: number, random: RandomSource): CaptureVerdict {
    if (random() * 100 < odds.beheadRate) return 'beheaded';
    if (random() * 100 < surrender) return 'surrendered';
    if (random() * 100 < odds.releaseRate) return 'released';
    return 'imprisoned';
}

// ── 對應君主與國家 ───────────────────────────────────────────────────────────

/**
 * 從被擒紀錄找擒獲方的國家：captorTemplateId 對君主 id；找不到再用遭遇戰的敵將（encounterEnemyGeneralId）。
 * 對不到（挑戰關等）回傳 undefined。
 */
export function resolveCaptorNation(
    record: Pick<GeneralCaptureRecord, 'captorTemplateId' | 'captorGeneralId'>,
    encounterEnemyGeneralId?: string | null,
    defs: readonly NationDef[] = NATION_DEFS,
): NationDef | undefined {
    const candidates = [record.captorTemplateId, record.captorGeneralId, encounterEnemyGeneralId ?? null];
    for (const id of candidates) {
        if (!id) continue;
        const found = defs.find((def) => def.leaderId === id);
        if (found) return found;
    }
    return undefined;
}

// ── 處置計畫 ─────────────────────────────────────────────────────────────────

/** 名冊裡處置時要用到的欄位 */
export interface CaptureRosterGeneral extends CaptureTarget {
    id: string;
    name?: string;
    status?: string;
    captivity?: CaptivityState | null;
}

export interface CaptureOutcome {
    generalId: string;
    generalName: string;
    nationId: string;
    captorName: string;
    verdict: CaptureVerdict;
    odds: CaptureOdds;
    surrender: number;
}

export interface PlanCapturesInput {
    records: readonly GeneralCaptureRecord[];
    roster: readonly CaptureRosterGeneral[];
    nations: readonly Pick<NationState, 'id' | 'relation' | 'fallen'>[];
    random: RandomSource;
    /** 這場遭遇戰的敵將（君主）id；captorTemplateId 對不到時的備援 */
    encounterEnemyGeneralId?: string | null;
    /** 君主五維（cha、luk）；查不到用 CAPTURE_FALLBACK_LORD_STATS */
    lordStatsOf?: (leaderId: string) => { cha?: number; luk?: number } | null | undefined;
    /** 君主顯示名；查不到用國名 */
    lordNameOf?: (leaderId: string) => string | null | undefined;
    /** 不處理的名冊 id（試用傭兵等） */
    exemptIds?: ReadonlySet<string>;
}

/** 過濾出要處置的被擒紀錄並逐筆擲骰；不改輸入、不寫狀態 */
export function planGeneralCaptures(input: PlanCapturesInput): CaptureOutcome[] {
    const outcomes: CaptureOutcome[] = [];
    const seen = new Set<string>();
    for (const record of input.records) {
        if (record.capturedFaction !== Faction.Player || record.tutorial) continue;
        if (seen.has(record.capturedGeneralId) || input.exemptIds?.has(record.capturedGeneralId)) continue;
        const general = input.roster.find((g) => g.id === record.capturedGeneralId);
        if (!general || (general.status ?? '').toLowerCase() === GENERAL_STATUS_DEAD || isCaptive(general)) continue;
        const def = resolveCaptorNation(record, input.encounterEnemyGeneralId);
        const nation = def ? input.nations.find((n) => n.id === def.id) : undefined;
        if (!def || !nation || nation.fallen) continue;
        seen.add(record.capturedGeneralId);
        const topRarity = powRarityOf(general.rarityTier) === 'SSR';
        const odds = captureOdds(def.profile, nation.relation, topRarity);
        const lord = input.lordStatsOf?.(def.leaderId) ?? CAPTURE_FALLBACK_LORD_STATS;
        const surrender = surrenderRate(lord, general, odds.surrenderBonus);
        outcomes.push({
            generalId: general.id,
            generalName: general.name ?? general.id,
            nationId: def.id,
            captorName: input.lordNameOf?.(def.leaderId) ?? def.name,
            verdict: rollCaptureVerdict(odds, surrender, input.random),
            odds,
            surrender,
        });
    }
    return outcomes;
}

// ── 虎符易主 ─────────────────────────────────────────────────────────────────

/** 投降：武將持有的虎符跟著他走，從我方持有關係移除；回傳帶走的虎符 uid */
export function takeTalliesWithDefector(state: TallyHoldings, generalId: string): { state: TallyHoldings; taken: string[] } {
    const taken = Object.keys(state.holders).filter((uid) => state.holders[uid] === generalId);
    if (taken.length === 0) return { state, taken };
    const holders = { ...state.holders };
    for (const uid of taken) delete holders[uid];
    return { state: { holders }, taken };
}

// ── 顯示文字（i18n Key＋參數，保底繁中在 TallyLineSpec） ───────────────────────

export function captureNoticeSpec(verdict: CaptureVerdict, generalName: string, captorName: string): TallyLine {
    const key = {
        beheaded: 'SCRIPT_CAPTURE_BEHEADED',
        surrendered: 'SCRIPT_CAPTURE_SURRENDERED',
        imprisoned: 'SCRIPT_CAPTURE_IMPRISONED',
        released: 'SCRIPT_CAPTURE_RELEASED',
    }[verdict];
    return { key, args: [generalName, captorName] };
}

/** 關滿自動釋放、索要釋放的提示 */
export function captiveFreedSpec(generalName: string, nationName: string, ransomed: boolean): TallyLine {
    return { key: ransomed ? 'SCRIPT_CAPTIVE_RANSOMED' : 'SCRIPT_CAPTIVE_SERVED', args: [generalName, nationName] };
}
