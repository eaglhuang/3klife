import { TestSuite, assert } from './TestRunner';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { sameSurnameNote } from '../assets/scripts/core/systems/MatchRumor';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const general = (id: string, name: string, gender: '男' | '女'): GeneralConfig => ({
    id, name, faction: 'shu', gender, age: 30, hp: 1000,
    vitality: 100, maxVitality: 100,
    str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
} as unknown as GeneralConfig);

function makeFlow(generals: GeneralConfig[]): BondingSetupController {
    const roster = new InMemoryRosterStore(generals);
    const service = new BreedingService(roster, new BloodlineGraph(), { random: () => 0.01 });
    return new BondingSetupController({
        roster,
        breeding: service,
        prepare: async () => service.syncGraphFromRoster(),
        persist: async () => undefined,
    });
}

export function createSameSurnameNoteSuite(): TestSuite {
    const suite = new TestSuite('SameSurnameNote');

    suite.test('同姓才有句子', () => {
        assert.equals('同宗同姓：皆為趙氏', sameSurnameNote('趙統', '趙蘭') ?? '');
        assert.equals(null, sameSurnameNote('趙統', '孫蘭'));
    });

    suite.test('姓氏不明不算同姓', () => {
        assert.equals(null, sameSurnameNote('', ''));
    });

    suite.test('結緣畫面的血緣行標出同姓，但不擋結緣', () => {
        const view = makeFlow([general('m', '趙統', '男'), general('f', '趙蘭', '女')]).getView();
        assert.isTrue(view.texts.inbreedingLabel.indexOf('同宗同姓：皆為趙氏') >= 0);
        assert.isTrue(view.enabled.btnConfirmBond);
    });

    suite.test('不同姓時血緣行不提同姓', () => {
        const view = makeFlow([general('m', '趙統', '男'), general('f', '孫蘭', '女')]).getView();
        assert.isTrue(view.texts.inbreedingLabel.indexOf('同宗同姓') < 0);
    });

    return suite;
}
