/**
 * LobbySaveLoadOrder.test.ts — 大廳讀存檔前必須先初始化服務（PROG-2-1081）
 *
 * 存檔後端由 ServiceLoader.initialize() 設進 GameSession；LobbyScene 原本沒呼叫，
 * 讀檔時「尚未設定存檔服務」失敗，玩家每次重開都被當成新玩家（開場與主將重來）。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

export function createLobbySaveLoadOrderSuite(): TestSuite {
    const suite = new TestSuite('LobbySaveLoadOrder');

    suite.test('LobbyScene.start 先 services().initialize() 再讀存檔', () => {
        const src = fs.readFileSync(path.join(__dirname, '../assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        const start = src.indexOf('async start()');
        const init = src.indexOf('services().initialize(', start);
        const load = src.indexOf('this._loadPlayerSave()', start);
        assert.isTrue(start >= 0 && load > start, '找得到 start 與讀檔呼叫');
        assert.isTrue(init > start && init < load, 'initialize 必須在 _loadPlayerSave 之前');
    });

    return suite;
}
