/**
 * architectureGovernance.test.ts — UCUF M9 架構治理單元測試
 *
 * 涵蓋：
 *  - ChildPanelBase._shallowDiff  淺比對合約（changedKeys 偵測 / 跳過unchanged / 全量）
 *  - ChildPanelBase.onDiffUpdate  向後相容合約（fallback to onDataUpdate）
 *  - ChildPanelBase._lastData     資料追蹤欄位合約
 *  - scope ID 格式驗證（`screen:{screenId}` 格式）
 *  - specVersion 介面合約（UIScreenSpec / UILayoutSpec 含可選欄位）
 *  - CURRENT_SPEC_VERSION 常數型別合約
 *  - EventSystem emit/on 觸發合約（event bus 代理）
 *
 * 不依賴 Cocos runtime；所有測試可在純 Node.js 環境（ts-node）執行。
 *
 * Unity 對照：unit test for ComponentState diff pipeline + event contract
 */

import { TestSuite, assert } from '../TestRunner';
import { StubEventSystem, StubPanel } from './fixtures/architectureEngineStubs';
import { registerGeneralDetailChromePresenterTests } from './generalDetailChromePresenter.test';
import * as fs from 'fs';
import * as path from 'path';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';
import { CURRENT_SPEC_VERSION } from '../../assets/scripts/ui/core/UISpecTypes';
import type { UIScreenSpec, UILayoutSpec } from '../../assets/scripts/ui/core/UISpecTypes';

const PROJECT_ROOT = path.resolve(__dirname, '../..');

function readProjectFile(...segments: string[]): string {
    return fs.readFileSync(path.join(PROJECT_ROOT, ...segments), 'utf8');
}

/** Run the actual Composite lifecycle with deferred engine I/O, without cc. */
function createSelectedPersonFixture(block: 'mount' | 'tab' | 'portrait') {
    const applied: string[] = [];
    const visibleNode = { isValid: true, activeInHierarchy: true, parent: null, getComponent: () => null };
    const labels = new Map<string, { string: string; node: typeof visibleNode }>();
    const portrait = { node: visibleNode, spriteFrame: null as null | { personId: string } };
    let entered = false;
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let blockedOnce = false;
    const waitOnce = async (at: 'mount' | 'tab' | 'portrait') => {
        if (at !== block || blockedOnce) return;
        blockedOnce = true;
        entered = true;
        await pending;
    };
    class EnginePanel {
        private opacity = { opacity: 255 };
        node = {
            active: false, isValid: true, parent: null, children: [],
            getComponent: () => this.opacity, addComponent: () => this.opacity,
        };
        async mount() { await waitOnce('mount'); }
        async switchTab() { await waitOnce('tab'); }
        getSlotNode() { return null; }
        applyContentState(state: { config?: { id: string } }) {
            if (state.config) applied.push(state.config.id);
        }
        unmount() { /* fixture engine has no resources */ }
    }
    const source = readProjectFile('assets', 'scripts', 'ui', 'components', 'GeneralDetailComposite.ts');
    const output = transpileModule(source, {
        compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2018, experimentalDecorators: true },
    }).outputText;
    const testModule = { exports: {} as Record<string, new () => {
        node: EnginePanel['node'];
        show(config: { id: string; name: string }, options: { screenId: string }): Promise<void>;
        applyContentState(state: { config: { id: string; name: string } }): void;
        _operationQueue: Promise<void>;
        selectedPersonViewState(): { name: string; visible: boolean; portraitResource: string | null };
        hide(): void;
    }> };
    const load = (id: string): unknown => {
        if (id === 'cc') return { _decorator: { ccclass: () => (constructor: unknown) => constructor } };
        if (id === '../core/CompositePanel') return { CompositePanel: EnginePanel };
        if (id.endsWith('/GeneralDetailChromePresenter')) {
            const chromeSource = readProjectFile('assets', 'scripts', 'ui', 'components', 'character-ds3', 'GeneralDetailChromePresenter.ts');
            const chromeOutput = transpileModule(chromeSource, {
                compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2018 },
            }).outputText;
            const chromeModule = { exports: {} };
            new Function('require', 'exports', 'module', chromeOutput)(load, chromeModule.exports, chromeModule);
            return chromeModule.exports;
        }
        if (id === './GeneralDetailOverviewMapper') return {
            buildGeneralDetailOverviewContentState: (config: { id: string; name: string }) => ({
                headerName: config.name, headerTitle: config.name, rarityLabel: 'Rare', rarityTier: 'rare', portraitResource: config.id,
            }),
        };
        if (id.endsWith('/ServiceLoader')) return { services: () => ({ resource: {
            loadSpriteFrame: async (personId: string) => { await waitOnce('portrait'); return { personId }; },
        } }) };
        if (id.endsWith('/UCUFLogger')) return {
            UCUFLogger: { info: () => undefined, error: () => undefined, warn: () => undefined }, LogCategory: { LIFECYCLE: 'lifecycle' },
        };
        return {};
    };
    new Function('require', 'exports', 'module', output)(load, testModule.exports, testModule);
    const panel = new testModule.exports.GeneralDetailComposite();
    Object.assign(panel, {
        _gdBinder: {
            getLabel: (id: string) => {
                if (!labels.has(id)) labels.set(id, { string: '', node: visibleNode });
                return labels.get(id);
            },
            getSprite: (id: string) => id === 'CharacterDs3Main_img_1_ImageContent' ? portrait : null,
            getButton: () => null,
        },
        _bindDs3TabChild: () => undefined,
    });
    (panel as any)._ds3TabChildren.set('Overview', {
        binder: { getLabel: (id: string) => (panel as any)._gdBinder.getLabel(id) },
    });
    return { panel, applied, portrait, labels, release, entered: () => entered };
}

