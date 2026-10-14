/**
 * FemaleCaptiveSource — 戰俘女將歸入名冊時寫入 CAPTIVE 來源的 headless 測試（PROG-2-0245）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, extra: Partial<GeneralConfig> = {}): GeneralConfig {
    return { id, name: id, faction: 'wei', gender: '男', age: 30, hp: 1000, stats: { cha: 50, luk: 50, int: 50, pol: 50 }, ...extra } as unknown as GeneralConfig;
}

export function createFemaleCaptiveSourceSuite(): TestSuite {
    const suite = new TestSuite('FemaleCaptiveSource (戰俘女將來源寫入 PROG-2-0245)');

    suite.test('女俘虜招募入名冊後帶 CAPTIVE 來源；男俘虜不寫', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([general('lead')]));
        await session.capturePrisoner(general('diaochan', { name: '貂蟬', gender: '女', rarityTier: 'legendary' }));
        await session.capturePrisoner(general('lu-bu', { name: '呂布', rarityTier: 'legendary' }));

        const recruited = (await session.resolvePrisoner('diaochan', 'recruit', { gold: 9000 }))!;
        assert.isTrue(recruited.joined);
        assert.equals('CAPTIVE', session.femaleSources.diaochan?.Source_Type ?? '');
        assert.equals('SR', session.femaleSources.diaochan?.Quality_Grade ?? '');

        const male = (await session.resolvePrisoner('lu-bu', 'recruit', { gold: 9000 }))!;
        assert.isTrue(male.joined);
        assert.equals(null, session.femaleSources['lu-bu'] ?? null);
    });

    suite.test('女俘虜被關押或放走不寫來源（沒有入名冊）', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([general('lead')]));
        await session.capturePrisoner(general('daqiao', { name: '大喬', gender: '女', rarityTier: 'epic' }));
        const jailed = (await session.resolvePrisoner('daqiao', 'imprison'))!;
        assert.isTrue(jailed.imprisoned);
        assert.equals(null, session.femaleSources.daqiao ?? null);
    });

    return suite;
}
