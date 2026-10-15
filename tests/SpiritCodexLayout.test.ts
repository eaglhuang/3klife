/**
 * 英靈圖鑑版面與語系接線（PROG-2-0803）
 *
 * 鎖住：文字 key 都對得到 spirit-codex-main.json 節點；版面用到的 skinSlot 都在 skin 裡；
 * screen 指向正確的 layout 與 skin；英靈圖鑑入口按鈕在季度 HUD 版面裡；四語系有同一組 key。
 */
import { assert, TestSuite } from './TestRunner';
import { buildSpiritCodexTexts, SPIRIT_CODEX_TEXT_FALLBACK_ZH_TW } from '../assets/scripts/ui/core/SpiritCodexController';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');
const readJson = <T>(rel: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;

function collect(node: { id?: string; skinSlot?: string; styleSlot?: string; children?: unknown[] }, ids: Set<string>, slots: Set<string>): void {
    if (node.id) ids.add(node.id);
    if (node.skinSlot) slots.add(node.skinSlot);
    if (node.styleSlot) slots.add(node.styleSlot);
    for (const c of node.children ?? []) collect(c as typeof node, ids, slots);
}

export function createSpiritCodexLayoutSuite(): TestSuite {
    const suite = new TestSuite('SpiritCodexLayout (英靈圖鑑版面與語系接線 PROG-2-0803)');

    suite.test('文字 key 全部對得到 spirit-codex-main.json 節點', () => {
        const layout = readJson<{ root: unknown }>('assets/resources/ui-spec/layouts/spirit-codex-main.json');
        const ids = new Set<string>();
        collect(layout.root as never, ids, new Set<string>());
        const missing = Object.keys(buildSpiritCodexTexts([])).filter((k) => !ids.has(k));
        assert.equals('', missing.join(','));
    });

    suite.test('版面用到的 skinSlot / styleSlot 都在 skin 裡，screen 指向正確的 layout 與 skin', () => {
        const layout = readJson<{ root: unknown }>('assets/resources/ui-spec/layouts/spirit-codex-main.json');
        const slots = new Set<string>();
        collect(layout.root as never, new Set<string>(), slots);
        const skin = readJson<{ slots: Record<string, unknown> }>('assets/resources/ui-spec/skins/spirit-codex-screen.skin.json');
        assert.equals('', Array.from(slots).filter((s) => !(s in skin.slots)).join(','));
        const screen = readJson<{ layout: string; skin: string; uiId: string }>('assets/resources/ui-spec/screens/spirit-codex-screen.json');
        assert.equals('spirit-codex-main', screen.layout);
        assert.equals('spirit-codex-screen.skin', screen.skin);
        assert.equals('SpiritCodex', screen.uiId);
    });

    suite.test('季度 HUD 版面有英靈圖鑑入口按鈕 btnOpenSpiritCodex', () => {
        const hud = readJson<{ root: unknown }>('assets/resources/ui-spec/layouts/lobby-season-hud-main.json');
        const ids = new Set<string>();
        collect(hud.root as never, ids, new Set<string>());
        assert.isTrue(ids.has('btnOpenSpiritCodex'));
    });

    suite.test('四個語系都有 ui.spirit_codex.* 同一組 key', () => {
        const keys = Object.keys(SPIRIT_CODEX_TEXT_FALLBACK_ZH_TW);
        for (const loc of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = readJson<Record<string, string>>(`assets/resources/i18n/${loc}.json`);
            assert.equals('', keys.filter((k) => !(k in table)).join(','));
        }
    });

    return suite;
}
