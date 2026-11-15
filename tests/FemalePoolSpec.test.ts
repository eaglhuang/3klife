// @spec-source → 紅顏天香轉蛋女將卡池規格（FEM-03，doc_spec_0645）；PROG-2-9042
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { beautyPoolRule } from '../assets/scripts/core/systems/GachaLocalRules';
import type { LocalGachaService } from '../assets/scripts/core/services/LocalGachaService';
import type { GachaConfig } from '../assets/scripts/core/models/GachaConfig';

function readJson(relative: string): any {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf8'));
}

function poolOf(poolId: string): GachaConfig {
    const pools: GachaConfig[] = readJson('assets/resources/data/gacha-config.json');
    return pools.find(p => p.poolId === poolId)!;
}

export function createFemalePoolSpecSuite(): TestSuite {
    const suite = new TestSuite('FemalePoolSpec (FEM-03 紅顏天香池數值與名將池男將化)');

    suite.test('名將池候選只含男將（性別以武將資料 gender 為準）', () => {
        const generals: Array<{ id: string; gender?: string }> = readJson('assets/resources/data/master/generals-base.json').data;
        const gender = new Map(generals.map(g => [g.id, g.gender] as const));
        const hero = poolOf('hero-pool');
        const females = hero.candidateIds.filter(id => gender.get(id) === '女');
        assert.equals(0, females.length);
    });

    suite.test('紅顏池價格：單抽 160 玉璧（靈玉）', () => {
        const pool = poolOf('support-pool');
        assert.equals(160, pool.singlePullCost!);
        assert.equals('gem', pool.currencyType!);
        assert.equals('gems', pool.presentation!.currency);
    });

    suite.test('紅顏池保底：5 抽小保底、50 抽大保底', () => {
        const pool = poolOf('support-pool');
        assert.equals(5, pool.guaranteeThreshold);
        assert.equals(50, pool.grandPityThreshold!);
    });

    suite.test('紅顏池抽到後起始好感為 60', () => {
        const pool = poolOf('support-pool');
        assert.equals(60, pool.initialAffection!);
    });

    suite.test('紅顏池規則以設定的單抽價扣靈玉（不扣召喚券）', async () => {
        const pool = poolOf('support-pool');
        const calls: Array<{ fn: string; args: unknown[] }> = [];
        const service = {
            performLocalGacha: async (...args: unknown[]) => { calls.push({ fn: 'performLocalGacha', args }); return []; },
            performPoolTicketSummon: async (...args: unknown[]) => { calls.push({ fn: 'performPoolTicketSummon', args }); return []; },
        } as unknown as LocalGachaService;
        const general = { id: 'da-qiao' } as never;
        await beautyPoolRule(service).pull({ poolId: pool.poolId, drawCount: 2, generals: [general] } as never, pool);
        assert.equals(1, calls.length);
        assert.equals('performLocalGacha', calls[0].fn);
        assert.equals(320, calls[0].args[2]);
        assert.equals('gems', calls[0].args[5]);
    });

    return suite;
}
