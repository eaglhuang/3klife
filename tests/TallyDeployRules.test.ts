/**
 * TallyDeployRules — 虎符出陣編制與專屬營效率（doc_spec_0317；PROG-2-1943）
 */
import { assert, TestSuite } from './TestRunner';
import { canEquipTally, tallyDeployTroops, tallyEfficiency } from '../assets/scripts/core/systems/TallyDeployRules';

export function createTallyDeployRulesSuite(): TestSuite {
    const suite = new TestSuite('TallyDeployRules (三十四營 doc_spec_0317 PROG-2-1943)');

    suite.test('專屬營本人與一階直系 100%、外人 60%；通用營 100%', () => {
        assert.equals(1, tallyEfficiency('named', 'guan-yu', { generalId: 'guan-yu' }));
        assert.equals(1, tallyEfficiency('named', 'guan-yu', { generalId: 'guan-ping', parentIds: ['guan-yu'] }));
        assert.equals(0.6, tallyEfficiency('named', 'guan-yu', { generalId: 'zhang-fei' }));
        assert.equals(1, tallyEfficiency('general', 'gao-shun', { generalId: 'zhang-fei' }));
    });

    suite.test('一人限裝一符、固定 1,500 兵力', () => {
        assert.isTrue(canEquipTally({ generalId: 'a' }, 't1'));
        assert.isTrue(canEquipTally({ generalId: 'a', equippedTallyId: 't1' }, 't1'));
        assert.isFalse(canEquipTally({ generalId: 'a', equippedTallyId: 't1' }, 't2'));
        assert.equals(1500, tallyDeployTroops(9000));
        assert.equals(800, tallyDeployTroops(800.7));
        assert.equals(0, tallyDeployTroops(-3));
    });

    return suite;
}
