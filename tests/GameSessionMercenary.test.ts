import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { MercenarySaveBundle } from '../assets/scripts/core/systems/MercenarySaveModel';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const BUNDLE: MercenarySaveBundle = {
    mercenaries: [{ uid: 'merc-1', daysLeft: 2, bond: 10, status: 'Trial' }],
    upkeep: [],
    cooldowns: [{ uid: 'merc-9', availableOnDay: 30 }],
};

export function createGameSessionMercenarySuite(): TestSuite {
    const suite = new TestSuite('GameSessionMercenary (MERC-01 會話接線)');

    suite.test('新會話的傭兵包為空，快照帶空包', () => {
        const session = new GameSession(1);
        assert.equals(0, session.mercenaries.mercenaries.length);
        assert.equals(0, session.createSnapshot(new Date(0)).mercenaries!.mercenaries.length);
    });

    suite.test('setMercenaries 後快照帶入傭兵包', () => {
        const session = new GameSession(1);
        session.setMercenaries(BUNDLE);
        const snapshot = session.createSnapshot(new Date(0));
        assert.equals(JSON.stringify(BUNDLE), JSON.stringify(snapshot.mercenaries));
    });

    suite.test('getter 回傳副本，外部修改不影響會話內容', () => {
        const session = new GameSession(1);
        session.setMercenaries(BUNDLE);
        session.mercenaries.mercenaries[0].daysLeft = 0;
        assert.equals(2, session.mercenaries.mercenaries[0].daysLeft);
    });

    // 成功路徑（扣點、入名冊、冷卻）的數值已由 MercenaryRoster.test.ts 覆蓋。
    // 結義點數餘額來源（GCH-06）未接上，這裡傳入 0 驗證失敗路徑。
    suite.test('bondMercenaryToRoster：點數不足 R 的 100 點，傭兵與名冊都不變', async () => {
        const session = new GameSession(1);
        session.setMercenaries({
            mercenaries: [{ uid: 'merc-1', daysLeft: 0, bond: 6, status: 'Trial', generalId: 'gen-merc', affection: 60 }],
            upkeep: [{ uid: 'merc-1', status: 'Active', unpaidDays: 0, frozenDaysLeft: 0 }],
            cooldowns: [],
        });
        const template = { id: 'gen-merc', name: '測試', faction: 'shu', hp: 1000, rarityTier: 'common' } as unknown as GeneralConfig;
        const result = await session.bondMercenaryToRoster('merc-1', template, 0, 10);
        assert.isFalse(result.ok);
        assert.equals('insufficient-points', result.reason!);
        assert.equals('Trial', session.mercenaries.mercenaries[0].status);
        assert.equals(1, session.mercenaries.upkeep.length);
        assert.equals(0, session.roster.length);
    });

    suite.test('startNewGame 會清空傭兵包', () => {
        const session = new GameSession(1);
        session.setMercenaries(BUNDLE);
        session.startNewGame(2);
        assert.equals(0, session.mercenaries.mercenaries.length);
    });

    return suite;
}
