/**
 * PrisonSlotExpansion.test.ts — 監獄格數與每季產出 headless 測試（POW-06 / PROG-2-0942）
 *
 * 鎖住：格數滿了關押被拒（PRISON_FULL）；每季產出依關押中的俘虜加總。
 * 擴容（expandPrisonSlots）已由主城等級容量表取代並移除（ECO-14，PROG-2-1416）。
 *
 * Unity 對照：像 Inventory 的格子數上限，滿格時 AddItem 回傳失敗，
 * 擴充背包後同一個 AddItem 就能成功。
 */
import { TestSuite, assert } from './TestRunner';
import {
    createPowRecord,
    createPrisonState,
    PRISON_SLOTS_INITIAL,
    prisonYieldOneSeason,
    resolvePowDecision,
    type PowRecord,
    type PrisonState,
} from '../assets/scripts/core/systems/PrisonerOfWar';

const TARGET = { id: 'guan-yu', name: '關羽', cha: 30, luk: 20, int: 20, pol: 20, loyalty: 40, rarityTier: 'epic' };

function recordFor(id: string): PowRecord {
    const record = createPowRecord({ ...TARGET, id, name: id }, { cha: 50, luk: 50 });
    if (!record) throw new Error('測試資料不應為試用傭兵');
    return record;
}

/** 依目前格數關押一名俘虜；成功時回傳新的已用格數 */
function imprisonOne(state: PrisonState, prisonUsed: number, id: string): { ok: boolean; prisonUsed: number } {
    const result = resolvePowDecision(recordFor(id), 'imprison', {
        random: () => 0,
        gold: 0,
        cityTroops: 0,
        prisonUsed,
        prisonSlots: state.slots,
    });
    return { ok: result.ok, prisonUsed: result.imprisoned ? prisonUsed + 1 : prisonUsed };
}

export function createPrisonSlotExpansionSuite(): TestSuite {
    const suite = new TestSuite('PrisonSlotExpansion (監獄格數與擴容 POW-06 / PROG-2-0942)');

    suite.test('格數滿了關押被拒（PRISON_FULL），不扣任何東西', () => {
        const state = createPrisonState();
        let used = 0;
        for (let i = 0; i < PRISON_SLOTS_INITIAL; i += 1) used = imprisonOne(state, used, `p${i}`).prisonUsed;
        assert.equals(PRISON_SLOTS_INITIAL, used);

        const rejected = resolvePowDecision(recordFor('overflow'), 'imprison', {
            random: () => 0,
            gold: 0,
            cityTroops: 0,
            prisonUsed: used,
            prisonSlots: state.slots,
        });
        assert.isTrue(!rejected.ok);
        assert.isTrue(rejected.reasons.includes('PRISON_FULL'));
        assert.isTrue(!rejected.imprisoned);
    });

    suite.test('每季產出依關押中的俘虜加總（情報與資源）', () => {
        const yieldOf = (uid: string) => ({ targetUid: uid, targetName: uid, imprisonedSeason: 1, yieldPerSeason: { intel: 2, resource: 60 } });
        const total = prisonYieldOneSeason([yieldOf('a'), yieldOf('b'), yieldOf('c')]);
        assert.equals(6, total.intel);
        assert.equals(180, total.resource);
        assert.equals(0, prisonYieldOneSeason([]).intel);
    });

    return suite;
}
