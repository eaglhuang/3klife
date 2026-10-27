/**
 * PrisonerReleaseReturn.test.ts — 放走俘虜的未來來投 headless 測試（POW-07 / PROG-2-0941）
 *
 * 鎖住：放走後進入來投名單；只有放走於更早季的俘虜才會擲骰；
 * 5% 機率來投者移出名單並回傳；舊存檔沒有 released 欄位時正規化為空陣列。
 *
 * Unity 對照：像 EditMode Test 注入假的 Random，驗證一個 ScriptableObject 狀態表
 * 在每回合 Tick 後的增減，而不是真的等隨機數。
 */
import { TestSuite, assert } from './TestRunner';
import {
    addReleasedPrisoner,
    createPrisonState,
    FUTURE_RETURN_CHANCE,
    normalizePrisonState,
    rollFutureReturns,
    type PrisonReleaseEntry,
} from '../assets/scripts/core/systems/PrisonerOfWar';

const ENTRY: PrisonReleaseEntry = { targetUid: 'lu-bu', targetName: '呂布', releasedSeason: 3 };

/** 固定回傳同一個值的假亂數（對應 Unity 測試裡注入的 Random） */
function fixedRandom(value: number): () => number {
    return () => value;
}

export function createPrisonerReleaseReturnSuite(): TestSuite {
    const suite = new TestSuite('PrisonerReleaseReturn (俘虜放走後來投 POW-07 / PROG-2-0941)');

    suite.test('放走的俘虜進入來投名單，原狀態不被改寫', () => {
        const before = createPrisonState();
        const after = addReleasedPrisoner(before, ENTRY);
        assert.equals(0, before.released.length);
        assert.equals(1, after.released.length);
        assert.equals('呂布', after.released[0].targetName);
    });

    suite.test('同一季放走的俘虜不會當季來投（只看更早的季）', () => {
        const state = addReleasedPrisoner(createPrisonState(), ENTRY);
        const result = rollFutureReturns(state, ENTRY.releasedSeason, fixedRandom(0));
        assert.equals(0, result.returned.length);
        assert.equals(1, result.state.released.length);
    });

    suite.test('擲中機率（小於 5%）時來投：移出名單並回傳；未中者留在名單', () => {
        const state = addReleasedPrisoner(createPrisonState(), ENTRY);
        const hit = rollFutureReturns(state, ENTRY.releasedSeason + 1, fixedRandom(FUTURE_RETURN_CHANCE - 0.001));
        assert.equals(1, hit.returned.length);
        assert.equals('lu-bu', hit.returned[0].targetUid);
        assert.equals(0, hit.state.released.length);

        const miss = rollFutureReturns(state, ENTRY.releasedSeason + 1, fixedRandom(FUTURE_RETURN_CHANCE));
        assert.equals(0, miss.returned.length);
        assert.equals(1, miss.state.released.length);
    });

    suite.test('當季放走者不消耗亂數，其餘合格者各擲一次', () => {
        let calls = 0;
        const counting = (): number => { calls += 1; return 0.99; };
        const state = {
            ...createPrisonState(),
            released: [
                { targetUid: 'old', targetName: '舊', releasedSeason: 1 },
                { targetUid: 'new', targetName: '新', releasedSeason: 5 },
                { targetUid: 'mid', targetName: '中', releasedSeason: 2 },
            ],
        };
        rollFutureReturns(state, 5, counting);
        assert.equals(2, calls);
    });

    suite.test('舊存檔沒有 released 欄位時正規化為空陣列，壞項目略過', () => {
        const legacy = normalizePrisonState({ fame: 100, intel: 2 });
        assert.equals(0, legacy.released.length);
        assert.equals(100, legacy.fame);

        const dirty = normalizePrisonState({
            released: [ENTRY, null, { targetName: '無 uid' }],
        });
        assert.equals(1, dirty.released.length);
        assert.equals('lu-bu', dirty.released[0].targetUid);
    });

    return suite;
}
