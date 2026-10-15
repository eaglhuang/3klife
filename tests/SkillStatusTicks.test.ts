import { TestSuite, assert } from './TestRunner';
import {
    dotTickDamage,
    rootedBlocksMove,
    slowedStatusMoveRange,
    tickStatusTurns,
} from '../assets/scripts/battle/skills/SkillStatusTicks';

export function createSkillStatusTicksSuite(): TestSuite {
    const suite = new TestSuite('SkillStatusTicks (戰法狀態回合遞減 PROG-2-0753)');

    suite.test('回合遞減到 0 即到期，不會變成負數', () => {
        const first = tickStatusTurns(2);
        assert.equals(1, first.remaining);
        assert.isFalse(first.expired);
        const last = tickStatusTurns(1);
        assert.equals(0, last.remaining);
        assert.isTrue(last.expired);
        assert.equals(0, tickStatusTurns(0).remaining);
    });

    suite.test('定身中不可移動，到期後可移動', () => {
        assert.isTrue(rootedBlocksMove(1));
        assert.isFalse(rootedBlocksMove(0));
    });

    suite.test('緩速有效時移動力減少，到期後還原', () => {
        assert.equals(3, slowedStatusMoveRange(4, 1, 1));
        assert.equals(4, slowedStatusMoveRange(4, 0, 1));
    });

    suite.test('毒傷有效時扣最大 HP 的 10%，到期後為 0', () => {
        assert.equals(50, dotTickDamage(500, 2));
        assert.equals(0, dotTickDamage(500, 0));
    });

    return suite;
}
