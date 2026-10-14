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
