/**
 * BondingRelationLore.test.ts — 結緣時宿敵關係事件的劇本台詞（KIN-08 / PROG-2-1406）headless 測試
 *
 * Unity 對照：EditMode Test。結緣流程的 Presenter 把事件 Key 轉成台詞，接在通知列後面。
 */
import { TestSuite, assert } from './TestRunner';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { HistoricalPairTable } from '../assets/scripts/core/systems/HistoricalPairs';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, gender: '男' | '女'): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender, age: 30, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
    } as unknown as GeneralConfig;
}

function rivalTable(): HistoricalPairTable {
    const base = { epBonus: 0, extraEffects: {} };
    return HistoricalPairTable.load({
        relations: [
            { ...base, relationId: 'T_RIVAL', templateA: 'zhuge-liang', templateB: 'sima-yi', type: 'RIVAL', loreKey: 'L3' },
        ],
    }).table;
}

function makeFlow(generals: GeneralConfig[]): BondingSetupController {
    const roster = new InMemoryRosterStore(generals);
    const service = new BreedingService(roster, new BloodlineGraph(), {
        random: () => 0.01,
        historicalPairs: rivalTable(),
    });
    return new BondingSetupController({
        roster,
        breeding: service,
        prepare: async () => service.syncGraphFromRoster(),
        persist: async () => undefined,
    });
}

export function createBondingRelationLoreSuite(): TestSuite {
    const suite = new TestSuite('BondingRelationLore (結緣宿敵台詞 KIN-08)');

    suite.test('宿敵配對結緣：通知列接上劇本台詞', async () => {
        const flow = makeFlow([general('zhuge-liang', '男'), general('sima-yi', '女')]);
        await flow.confirm();
        assert.isTrue(flow.getView().texts.bondNotice.includes('諸葛亮與司馬懿的血脈交融'));
    });

    suite.test('非宿敵配對結緣：通知列不出現關係台詞', async () => {
        const flow = makeFlow([general('liu', '男'), general('sun', '女')]);
        await flow.confirm();
        assert.isFalse(flow.getView().texts.bondNotice.includes('血脈交融'));
    });

    return suite;
}
