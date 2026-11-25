// @spec-source → NPC人性化規格書 §K 與三國大腦中台的分工（NPC-10，PROG-2-1933）
/**
 * NpcDialogueCache — 中台生成台詞的本地回寫：可驗證摘要或可丟棄快取（純邏輯，不依賴 cc）。
 *
 * 規格要求：中台生成結果只能回寫為「可驗證摘要」或「可丟棄快取」，前端不得把不可追溯的生成文字當唯一真相。
 * - 有已用證據（usedEvidenceRefs，缺值時用 evidenceRefs）且沒有走降級：VERIFIABLE_SUMMARY，保留證據與來源。
 * - 其他（無證據、降級、或有未解析證據）：DISPOSABLE_CACHE，可隨時清掉重新生成。
 * - 快取以 generalId + contextKey + locale + 關鍵詞組合為鍵；clear 可全清或只清可丟棄者。
 *
 * 暫定：存檔欄位與 NpcDialogueService 接線另卡；本卡只提供分類與記憶體快取。
 * Unity 對照：像一個 Dictionary 快取，每筆標記「可信」或「可丟」，可丟的隨時 Clear。
 */
import type { NpcDialogueRequest, NpcDialogueResponse } from '../services/NpcDialogueService';
import { sha256, toHex, utf8Encode } from '../../shared/foundation/Sha256';
import type { InsightConfigV1 } from '../../shared/reward/RewardConfig';
import type { InsightMeta } from '../../shared/reward/RewardRules';

