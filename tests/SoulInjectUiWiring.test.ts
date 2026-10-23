/**
 * SoulInjectUiWiring.test.ts — 寄宿戰魂按鈕的畫面接線（PROG-2-1058）headless 測試
 *
 * 鎖住：Overview 版面有 btnSoulInject 節點，它的 skinSlot 與文字 styleSlot 都在皮膚檔註冊；
 * LobbyScene 在人物頁打開時綁定這顆按鈕，並讀 GameSession 的碎片帳本。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function findNode(node: unknown, id: string): Record<string, unknown> | null {
    if (!node || typeof node !== 'object') return null;
    const record = node as Record<string, unknown>;
    if (record.id === id) return record;
    for (const child of (record.children as unknown[] | undefined) ?? []) {
        const found = findNode(child, id);
        if (found) return found;
    }
    return null;
}

export function createSoulInjectUiWiringSuite(): TestSuite {
    const suite = new TestSuite('SoulInjectUiWiring (寄宿戰魂按鈕接線 PROG-2-1058)');

    suite.test('Overview 版面有 btnSoulInject，skinSlot 與文字 styleSlot 都在皮膚檔註冊', () => {
        const layout = JSON.parse(read('assets/resources/ui-spec/fragments/layouts/character-ds3-overview-content.json'));
        const skin = JSON.parse(read('assets/resources/ui-spec/skins/character-ds3-main.skin.json'));
        const node = findNode(layout, 'btnSoulInject');
        assert.isTrue(node !== null, '版面沒有 btnSoulInject');
        assert.equals('button', node!.type);
        const label = findNode(node, 'soulInjectLabel');
        assert.isTrue(label !== null, '按鈕沒有文字節點');
        assert.isTrue(typeof skin.slots[node!.skinSlot as string] === 'object', 'skinSlot 沒有在皮膚檔註冊');
        assert.isTrue(typeof skin.slots[label!.styleSlot as string] === 'object', 'styleSlot 沒有在皮膚檔註冊');
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
