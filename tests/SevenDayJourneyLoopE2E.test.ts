/**
 * SevenDayJourneyLoopE2E.test.ts — 七天歷程跨日登入流程（QA，PROG-2-1456）
 * 連續八天登入、每天存讀檔：Day 1 日報、Day 2 子嗣、Day 4 天才各只寫一次；
 * 第 8 天起窗口關閉，之後出生的天才不再補寫；月卡每日領取與日報同日不重生。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { buildBreedingBirthRecord } from '../assets/scripts/core/systems/BreedingBirthRecord';
import { ITEM_WISH_SPEED_CARD, itemCount } from '../assets/scripts/core/systems/PlayerInventory';
import type { BreedingResult } from '../assets/scripts/core/systems/BreedingSystem';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const SEED = 1456;

function noonOf(day: number): number {
    return Date.UTC(2026, 9, 28 + day, 4, 0);
}

function sessionOn(adapter: MemoryStorageAdapter): GameSession {
    const s = new GameSession(SEED);
    s.setSaveService(new PlayerSaveService(adapter));
    s.setAutoSave(false);
    return s;
}

function hero(id: string): GeneralConfig {
    return { id, name: id, faction: 'shu', hp: 1000, str: 80, int: 70, lea: 80, pol: 60, cha: 70 } as unknown as GeneralConfig;
}

function birthOf(childId: string, daqi = false) {
    const result = {
        outcome: 'conceived', breedingMode: 'Peace_Lineage', reasons: [], conceptionRate: 0.5,
        father: { id: 'f', name: '父' } as unknown as BreedingResult['father'],
        mother: { id: 'm', name: '母' } as unknown as BreedingResult['mother'],
        child: { id: childId, name: '子', gender: '男', age: 0, status: 'Mystery', ...(daqi ? { fate: { lateBloomer: true } } : {}) } as unknown as BreedingResult['child'],
        ep: { ep: 93 } as unknown as BreedingResult['ep'],
    } as BreedingResult;
    return buildBreedingBirthRecord(result, 'meteor')!.record!;
}

function systemSummaries(s: GameSession): string[] {
    return s.queryJournal({ category: 'SYSTEM' }).map((e) => e.summary);
}

/** 存檔後用新會話讀回，模擬每天關遊戲重開 */
async function reopen(s: GameSession, adapter: MemoryStorageAdapter): Promise<GameSession> {
    await s.save();
    const next = sessionOn(adapter);
    assert.isTrue(await next.load(), '讀檔成功');
    return next;
}

export function createSevenDayJourneyLoopE2ESuite(): TestSuite {
    const suite = new TestSuite('SevenDayJourneyLoopE2E (七天歷程跨日登入 PROG-2-1456)');

    suite.test('連續八天登入每天存讀檔：觸發點各寫一次，第 8 天起窗口關閉，月卡與日報同日不重複', async () => {
        const adapter = new MemoryStorageAdapter();
        let s = sessionOn(adapter);
        s.startNewGame(SEED);
        s.enrollGenerals([hero('zhang-fei'), hero('guan-yu')]);
        s.activateMonthlyCard(noonOf(0));
        const cardsStart = itemCount(s.inventory, ITEM_WISH_SPEED_CARD);

        for (let day = 0; day < 8; day++) {
            s.recordLoginAt(noonOf(day));
            assert.equals(1, s.claimMonthlyCardDaily(noonOf(day)), `第 ${day + 1} 天月卡可領`);
            assert.equals(0, s.claimMonthlyCardDaily(noonOf(day) + 1000), `第 ${day + 1} 天不可重領`);
            const generated = s.dailyNews.lastGeneratedDay;
            s.recordLoginAt(noonOf(day) + 3600 * 1000);
            assert.equals(generated, s.dailyNews.lastGeneratedDay, `第 ${day + 1} 天同日重登日報不重生`);

            if (day === 1) s.recordBreedingBirth(birthOf('C1'));
            if (day === 2) s.recordBreedingBirth(birthOf('C2', true));
            if (day === 7) s.recordBreedingBirth(birthOf('C3', true)); // 第 8 天出生的天才：窗口已關
            s = await reopen(s, adapter);
            s.recordLoginAt(noonOf(day) + 7200 * 1000);
            if (day < 7) await s.advanceSeason();
        }

        const lines = systemSummaries(s);
        assert.equals(1, lines.filter((x) => x.includes('三國日報首次生成')).length, 'Day 1 只寫一次');
        assert.equals(1, lines.filter((x) => x.includes('子嗣誕生')).length, 'Day 2 只寫一次');
        assert.equals(1, lines.filter((x) => x.includes('晚成')).length, 'Day 4 只寫一次');
        assert.equals(0, lines.filter((x) => x.includes('百年世家')).length, '三代血統未成立不寫');
        assert.equals(3, s.sevenDayJourney.firedIds.length, '已觸發 3 個');
        assert.equals(cardsStart + 8, itemCount(s.inventory, ITEM_WISH_SPEED_CARD), '八天月卡共 8 張');
        assert.equals(3, s.breedingBirthRecords().length, '三筆出生紀錄都保留');
    });

    return suite;
}
