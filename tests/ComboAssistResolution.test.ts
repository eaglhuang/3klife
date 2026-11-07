/**
 * ComboAssistResolution — 合攻援護結算（doc_spec_0323；PROG-2-1949）
 */
import { assert, TestSuite } from './TestRunner';
import {
    canRespondToCombo, comboResonanceLine, isComboAdjacent, resetComboAssistTurn, resolveComboAssist,
} from '../assets/scripts/core/systems/ComboAssistResolution';

export function createComboAssistResolutionSuite(): TestSuite {
    const suite = new TestSuite('ComboAssistResolution (相鄰合攻 doc_spec_0323 PROG-2-1949)');

    suite.test('九宮格相鄰（含斜角、不含同格與距離 2）', () => {
        assert.isTrue(isComboAdjacent({ x: 3, y: 3 }, { x: 4, y: 4 }));
        assert.isTrue(isComboAdjacent({ x: 3, y: 3 }, { x: 3, y: 2 }));
        assert.isFalse(isComboAdjacent({ x: 3, y: 3 }, { x: 3, y: 3 }));
        assert.isFalse(isComboAdjacent({ x: 3, y: 3 }, { x: 5, y: 3 }));
    });

    suite.test('援護 60% 傷害、扣 3 精力、士氣 +5；每回合 2 次、精力 < 10 不響應', () => {
        const r = resolveComboAssist(101, true, { vitality: 20, assistsThisTurn: 0 })!;
        assert.equals(60, r.damage);
        assert.equals(17, r.assist.vitality);
        assert.equals(1, r.assist.assistsThisTurn);
        assert.equals(5, r.moraleBonus);
        assert.equals(null, resolveComboAssist(100, false, { vitality: 20, assistsThisTurn: 0 }));
        assert.isFalse(canRespondToCombo({ vitality: 20, assistsThisTurn: 2 }));
        assert.isFalse(canRespondToCombo({ vitality: 9, assistsThisTurn: 0 }));
        assert.equals(0, resetComboAssistTurn({ vitality: 9, assistsThisTurn: 2 }).assistsThisTurn);
    });

    suite.test('情誼共鳴台詞', () => {
        assert.equals('桃園同心，共破頑敵！', comboResonanceLine('guan-yu', 'zhang-fei'));
        assert.equals('琴瑟相和，烈火焚營！', comboResonanceLine('xiao-qiao', 'zhou-yu'));
        assert.equals(null, comboResonanceLine('guan-yu', 'zhao-yun'));
    });

    return suite;
}
