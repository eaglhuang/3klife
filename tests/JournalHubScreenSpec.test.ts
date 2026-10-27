/**
 * PROG-2-1180：晨報與派遣板畫面規格（JRN-06 掛載）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { UIValidationRunner } from '../assets/scripts/ui/core/UIValidationRunner';
import type { UILayoutSpec, UISkinManifest } from '../assets/scripts/ui/core/UISpecTypes';
import { JournalHubController } from '../assets/scripts/ui/core/JournalHubController';

const SPEC = 'assets/resources/ui-spec';

function readJson(rel: string): unknown {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8'));
}

function collectIds(node: { id?: string; children?: unknown[] }, out: Set<string>): Set<string> {
    if (node.id) out.add(node.id);
    for (const child of node.children ?? []) collectIds(child as { id?: string; children?: unknown[] }, out);
    return out;
}

export function createJournalHubScreenSpecSuite(): TestSuite {
    const suite = new TestSuite('JournalHubScreenSpec (PROG-2-1180 晨報派遣板畫面)');

    suite.test('screen 指向既有 layout 與 skin', () => {
        const screen = readJson(`${SPEC}/screens/journal-hub-screen.json`) as { layout: string; skin: string };
        assert.isTrue(fs.existsSync(path.resolve(__dirname, '..', `${SPEC}/layouts/${screen.layout}.json`)));
        assert.isTrue(fs.existsSync(path.resolve(__dirname, '..', `${SPEC}/skins/${screen.skin}.json`)));
    });

    suite.test('layout 與 skin 跑驗證無 error', () => {
        const layout = readJson(`${SPEC}/layouts/journal-hub-main.json`) as UILayoutSpec;
        const skin = readJson(`${SPEC}/skins/journal-hub-screen.skin.json`) as UISkinManifest;
        const errors = new UIValidationRunner().validate(layout, skin).issues.filter((i) => i.severity === 'error').map((i) => i.message);
        assert.equals(0, errors.length, errors.join('；'));
    });

    suite.test('layout 含 FlowView 全部 key 與關閉鈕；內政頁有入口鈕', () => {
        const layout = readJson(`${SPEC}/layouts/journal-hub-main.json`) as { root: { id?: string; children?: unknown[] } };
        const ids = collectIds(layout.root, new Set<string>());
        const view = new JournalHubController({ morningLines: () => [], dispatchRows: () => [] }).getFlowView();
        const keys = Object.keys(view.texts).concat(Object.keys(view.actives), Object.keys(view.enabled));
        const missing = keys.filter((k) => !ids.has(k));
        assert.equals(0, missing.length, missing.join(','));
        const domestic = readJson(`${SPEC}/layouts/domestic-main.json`) as { root: { id?: string; children?: unknown[] } };
        assert.isTrue(collectIds(domestic.root, new Set<string>()).has('btnOpenJournalHub'));
    });

    return suite;
}
