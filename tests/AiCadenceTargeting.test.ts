/**
 * AiCadenceTargeting — AI 戰法節奏與自動索敵（doc_spec_0360；PROG-2-2046）
 */
import { assert, TestSuite } from './TestRunner';
import {
    AiCadenceController, canAffordWithReserve, pickEnemyCluster, pickLowestHpEnemy, pickSupportLowAlly, pickVanguardChoke,
} from '../assets/scripts/battle/shared/AiCadenceTargeting';

const u = (unitId: string, hp: number, x = 0, y = 0) => ({ unitId, hp, maxHp: 100, x, y });

export function createAiCadenceTargetingSuite(): TestSuite {
    const suite = new TestSuite('AiCadenceTargeting (AI 節奏 doc_spec_0360 PROG-2-2046)');

    suite.test('§4-1 連續回合施放間隔 ≥2，低階戰法不進冷卻', () => {
        const ai = new AiCadenceController();
        const cast: number[] = [];
        for (let turn = 1; turn <= 8; turn++) {
            if (ai.canCastTactic('e1', turn)) {
                cast.push(turn);
                ai.recordTacticCast('e1', turn, 2);
            }
        }
        assert.equals('1,4,7', cast.join(','));
        ai.recordTacticCast('e2', 1, 1);
        assert.isTrue(ai.canCastTactic('e2', 2));
        assert.isFalse(canAffordWithReserve(50, 31));
        assert.isTrue(canAffordWithReserve(50, 30));
    });

    suite.test('§4-2 LowestHp 鎖 20% 殘血；SupportLowAlly 只看 <50%', () => {
        assert.equals('c', pickLowestHpEnemy([u('a', 100), u('b', 60), u('c', 20)])!.unitId);
        assert.equals(null, pickSupportLowAlly([u('a', 100), u('b', 50)]));
        assert.equals('b', pickSupportLowAlly([u('a', 40), u('b', 10)])!.unitId);
    });

    suite.test('§4-3 扇形取覆蓋 ≥2 錨點，分散時退回最近', () => {
        const enemies = [u('far', 50, 5, 5), u('near', 50, 1, 0)];
        const hit = pickEnemyCluster([{ x: 2, y: 0, hitCount: 1 }, { x: 3, y: 1, hitCount: 3 }], enemies, { x: 0, y: 0 });
        assert.equals('anchor', hit!.kind);
        const spread = pickEnemyCluster([{ x: 2, y: 0, hitCount: 1 }], enemies, { x: 0, y: 0 });
        assert.equals('near', spread && spread.kind === 'nearest' ? spread.unit.unitId : '');
        assert.equals('3,2', ((p) => `${p.x},${p.y}`)(pickVanguardChoke({ x: 6, y: 2 }, { x: 0, y: 2 })));
    });

    return suite;
}
