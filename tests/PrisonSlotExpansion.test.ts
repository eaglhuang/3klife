/**
 * PrisonSlotExpansion.test.ts — 監獄格數與擴容 headless 測試（POW-06 / PROG-2-0942）
 *
 * 鎖住：格數滿了關押被拒（PRISON_FULL）；擴容後同一關押生效；擴容到上限為止；
 * 每季產出依關押中的俘虜加總。
 *
 * Unity 對照：像 Inventory 的格子數上限，滿格時 AddItem 回傳失敗，
 * 擴充背包後同一個 AddItem 就能成功。
 */
import { TestSuite, assert } from './TestRunner';
import {
    createPowRecord,
    createPrisonState,
    expandPrisonSlots,
    PRISON_SLOTS_INITIAL,
    PRISON_SLOTS_MAX,
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

    suite.test('擴容一次 +1 格，擴容後同一關押成功', () => {
        const state = createPrisonState();
        let used = 0;
        for (let i = 0; i < PRISON_SLOTS_INITIAL; i += 1) used = imprisonOne(state, used, `p${i}`).prisonUsed;

        const expanded = expandPrisonSlots(state);
        assert.isTrue(expanded.ok);
        assert.equals(PRISON_SLOTS_INITIAL + 1, expanded.state.slots);
        assert.equals(PRISON_SLOTS_INITIAL, state.slots, '原狀態不被改寫');

        const next = imprisonOne(expanded.state, used, 'after-expand');
        assert.isTrue(next.ok);
    });

    suite.test('擴容到上限 PRISON_SLOTS_MAX 為止，之後擴容被拒且狀態不變', () => {
        let state = createPrisonState();
        while (state.slots < PRISON_SLOTS_MAX) {
            const step = expandPrisonSlots(state);
            assert.isTrue(step.ok);
            state = step.state;
        }
        assert.equals(PRISON_SLOTS_MAX, state.slots);

        const capped = expandPrisonSlots(state);
        assert.isTrue(!capped.ok);
        assert.equals(PRISON_SLOTS_MAX, capped.state.slots);
        assert.equals(state, capped.state);
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
