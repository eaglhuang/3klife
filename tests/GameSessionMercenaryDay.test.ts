import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { MercenarySaveBundle } from '../assets/scripts/core/systems/MercenarySaveModel';

const BUNDLE: MercenarySaveBundle = {
    mercenaries: [{ uid: 'merc-1', daysLeft: 6, bond: 0, status: 'Trial', generalId: 'gen-1', affection: 0 }],
    upkeep: [{ uid: 'merc-1', status: 'Active', unpaidDays: 0, frozenDaysLeft: 0 }],
    cooldowns: [],
};

export function createGameSessionMercenaryDaySuite(): TestSuite {
    const suite = new TestSuite('GameSessionMercenaryDay (MERC-03/05 每日時間軸)');

    suite.test('推進一日：日序 +1、倒數 −1、好感 +10', async () => {
        const session = new GameSession(1);
        session.setMercenaries(BUNDLE);
        const report = await session.advanceMercenaryDay();
        assert.equals(1, report.day);
        assert.equals(1, session.mercenaryDay);
        assert.equals(5, session.mercenaries.mercenaries[0].daysLeft);
        assert.equals(10, session.mercenaries.mercenaries[0].affection!);
        assert.equals(0, report.events.length);
    });

    suite.test('第 6 日倒數歸零仍為 Trial，不離隊（可在當日結義）', async () => {
        const session = new GameSession(1);
        session.setMercenaries(BUNDLE);
        let report = await session.advanceMercenaryDay();
        for (let day = 1; day < 6; day++) report = await session.advanceMercenaryDay();
        assert.equals(6, report.day);
        assert.equals(0, session.mercenaries.mercenaries[0].daysLeft);
        assert.equals(60, session.mercenaries.mercenaries[0].affection!);
        assert.equals('Trial', session.mercenaries.mercenaries[0].status);
        assert.equals(0, report.events.length);
    });

    suite.test('倒數歸零的隔日離隊：寫入告別事件、武將冷卻 30 天、欠薪紀錄移除', async () => {
        const session = new GameSession(1);
        session.setMercenaries(BUNDLE);
        for (let day = 0; day < 6; day++) await session.advanceMercenaryDay();
        const report = await session.advanceMercenaryDay();
        assert.equals(7, report.day);
        assert.equals('Expired', session.mercenaries.mercenaries[0].status);
        assert.equals('departed', report.events[0].type);
        assert.equals('farewell-letter', report.events[1].type);
        assert.equals(37, session.mercenaries.cooldowns[0].availableOnDay);
        assert.equals('gen-1', session.mercenaries.cooldowns[0].generalId!);
        assert.equals(0, session.mercenaries.upkeep.length);
    });

    suite.test('傭兵池：同武將冷卻中被過濾，冷卻結束後恢復', async () => {
        const session = new GameSession(1);
        session.setMercenaries(BUNDLE);
        for (let day = 0; day < 7; day++) await session.advanceMercenaryDay();
        assert.equals(7, session.mercenaryDay);
        assert.equals('gen-2', session.availablePoolGeneralIds(['gen-1', 'gen-2'])[0]);
        assert.equals(1, session.availablePoolGeneralIds(['gen-1', 'gen-2']).length);
        for (let day = 7; day < 37; day++) await session.advanceMercenaryDay();
        assert.equals(2, session.availablePoolGeneralIds(['gen-1', 'gen-2']).length);
    });

    suite.test('日序存進存檔包，載入後延續', async () => {
        const session = new GameSession(1);
        session.setMercenaries({ ...BUNDLE, day: 5 });
        await session.advanceMercenaryDay();
        assert.equals(6, session.mercenaryDay);
        const snapshot = session.createSnapshot(new Date(0));
        assert.equals(6, snapshot.mercenaries!.day!);
    });

    suite.test('傭兵池列資料：試用中顯示倒數與進度，不改存檔包', () => {
        const session = new GameSession(1);
        session.setMercenaries({ ...BUNDLE, mercenaries: [{ ...BUNDLE.mercenaries[0], daysLeft: 4, affection: 30 }] });
        const before = JSON.stringify(session.mercenaries);
        const rows = session.mercenaryPoolRows();
        assert.equals(1, rows.length);
        assert.equals('試用中', rows[0].statusText);
        assert.equals('剩餘 4 日', rows[0].daysLeftText);
        assert.equals(1 / 3, rows[0].trialProgress);
        assert.equals(true, rows[0].canDeploy);
        assert.equals(before, JSON.stringify(session.mercenaries));
    });

    suite.test('傭兵池列資料：已離隊無倒數、無薪水紀錄則不可出戰', () => {
        const session = new GameSession(1);
        session.setMercenaries({
            mercenaries: [{ uid: 'merc-x', daysLeft: 0, bond: 0, status: 'Expired', generalId: 'gen-1', affection: 0 }],
            upkeep: [],
            cooldowns: [],
        });
        const rows = session.mercenaryPoolRows();
        assert.equals('已離隊', rows[0].statusText);
        assert.equals('', rows[0].daysLeftText);
        assert.equals(false, rows[0].canDeploy);
        assert.equals(false, rows[0].canTeach);
    });

    return suite;
}
