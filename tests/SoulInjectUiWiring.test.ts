/**
 * SoulInjectUiWiring.test.ts — 寄宿戰魂按鈕的畫面接線（PROG-2-1058）headless 測試
 *
 * 鎖住：LobbyScene 在左側動作欄建立 btnSoulInject；舊版面的 skinSlot 與文字 styleSlot 檢查已隨版面移除註冊；
 * LobbyScene 在人物頁打開時綁定這顆按鈕，並讀 GameSession 的碎片帳本。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');

export function createSoulInjectUiWiringSuite(): TestSuite {
    const suite = new TestSuite('SoulInjectUiWiring (寄宿戰魂按鈕接線 PROG-2-1058)');

    suite.test('v3 版面沒有這顆按鈕時，LobbyScene 把它建在立繪左側動作欄', () => {
        const lobby = read('assets/scripts/ui/scenes/LobbyScene.ts');
        assert.isTrue(lobby.includes("this._characterDs3ActionButton('btnSoulInject'"), '沒有建立 btnSoulInject');
    });

    suite.test('LobbyScene 打開人物頁時綁定 btnSoulInject，並讀 GameSession 的碎片帳本', () => {
        const lobby = read('assets/scripts/ui/scenes/LobbyScene.ts');
        assert.isTrue(lobby.includes("getButton('btnSoulInject')"), 'LobbyScene 沒有取得 btnSoulInject');
        assert.isTrue(lobby.includes('this._bindCharacterDs3SoulInject();'), '打開人物頁時沒有綁定寄宿戰魂');
        assert.isTrue(lobby.includes('services().session.soulFragmentLedger()'), 'LobbyScene 沒有讀碎片帳本');
    });

    suite.test('GameSession 提供碎片帳本的唯讀副本', () => {
        const session = read('assets/scripts/core/managers/GameSession.ts');
        assert.isTrue(session.includes('public soulFragmentLedger(): SoulFragmentLedger'), 'GameSession 沒有 soulFragmentLedger()');
    });

    return suite;
}
