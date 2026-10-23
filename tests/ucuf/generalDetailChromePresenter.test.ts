import { readFileSync } from 'fs';
import * as path from 'path';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';
import { TestSuite, assert } from '../TestRunner';

const ROOT = path.resolve(__dirname, '../..');
const EXTRACTION_CEILINGS: Record<string, number> = {
    'assets/scripts/ui/components/GeneralDetailComposite.ts': 696,
    'tools_node/capture-ui-screens.js': 1453,
    'tests/ucuf/architectureGovernance.test.ts': 334,
    'assets/scripts/ui/components/character-ds3/GeneralDetailChromePresenter.ts': 600,
    'tools_node/lib/ui-capture-diagnostics.js': 600,
    'tests/ucuf/fixtures/architectureEngineStubs.ts': 600,
    'tests/ucuf/generalDetailChromePresenter.test.ts': 600,
};

function verifyCeilings(ceilings: Record<string, number>): void {
    for (const [file, ceiling] of Object.entries(ceilings)) {
        const text = readFileSync(path.join(ROOT, file), 'utf8');
        const count = text.split(/\r\n|\n|\r/).length - (/[\r\n]$/.test(text) ? 1 : 0);
        assert.isTrue(count <= ceiling, `${file}: ${count} physical lines exceeds ${ceiling}`);
    }
}

/** Execute the real presenter through its resource and scene ports. */
function chromeFixture(failLoad = false) {
    const requests: string[] = [];
    let resourceFailure = failLoad;
    let badgeNodeAvailable = true;
    class Color { static WHITE = {}; }
    class Sprite { static Type = { SIMPLE: 0 }; static SizeMode = { CUSTOM: 0 }; spriteFrame: unknown = null; }
    const background = new Sprite();
    const badge = new Sprite();
    const artwork = new Sprite();
    const node = (sprite: Sprite) => ({ active: true, getComponent: () => sprite });
    const backgroundNode = node(background);
    const badgeNode = node(badge);
    const artworkNode = node(artwork);
    let portraitVisible = true;
    const ports = {
        requireNode: (name: string) => {
            if (name !== 'BackgroundFull') throw new Error(`unexpected required node: ${name}`);
            return backgroundNode;
        },
        findNode: (name: string) => name === 'PortraitRarityBadge' && badgeNodeAvailable ? badgeNode : name === 'PortraitImage' ? artworkNode : null,
        mainRoot: () => null,
        currentConfig: () => null,
        portraitVisible: () => portraitVisible,
    };
    const source = readFileSync(path.join(ROOT, 'assets/scripts/ui/components/character-ds3/GeneralDetailChromePresenter.ts'), 'utf8');
    const compiled = transpileModule(source, {
        compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2018 },
    }).outputText;
    const testModule = { exports: {} as Record<string, new (host: typeof ports) => {
        loadBackground(resource: string): Promise<void>;
        resetBackground(): void;
        loadPortraitRarityBadge(tier: string): Promise<void>;
        syncPortraitVisibility(): void;
    }> };
    const load = (id: string): unknown => {
        if (id === 'cc') return { Color, Sprite };
        if (id.endsWith('/ServiceLoader')) return { services: () => ({ resource: {
            loadSpriteFrame: async (resource: string) => {
                requests.push(resource);
                if (resourceFailure) throw new Error('fixture resource unavailable');
                return { resource, width: 1, height: 1 };
            },
        } }) };
        if (id.endsWith('/UCUFLogger')) return {
            UCUFLogger: { info: () => undefined, error: () => undefined }, LogCategory: {},
        };
        return {};
    };
    new Function('require', 'exports', 'module', compiled)(load, testModule.exports, testModule);
    const presenter = new testModule.exports.GeneralDetailChromePresenter(ports);
    return { presenter, requests, background, badge, artworkNode, ports,
        setResourceFailure: (value: boolean) => { resourceFailure = value; },
        setBadgeNodeAvailable: (value: boolean) => { badgeNodeAvailable = value; },
        setPortraitVisible: (value: boolean) => { portraitVisible = value; } };
}