async function waitForSelectionIo(fixture: ReturnType<typeof createSelectedPersonFixture>): Promise<void> {
    for (let tick = 0; tick < 12 && !fixture.entered(); tick++) await Promise.resolve();
    assert.isTrue(fixture.entered(), 'fixture must reach the deferred engine operation');
}

/** Execute the real fragment presenter against engine ports; no copied mapping logic. */
function loadDs3Presenter(className: string): any {
    const source = readProjectFile('assets', 'scripts', 'ui', 'components', 'character-ds3', `${className}.ts`);
    const output = transpileModule(source, {
        compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2018 },
    }).outputText;
    const testModule = { exports: {} as Record<string, new () => unknown> };
    class Color { clone() { return this; } }
    const load = (id: string): unknown => {
        if (id === 'cc') return { Color };
        if (id.endsWith('/ChildPanelBase')) return { ChildPanelBase: class {} };
        if (id.endsWith('/GeneralDetailFormatters')) return {
            resolveStat: (config: Record<string, unknown>, key: string) => config[key],
        };
        if (id.endsWith('/UCUFLogger')) return { UCUFLogger: { info: () => undefined }, LogCategory: {} };
        return {};
    };
    new Function('require', 'exports', 'module', output)(load, testModule.exports, testModule);
    return new testModule.exports[className]();
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

