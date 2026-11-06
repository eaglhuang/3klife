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
        this._entries.set(npcDialogueCacheKey(request), record);
        return record;
    }

    public get(request: Readonly<NpcDialogueRequest>): NpcDialogueRecord | null {
        return this._entries.get(npcDialogueCacheKey(request)) ?? null;
    }

    /** 清快取；onlyDisposable 為 true 時保留可驗證摘要。回傳清掉幾筆。 */
    public clear(onlyDisposable = false): number {
        let removed = 0;
        for (const [key, record] of [...this._entries]) {
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
