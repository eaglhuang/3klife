/**
 * PurpleFactorGuarantee — 祠堂 Lv.4 起子嗣保底 1 個紫色因子（doc_spec_0310 §3；PROG-2-1916）
 */
import { assert, TestSuite } from './TestRunner';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { buildFactorDictionary, resolveFactorColor } from '../assets/scripts/core/systems/FactorInheritance';
import { ensurePurpleFactor } from '../assets/scripts/core/systems/MvpLoopController';

const DICT = buildFactorDictionary([
    { id: 'P_TIANMING', displayName: '天命', color: 'purple' },
    { id: 'P_HIDDEN', color: 'purple', isHidden: true },
    { id: 'B_STR', color: 'blue' },
]);

const person = (id: string, gender: string): GeneralConfig => ({
    id, name: id, faction: 'player', gender, age: 30, ep: 60, role: 'Combat', vitality: 100, maxVitality: 100,
    str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, hp: 1000, genes: [],
} as unknown as GeneralConfig);
const conceiveOnly = (): (() => number) => { let call = 0; return () => (call++ === 0 ? 0.01 : 0.99); };

function birth(tier: number): GeneralConfig {
    const service = new BreedingService(new InMemoryRosterStore([person('father', '男'), person('mother', '女')]), new BloodlineGraph(), {
        random: conceiveOnly(), dictionary: DICT, clanPrestigeTier: () => tier,
    });
    service.syncGraphFromRoster();
    const result = service.breed('father', 'mother');
    assert.equals('conceived', result.outcome);
    return result.child as GeneralConfig;
}

const purpleCount = (g: GeneralConfig): number => (g.genes ?? []).filter((x) => x.id && resolveFactorColor(x.id, DICT, x) === 'purple').length;

export function createPurpleFactorGuaranteeSuite(): TestSuite {
    const suite = new TestSuite('PurpleFactorGuarantee (紫色因子保底 PROG-2-1916)');

    suite.test('Lv.4 子嗣必帶 1 個非隱藏紫色因子；Lv.3 不保底', () => {
        const lv4 = birth(4);
        assert.equals(1, purpleCount(lv4));
        assert.isTrue((lv4.genes ?? []).some((g) => g.id === 'P_TIANMING'));
        assert.equals(0, purpleCount(birth(3)));
    });

    suite.test('已有紫色因子不重複加；字典沒有紫色時原樣；不改輸入', () => {
        const has = { ...person('kid', '男'), genes: [{ id: 'P_TIANMING', type: 'purple', level: 2 }] } as GeneralConfig;
        assert.equals(1, purpleCount(ensurePurpleFactor(has, DICT, () => 0.5)));
        const none = person('kid2', '女');
        assert.equals(0, (ensurePurpleFactor(none, buildFactorDictionary([{ id: 'B_STR', color: 'blue' }]), () => 0).genes ?? []).length);
        ensurePurpleFactor(none, DICT, () => 0);
        assert.equals(0, (none.genes ?? []).length);
    });

    return suite;
}