/** 台詞成就（PROG-2-9864）：正規化時要去掉的空白與標點（全形與半形常見符號） */
const INSIGHT_STRIP_RE = /[\s!-\/:-@\[-`{-~ -⁯　-〿＀-／：-＠［-｀｛-･]+/g;

/** 台詞正規化：NFKC、小寫、去空白與標點。相同意思的寫法差異（全半形、標點）視為同一句。 */
export function normalizeDialogueText(text: string): string {
    return text.normalize('NFKC').toLowerCase().replace(INSIGHT_STRIP_RE, '');
}

/** 台詞指紋：正規化後的 SHA-256（hex）。 */
export function dialogueFingerprint(text: string): string {
    return toHex(sha256(utf8Encode(normalizeDialogueText(text))));
}

export type InsightDecision = 'none' | 'first' | 'step' | 'capped';

export interface InsightEvaluation {
    decision: InsightDecision;
    fingerprint: string;
    /** 套用後的新狀態（decision 為 none 時與輸入相同）；呼叫端若後續入帳失敗要還原 */
    next: InsightMeta;
}

export function emptyInsightMeta(): InsightMeta {
    return { seen: {}, daily: {}, achieved: {} };
}

/**
 * 台詞成就判定（純函式）：
 * - 指紋已見 → none（不加友誼、不發獎，台詞照顯示）。
 * - 未解鎖成就 → first（解鎖、友誼與徽章由 firstBundle 發）。
 * - 已解鎖 → step（當日未達上限）或 capped（達上限：不加友誼，但仍計入已見）。
 * 每句新台詞都會寫入已見清單，每位武將保留最近 seenLimit 筆。
 */
export function evaluateInsight(
    meta: InsightMeta | undefined,
    generalId: string,
    text: string,
    dayKey: string,
    config: Pick<InsightConfigV1, 'dailyCap' | 'seenLimit'>,
): InsightEvaluation {
    const base = meta ?? emptyInsightMeta();
    const fingerprint = dialogueFingerprint(text);
    const seenList = base.seen[generalId] ?? [];
    if (seenList.includes(fingerprint)) return { decision: 'none', fingerprint, next: base };

    const seen = { ...base.seen, [generalId]: [...seenList, fingerprint].slice(-config.seenLimit) };
    const next: InsightMeta = { seen, daily: { ...base.daily }, achieved: { ...base.achieved } };
    if (!base.achieved[generalId]) {
        next.achieved[generalId] = { badgeId: `badge_insight_${generalId}`, unlockedDay: dayKey };
        return { decision: 'first', fingerprint, next };
    }
    const today = base.daily[generalId];
    const count = today && today.day === dayKey ? today.count : 0;
    if (count >= config.dailyCap) return { decision: 'capped', fingerprint, next };
    next.daily[generalId] = { day: dayKey, count: count + 1 };
    return { decision: 'step', fingerprint, next };
}

export type NpcDialogueRecordKind = 'VERIFIABLE_SUMMARY' | 'DISPOSABLE_CACHE';

export interface NpcDialogueRecord {
    kind: NpcDialogueRecordKind;
    generalId: string;
    text: string;
    evidenceRefs: string[];
    fallbackUsed: boolean;
    provider: string | null;
    model: string | null;
    cachedAtMs: number;
    /** 這句是哪個語系產生的（頭像點擊說話要挑同語系）；舊資料沒有就視為不分語系 */
    locale?: string;
}

/** 依證據與降級狀態把回應分類成可驗證摘要或可丟棄快取。 */
export function classifyNpcDialogue(response: Readonly<NpcDialogueResponse>, nowMs: number): NpcDialogueRecord {
    const used = response.usedEvidenceRefs ?? response.evidenceRefs ?? [];
    const unresolved = response.unresolvedEvidenceRefs ?? [];
    const verifiable = used.length > 0 && !response.fallbackUsed && unresolved.length === 0;
    return {
        kind: verifiable ? 'VERIFIABLE_SUMMARY' : 'DISPOSABLE_CACHE',
        generalId: response.generalId,
        text: response.text,
        evidenceRefs: [...used],
        fallbackUsed: !!response.fallbackUsed,
        provider: response.provider ?? null,
        model: response.model ?? null,
        cachedAtMs: nowMs,
    };
}

/** 快取鍵：同武將、同情境、同語系、同一組關鍵詞（不分順序）視為同一請求。 */
export function npcDialogueCacheKey(request: Readonly<NpcDialogueRequest>): string {
    const keywords = [...request.selectedKeywordKeys].sort().join(',');
    return [request.generalId, request.contextKey ?? '', request.locale ?? 'zh-TW', request.speechContextMode ?? '', keywords].join('|');
}

export class NpcDialogueCache {
    private readonly _entries = new Map<string, NpcDialogueRecord>();

    public put(request: Readonly<NpcDialogueRequest>, response: Readonly<NpcDialogueResponse>, nowMs: number): NpcDialogueRecord {
        const record = classifyNpcDialogue(response, nowMs);
        record.locale = request.locale ?? 'zh-TW';
        this._entries.set(npcDialogueCacheKey(request), record);
        return record;
    }

    public get(request: Readonly<NpcDialogueRequest>): NpcDialogueRecord | null {
        return this._entries.get(npcDialogueCacheKey(request)) ?? null;
    }

    /**
     * 該武將最新一句 AI 台詞（頭像點擊說話用，PROG-2-9885）：不取降級（fallback）句，
     * 指定語系時只取同語系（沒標語系的舊資料也算）。沒有回 null。
     */
    public latestFor(generalId: string, locale?: string): NpcDialogueRecord | null {
        let best: NpcDialogueRecord | null = null;
        for (const record of this._entries.values()) {
            if (record.generalId !== generalId || record.fallbackUsed || record.text.trim().length === 0) continue;
            if (locale && record.locale && record.locale !== locale) continue;
            if (!best || record.cachedAtMs >= best.cachedAtMs) best = record;
        }
        return best;
    }

    /** 清快取；onlyDisposable 為 true 時保留可驗證摘要。回傳清掉幾筆。 */
    public clear(onlyDisposable = false): number {
        let removed = 0;
        for (const [key, record] of Array.from(this._entries)) {
            if (onlyDisposable && record.kind === 'VERIFIABLE_SUMMARY') continue;
            this._entries.delete(key);
            removed += 1;
        }
        return removed;
    }

    public get size(): number {
        return this._entries.size;
    }
}

/** 全遊戲共用的一份本機台詞快取：NPC 對話測試寫入，頭像點擊說話讀取（PROG-2-9885） */
export const sharedNpcDialogueCache = new NpcDialogueCache();
