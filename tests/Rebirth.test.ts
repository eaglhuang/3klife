/**
 * Rebirth.test.ts — 轉生（重複抽到同名武將）headless 測試（PROG-2-0314 / WBS GCH-05）
 *
 * Unity 對照：EditMode Test 直接驗證純邏輯表格，再用 GameSession 驗證抽卡寫入名冊。
 */
import { assert, TestSuite } from './TestRunner';
import {
    applyDuplicatePull,
    MAX_REBIRTH_COUNT,
    normalizeRebirthCount,
    REBIRTH_TABLE,
    tierOf,
} from '../assets/scripts/core/systems/Rebirth';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, extra: Partial<GeneralConfig> = {}): GeneralConfig {
    return { id, name: id, faction: 'shu', hp: 1000, age: 25, ...extra } as unknown as GeneralConfig;
}

async function sessionWith(generals: GeneralConfig[]): Promise<GameSession> {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(generals));
    return session;
}

export function createRebirthSuite(): TestSuite {
    const suite = new TestSuite('Rebirth (轉生 GCH-05)');

    suite.test('轉生表與轉蛋系統 §F 一致：1~5 轉的上限與培育機會', () => {
        const expected = [[1000, 1], [1100, 2], [1250, 3], [1400, 4], [1500, 5]];
        assert.equals(5, REBIRTH_TABLE.length);
        REBIRTH_TABLE.forEach((tier, index) => {
            assert.equals(expected[index][0], tier.attributeCap);
            assert.equals(expected[index][1], tier.trainingChances);
        });
    });

    suite.test('缺轉數的舊武將視為 1 轉；超出範圍夾回 1~5', () => {
        assert.equals(1, normalizeRebirthCount(undefined));
        assert.equals(1, normalizeRebirthCount(0));
        assert.equals(1, normalizeRebirthCount(Number.NaN));
        assert.equals(MAX_REBIRTH_COUNT, normalizeRebirthCount(9));
        assert.equals(1000, tierOf(undefined).attributeCap);
    });

    suite.test('重複抽到：1 轉 → 2 轉，上限 1100，培育機會 2 次，未溢出', () => {
        const pull = applyDuplicatePull(1);
        assert.equals(2, pull.rebirthCount);
        assert.isFalse(pull.overflow);
        assert.equals(1100, pull.attributeCap);
        assert.equals(2, pull.trainingChances);
    });

    suite.test('已滿 5 轉再重複抽到：維持 5 轉並標記溢出', () => {
        const pull = applyDuplicatePull(5);
        assert.equals(5, pull.rebirthCount);
        assert.isTrue(pull.overflow);
        assert.equals(5, pull.trainingChances);
    });

    suite.test('GameSession：轉蛋重複抽到的同名武將轉數 +1，寫回名冊', async () => {
        const session = await sessionWith([general('zhao', { rebirthCount: 1 })]);
        const result = await session.addGenerals([general('zhao')], { rebirthOnDuplicate: true });
        assert.equals(0, result.added.length);
        assert.equals(1, result.rebirths.length);
        assert.equals(2, result.rebirths[0].rebirthCount);
        assert.equals(2, session.roster.find((g) => g.id === 'zhao')!.rebirthCount!);
    });

    suite.test('同一批抽到同名多次，逐筆累加；超過 5 轉的部分回報溢出', async () => {
        const session = await sessionWith([general('lu', { rebirthCount: 4 })]);
        const result = await session.addGenerals(
            [general('lu'), general('lu'), general('lu')],
            { rebirthOnDuplicate: true },
        );
        assert.equals(3, result.rebirths.length);
        assert.equals(5, session.roster.find((g) => g.id === 'lu')!.rebirthCount!);
        // 4 轉 → 5 轉（未溢出），之後兩次都是滿轉溢出
        assert.equals(2, result.rebirths.filter((entry) => entry.overflow).length);
    });

    suite.test('未啟用轉生（例如俘虜招募）：重複武將只回報，不改轉數', async () => {
        const session = await sessionWith([general('guan', { rebirthCount: 1 })]);
        const result = await session.addGenerals([general('guan')]);
        assert.equals(1, result.duplicates.length);
        assert.equals(0, result.rebirths.length);
        assert.equals(1, session.roster.find((g) => g.id === 'guan')!.rebirthCount!);
    });

    suite.test('新武將仍照常加入名冊，不套用轉生', async () => {
        const session = await sessionWith([general('zhang', { rebirthCount: 1 })]);
        const result = await session.addGenerals([general('zhang'), general('diao')], { rebirthOnDuplicate: true });
        assert.equals(1, result.added.length);
        assert.equals('diao', result.added[0].id);
        assert.equals(1, result.rebirths.length);
        assert.equals(2, session.roster.length);
    });

    return suite;
}
