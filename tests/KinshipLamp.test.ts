import { TestSuite, assert } from './TestRunner';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { kinshipLampLevel, kinshipLampLine } from '../assets/scripts/core/systems/BloodFatigue';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const general = (id: string, gender: '男' | '女', bloodFatigue: number, extra: Partial<GeneralConfig> = {}): GeneralConfig => ({
    id, name: id, faction: 'shu', gender, age: 30, hp: 1000,
    vitality: 100, maxVitality: 100, bloodFatigue,
    str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, ...extra,
} as unknown as GeneralConfig);

function lampOf(generals: GeneralConfig[]): string {
    const roster = new InMemoryRosterStore(generals);
    const service = new BreedingService(roster, new BloodlineGraph(), { random: () => 0.01 });
    const flow = new BondingSetupController({
        roster,
        breeding: service,
        prepare: async () => service.syncGraphFromRoster(),
        persist: async () => undefined,
    });
    return flow.getView().texts.kinshipLampLine;
}

export function createKinshipLampSuite(): TestSuite {
    const suite = new TestSuite('KinshipLamp');

    suite.test('h 0、1、2 各一盞，3 以上都是枯竭', () => {
        assert.equals(0, kinshipLampLevel(0));
        assert.equals(1, kinshipLampLevel(1));
        assert.equals(2, kinshipLampLevel(2));
        assert.equals(3, kinshipLampLevel(3));
        assert.equals(3, kinshipLampLevel(9));
    });

    suite.test('缺欄位視為清朗', () => {
        assert.equals(0, kinshipLampLevel(undefined));
    });

    suite.test('乾淨外婚也顯示清朗燈與安全值', () => {
        assert.equals('🟢 血脈清朗（無近親累積疲勞）｜當胎病弱 1%｜子嗣殘留 0 階', kinshipLampLine(0, 0, false));
    });

    suite.test('枯竭家主外婚：當胎回安全值，殘留只降一階', () => {
        assert.equals('🔴 血脈枯竭（極高病弱風險，請務必進行異姓外婚）｜當胎病弱 1%｜子嗣殘留 2 階', kinshipLampLine(3, 0, false));
    });

    suite.test('微躁再近婚：當胎風險升高，殘留加一階', () => {
        assert.equals('🟡 血脈微躁（曾有近親聯姻，若再近婚將提高抱恙風險；異姓外婚可復壯）｜當胎病弱 20%｜子嗣殘留 2 階', kinshipLampLine(1, 0, true));
    });

    suite.test('燈號看雙親較高的一方', () => {
        assert.isTrue(kinshipLampLine(0, 2, false).indexOf('🟠 血脈鬱結') === 0);
    });

    suite.test('結緣畫面有獨立的燈號行', () => {
        const roster = [general('m', '男', 2), general('f', '女', 0)];
        const line = lampOf(roster);
        assert.isTrue(line.indexOf('🟠 血脈鬱結') === 0);
        assert.isTrue(line.indexOf('子嗣殘留 1 階') >= 0);
    });

    suite.test('雙親乾淨時結緣畫面仍亮清朗燈', () => {
        assert.isTrue(lampOf([general('m', '男', 0), general('f', '女', 0)]).indexOf('🟢 血脈清朗') === 0);
    });

    return suite;
}
