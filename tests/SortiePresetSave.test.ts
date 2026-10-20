/**
 * SortiePresetSave.test.ts — 編制預設存檔與畫面接線（PROG-2-0784）
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { normalizeSortiePresets } from '../assets/scripts/core/services/PlayerSaveService';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');
const ROOT = path.resolve(__dirname, '..');

function collectIds(node: unknown, out: Set<string>): Set<string> {
    if (Array.isArray(node)) { node.forEach((c) => collectIds(c, out)); return out; }
    if (node && typeof node === 'object') {
        const id = (node as { id?: unknown }).id;
        if (typeof id === 'string') out.add(id);
        for (const v of Object.values(node as Record<string, unknown>)) collectIds(v, out);
    }
    return out;
}

export function createSortiePresetSaveSuite(): TestSuite {
    const suite = new TestSuite('SortiePresetSave (編制預設存檔與畫面 PROG-2-0784)');

    suite.test('舊存檔沒有 sortiePresets 欄位：讀回為空', () => {
        assert.equals(0, Object.keys(normalizeSortiePresets(undefined)).length);
        assert.equals(0, Object.keys(normalizeSortiePresets('bad')).length);
    });

    suite.test('讀回時丟棄格式錯誤的條目，保留正確的', () => {
        const out = normalizeSortiePresets({
            'cao-cao': { strategistUid: 'xun-yu', deputyUid: null },
            'bad': 'x',
            'half': { strategistUid: 3, deputyUid: 'cao-ren' },
        });
        assert.equals('xun-yu', out['cao-cao'].strategistUid);
        assert.equals(undefined, out.bad);
        assert.equals(null, out.half.strategistUid);
        assert.equals('cao-ren', out.half.deputyUid);
    });

    suite.test('存檔快照會帶上編制預設，且與 session 內容一致', () => {
        const session = new GameSession(3);
        session.setSortiePresets({ 'cao-cao': { strategistUid: 'xun-yu', deputyUid: 'cao-ren' } });
        const snapshot = session.createSnapshot();
        assert.equals('xun-yu', snapshot.sortiePresets?.['cao-cao'].strategistUid);
        assert.equals('cao-ren', snapshot.sortiePresets?.['cao-cao'].deputyUid);
    });

    suite.test('版面：預設的按鈕與標籤節點存在於 sortie-setup-main', () => {
        const layout = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/layouts/sortie-setup-main.json'), 'utf8'));
        const ids = collectIds(layout, new Set<string>());
        for (const id of ['btnSavePreset', 'btnApplyPreset', 'savePresetLabel', 'applyPresetLabel']) {
            assert.isTrue(ids.has(id), `缺少節點 ${id}`);
        }
    });

    return suite;
}
