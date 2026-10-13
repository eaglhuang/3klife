import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { normalizeDomesticLog } from '../assets/scripts/core/systems/DomesticTasks';
import { normalizeFame, validatePlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';

export function createDomesticWireSuite(): TestSuite {
    const suite = new TestSuite('DomesticWire (MVP-10 內政會話接線)');

    suite.test('農耕：糧草依規格當下入帳，夾在上限內', () => {
        const session = new GameSession(1);
        const before = session.military.food;
        const cap = session.military.foodCap;
        return session.chooseDomesticTask('farming').then(result => {
            assert.isTrue(result.ok);
            assert.equals(Math.max(before, Math.min(cap, before + 120)), session.military.food);
        });
    });

    suite.test('同季第二次選擇被拒絕，資源不變', () => {
        const session = new GameSession(1);
        return session.chooseDomesticTask('farming').then(async () => {
            const food = session.military.food;
            const second = await session.chooseDomesticTask('commerce');
            assert.isFalse(second.ok);
            assert.equals('already-chosen-this-season', second.reason!);
            assert.equals(food, session.military.food);
        });
    });

    suite.test('商業黃金交給 grantGold，會話不自己記黃金', () => {
        const session = new GameSession(1);
        const granted: number[] = [];
        return session.chooseDomesticTask('commerce', amount => granted.push(amount)).then(() => {
            assert.equals(1, granted.length);
            assert.equals(100, granted[0]);
        });
    });

    suite.test('外交增加名聲，存檔帶 resources.fame', () => {
        const session = new GameSession(1);
        return session.chooseDomesticTask('diplomacy').then(() => {
            assert.equals(40, session.fame);
            assert.equals(40, session.createSnapshot(new Date(0)).resources!.fame);
        });
    });

    suite.test('存檔往返保留名聲與本季內政紀錄', () => {
        const session = new GameSession(1);
        return session.chooseDomesticTask('diplomacy').then(() => {
            const raw = JSON.parse(JSON.stringify(session.createSnapshot(new Date(0))));
            const restored = validatePlayerSaveSnapshot(raw);
            assert.equals(40, restored.resources!.fame);
            assert.equals('diplomacy', restored.domestic!.lastTask!);
        });
    });

    suite.test('開新局清空名聲與內政紀錄', () => {
        const session = new GameSession(1);
        return session.chooseDomesticTask('diplomacy').then(() => {
            session.startNewGame(2);
            assert.equals(0, session.fame);
            assert.isTrue(session.domesticLog.lastTask === null);
        });
    });

    suite.test('舊存檔的名聲與內政紀錄壞掉時補零與空紀錄', () => {
        assert.equals(0, normalizeFame(undefined));
        assert.equals(0, normalizeFame(-5));
        assert.equals(0, normalizeFame(1.5));
        assert.isTrue(normalizeDomesticLog('bad').lastTask === null);
        assert.isTrue(normalizeDomesticLog({ lastSeason: 2, lastTask: 'unknown' }).lastTask === null);
    });

    return suite;
}
