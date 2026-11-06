/**
 * NpcDialogueCache — 中台台詞回寫為可驗證摘要或可丟棄快取（NPC-10；PROG-2-1933）
 */
import { assert, TestSuite } from './TestRunner';
import { classifyNpcDialogue, NpcDialogueCache, npcDialogueCacheKey } from '../assets/scripts/core/dialogue/NpcDialogueCache';
import type { NpcDialogueRequest, NpcDialogueResponse } from '../assets/scripts/core/services/NpcDialogueService';

function response(extra: Partial<NpcDialogueResponse>): NpcDialogueResponse {
    return {
        generalId: 'zhang-fei', text: '俺也一樣！', evidenceRefs: ['ref-1'], usedKeywords: [], rejectedKeywordKeys: [],
        fallbackUsed: false, generationMode: 'rag', ...extra,
    } as NpcDialogueResponse;
}

const REQ: NpcDialogueRequest = { generalId: 'zhang-fei', selectedKeywordKeys: ['b', 'a'] };

export function createNpcDialogueCacheSuite(): TestSuite {
    const suite = new TestSuite('NpcDialogueCache (中台回寫 NPC-10 PROG-2-1933)');

    suite.test('有證據且未降級＝可驗證摘要；其他＝可丟棄快取', () => {
        assert.equals('VERIFIABLE_SUMMARY', classifyNpcDialogue(response({}), 1).kind);
        assert.equals('DISPOSABLE_CACHE', classifyNpcDialogue(response({ evidenceRefs: [] }), 1).kind);
        assert.equals('DISPOSABLE_CACHE', classifyNpcDialogue(response({ fallbackUsed: true }), 1).kind);
        assert.equals('DISPOSABLE_CACHE', classifyNpcDialogue(response({ unresolvedEvidenceRefs: ['x'] }), 1).kind);
        assert.equals('DISPOSABLE_CACHE', classifyNpcDialogue(response({ usedEvidenceRefs: [] }), 1).kind);
    });

    suite.test('關鍵詞順序不影響鍵；可只清可丟棄快取或全清', () => {
        assert.equals(npcDialogueCacheKey(REQ), npcDialogueCacheKey({ ...REQ, selectedKeywordKeys: ['a', 'b'] }));
        const cache = new NpcDialogueCache();
        cache.put(REQ, response({}), 1);
        cache.put({ ...REQ, contextKey: 'drink' }, response({ fallbackUsed: true }), 2);
        assert.equals(2, cache.size);
        assert.equals(1, cache.clear(true));
        assert.equals('VERIFIABLE_SUMMARY', cache.get(REQ)?.kind);
        assert.equals(1, cache.clear());
        assert.equals(null, cache.get(REQ));
    });

    return suite;
}