export function createArchitectureGovernanceSuite(): TestSuite {
    const suite = new TestSuite('UCUF-M9-ArchitectureGovernance');

    suite.test('DS3 selection: delayed tab result cannot apply the previous person', async () => {
        const fixture = createSelectedPersonFixture('tab');
        const first = fixture.panel.show({ id: 'person-a', name: 'A' }, { screenId: 'character-ds3-main' });
        await waitForSelectionIo(fixture);
        const latest = fixture.panel.show({ id: 'person-b', name: 'B' }, { screenId: 'character-ds3-main' });
        fixture.release();
        await Promise.all([first, latest]);
        assert.isTrue(fixture.applied.join(',') === 'person-b', 'only the latest selected person may reach content binding');
        assert.isTrue(fixture.panel.node.active, 'latest selection must remain open');
    });

    suite.test('DS3 selection: closing during mount invalidates pending content and permits reopening', async () => {
        const fixture = createSelectedPersonFixture('mount');
        const pending = fixture.panel.show({ id: 'person-a', name: 'A' }, { screenId: 'character-ds3-main' });
        await waitForSelectionIo(fixture);
        fixture.panel.hide();
        fixture.release();
        await pending;
        assert.isTrue(fixture.applied.length === 0, 'a closed selection must never bind delayed content');
        assert.isTrue(!fixture.panel.node.active, 'delayed mount must not reopen a closed view');
        await fixture.panel.show({ id: 'person-b', name: 'B' }, { screenId: 'character-ds3-main' });
        assert.isTrue(fixture.applied.join(',') === 'person-b', 'reopening must bind the new person');
    });

    suite.test('DS3 content update: delayed A portrait cannot overwrite config B', async () => {
        const fixture = createSelectedPersonFixture('portrait');
        const first = fixture.panel.show({ id: 'person-a', name: 'A' }, { screenId: 'character-ds3-main' });
        await waitForSelectionIo(fixture);
        fixture.panel.applyContentState({ config: { id: 'person-b', name: 'B' } });
        const latest = fixture.panel._operationQueue;
        fixture.release();
        await Promise.all([first, latest]);
        assert.isTrue(fixture.applied.join(',') === 'person-b', 'config updates must invalidate the previous selection');
        assert.isTrue(fixture.portrait.spriteFrame?.personId === 'person-b', 'portrait must match the updated config');
        assert.isTrue(fixture.labels.get('CharacterDs3Main_div_3')?.string === 'B', 'identity chrome must match the updated config');
    });

    suite.test('DS3 content update: an open A view refreshes both chrome and content for B', async () => {
        const fixture = createSelectedPersonFixture('tab');
        const first = fixture.panel.show({ id: 'person-a', name: 'A' }, { screenId: 'character-ds3-main' });
        await waitForSelectionIo(fixture);
        fixture.release();
        await first;
        fixture.panel.applyContentState({ config: { id: 'person-b', name: 'B' } });
        await fixture.panel._operationQueue;
        assert.isTrue(fixture.applied.join(',') === 'person-a,person-b', 'open content must receive the new selection');
        assert.isTrue(fixture.portrait.spriteFrame?.personId === 'person-b', 'open portrait must receive the new selection');
    });

    suite.test('DS3 rendered observation rejects a replaced portrait and hidden name', async () => {
        const fixture = createSelectedPersonFixture('tab');
        const opening = fixture.panel.show({ id: 'person-a', name: 'A' }, { screenId: 'character-ds3-main' });
        await waitForSelectionIo(fixture);
        fixture.release();
        await opening;
        assert.isTrue(fixture.panel.selectedPersonViewState().portraitResource === 'person-a', 'observation must identify the assigned frame');
        fixture.portrait.spriteFrame = { personId: 'stale-person' };
        assert.isTrue(fixture.panel.selectedPersonViewState().portraitResource === null, 'metadata must not conceal a replaced frame');
        fixture.labels.get('CharacterDs3TabOverview_span_1')!.node.activeInHierarchy = false;
        assert.isTrue(!fixture.panel.selectedPersonViewState().visible, 'hidden labels must not satisfy visual readiness');
    });

    suite.test('DS3 Overview binds actual fragment labels and replaces A data with B', () => {
        const presenter = loadDs3Presenter('CharacterDs3OverviewChild');
        const labels = new Map<string, { string: string }>();
        const layout = JSON.parse(readProjectFile('assets', 'resources', 'ui-spec', 'fragments', 'layouts', 'character-ds3-overview-content.json'));
        const visit = (node: any): void => {
            if (node.type === 'label') labels.set(node.name, { string: 'demo' });
            (node.children || []).forEach(visit);
        };
        visit(layout);
        presenter.binder = { getLabel: (name: string) => labels.get(name), getNode: () => null };
        const state = (name: string, biography: string) => ({
            headerName: name, headerTitle: '—', headerMeta: '—', rarityLabel: 'Rare', rarityTier: 'rare',
            biographyBody: biography, crestTitle: '—', bloodlineName: '—', awakeningProgress: 0,
            crestHint: '—', personalityValue: '—', footerTitle: '—', roleValue: '', traitValue: '',
            dualLayerStats: {},
        });
        presenter.onDataUpdate(state('A', 'A biography'));
        presenter.onDataUpdate(state('B', '—'));
        assert.isTrue(labels.get('CharacterDs3TabOverview_span_1')?.string === 'B', 'real name node must receive B');
        assert.isTrue(labels.get('CharacterDs3TabOverview_div_45')?.string === '—', 'missing B biography must clear A');
        assert.isTrue(labels.get('CharacterDs3TabOverview_span_26')?.string === '—', 'empty roles must clear demo values');
    });

    suite.test('DS3 Stats clears missing prowess and uses actual current talent', () => {
        const presenter = loadDs3Presenter('CharacterDs3StatsChild');
        const rows = Array.from({ length: 6 }, () => ({ current: { string: '' }, prowess: { string: '' } }));
        presenter._statRows = rows;
        presenter._setBarRatio = () => undefined;
        presenter._syncStatsRows({ dualLayerStats: { str: { base: 80, current: 91, prowess: 1234 } } });
        assert.isTrue(rows[0].current.string === '91', 'selected current talent must be used');
        assert.isTrue(rows[0].prowess.string === (1234).toLocaleString(), 'explicit prowess must be used');
        presenter._syncStatsRows({ str: 20 });
        assert.isTrue(rows[0].current.string === '20' && rows[0].prowess.string === '—', 'B must not inherit A prowess or synthesize it');
        assert.isTrue(rows[1].current.string === '—', 'missing talent must not become zero');
    });

    suite.test('DS3 pending pages leave only an empty state visible', () => {
        const fixture = createSelectedPersonFixture('mount');
        const node = (parent: any = null): any => ({
            active: true, parent, children: [], getComponent: () => null,
        });
        const slot = node();
        const root = node(slot);
        const textNode = node(root);
        const demoNode = node(root);
        const demoChild = node(demoNode);
        slot.children = [root];
        root.children = [textNode, demoNode];
        demoNode.children = [demoChild];
        const label = { node: textNode, string: 'previous person demo' };
        root.getComponentsInChildren = () => [label];
        Object.assign(fixture.panel, { getSlotNode: () => slot });
        for (const tab of ['Tactics', 'Bloodline', 'Equip', 'Aptitude']) {
            demoNode.active = demoChild.active = true;
            label.string = 'previous person demo';
            (fixture.panel as any)._clearPendingDs3Tab(tab);
            assert.isTrue(label.string === '—' && textNode.active, `${tab} must expose the empty state`);
            assert.isTrue(!demoNode.active && !demoChild.active, `${tab} must hide nested demo content`);
        }
    });

    // ── _shallowDiff 合約 ──────────────────────────────────────────────────

    suite.test('shallowDiff: 偵測到 changedKeys 正確', () => {
        const panel = new StubPanel();
        const prev = { hp: 100, atk: 50 };
        const next = { hp: 80, atk: 50 };
        const keys = panel._shallowDiff(prev, next);
        assert.isTrue(keys.length === 1, `應有 1 個 changedKey，got ${keys.length}`);
        assert.isTrue(keys[0] === 'hp', `changedKey 應為 'hp'，got '${keys[0]}'`);
    });

    suite.test('shallowDiff: 無變化時回傳空陣列', () => {
        const panel = new StubPanel();
        const obj = { hp: 100, atk: 50 };
        const keys = panel._shallowDiff(obj, { ...obj });
        assert.isTrue(keys.length === 0, `應無 changedKeys，got ${keys.length}`);
    });

    suite.test('shallowDiff: 新增 key 時偵測為 changed', () => {
        const panel = new StubPanel();
        const prev = { hp: 100 };
        const next = { hp: 100, mp: 200 };
        const keys = panel._shallowDiff(prev, next);
        assert.isTrue(keys.includes('mp'), `新增 key 'mp' 應出現在 changedKeys`);
    });

    suite.test('shallowDiff: prev 為 null 時回傳空陣列（全量更新 fallback）', () => {
        const panel = new StubPanel();
        const keys = panel._shallowDiff(null, { hp: 100 });
        assert.isTrue(keys.length === 0, `prev=null 應回傳 []`);
    });

    suite.test('shallowDiff: prev 為陣列時回傳空陣列', () => {
        const panel = new StubPanel();
        const keys = panel._shallowDiff([1, 2], { hp: 100 });
        assert.isTrue(keys.length === 0, `prev=Array 應回傳 []`);
    });

    // ── diff-update 分派合約 ───────────────────────────────────────────────

    suite.test('applyData: 首次呼叫（_lastData=null）一定執行 onDiffUpdate', () => {
        const panel = new StubPanel();
        panel.applyData({ hp: 100 });
        assert.isTrue(panel.onDiffUpdateCalled === 1, `首次應呼叫 onDiffUpdate once`);
        assert.isTrue(panel.onDataUpdateCalled === 1, `onDiffUpdate fallback 應呼叫 onDataUpdate`);
    });

    suite.test('applyData: 資料未變化時跳過更新', () => {
        const panel = new StubPanel();
        panel.applyData({ hp: 100 });
        panel.applyData({ hp: 100 }); // 同資料再次送入
        assert.isTrue(panel.onDiffUpdateCalled === 1, `相同資料不應重複呼叫 onDiffUpdate`);
    });

    suite.test('applyData: 資料有變化時繼續更新', () => {
        const panel = new StubPanel();
        panel.applyData({ hp: 100 });
        panel.applyData({ hp: 80 }); // hp 改變
        assert.isTrue(panel.onDiffUpdateCalled === 2, `資料改變應呼叫 onDiffUpdate 兩次`);
        assert.isTrue(panel.lastChangedKeys.includes('hp'), `changedKeys 應包含 'hp'`);
    });

    suite.test('applyData: _lastData 隨呼叫更新', () => {
        const panel = new StubPanel();
        const data1 = { hp: 100 };
        panel.applyData(data1);
        assert.isTrue(panel._lastData === data1, `_lastData 應指向最新傳入的資料`);
        const data2 = { hp: 80 };
        panel.applyData(data2);
        assert.isTrue(panel._lastData === data2, `_lastData 應更新為 data2`);
    });

    // ── scope ID 格式合約 ─────────────────────────────────────────────────

    suite.test('scope ID 格式應為 screen:{screenId}', () => {
        const screenId = 'general-detail-v3';
        const scopeId = `screen:${screenId}`;
        assert.isTrue(scopeId === 'screen:general-detail-v3', `scopeId 格式不符，got "${scopeId}"`);
        assert.isTrue(scopeId.startsWith('screen:'), `scopeId 應以 'screen:' 開頭`);
    });

    // ── GeneralDetail canonical runtime 治理合約 ───────────────────────────

    suite.test('GeneralDetail canonical runtime: LobbyScene 只能直接依賴 GeneralDetailComposite', () => {
        const content = readProjectFile('assets', 'scripts', 'ui', 'scenes', 'LobbyScene.ts');
        assert.contains(content, "import { GeneralDetailComposite } from '../components/GeneralDetailComposite';");
        assert.notContains(content, "GeneralDetailPanel';");
        assert.contains(content, "private _detailPanel: GeneralDetailComposite | null = null;");
        assert.contains(content, "getChildByName('GeneralDetailComposite')");
        assert.notContains(content, "getChildByName('GeneralDetailPanel')");
    });

    suite.test('GeneralDetail canonical runtime: LobbyScene.scene 詳情宿主與 click event 都必須是 GeneralDetailComposite', () => {
        const content = readProjectFile('assets', 'scenes', 'LobbyScene.scene');
        assert.contains(content, '"_name": "GeneralDetailComposite"');
        assert.contains(content, '"component": "GeneralDetailComposite"');
        assert.notContains(content, '"_name": "GeneralDetailPanel"');
        assert.notContains(content, '"component": "GeneralDetailPanel"');
    });

    suite.test('GeneralDetail legacy host: GeneralDetailPanel.ts 與 .meta 都必須已從 live workspace 移除', () => {
        const panelPath = path.join(PROJECT_ROOT, 'assets', 'scripts', 'ui', 'components', 'GeneralDetailPanel.ts');
        const panelMetaPath = path.join(PROJECT_ROOT, 'assets', 'scripts', 'ui', 'components', 'GeneralDetailPanel.ts.meta');
        assert.isTrue(!fs.existsSync(panelPath), 'GeneralDetailPanel.ts 應已刪除');
        assert.isTrue(!fs.existsSync(panelMetaPath), 'GeneralDetailPanel.ts.meta 應已刪除');
    });

    // ── Migration Phase Tag ──────────────────────────────────────────────
    // unified-only 收斂完成：OverviewShell 相容層已移除，全走 OverviewSlot + fragment 路徑。
    const MIGRATION_PHASE = 'unified-only' as 'shell-compat' | 'unified-only';

    suite.test('GeneralDetail shell lifecycle: OverviewShell 存在性隨 migration phase 同步', () => {
        const shellPath = path.join(PROJECT_ROOT, 'assets', 'scripts', 'ui', 'components', 'GeneralDetailOverviewShell.ts');
        const shellResourcePath = path.join(PROJECT_ROOT, 'assets', 'scripts', 'ui', 'components', 'general-detail', 'GeneralDetailOverviewShellResources.ts');
        if (MIGRATION_PHASE === 'shell-compat') {
            assert.isTrue(fs.existsSync(shellPath), 'shell-compat 階段 GeneralDetailOverviewShell.ts 必須存在');
        } else {
            assert.isTrue(!fs.existsSync(shellPath), 'unified-only 階段 GeneralDetailOverviewShell.ts 應已刪除');
        }
        // ShellResources 在任何階段都不應存在（已合併進 Shell 本體）
        assert.isTrue(!fs.existsSync(shellResourcePath), 'GeneralDetailOverviewShellResources.ts 應已刪除');
    });

    // ── B 系列：spec 結構合約（JSON property 檢查，非字串比對）──────────

    suite.test('GeneralDetail spec wiring: screen tabRouting.Overview 有合法 slotId', () => {
        const screen = JSON.parse(readProjectFile('assets', 'resources', 'ui-spec', 'screens', 'general-detail-unified-screen.json'));
        assert.isTrue(screen.tabRouting != null, 'screen 應有 tabRouting');
        assert.isTrue(screen.tabRouting.Overview != null, 'tabRouting 應有 Overview entry');
        const overview = screen.tabRouting.Overview;
        assert.isTrue(typeof overview.slotId === 'string' && overview.slotId.length > 0, 'Overview.slotId 應為非空字串');
        assert.isTrue(typeof overview.fragment === 'string' && overview.fragment.length > 0, 'Overview.fragment 應為非空字串');
    });

    suite.test('GeneralDetail spec wiring: layout 中 tabRouting 引用的 slot name 存在於 node tree', () => {
        const screen = JSON.parse(readProjectFile('assets', 'resources', 'ui-spec', 'screens', 'general-detail-unified-screen.json'));
        const layout = JSON.parse(readProjectFile('assets', 'resources', 'ui-spec', 'layouts', 'general-detail-unified-main.json'));
        // 收集 layout tree 中所有 node name（遞迴）
        const nodeNames = new Set<string>();
        function walk(node: any) {
            if (node && node.name) nodeNames.add(node.name);
            if (Array.isArray(node?.children)) node.children.forEach(walk);
        }
        walk(layout.root);
        // 驗證 tabRouting 中每個 slotId 都能在 layout tree 中找到
        for (const [tab, route] of Object.entries(screen.tabRouting as Record<string, any>)) {
            assert.isTrue(nodeNames.has(route.slotId), `tabRouting['${tab}'].slotId '${route.slotId}' 在 layout tree 中找不到`);
        }
    });

    suite.test('GeneralDetail spec wiring: gd-tab-overview fragment 有正確的 root 與子結構', () => {
        const fragmentPath = path.join(PROJECT_ROOT, 'assets', 'resources', 'ui-spec', 'fragments', 'layouts', 'gd-tab-overview.json');
        assert.isTrue(fs.existsSync(fragmentPath), 'gd-tab-overview.json 應存在');
        const raw = fs.readFileSync(fragmentPath, 'utf8');
        const frag = JSON.parse(raw);
        assert.isTrue(frag.name === 'OverviewTabContent', 'fragment root 應為 OverviewTabContent');
        assert.isTrue(Array.isArray(frag.children) && frag.children.length >= 2, 'fragment 應有至少 2 個 children');
        // 檢查 $ref 或直接 name 包含預期的子結構
        const childRefs = frag.children.map((c: any) => c['$ref'] || c.name || '').join(' ');
        assert.isTrue(/header-row|HeaderRow/i.test(childRefs), 'fragment 應引用 header-row 相關 $ref 或 node');
        assert.isTrue(/summary-modules|OverviewSummaryModules/i.test(childRefs), 'fragment 應引用 summary-modules 相關 $ref 或 node');
        assert.isTrue(/BloodlineOverviewModules/.test(raw), 'fragment 應含 BloodlineOverviewModules');
    });

    // ── C 系列：runtime 結構合約（regex 驗 method 存在性，非精確字串）───

    suite.test('GeneralDetail overview regression guard: _switchToTab 有 Overview 專門分支', () => {
        const content = readProjectFile('assets', 'scripts', 'ui', 'components', 'GeneralDetailComposite.ts');
        assert.isTrue(/_switchToTab\s*\(/.test(content), 'GeneralDetailComposite 應有 _switchToTab method');
        // Overview 分支必須有明確的 overview mode 設定 + shell 或 slot 顯示
        assert.isTrue(/Overview/.test(content), '_switchToTab 應處理 Overview tab');
        assert.isTrue(/_setOverviewMode/.test(content), '應有 _setOverviewMode 方法');
        if (MIGRATION_PHASE === 'shell-compat') {
            assert.isTrue(/_showOverviewShell/.test(content), 'shell-compat 階段應有 _showOverviewShell');
            assert.isTrue(/_ensureOverviewShell/.test(content), 'shell-compat 階段應有 _ensureOverviewShell');
        }
    });

    suite.test('GeneralDetail overview regression guard: _setOverviewMode 管理 OverviewSlot active/opacity', () => {
        const content = readProjectFile('assets', 'scripts', 'ui', 'components', 'GeneralDetailComposite.ts');
        // 不比對完整程式碼行 — 只驗概念：method 內操作了 overviewSlot.active 和 UIOpacity
        assert.isTrue(/overviewSlot\.active\s*=/.test(content), '_setOverviewMode 應設定 overviewSlot.active');
        assert.isTrue(/UIOpacity/.test(content), '_setOverviewMode 應操作 UIOpacity');
    });

    suite.test('GeneralDetail overview regression guard: LoadingScene smoke 方法存在且驗證 content host', () => {
        const content = readProjectFile('assets', 'scripts', 'ui', 'scenes', 'LoadingScene.ts');
        assert.isTrue(/_assertGeneralDetailOverviewVisualReady/.test(content), 'LoadingScene 應有 _assertGeneralDetailOverviewVisualReady');
        assert.isTrue(/_assertGeneralDetailOverviewPortraitReady/.test(content), 'LoadingScene 應有 portrait ready 檢查');
        assert.isTrue(/OverviewSlot/.test(content), 'smoke guard 應檢查 OverviewSlot');
        if (MIGRATION_PHASE === 'shell-compat') {
            assert.isTrue(/GeneralDetailOverviewShellHost/.test(content), 'shell-compat 階段 smoke guard 應檢查 ShellHost');
        }
        // 無論哪個 phase，都必須驗 NameLabel + CoreStatsCard + BloodlineSummaryCard
        assert.isTrue(/NameLabel/.test(content), 'smoke guard 應驗證 NameLabel');
        assert.isTrue(/CoreStatsCard/.test(content), 'smoke guard 應驗證 CoreStatsCard');
        assert.isTrue(/BloodlineSummaryCard/.test(content), 'smoke guard 應驗證 BloodlineSummaryCard');
    });

    // ── specVersion 介面合約 ──────────────────────────────────────────────

    suite.test('CURRENT_SPEC_VERSION 應為正整數', () => {
        assert.isTrue(typeof CURRENT_SPEC_VERSION === 'number', `CURRENT_SPEC_VERSION 應為 number`);
        assert.isTrue(CURRENT_SPEC_VERSION >= 1, `CURRENT_SPEC_VERSION 應 >= 1，got ${CURRENT_SPEC_VERSION}`);
        assert.isTrue(Number.isInteger(CURRENT_SPEC_VERSION), `CURRENT_SPEC_VERSION 應為整數`);
    });

    suite.test('UIScreenSpec 可選 specVersion 欄位型別合約', () => {
        // 型別層面驗證（編譯時保證）：建構一個包含 specVersion 的 spec 物件
        const screen: UIScreenSpec = {
            id: 'test-screen',
            version: 1,
            uiId: 'TestUI',
            layer: 'UI_2D',
            bundle: 'resources',
            layout: 'test-layout',
            skin: 'test-skin',
            specVersion: 1, // M9 新增欄位
        };
        assert.isTrue(screen.specVersion === 1, `screen.specVersion 應為 1`);
    });

    suite.test('UILayoutSpec 可選 specVersion 欄位型別合約', () => {
        const layout: UILayoutSpec = {
            id: 'test-layout',
            version: 1,
            specVersion: 1, // M9 新增欄位
            canvas: {
                fitWidth: true,
                fitHeight: true,
                safeArea: true,
                designWidth: 1920,
                designHeight: 1024,
            },
            root: { type: 'container', name: 'Root' },
        };
        assert.isTrue(layout.specVersion === 1, `layout.specVersion 應為 1`);
    });

    suite.test('specVersion 未設定時型別合約允許 undefined', () => {
        const layout: UILayoutSpec = {
            id: 'test-minimal',
            version: 1,
            canvas: {
                fitWidth: true,
                fitHeight: true,
                safeArea: true,
                designWidth: 1920,
                designHeight: 1024,
            },
            root: { type: 'container', name: 'Root' },
        };
        assert.isTrue(layout.specVersion === undefined, `未設定 specVersion 應為 undefined`);
    });

    // ── EventSystem emit/on 合約 ──────────────────────────────────────────

    suite.test('EventSystem emit/on: slot:switched 事件正確觸發', () => {
        const bus = new StubEventSystem();
        let received: unknown = null;
        bus.on('slot:switched', (payload) => { received = payload; });
        bus.emit('slot:switched', { slotId: 'TabContentSlot', fragmentId: 'tab-basics' });
        assert.isTrue(
            received !== null &&
            (received as any).slotId === 'TabContentSlot' &&
            (received as any).fragmentId === 'tab-basics',
            `slot:switched payload 應包含 slotId 與 fragmentId，got ${JSON.stringify(received)}`
        );
    });

    suite.test('EventSystem emit/on: content:updated 事件正確觸發', () => {
        const bus = new StubEventSystem();
        let received: unknown = null;
        bus.on('content:updated', (payload) => { received = payload; });
        bus.emit('content:updated', { sources: ['attributes', 'skills'] });
        assert.isTrue(
            Array.isArray((received as any)?.sources) &&
            (received as any).sources.includes('attributes'),
            `content:updated payload 應含 sources 陣列，got ${JSON.stringify(received)}`
        );
    });

    suite.test('EventSystem on: 取消訂閱後不再觸發', () => {
        const bus = new StubEventSystem();
        let count = 0;
        const unsub = bus.on('slot:switched', () => { count++; });
        bus.emit('slot:switched', {});
        unsub();
        bus.emit('slot:switched', {});
        assert.isTrue(count === 1, `取消訂閱後應只觸發 1 次，got ${count}`);
    });

    registerGeneralDetailChromePresenterTests(suite);
    return suite;
}
