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

type LayoutNode = Record<string, unknown> & { children?: LayoutNode[] };

function findNode(node: LayoutNode | undefined, match: (n: LayoutNode) => boolean): LayoutNode | null {
    if (!node || typeof node !== 'object') return null;
    if (match(node)) return node;
    for (const child of node.children ?? []) {
        const found = findNode(child, match);
        if (found) return found;
    }
    return null;
}

export function createGeneralJournalEntryWiringSuite(): TestSuite {
    const suite = new TestSuite('GeneralJournalEntryWiring (人物頁武將日誌入口 PROG-2-1723)');

    suite.test('Overview 動作列有 btnGeneralJournal，slot 已註冊，整列寬度不超過容器', () => {
        const layout = JSON.parse(read('assets/resources/ui-spec/fragments/layouts/character-ds3-overview-content.json'));
        const skin = JSON.parse(read('assets/resources/ui-spec/skins/character-ds3-main.skin.json'));
        const row = findNode(layout.root ?? layout, (n) => n.name === 'OverviewActionRow');
        assert.isTrue(row !== null, '版面沒有 OverviewActionRow');
        const button = findNode(row!, (n) => n.id === 'btnGeneralJournal');
        assert.isTrue(button !== null, '動作列沒有 btnGeneralJournal');
        const label = findNode(button!, (n) => n.id === 'generalJournalLabel');
        assert.isTrue(label !== null, '按鈕沒有文字節點');
        assert.equals('武將日誌', label!.text as string);
        assert.isTrue(typeof skin.slots[button!.skinSlot as string] === 'object', 'skinSlot 沒有在皮膚檔註冊');
        assert.isTrue(typeof skin.slots[label!.styleSlot as string] === 'object', 'styleSlot 沒有在皮膚檔註冊');
        const children = row!.children ?? [];
        const spacing = ((row!.layout as { spacingX?: number } | undefined)?.spacingX ?? 0) * Math.max(0, children.length - 1);
        const used = children.reduce((sum, child) => sum + (child.width as number), 0) + spacing;
        assert.isTrue(used <= (row!.width as number), `動作列寬度 ${used} 超過容器 ${String(row!.width)}`);
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
