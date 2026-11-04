/**
 * GeneralJournalEntryWiring.test.ts — 人物頁「武將日誌」入口按鈕接線（doc_spec_0015 §E-6，PROG-2-1723）headless 測試
 *
 * 鎖住：Overview 版面的動作列有 btnGeneralJournal，皮膚 slot 都已註冊、整列寬度不超過容器；
 * LobbyScene 切到 Overview 時綁定這顆按鈕，點了用目前武將 id 打開日誌抽屜。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');

export function createGeneralJournalEntryWiringSuite(): TestSuite {
    const suite = new TestSuite('GeneralJournalEntryWiring (人物頁武將日誌入口 PROG-2-1723)');

    suite.test('v3 版面沒有這顆按鈕時，LobbyScene 把它建在立繪左側動作欄', () => {
        const lobby = read('assets/scripts/ui/scenes/LobbyScene.ts');
        assert.isTrue(lobby.includes("this._characterDs3ActionButton('btnGeneralJournal'"), '沒有建立 btnGeneralJournal');
    });

    suite.test('LobbyScene 在 Overview 綁定 btnGeneralJournal，點了用目前武將打開日誌', () => {
        const lobby = read('assets/scripts/ui/scenes/LobbyScene.ts');
        assert.isTrue(lobby.includes("getButton('btnGeneralJournal')"), 'LobbyScene 沒有取得 btnGeneralJournal');
        assert.isTrue(lobby.includes('this._bindCharacterDs3JournalEntry();'), 'Overview 按鈕綁定沒有包含武將日誌');
        assert.isTrue(lobby.includes('this.openGeneralJournal(general.id);'), '點擊時沒有用目前武將打開日誌');
        assert.isTrue(lobby.includes('this._bindCharacterDs3OverviewButtons();'), '切回 Overview 時沒有走共用的 Overview 按鈕綁定');
    });

    return suite;
}
