/**
 * LobbyNumberConsistency.test.ts — 幕府大廳「提示數字 = 實際變化量」（PROG-2-9126）
 *
 * 鎖住：
 * 1. 換季「本季治理成果」只列換季前後的實際淨變化，上季內政已入帳的產出另行註明，不併進數字。
 * 2. 選完內政任務的提示用實際入帳量；被上限夾住時註明。
 * 3. 頂欄時間沿用規格「第 N 年 M 季」。
 *
 * Unity 對照：Toast 文字與 HUD 數字都由同一份 Model 差額產生，不各算一套。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { governanceReportLine } from '../assets/scripts/core/systems/GovernanceEvents';
import { domesticChosenNotice } from '../assets/scripts/core/systems/DomesticPresenter';
import { hallTimeLabelText, seasonDisplayText } from '../assets/scripts/ui/core/SeasonTexts';

const noLocale = (key: string): string => key;

/** 從「糧草 +N」抓出數字；沒有回 0 */
function foodNumberOf(line: string | null | undefined): number {
    const match = /糧草 \+(\d+)/.exec(line ?? '');
    return match ? Number(match[1]) : 0;
}

function makeSession(): GameSession {
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setRandomSource(() => 0.99);
    return session;
}

export function createLobbyNumberConsistencySuite(): TestSuite {
    const suite = new TestSuite('LobbyNumberConsistency (提示數字 = 實際變化 PROG-2-9126)');

    suite.test('治理報告：只列實際淨變化，已入帳的內政產出另註明', () => {
        assert.equals('本季治理成果：糧草 +145', governanceReportLine({ food: 145 }));
        assert.equals(
            '本季治理成果：糧草 +145（內政產出 糧草 +80 已於季中入帳）',
            governanceReportLine({ food: 145 }, { food: 80 }),
        );
        assert.equals('本季治理成果：內政產出 黃金 +50 已於季中入帳', governanceReportLine({}, { gold: 50 }));
        assert.isTrue(governanceReportLine({ food: 0 }, { gold: 0 }) === null);
    });

    suite.test('真實換季：提示的糧草數字 = 頂欄糧草前後差額（內政已入帳的不重複計入）', async () => {
        const session = makeSession();
        // 先選農耕：糧草在季中就入帳
        const before0 = session.military.food;
        await session.chooseDomesticTask('farming');
        const grant = session.military.food - before0;
        assert.isTrue(grant > 0);
        const before = session.military.food;
        const payload = await session.advanceSeason();
        const delta = session.military.food - before;
        assert.equals(delta, foodNumberOf(payload.governanceReport?.split('（')[0]));
        assert.isTrue((payload.governanceReport ?? '').indexOf(`糧草 +${grant} 已於季中入帳`) >= 0);
    });

    suite.test('內政選擇提示：未被夾住顯示實際量，被上限夾住註明原產出', () => {
        const output = { resource: 'food' as const, amount: 120 };
        assert.equals('本季已選「農耕」：糧草 +120', domesticChosenNotice('農耕', output, 120));
        assert.equals('本季已選「農耕」：糧草 +45（已達糧草上限，原產出 +120）', domesticChosenNotice('農耕', output, 45));
    });

    suite.test('頂欄時間與季別顯示：照規格「第 N 年 M 季」', () => {
        const state = { currentYear: 1, currentSeason: 1 as const };
        assert.equals('第 1 年 1 季', seasonDisplayText(noLocale, state));
        assert.equals('第 1 年 1 季 · 夜', hallTimeLabelText(noLocale, state, true));
        assert.equals('第 2 年 3 季 · 晝', hallTimeLabelText(noLocale, { currentYear: 2, currentSeason: 3 }, false));
    });

    return suite;
}
