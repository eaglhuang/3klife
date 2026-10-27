/**
 * GameSessionFarewellLetters.test.ts — 傭兵離隊寫入告別信、已讀、存讀檔（PROG-2-0985）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { MercenarySaveBundle } from '../assets/scripts/core/systems/MercenarySaveModel';
import type { PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';

function bundleWith(affection: number): MercenarySaveBundle {
    return {
        mercenaries: [{ uid: 'merc-1', daysLeft: 1, bond: 0, status: 'Trial', generalId: 'gen-1', affection }],
        upkeep: [{ uid: 'merc-1', status: 'Active', unpaidDays: 0, frozenDaysLeft: 0 }],
        cooldowns: [],
    };
}

function roundTrip(snapshot: PlayerSaveSnapshot): PlayerSaveSnapshot {
    return JSON.parse(JSON.stringify(snapshot)) as PlayerSaveSnapshot;
}

/** 試用倒數 1 天：第 1 日歸零仍在隊，第 2 日離隊。 */
async function departWith(affection: number): Promise<GameSession> {
    const session = new GameSession(1);
    session.setMercenaries(bundleWith(affection));
    await session.advanceMercenaryDay();
    await session.advanceMercenaryDay();
    return session;
}

export function createGameSessionFarewellLettersSuite(): TestSuite {
    const suite = new TestSuite('GameSessionFarewellLetters (PROG-2-0985 告別信接線)');

    suite.test('好感 20–39 離隊時寫入一封普通告別信', async () => {
        const session = await departWith(25);
        const inbox = session.farewellLetters;
        assert.equals(1, inbox.length);
        assert.equals('normal', inbox[0].tier);
        assert.equals(2, inbox[0].day);
        assert.isFalse(inbox[0].read);
    });

    suite.test('好感 40 以上離隊寫入感人告別信', async () => {
        const session = await departWith(35);
        assert.equals('moving', session.farewellLetters[0].tier);
    });

    suite.test('好感不足 20 離隊不寫信', async () => {
        const session = await departWith(0);
        assert.equals(0, session.farewellLetters.length);
    });

    suite.test('讀取收件匣回傳副本，改動副本不影響遊戲狀態', async () => {
        const session = await departWith(25);
        session.farewellLetters[0].read = true;
        assert.isFalse(session.farewellLetters[0].read);
    });

    suite.test('標記已讀只改指定信件；找不到的 ID 不變動', async () => {
        const session = await departWith(25);
        session.readFarewellLetter(session.farewellLetters[0].id);
        assert.isTrue(session.farewellLetters[0].read);
        session.readFarewellLetter('FL-NOPE-1');
        assert.equals(1, session.farewellLetters.length);
    });

    suite.test('收件匣跨存讀檔保留已讀狀態；無信時不寫入欄位', async () => {
        const empty = new GameSession(1);
        assert.isTrue(empty.createSnapshot(new Date(0)).farewellLetters === undefined);

        const session = await departWith(25);
        session.readFarewellLetter(session.farewellLetters[0].id);
        const snapshot = roundTrip(session.createSnapshot(new Date(0)));
        const restored = new GameSession(1);
        restored.restoreLifespanState(snapshot);
        assert.equals(1, restored.farewellLetters.length);
        assert.isTrue(restored.farewellLetters[0].read);
    });

    suite.test('舊檔沒有 farewellLetters 欄位時為空收件匣', () => {
        const session = new GameSession(1);
        session.restoreLifespanState({} as PlayerSaveSnapshot);
        assert.equals(0, session.farewellLetters.length);
    });

    return suite;
}
