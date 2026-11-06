/**
 * SpiritResonance — 英靈卡共鳴三階判定與家族加成封頂（SPI-05；PROG-2-1928）
 */
import { assert, TestSuite } from './TestRunner';
import { glowStateOf, resonanceBandOf, resonanceBonus } from '../assets/scripts/core/systems/SpiritResonance';

const CARD = { General_Template_ID: 'ZHAO_YUN_01', Spirit_Family_Key: 'FAMILY_ZHAO' };

export function createSpiritResonanceSuite(): TestSuite {
    const suite = new TestSuite('SpiritResonance (英靈卡共鳴三階 SPI-05 PROG-2-1928)');

    suite.test('本人 SELF、同家族 FAMILY、其他 ECHO，光效對應', () => {
        assert.equals('SELF_RESONANCE', resonanceBandOf(CARD, { templateId: 'ZHAO_YUN_01', familyKey: 'FAMILY_ZHAO' }));
        assert.equals('FAMILY_RESONANCE', resonanceBandOf(CARD, { templateId: 'ZHAO_TONG', familyKey: 'FAMILY_ZHAO' }));
        assert.equals('ECHO_RESONANCE', resonanceBandOf(CARD, { templateId: 'GUAN_YU', familyKey: 'FAMILY_GUAN' }));
        assert.equals('ECHO_RESONANCE', resonanceBandOf(CARD, { templateId: null, familyKey: null }));
        assert.equals('StrongGlow', glowStateOf('SELF_RESONANCE'));
        assert.equals('WarmGlow', glowStateOf('FAMILY_RESONANCE'));
    });

    suite.test('家族加成封頂；本人完整；其他用一般值', () => {
        const values = { full: 30, family: 25, familyCap: 20, echo: 10 };
        assert.equals(30, resonanceBonus('SELF_RESONANCE', values));
        assert.equals(20, resonanceBonus('FAMILY_RESONANCE', values));
        assert.equals(15, resonanceBonus('FAMILY_RESONANCE', { ...values, family: 15 }));
        assert.equals(10, resonanceBonus('ECHO_RESONANCE', values));
    });

    return suite;
}
