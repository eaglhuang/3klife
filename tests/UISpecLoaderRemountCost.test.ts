// @spec-source → Issue #2115；返回大廳掛載成本
import { assert, TestSuite } from './TestRunner';
import { readFileSync } from 'fs';
import { join } from 'path';
const cc = require('cc');
const { UISpecLoader, isJsonMissingFromResources } = require('../assets/scripts/ui/core/UISpecLoader');

function withResourceIndex<T>(known: string[] | null, run: () => Promise<T>): Promise<T> {
    const original = cc.resources.getInfoWithPath;
    if (known === null) delete cc.resources.getInfoWithPath;
    else cc.resources.getInfoWithPath = (path: string) => (known.includes(path) ? { path } : null);
    return run().finally(() => {
        if (original === undefined) delete cc.resources.getInfoWithPath;
        else cc.resources.getInfoWithPath = original;
    });
}

function fakeResourceManager(data: Record<string, unknown>) {
    const requested: string[] = [];
    return {
        requested,
        loadJson: async (path: string) => {
            requested.push(path);
            if (!(path in data)) throw new Error(`missing ${path}`);
            return data[path];
        },
    };
}

export function createUISpecLoaderRemountCostSuite(): TestSuite {
    const suite = new TestSuite('UISpecLoaderRemountCost');

    suite.test('資源清單沒有的 sidecar 直接回 null，不發載入也不印警告', async () => {
        const rm = fakeResourceManager({});
        const loader = new UISpecLoader(rm as any);
        const oldWarn = console.warn; let warned = 0; console.warn = () => { warned++; };
        try {
            const result = await withResourceIndex([], () => loader.loadScreenSidecar('lobby-hall-screen', 'interaction'));
            assert.equals(null, result);
        } finally { console.warn = oldWarn; }
        assert.equals(0, rm.requested.length);
        assert.equals(0, warned);
    });

    suite.test('清單有的 sidecar 照常載入', async () => {
        const path = 'ui-spec/screens/character-ds3-main.tab-routing';
        const rm = fakeResourceManager({ [path]: { routes: [] } });
        const loader = new UISpecLoader(rm as any);
        const result = await withResourceIndex([path], () => loader.loadScreenSidecar('character-ds3-main', 'tab-routing'));
        assert.equals(1, rm.requested.length);
        assert.equals(path, rm.requested[0]);
        assert.equals(0, (result as any).routes.length);
    });

    suite.test('拿不到資源清單時退回原本的嘗試載入', async () => {
        await withResourceIndex(null, async () => {
            assert.equals(false, isJsonMissingFromResources('ui-spec/screens/any.interaction'));
            const rm = fakeResourceManager({});
            const loader = new UISpecLoader(rm as any);
            const oldWarn = console.warn; console.warn = () => undefined;
            try { assert.equals(null, await loader.loadScreenSidecar('any', 'interaction')); } finally { console.warn = oldWarn; }
            assert.equals(1, rm.requested.length);
        });
    });

    suite.test('沒有 local-tokens 的畫面只讀全域 token', async () => {
        const base = { colors: { gold: '#D4AF37' }, typography: {} };
        const rm = fakeResourceManager({ 'ui-spec/ui-design-tokens': base });
        const loader = new UISpecLoader(rm as any);
        const tokens = await withResourceIndex([], () => loader.loadDesignTokensForScreen('lobby-hall-screen'));
        assert.equals(base, tokens);
        assert.equals('ui-spec/ui-design-tokens', rm.requested.join(','));
    });

    suite.test('正式版掛載畫面不再強制釋放 spec，只有編輯器／預覽才重讀', () => {
        const src = readFileSync(join(__dirname, '../assets/scripts/ui/components/UIScreenPreviewHost.ts'), 'utf8');
        assert.contains(src, "import { EDITOR, PREVIEW } from 'cc/env';");
        assert.contains(src, 'if (shouldReloadScreenSpecOnMount(EDITOR, PREVIEW)) this._specLoader.invalidateScreen(screenId);');
        assert.contains(src, 'return editor || preview;');
        assert.equals(1, src.split('invalidateScreen(').length - 1);
    });

    return suite;
}
