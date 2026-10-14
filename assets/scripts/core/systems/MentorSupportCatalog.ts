// @spec-source → 教官系統（支援卡）.md (doc_spec_0027) §I Data Schema；資料檔 assets/resources/data/mentor-support-cards.json
/**
 * MentorSupportCatalog — 教官支援卡目錄（純邏輯，不依賴 cc）
 *
 * 把 mentor-support-cards.json 解析成「武將 id → 支援卡資料」的對照表，並把它掛到退役教官卡上。
 * 壞條目不會擋住其他條目：每筆獨立驗證，錯誤連同序號回報。
 *
 * 暫定：
 *   - 條目格式 { General_ID, Support }：General_ID 指向 generals.json 的武將 id；
 *     Support 是 §I 的 SUP_* JSON（由 parseSupportCard 驗證）。
 *   - 同一武將只會有一張支援卡；重複時後面的條目回報為錯誤，保留先出現的那張。
 *
 * Unity 對照：像一張 ScriptableObject 清單，開機時讀一次，之後按 id 查表；
 * 掛載（attach）只替沒有元件的物件加元件，不覆蓋已經設定好的。
 */
import { parseSupportCard, SupportCardDef } from '../models/MentorSupportSchema';
import type { MentorCard } from '../models/MentorCard';
import type { GeneralConfig } from '../models/GeneralUnit';
import { addMentorToHoldings } from './MentorSources';

export interface SupportCatalogProblem {
    index: number;
    errors: string[];
}

export interface SupportCatalog {
    /** 武將 id → 支援卡資料 */
    byGeneralId: ReadonlyMap<string, SupportCardDef>;
    problems: SupportCatalogProblem[];
}

export function parseSupportCatalog(raw: unknown): SupportCatalog {
    const byGeneralId = new Map<string, SupportCardDef>();
    const problems: SupportCatalogProblem[] = [];
    if (!Array.isArray(raw)) {
        problems.push({ index: -1, errors: ['目錄必須是陣列'] });
        return { byGeneralId, problems };
    }
    raw.forEach((entry, index) => {
        const generalId = typeof entry === 'object' && entry !== null ? (entry as { General_ID?: unknown }).General_ID : undefined;
        if (typeof generalId !== 'string' || generalId.trim() === '') {
            problems.push({ index, errors: ['General_ID 必須是非空字串'] });
            return;
        }
        if (byGeneralId.has(generalId)) {
            problems.push({ index, errors: [`General_ID ${generalId} 重複，保留先出現的支援卡`] });
            return;
        }
        const parsed = parseSupportCard((entry as { Support?: unknown }).Support);
        if (!parsed.ok) {
            problems.push({ index, errors: parsed.errors });
            return;
        }
        byGeneralId.set(generalId, parsed.value);
    });
    return { byGeneralId, problems };
}

/** 替沒有支援卡的教官卡掛上目錄資料；已有 support 的卡與目錄外的武將原樣回傳（不改輸入） */
export function attachSupportToCards(cards: readonly MentorCard[], catalog: SupportCatalog): MentorCard[] {
    return cards.map((card) => {
        if (card.support) return card;
        const support = catalog.byGeneralId.get(card.sourceGeneralId);
        return support ? { ...card, support } : card;
    });
}

/** 轉蛋抽到時的時間（季與年），給新產生的教官卡填入 */
export interface GachaMentorTime {
    currentYear: number;
    currentSeason: number;
}

/**
 * 轉蛋抽到支援卡武將：產生 source=Gacha 的教官卡。
 * 轉蛋沒有退役資料，年齡欄位填 0（暫定），季與年用抽卡當下的時間；沒有父母，parentUids 留空字串。
 */
export function mentorCardFromGachaDraw(general: GeneralConfig, support: SupportCardDef, time: GachaMentorTime): MentorCard {
    return {
        uid: `mentor-${general.id}`,
        sourceGeneralId: general.id,
        name: general.name,
        faction: String(general.faction ?? ''),
        retiredAge: 0,
        retiredSeason: time.currentSeason,
        retiredYear: time.currentYear,
        ep_snapshot: general.ep ?? 0,
        gene_refs: [],
        parentUids: ['', ''],
        generalSnapshot: general,
        support,
        source: 'Gacha',
    };
}

/**
 * 支援卡池的 poolId 清單。PM 裁定（2026-10-14）：目前留空，支援卡池設定待企劃補。
 * 一般武將池（名將池、紅顏池）不產生教官卡，避免與分池規格衝突。
 */
export const SUPPORT_CARD_POOL_IDS: readonly string[] = [];

/** 這個卡池是否為支援卡池（只有支援卡池抽到的支援卡武將才會產生 Gacha 教官卡） */
export function isSupportCardPool(poolId: string | undefined, supportPoolIds: readonly string[] = SUPPORT_CARD_POOL_IDS): boolean {
    return !!poolId && supportPoolIds.includes(poolId);
}

/**
 * 把抽到的武將裡有支援卡的，加進教官持有清單（同 uid 保留舊卡與舊來源，不重複新增）。
 * 只有支援卡池才會加；一般武將池回傳原清單的副本。回傳新陣列，不改傳入的清單。
 */
export function addGachaMentorCards(
    holdings: readonly MentorCard[],
    drawn: readonly GeneralConfig[],
    catalog: SupportCatalog,
    time: GachaMentorTime,
    poolId: string | undefined,
    supportPoolIds: readonly string[] = SUPPORT_CARD_POOL_IDS,
): MentorCard[] {
    let next: MentorCard[] = [...holdings];
    if (!isSupportCardPool(poolId, supportPoolIds)) return next;
    for (const general of drawn) {
        const support = general ? catalog.byGeneralId.get(general.id) : undefined;
        if (!support) continue;
        next = addMentorToHoldings(next, mentorCardFromGachaDraw(general, support, time), 'Gacha');
    }
    return next;
}
