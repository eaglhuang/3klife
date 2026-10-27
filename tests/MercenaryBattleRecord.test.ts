/**
 * MercenaryBattleRecord.test.ts — 試用傭兵出戰的場數、勝場與插畫階段（RET-01 後續，PROG-2-1401）
 *
 * 鎖住：只有試用中的傭兵會計數、勝場只計戰勝、ongoing 不計、插畫階段依規格推進、存檔保留計數。
 *
 * Unity 對照：每場戰鬥結束時，把計數器寫回那個 ScriptableObject，EditMode 測試只驗計數規則。
 */
import { assert, TestSuite } from './TestRunner';
import { recordTrialBattle } from '../assets/scripts/core/systems/MercenaryBattleRecord';
import { normalizeMercenaryBundle, serializeMercenaryBundle } from '../assets/scripts/core/systems/MercenarySaveModel';
import type { MercenaryState } from '../assets/scripts/core/systems/MercenaryBond';

const TRIAL: MercenaryState = { uid: 'merc-1', daysLeft: 3, bond: 2, status: 'Trial', affection: 10 };

export function createMercenaryBattleRecordSuite(): TestSuite {
    const suite = new TestSuite('MercenaryBattleRecord (試用傭兵出戰計數 RET-01 後續)');

    suite.test('戰勝：場數與勝場各 +1，插畫階段到 2（交手）', () => {
        const next = recordTrialBattle(TRIAL, 'win');
        assert.equals(1, next.battles!);
        assert.equals(1, next.wins!);
        assert.equals(2, next.illustrationStage!);
    });

    suite.test('敗北與平手：只加場數，不加勝場', () => {
        assert.equals(1, recordTrialBattle(TRIAL, 'loss').battles!);
        assert.equals(0, recordTrialBattle(TRIAL, 'loss').wins!);
        assert.equals(0, recordTrialBattle(TRIAL, 'draw').wins!);
    });

    suite.test('戰勝 3 場後插畫階段到 3（認同）', () => {
        let state: MercenaryState = TRIAL;
        for (let i = 0; i < 3; i += 1) state = recordTrialBattle(state, 'win');
        assert.equals(3, state.wins!);
        assert.equals(3, state.illustrationStage!);
    });

    suite.test('結義或已到期的傭兵原樣回傳，呼叫端可用參照比較判斷沒有變動', () => {
        const bonded: MercenaryState = { ...TRIAL, status: 'Bonded' };
        const expired: MercenaryState = { ...TRIAL, status: 'Expired' };
        assert.isTrue(recordTrialBattle(bonded, 'win') === bonded);
        assert.isTrue(recordTrialBattle(expired, 'win') === expired);
    });

    suite.test('插畫階段只進不退：既有階段 4 時，出戰不會降階', () => {
        const state: MercenaryState = { ...TRIAL, illustrationStage: 4, affection: 0 };
        assert.equals(4, recordTrialBattle(state, 'loss').illustrationStage!);
    });

    suite.test('存檔正規化保留 battles、wins，非法值只丟該欄', () => {
        const bundle = normalizeMercenaryBundle({
            mercenaries: [{ uid: 'merc-1', daysLeft: 3, bond: 2, status: 'Trial', battles: 2, wins: -1 }],
            upkeep: [],
            cooldowns: [],
        });
        assert.equals(2, bundle.mercenaries[0].battles!);
        assert.isTrue(bundle.mercenaries[0].wins === undefined);
        const round = serializeMercenaryBundle(bundle);
        assert.equals(2, round.mercenaries[0].battles!);
    });

    return suite;
}