async function expectFailure(action: () => Promise<void>, expected: string): Promise<void> {
    let failure = '';
    try { await action(); } catch (error) { failure = String(error); }
    assert.isTrue(failure.includes(expected), `expected failure containing ${expected}, got ${failure}`);
}

export function registerGeneralDetailChromePresenterTests(suite: TestSuite): void {
    suite.test('Chrome: normalized background cache resets only when requested', async () => {
        const fixture = chromeFixture();
        await fixture.presenter.loadBackground('  backgrounds/a  ');
        await fixture.presenter.loadBackground('backgrounds/a');
        assert.isTrue(fixture.requests.join(',') === 'backgrounds/a', 'repeated normalized backgrounds must reuse the cache');
        fixture.presenter.resetBackground();
        await fixture.presenter.loadBackground('backgrounds/a');
        assert.isTrue(fixture.requests.length === 2, 'a new opening must be able to reset the background cache');
        assert.isTrue((fixture.background.spriteFrame as { resource: string }).resource === 'backgrounds/a', 'loaded frame must be assigned');
    });

    suite.test('Chrome: empty and unavailable backgrounds retain fail-fast behavior', async () => {
        const fixture = chromeFixture(true);
        await expectFailure(() => fixture.presenter.loadBackground(' '), '背景資源路徑空白');
        assert.isTrue(fixture.requests.length === 0, 'empty paths must not reach resources');
        await expectFailure(() => fixture.presenter.loadBackground('missing'), '載入 BackgroundFull');
        assert.isTrue(fixture.background.spriteFrame === null, 'failed loading must not assign a placeholder');
    });

    suite.test('Chrome: rarity cache and legendary fallback stay unchanged', async () => {
        const fixture = chromeFixture();
        await fixture.presenter.loadPortraitRarityBadge('mythic');
        await fixture.presenter.loadPortraitRarityBadge('legendary');
        assert.isTrue(fixture.requests.length === 1, 'tiers sharing the same artwork reuse the cache');
        assert.isTrue(fixture.requests[0].endsWith('badge_rarity_legendary_flat'), 'mythic keeps the existing resource mapping');
        await fixture.presenter.loadPortraitRarityBadge('common');
        assert.isTrue(fixture.requests[1].endsWith('badge_rarity_common_flat'), 'tier changes load the actual new badge');
    });

    suite.test('Chrome: failed background replacement preserves the valid frame and permits retry', async () => {
        const fixture = chromeFixture();
        await fixture.presenter.loadBackground('backgrounds/a');
        const previousFrame = fixture.background.spriteFrame;
        fixture.setResourceFailure(true);
        await expectFailure(() => fixture.presenter.loadBackground('backgrounds/b'), '載入 BackgroundFull');
        assert.isTrue(fixture.background.spriteFrame === previousFrame, 'failed replacement must preserve the valid frame');
        await fixture.presenter.loadBackground('backgrounds/a');
        assert.isTrue(fixture.requests.length === 2, 'failure must preserve the previous successful cache entry');
        fixture.setResourceFailure(false);
        await fixture.presenter.loadBackground('backgrounds/b');
        assert.isTrue(fixture.requests.length === 3, 'failed resource must remain retryable');
        assert.isTrue((fixture.background.spriteFrame as { resource: string }).resource === 'backgrounds/b', 'retry must assign the recovered frame');
    });

    suite.test('Chrome: failed rarity replacement preserves the valid badge and permits retry', async () => {
        const fixture = chromeFixture();
        await fixture.presenter.loadPortraitRarityBadge('rare');
        const previousFrame = fixture.badge.spriteFrame;
        fixture.setResourceFailure(true);
        await fixture.presenter.loadPortraitRarityBadge('epic');
        assert.isTrue(fixture.badge.spriteFrame === previousFrame, 'badge loading keeps its existing non-throwing failure behavior');
        await fixture.presenter.loadPortraitRarityBadge('rare');
        assert.isTrue(fixture.requests.length === 2, 'failed replacement must not overwrite the previous badge cache');
        fixture.setResourceFailure(false);
        await fixture.presenter.loadPortraitRarityBadge('epic');
        assert.isTrue(fixture.requests.length === 3, 'failed badge resource must remain retryable');
        assert.isTrue((fixture.badge.spriteFrame as { resource: string }).resource.endsWith('badge_rarity_epic_flat'), 'retry must assign the recovered badge');
    });

    suite.test('Chrome: missing rarity node fails before resource loading and can recover', async () => {
        const fixture = chromeFixture();
        fixture.setBadgeNodeAvailable(false);
        await expectFailure(() => fixture.presenter.loadPortraitRarityBadge('common'), '缺少必要節點 PortraitRarityBadge');
        assert.isTrue(fixture.requests.length === 0, 'missing nodes must fail before loading artwork');
        fixture.setBadgeNodeAvailable(true);
        await fixture.presenter.loadPortraitRarityBadge('common');
        assert.isTrue(fixture.requests.length === 1 && fixture.badge.spriteFrame !== null, 'restored node must allow a real retry');
    });

    suite.test('Chrome: scene-owned visibility controls the original artwork node', () => {
        const fixture = chromeFixture();
        fixture.setPortraitVisible(false);
        fixture.presenter.syncPortraitVisibility();
        assert.isTrue(!fixture.artworkNode.active, 'bloodline visibility must hide the artwork');
        fixture.setPortraitVisible(true);
        fixture.presenter.syncPortraitVisibility();
        assert.isTrue(fixture.artworkNode.active, 'returning to a portrait tab must restore it');
    });

    suite.test('Capture diagnostics: preserve event buckets, counts and verdict schema', () => {
        const diagnosticsModule = require(path.join(ROOT, 'tools_node/lib/ui-capture-diagnostics.js'));
        const listeners = new Map<string, (value: unknown) => void>();
        const diagnostics = diagnosticsModule.createPageDiagnostics({ on: (name: string, callback: (value: unknown) => void) => listeners.set(name, callback) });
        listeners.get('console')!({ type: () => 'warning', text: () => 'same warning' });
        listeners.get('console')!({ type: () => 'log', text: () => 'ignored regular log' });
        listeners.get('pageerror')!(new Error('page failed'));
        const summary = diagnosticsModule.summarizeDiagnostics(diagnostics);
        assert.isTrue(summary.consoleWarningCount === 1 && summary.pageErrorCount === 1, 'diagnostics retain warning and page-error counts');
        assert.isTrue(diagnostics.console.length === 1, 'regular logs remain excluded');
        assert.isTrue(diagnosticsModule.buildRuntimeStatus(summary, false) === 'fail', 'page errors must fail capture');
        assert.isTrue(diagnosticsModule.buildRuntimeResiduals(summary).includes('page errors: 1'), 'residual text schema stays stable');
    });

    suite.test('Capture diagnostics: target owns an optional visibility guard', async () => {
        const diagnosticsModule = require(path.join(ROOT, 'tools_node/lib/ui-capture-diagnostics.js'));
        const page = { evaluate: () => { throw new Error('unexpected DOM inspection'); } };
        const expected = { guardId: 'target-owned', passed: true };
        let observedPage: unknown;
        const result = await diagnosticsModule.collectTargetRuntimeGuard(page, {
            id: 'CustomScreen', runtimeGuard: (receivedPage: unknown) => { observedPage = receivedPage; return expected; },
        });
        assert.isTrue(result === expected && observedPage === page, 'target adapter must receive the real page and preserve the guard result');
        assert.isTrue(await diagnosticsModule.collectTargetRuntimeGuard(page, { id: 'UnrelatedScreen' }) === null,
            'unrelated targets must retain the previous no-guard behavior');
    });

    suite.test('Extracted modules retain the permanent 600-line ceiling', () => {
        verifyCeilings(Object.fromEntries(Object.entries(EXTRACTION_CEILINGS).filter(([, ceiling]) => ceiling === 600)));
    });
}

// This delivery-specific check stays separate from later feature test runs.
if (require.main === module && process.argv.includes('--verify-extraction-ceilings')) {
    verifyCeilings(EXTRACTION_CEILINGS);
    console.log('TASK-UI-9001: all 7 exact extraction ceilings passed.');
}
