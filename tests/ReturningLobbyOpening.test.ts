/**
 * ReturningLobbyOpening.test.ts — 老玩家重整後進大廳（PROG-2-9124）
 *
 * 鎖住兩件事：
 * 1. 開場信在宿命轉蛋之前讀完，轉蛋確定開新局時已讀旗標不可被洗回未讀（否則重整後信重彈）。
 * 2. 頂欄這類「自行分配」的凍結容器，尺寸被 Widget 改掉後要重新分配，判斷邏輯為純函式。
 *
 * Unity 對照：PlayerPrefs 旗標不隨「新遊戲」清掉；LayoutGroup 在 RectTransform 尺寸變動時重算。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { carryOpeningLetterOnNewGame, shouldShowOpeningLetter } from '../assets/scripts/core/systems/OpeningLetter';
import { needsRealign } from '../assets/scripts/ui/core/UIPreviewLayoutBuilder';

const generals = JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/data/generals.json'), 'utf8')) as GeneralConfig[];

function makeSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.99);
    return session;
}

export function createReturningLobbyOpeningSuite(): TestSuite {
    const suite = new TestSuite('ReturningLobbyOpening (老玩家重整 PROG-2-9124)');

    suite.test('已讀的信：轉蛋確定開新局、存檔、重整讀回後都不再彈', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = makeSession(adapter);
        await session.markOpeningLetterSeen();
        await session.startNewGameWithStarters(1, generals);
        assert.isFalse(shouldShowOpeningLetter(session.openingLetter));
        await session.save();

        const reloaded = makeSession(adapter);
        assert.isTrue(await reloaded.load());
        assert.isFalse(shouldShowOpeningLetter(reloaded.openingLetter));
    });

    suite.test('新帳號沒讀過信：開新局後仍要彈', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = makeSession(adapter);
        await session.startNewGameWithStarters(1, generals);
        assert.isTrue(shouldShowOpeningLetter(session.openingLetter));
        await session.save();

        const reloaded = makeSession(adapter);
        assert.isTrue(await reloaded.load());
        assert.isTrue(shouldShowOpeningLetter(reloaded.openingLetter));
    });

    suite.test('一般 startNewGame 仍重置信件狀態（只有開場轉蛋沿用）', async () => {
        const session = makeSession(new MemoryStorageAdapter());
        await session.markOpeningLetterSeen();
        session.startNewGame(2);
        assert.isTrue(shouldShowOpeningLetter(session.openingLetter));
    });

    suite.test('carryOpeningLetterOnNewGame：已讀保留、未讀維持未讀，且不修改輸入', () => {
        const seen = { seen: true };
        assert.isTrue(carryOpeningLetterOnNewGame(seen).seen);
        assert.isFalse(carryOpeningLetterOnNewGame({ seen: false }).seen);
        assert.isTrue(seen.seen);
    });

    suite.test('needsRealign：尺寸與上次分配相同略過，寬或高改變才重排', () => {
        assert.isTrue(needsRealign(undefined, 1864, 84));
        assert.isFalse(needsRealign({ width: 1864, height: 84 }, 1864, 84));
        assert.isFalse(needsRealign({ width: 1864, height: 84 }, 1864.2, 84));
        // 重整後頂欄：建置時寬 2160，Widget 之後改成 1864，必須重排
        assert.isTrue(needsRealign({ width: 2160, height: 84 }, 1864, 84));
        assert.isTrue(needsRealign({ width: 1864, height: 84 }, 1864, 120));
    });

    return suite;
}
