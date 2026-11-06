/**
 * ChildBirthPrestige — 子嗣出生套用祠堂福祉（doc_spec_0310 §3；PROG-2-1913）
 */
import { assert, TestSuite } from './TestRunner';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const person = (id: string, gender: string): GeneralConfig => ({
    id, name: id, faction: 'player', gender, age: 30, ep: 60, role: 'Combat', vitality: 100, maxVitality: 100,
    str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, hp: 1000, genes: [],
} as unknown as GeneralConfig);
const conceiveOnly = (): (() => number) => { let call = 0; return () => (call++ === 0 ? 0.01 : 0.99); };

function birth(tier?: number): { child: Record<string, number>; roster: GeneralConfig[] } {
    const store = new InMemoryRosterStore([person('father', '男'), person('mother', '女')]);
    const service = new BreedingService(store, new BloodlineGraph(), {
        random: conceiveOnly(),
        ...(tier !== undefined ? { clanPrestigeTier: () => tier } : {}),
    });
    service.syncGraphFromRoster();
    const result = service.breed('father', 'mother');
    assert.equals('conceived', result.outcome);
    return { child: result.child as unknown as Record<string, number>, roster: store.getAll() };
}

export function createChildBirthPrestigeSuite(): TestSuite {
    const suite = new TestSuite('ChildBirthPrestige (子嗣出生祠堂福祉 PROG-2-1913)');

    suite.test('Lv.3 子嗣五維 +10%、起點裨將軍，名冊與回傳一致', () => {
        const plain = birth().child;
        const { child, roster } = birth(3);
        for (const k of ['str', 'int', 'lea', 'pol', 'cha']) {
            assert.equals(Math.floor(plain[k] * 110 / 100), child[k], k);
        }
        assert.equals(1, child.generalRank);
        const stored = roster.find((g) => g.id === (child as unknown as GeneralConfig).id) as unknown as Record<string, number>;
        assert.equals(child.str, stored.str);
    });

    suite.test('沒接聲望或 Lv.1 時與原本完全相同', () => {
        const plain = birth().child;
        const lv1 = birth(1).child;
        assert.equals(JSON.stringify(plain), JSON.stringify(lv1));
    });

    suite.test('Lv.5 起點偏將軍、五維 +20%', () => {
        const plain = birth().child;
        const { child } = birth(5);
        assert.equals(2, child.generalRank);
        assert.equals(Math.floor(plain.str * 120 / 100), child.str);
    });

    return suite;
}
