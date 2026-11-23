/**
 * NpcDialogueCache — 中台台詞回寫為可驗證摘要或可丟棄快取（NPC-10；PROG-2-1933）
 */
import { assert, TestSuite } from './TestRunner';
import { classifyNpcDialogue, NpcDialogueCache, npcDialogueCacheKey } from '../assets/scripts/core/dialogue/NpcDialogueCache';
import type { NpcDialogueRequest, NpcDialogueResponse } from '../assets/scripts/core/services/NpcDialogueService';
import { dialogueFingerprint, evaluateInsight, normalizeDialogueText } from '../assets/scripts/core/dialogue/NpcDialogueCache';

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

const INSIGHT_CFG = { dailyCap: 3, seenLimit: 200 };

export function createInsightAchievementSuite(): TestSuite {
    const suite = new TestSuite('台詞成就「有感而發」判定 (PROG-2-9864)');

    suite.test('台詞正規化：全半形與標點、空白差異視為同一句；不同句得不同指紋', () => {
        assert.equals(dialogueFingerprint('俺也一樣！'), dialogueFingerprint('俺也一樣!'));
        assert.equals(dialogueFingerprint('俺 也 一樣'), dialogueFingerprint('俺也一樣'));
        assert.equals(normalizeDialogueText('Hello, World!'), 'helloworld');
        assert.notEquals(dialogueFingerprint('俺也一樣'), dialogueFingerprint('俺不一樣'));
    });

    suite.test('首次新台詞為 first 並寫入成就；同句再說為 none，不再計入', () => {
        const ev = evaluateInsight(undefined, 'zhang-fei', '俺也一樣', '2026-11-23', INSIGHT_CFG);
        assert.equals('first', ev.decision);
        assert.equals('badge_insight_zhang-fei', ev.next.achieved['zhang-fei'].badgeId);
        const again = evaluateInsight(ev.next, 'zhang-fei', '俺也一樣！', '2026-11-23', INSIGHT_CFG);
        assert.equals('none', again.decision);
        assert.equals(ev.next, again.next);
    });

    suite.test('之後每句新台詞 step（+2 次數）；同日第 4 句起 capped；換日重新計', () => {
        let meta = evaluateInsight(undefined, 'lu-bu', '第一句', '2026-11-23', INSIGHT_CFG).next;
        const steps: string[] = [];
        for (const line of ['第二句', '第三句', '第四句', '第五句']) {
            const ev = evaluateInsight(meta, 'lu-bu', line, '2026-11-23', INSIGHT_CFG);
            steps.push(ev.decision);
            meta = ev.next;
        }
        assert.equals('step,step,step,capped', steps.join(','));
        assert.equals(3, meta.daily['lu-bu'].count);
        const nextDay = evaluateInsight(meta, 'lu-bu', '第六句', '2026-11-24', INSIGHT_CFG);
        assert.equals('step', nextDay.decision);
        assert.equals(1, nextDay.next.daily['lu-bu'].count);
    });

    suite.test('次數上限只計該武將；已見清單每武將保留最近 seenLimit 筆', () => {
        const a = evaluateInsight(undefined, 'a', 'x1', 'd', { dailyCap: 1, seenLimit: 2 }).next;
        const b = evaluateInsight(a, 'b', 'x1', 'd', { dailyCap: 1, seenLimit: 2 });
        assert.equals('first', b.decision);
        let meta = evaluateInsight(a, 'a', 'x2', 'd', { dailyCap: 1, seenLimit: 2 }).next;
        meta = evaluateInsight(meta, 'a', 'x3', 'd', { dailyCap: 1, seenLimit: 2 }).next;
        assert.equals(2, meta.seen['a'].length);
        // x1 已被淘汰，視為新台詞；當日次數已達上限 1，故 capped
        assert.equals('capped', evaluateInsight(meta, 'a', 'x1', 'd', { dailyCap: 1, seenLimit: 2 }).decision);
    });

    return suite;
}

