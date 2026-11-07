/**
 * DuplicatePullRouting — 重複名將分流（doc_spec_0331；PROG-2-2008）
 */
import { assert, TestSuite } from './TestRunner';
import {
    autoDuplicateChoice, bloodlineInfusionGrant, DuplicateBatchPolicy, DUPLICATE_CHOICE_CARDS, needsDuplicateRouting, recordDuplicateChoice,
    reviveOverflowOathPoints,
} from '../assets/scripts/core/systems/DuplicatePullRouting';

export function createDuplicatePullRoutingSuite(): TestSuite {
    const suite = new TestSuite('DuplicatePullRouting (重複名將分流 doc_spec_0331 PROG-2-2008)');

    suite.test('同模板才彈窗；左右卡色', () => {
        assert.isTrue(needsDuplicateRouting('guan-yu', ['zhao-yun', 'guan-yu']));
        assert.isFalse(needsDuplicateRouting('ma-chao', ['guan-yu']));
        assert.equals('#00D1B2', DUPLICATE_CHOICE_CARDS[0].color);
        assert.equals('infuse', DUPLICATE_CHOICE_CARDS[1].choice);
    });

    suite.test('十連抽沿用選擇', () => {
        let p: DuplicateBatchPolicy = { remembered: null };
        assert.equals(null, autoDuplicateChoice(p));
        p = recordDuplicateChoice(p, 'revive', false);
        assert.equals(null, autoDuplicateChoice(p));
        p = recordDuplicateChoice(p, 'infuse', true);
        assert.equals('infuse', autoDuplicateChoice(p));
    });

    suite.test('五轉溢出 100 結義點數；灌注數值包', () => {
        assert.equals(0, reviveOverflowOathPoints(undefined));
        assert.equals(0, reviveOverflowOathPoints(4));
        assert.equals(100, reviveOverflowOathPoints(5));
        const g = bloodlineInfusionGrant('guan-yu', true, 'h1', 123);
        assert.equals(500, g.spiritExp);
        assert.equals(150, g.tallyExp);
        assert.equals(50, g.clanReputation);
        assert.equals('INFUSION_RECORD', g.record.kind);
        assert.equals(0, bloodlineInfusionGrant('guan-yu', false, 'h1', 1).tallyExp);
    });

    return suite;
}
