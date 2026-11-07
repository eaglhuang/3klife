/**
 * MentorShardVault — 教官支援卡槽位、被動驗證、碎片庫（doc_spec_0318；PROG-2-1944）
 */
import { assert, TestSuite } from './TestRunner';
import {
    dismantleDuplicate, MentorPassiveValidationError, slotPassiveValue, slotTeachesExclusiveTactic,
    synthesizeMentorCard, validateMentorPassives,
} from '../assets/scripts/core/systems/MentorShardVault';

function throws(fn: () => void): boolean {
    try { fn(); return false; } catch (e) { return e instanceof MentorPassiveValidationError; }
}

export function createMentorShardVaultSuite(): TestSuite {
    const suite = new TestSuite('MentorShardVault (教官支援卡 doc_spec_0318 PROG-2-1944)');

    suite.test('五大被動範圍驗證；未知類型或超界拒絕', () => {
        validateMentorPassives([{ type: 'STAT_TRAIN_BONUS', value: 0.25 }, { type: 'TACTIC_HINT_RATE', value: 0.1 }]);
        assert.isTrue(throws(() => validateMentorPassives([{ type: 'VITALITY_SAVE', value: 0.31 }])));
        assert.isTrue(throws(() => validateMentorPassives([{ type: 'COMBO_CHAIN_EXTEND', value: 0.04 }])));
        assert.isTrue(throws(() => validateMentorPassives([{ type: 'TP_Bonus', value: 0.1 }])));
    });

    suite.test('主位 100%、客座 50% 且不傳授專屬戰法', () => {
        assert.equals(0.2, slotPassiveValue('main', 0.2));
        assert.equals(0.1, slotPassiveValue('sub1', 0.2));
        assert.isTrue(slotTeachesExclusiveTactic('main'));
        assert.isFalse(slotTeachesExclusiveTactic('sub2'));
    });

    suite.test('重複分解與定向合成門檻', () => {
        let bank = { totalShards: 0, lastSynthesisTimestamp: 0 };
        bank = dismantleDuplicate(bank, 'SSR');
        bank = dismantleDuplicate(bank, 'R', 2);
        assert.equals(110, bank.totalShards);
        const unlock = { tutorialDone: true, academyClearedOnce: false, clanFame: 0 };
        const sr = synthesizeMentorCard(bank, 'SR', unlock, 5);
        assert.isTrue(!sr.ok && sr.reason === 'locked');
        const r = synthesizeMentorCard(bank, 'R', unlock, 5);
        assert.isTrue(r.ok && r.bank.totalShards === 80 && r.bank.lastSynthesisTimestamp === 5);
        const ssr = synthesizeMentorCard(bank, 'SSR', { ...unlock, clanFame: 300 }, 5);
        assert.isTrue(!ssr.ok && ssr.reason === 'insufficient');
    });

    return suite;
}
