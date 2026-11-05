/**
 * DiversityFactor.test.ts — 多樣性 D（PROG-2-1829）
 */
import { TestSuite, assert } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { BreedingGeneral, createChild } from '../assets/scripts/core/systems/BreedingSystem';
import { diversityOfPair } from '../assets/scripts/core/systems/DiversityFactor';

const person = (id: string, gender: string, fatherId = '', motherId = ''): GeneralConfig => ({
    id, name: id, faction: 'player', gender, age: 30, ep: 90, role: 'Combat', vitality: 100, maxVitality: 100, fatherId, motherId,
    str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, hp: 1000, genes: [],
} as unknown as GeneralConfig);

/** 四位祖輩 a、b 與 c、d；u 系兩支互相聯姻 */
const elders = (): GeneralConfig[] => [person('a', '男'), person('b', '女'), person('c', '男'), person('d', '女')];

async function graphOf(generals: GeneralConfig[]): Promise<BreedingService> {
    const service = new BreedingService(new InMemoryRosterStore(generals), new BloodlineGraph(), { random: () => 0.5 });
    await service.syncGraphFromRoster();
    return service;
}

export function createDiversityFactorSuite(): TestSuite {
    const suite = new TestSuite('DiversityFactor');

    suite.test('無共祖為 1，沒有祖譜資料也視為 1', async () => {
        const service = await graphOf([person('lord', '男', 'a', 'b'), person('bride', '女', 'c', 'd'), ...elders()]);
        assert.equals(1, service.diversityOf('lord', 'bride'));
        assert.equals(1, diversityOfPair('x', 'y', undefined));
    });

    suite.test('雙重表親扣至 0', async () => {
        const service = await graphOf([
            ...elders(),
            person('u1', '男', 'a', 'b'), person('u2', '女', 'c', 'd'), person('u3', '男', 'c', 'd'), person('u4', '女', 'a', 'b'),
            person('lord', '男', 'u1', 'u2'), person('bride', '女', 'u3', 'u4'),
        ]);
        assert.equals(0, service.diversityOf('lord', 'bride'));
    });

    suite.test('一般表親 0.5、順序不影響', async () => {
        const service = await graphOf([
            ...elders(), person('e', '男'), person('f', '女'), person('g', '男'), person('h', '女'),
            person('u1', '男', 'a', 'b'), person('u2', '女', 'e', 'f'), person('u3', '男', 'g', 'h'), person('u4', '女', 'a', 'b'),
            person('lord', '男', 'u1', 'u2'), person('bride', '女', 'u3', 'u4'),
        ]);
        assert.equals(0.5, service.diversityOf('lord', 'bride'));
        assert.equals(0.5, service.diversityOf('bride', 'lord'));
    });

    suite.test('再從表親只共曾祖，折減較輕', async () => {
        const service = await graphOf([
            ...elders(),
            person('m1', '男', 'a', 'b'), person('m2', '女', 'a', 'b'),
            person('n1', '男', 'm1', 'c'), person('n2', '女', 'm2', 'd'),
            person('lord', '男', 'n1', 'x1'), person('bride', '女', 'x2', 'n2'),
            person('x1', '女'), person('x2', '男'),
        ]);
        assert.equals(0.875, service.diversityOf('lord', 'bride'));
    });

    const child = (diversity: number | undefined): BreedingGeneral => createChild({
        id: 'c', father: person('f', '男') as BreedingGeneral, mother: person('m', '女') as BreedingGeneral,
        ep: { ep: 80 } as never, factors: [], pedigree: {} as never, random: () => 0.5, diversity,
    } as never);

    suite.test('D 折減五維加成：0 時完全沒有，未提供等同 1', () => {
        const full = child(1);
        const none = child(0);
        assert.isTrue((full.str ?? 0) > (none.str ?? 0));
        assert.equals(full.str, child(undefined).str);
        assert.isTrue((child(0.5).str ?? 0) <= (full.str ?? 0));
        assert.isTrue((child(0.5).str ?? 0) >= (none.str ?? 0));
    });

    suite.test('D 不動亂數序列', () => {
        const count = (diversity: number): number => {
            let calls = 0;
            createChild({
                id: 'c', father: person('f', '男') as BreedingGeneral, mother: person('m', '女') as BreedingGeneral,
                ep: { ep: 80 } as never, factors: [], pedigree: {} as never, random: () => { calls++; return 0.5; }, diversity,
            } as never);
            return calls;
        };
        assert.equals(count(1), count(0));
    });

    return suite;
}
