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
    // 這裡 setMercenaries 會丟掉超過好感上限 60 的值，R 結義需 100 點，正式規則下目前全部失敗（見 PROG-2-0308 待決）。
    suite.test('bondMercenaryToRoster：好感 60 不足 R 的 100 點，傭兵與名冊都不變', async () => {
        const session = new GameSession(1);
        session.setMercenaries({
            mercenaries: [{ uid: 'merc-1', daysLeft: 0, bond: 6, status: 'Trial', generalId: 'gen-merc', affection: 60 }],
            upkeep: [{ uid: 'merc-1', status: 'Active', unpaidDays: 0, frozenDaysLeft: 0 }],
            cooldowns: [],
        });
        const template = { id: 'gen-merc', name: '測試', faction: 'shu', hp: 1000 } as unknown as GeneralConfig;
        const result = await session.bondMercenaryToRoster('merc-1', template, { STR: 80, INT: 60, POL: 40, CHR: 70, LUK: 50 }, 'R', 10);
        assert.isFalse(result.ok);
        assert.equals('insufficient-points', result.reason!);
        assert.equals('Trial', session.mercenaries.mercenaries[0].status);
        assert.equals(1, session.mercenaries.upkeep.length);
        assert.equals(0, session.roster.length);
    });

    const READY = { uid: 'merc-1', daysLeft: 0, bond: 6, status: 'Trial' as const, generalId: 'gen-merc' };
    const BOND_STATS = { STR: 80, INT: 60, POL: 40, CHR: 70, LUK: 50 };
    const BOND_TEMPLATE = { id: 'gen-merc', name: '測試', faction: 'shu', hp: 1000 } as unknown as GeneralConfig;
    const sessionWith = (affection: number, bondPoints: number): GameSession => {
        const session = new GameSession(1);
        session.setMercenaries({ mercenaries: [{ ...READY, affection }], upkeep: [], cooldowns: [] });
        (session as unknown as { _bondPoints: number })._bondPoints = bondPoints;
        return session;
    };

    // PM 裁定 2026-10-14：好感滿 60 只是門檻，費用從結義點數餘額扣，好感不扣
    suite.test('結義：好感滿 60 且點數足夠 → 成功，扣點數餘額、好感不變、武將入名冊', async () => {
        const session = sessionWith(60, 150);
        const result = await session.bondMercenaryToRoster('merc-1', BOND_TEMPLATE, BOND_STATS, 'R', 10);
        assert.isTrue(result.ok);
        assert.equals(100, result.pointsSpent);
        assert.equals(50, session.bondPoints, '點數餘額 150 → 50');
        assert.equals(60, session.mercenaries.mercenaries[0].affection!, '好感不扣');
        assert.equals('Bonded', session.mercenaries.mercenaries[0].status);
        assert.isTrue(session.roster.some((g) => g.id === 'gen-merc'));
    });

    suite.test('結義：好感滿 60 但點數不足 → 被擋，點數、傭兵、名冊都不變', async () => {
        const session = sessionWith(60, 99);
        const result = await session.bondMercenaryToRoster('merc-1', BOND_TEMPLATE, BOND_STATS, 'R', 10);
        assert.isFalse(result.ok);
        assert.equals('insufficient-points', result.reason!);
        assert.equals(99, session.bondPoints);
        assert.equals('Trial', session.mercenaries.mercenaries[0].status);
        assert.equals(0, session.roster.length);
    });

    suite.test('結義：點數再多，好感未滿 60 也不能結義', async () => {
        const session = sessionWith(59, 5000);
        const result = await session.bondMercenaryToRoster('merc-1', BOND_TEMPLATE, BOND_STATS, 'R', 10);
        assert.isFalse(result.ok);
        assert.equals('affection-not-full', result.reason!);
        assert.equals(5000, session.bondPoints);
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
