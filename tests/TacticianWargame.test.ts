/**
 * TacticianWargame — 演武零消耗與釋放敵將頓悟（doc_spec_0356；PROG-2-2042）
 */
import { assert, TestSuite } from './TestRunner';
import { WargameSession, addNotesToInventory, handleReleaseCaptive } from '../assets/scripts/core/systems/TacticianWargame';

export function createTacticianWargameSuite(): TestSuite {
    const suite = new TestSuite('TacticianWargame (演武與釋放 doc_spec_0356 PROG-2-2042)');

    suite.test('§4-1 演武退出後兵糧與精力原值不變', () => {
        const real = { troops: 5000, grain: 800, vitality: { 'guan-yu': 90 } };
        const session = new WargameSession(real);
        session.sandbox.troops = 0;
        session.sandbox.grain -= 300;
        session.sandbox.vitality['guan-yu'] = 10;
        session.earnWarNote('WAR_NOTE_BEISHUI');
        session.earnWarNote('WAR_NOTE_BEISHUI');
        const out = session.exit();
        assert.equals(5000, out.resources.troops);
        assert.equals(800, out.resources.grain);
        assert.equals(90, out.resources.vitality['guan-yu']);
        assert.equals(90, real.vitality['guan-yu']);
        assert.equals('WAR_NOTE_BEISHUI', out.warNotes.join(','));
    });

    suite.test('§4-2 Q50：魅力 ≥75 必頓悟；狼性扣好感；未達門檻只加好感', () => {
        const base = { playerGeneralCha: 75, playerHasBenevolenceTrait: false, enemyGeneralTemplateId: 'guan-yu', enemyGeneralPersonality: 'Loyal', enemySignatureTacticId: 'CHUNQIU_BLADE' };
        const ok = handleReleaseCaptive(base);
        assert.isTrue(ok.epiphanyTriggered);
        assert.equals('NOTE_CHUNQIU_BLADE', ok.grantedTacticNoteId);
        assert.equals(20, ok.affinityGain);
        const wolf = handleReleaseCaptive({ ...base, enemyGeneralPersonality: 'Treacherous_Wolf' });
        assert.isFalse(wolf.epiphanyTriggered);
        assert.equals(-10, wolf.affinityGain);
        const low = handleReleaseCaptive({ ...base, playerGeneralCha: 74 });
        assert.isFalse(low.epiphanyTriggered);
        assert.equals(20, low.affinityGain);
        assert.isTrue(handleReleaseCaptive({ ...base, playerGeneralCha: 10, playerHasBenevolenceTrait: true }).epiphanyTriggered);
    });

    suite.test('§4-3 筆記入庫累加', () => {
        const inv = addNotesToInventory({ NOTE_X: 1 }, ['NOTE_X', 'NOTE_Y']);
        assert.equals(2, inv.NOTE_X);
        assert.equals(1, inv.NOTE_Y);
    });

    return suite;
}
