/**
 * NpcUtilityAI.test.ts — Utility AI 評分（PROG-2-1379，NPC-05）：評分相乘、排序只取最高分群、權重全相等時結果不變。
 */
import { assert, TestSuite } from './TestRunner';
import {
    NPC_HIGH_WEIGHT_THRESHOLD, NPC_RELATION_WEIGHTS, NpcInteractionLimiter, scoreNpcAction, scoreOfflineRelation,
} from '../assets/scripts/core/systems/NpcUtilityAI';
import {
    offlineInteractionCandidates, OFFLINE_INTERACTION_DETAILS, pickOfflineInteraction,
} from '../assets/scripts/core/systems/OfflineInteractionEvents';
import type { DynamicRelation } from '../assets/scripts/core/systems/KinRelation';

const GENERALS = [{ id: 'g1', name: '關羽' }, { id: 'g2', name: '張飛' }, { id: 'g3', name: '趙雲' }];

function relation(uidA: string, uidB: string, type: DynamicRelation['type']): DynamicRelation {
    return { uidA, uidB, type, intimacy: 30, createdSeason: 0, decayRate: 2 };
}

export function createNpcUtilityAISuite(): TestSuite {
    const suite = new TestSuite('NpcUtilityAI (Utility AI 評分 PROG-2-1379)');

    suite.test('scoreNpcAction 為五項相乘（F-1）', () => {
        const score = scoreNpcAction({
            eventWeight: 2, personalityWeight: 3, relationshipModifier: 0.5, moodModifier: 2, cooldownModifier: 1,
        });
        assert.equals(6, score);
    });

    suite.test('預設權重全為 1，離線互動分數皆為 1', () => {
        for (const type of Object.keys(NPC_RELATION_WEIGHTS) as (keyof typeof NPC_RELATION_WEIGHTS)[]) {
            assert.equals(1, scoreOfflineRelation(type));
        }
    });

    suite.test('權重較高的關係類型排在前面，只從最高分群挑選', () => {
        const candidates = offlineInteractionCandidates(
            [relation('g1', 'g2', 'COMRADE'), relation('g1', 'g3', 'SPOUSE')], GENERALS,
        );
        const weights = { COMRADE: 1, DYNAMIC_SWORN: 1, SPOUSE: 5, PARENT_CHILD: 1 };
        const scores = candidates.map((c) => scoreOfflineRelation(c.type, weights));
        assert.equals(1, scores[0]);
        assert.equals(5, scores[1]);
        // 排序依評分：SPOUSE 分數最高，應該只會挑到 SPOUSE 那一組
        const best = Math.max(...scores);
        const top = candidates.filter((_, i) => scores[i] === best);
        assert.equals(1, top.length);
        assert.equals('SPOUSE', top[0].type);
    });

    suite.test('權重全相等時，挑選結果與未評分時一致（亂數取同一索引）', () => {
        const candidates = offlineInteractionCandidates(
            [relation('g1', 'g2', 'COMRADE'), relation('g2', 'g3', 'PARENT_CHILD')], GENERALS,
        );
        const event = pickOfflineInteraction(candidates, [], 'W1', () => 0.99, 1, 'T')!;
        assert.equals('g2,g3', event.entry.relatedGeneralUids.join(','));
        assert.equals(`張飛 與 趙雲 在你離席時發生了一段插曲。${OFFLINE_INTERACTION_DETAILS.PARENT_CHILD[1]}`, event.entry.summary);
    });

    suite.test('登入窗限流：同一武將同一窗只放行一則高權重互動；低權重不受限；換窗重算', () => {
        const limiter = new NpcInteractionLimiter();
        const high = NPC_HIGH_WEIGHT_THRESHOLD + 0.1;
        const low = NPC_HIGH_WEIGHT_THRESHOLD - 0.1;
        assert.isTrue(limiter.tryClaim('login-1', 'g1', high));
        assert.isTrue(!limiter.tryClaim('login-1', 'g1', high), '同窗同將第二則高權重被擋');
        assert.isTrue(limiter.tryClaim('login-1', 'g2', high), '不同武將不受限');
        assert.isTrue(limiter.tryClaim('login-1', 'g1', low), '低權重不受限');
        assert.isTrue(limiter.tryClaim('login-2', 'g1', high), '換登入窗重新計算');
    });

    suite.test('高權重門檻嚴格大於 1：分數等於 1 不限流', () => {
        const limiter = new NpcInteractionLimiter();
        assert.isTrue(limiter.tryClaim('W1', 'g1', 1));
        assert.isTrue(limiter.tryClaim('W1', 'g1', 1), '等於門檻不算高權重');
        assert.isTrue(limiter.tryClaim('W1', 'g1', 1.5));
        assert.isTrue(!limiter.tryClaim('W1', 'g1', 1.5), '第二則高權重被擋');
    });

    suite.test('限流接上離線互動挑選：同窗同將高權重只排一次，換窗重算', () => {
        const heavy = { COMRADE: 2, DYNAMIC_SWORN: 2, SPOUSE: 2, PARENT_CHILD: 2 };
        const limiter = new NpcInteractionLimiter();
        const first = pickOfflineInteraction(offlineInteractionCandidates([relation('g1', 'g2', 'COMRADE')], GENERALS), [], 'W1', () => 0, 1, 'T', limiter, heavy);
        assert.isTrue(first !== null, '第一則可排');
        const blocked = pickOfflineInteraction(offlineInteractionCandidates([relation('g1', 'g3', 'COMRADE')], GENERALS), [], 'W1', () => 0, 2, 'T', limiter, heavy);
        assert.isTrue(blocked === null, 'g1 在同一窗已排過高權重互動');
        const otherWindow = pickOfflineInteraction(offlineInteractionCandidates([relation('g1', 'g3', 'COMRADE')], GENERALS), [], 'W2', () => 0, 2, 'T', limiter, heavy);
        assert.isTrue(otherWindow !== null, '換登入窗重新計算');
    });

    suite.test('預設權重下帶限流的挑選與不帶限流結果相同', () => {
        const candidates = offlineInteractionCandidates([relation('g1', 'g2', 'COMRADE'), relation('g2', 'g3', 'PARENT_CHILD')], GENERALS);
        const plain = pickOfflineInteraction(candidates, [], 'W1', () => 0.99, 1, 'T');
        const limited = pickOfflineInteraction(candidates, [], 'W1', () => 0.99, 1, 'T', new NpcInteractionLimiter());
        assert.equals(JSON.stringify(plain), JSON.stringify(limited));
    });

    return suite;
}
