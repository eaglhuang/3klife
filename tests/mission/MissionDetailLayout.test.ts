// @spec-source → 內政任務詳情單屏重排規格書 doc_spec_1342；PROG-2-10170（情報區長文字不壓提示／風險列）
/**
 * MissionDetailLayout.test.ts
 *
 * 任務詳情版面 JSON 的結構約束（不靠實跑也能擋回歸）：
 *  1. 長文字區（情報／環境偵察／提示列／獎勵）的容器高度隨內容（resizeMode=container、不寫死 height），
 *     文字標籤不寫死高度以外的高（RESIZE_HEIGHT 樣式），en／ja 長字換行加高而不是溢出。
 *  2. 提示列（IntelFogMask）在流程內（不貼底 widget），才不會壓到風險列。
 *  3. 左欄只放概要＋情報，獎勵放右欄資源下方，單欄高度預算夠長字使用。
 *  4. 內容契約與 LoadingScene 預覽檢查用的路徑，都指到版面實際存在的節點。
 */
import { TestSuite, assert } from '../TestRunner';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');

type Node = { name?: string; height?: unknown; widget?: unknown; layout?: { resizeMode?: string }; children?: Node[]; [k: string]: unknown };

const layout = (): Node => JSON.parse(read('assets/resources/ui-spec/layouts/lobby-mission-detail-dialog-main.json')).root;
const find = (n: Node, name: string): Node | undefined => {
    if (n.name === name) return n;
    for (const c of n.children ?? []) { const r = find(c, name); if (r) return r; }
    return undefined;
};
const byPath = (root: Node, p: string): Node | undefined => {
    let cur: Node | undefined = root;
    for (const seg of p.split('/')) cur = cur?.children?.find((c) => c.name === seg);
    return cur;
};

export function createMissionDetailLayoutSuite(): TestSuite {
    const suite = new TestSuite('MissionDetailLayout (PROG-2-10170：情報區長文字自動加高)');

    suite.test('情報／環境偵察／提示列／獎勵容器高度隨內容，不寫死 height', () => {
        const root = layout();
        for (const name of ['IntelPanel', 'EnvScoutPanel', 'IntelFogMask', 'RewardPanel', 'BaseRewardCard', 'PerfectRewardCard']) {
            const n = find(root, name);
            assert.isTrue(!!n, `${name} 存在`);
            assert.equals('container', n!.layout?.resizeMode, `${name} 須 resizeMode=container`);
            assert.isTrue(n!.height === undefined, `${name} 不可寫死 height`);
        }
    });

    suite.test('多行文字標籤不寫死 height：高度 < 1.5 行會被強制縮成單行小字，長字要靠 RESIZE_HEIGHT 換行', () => {
        const root = layout();
        for (const name of ['IntelBodyLabel', 'EnvScoutTerrainLabel', 'EnvScoutWeatherLabel', 'IntelFogLabel', 'RewardBaseLabel', 'RewardPerfectLabel']) {
            const n = find(root, name);
            assert.isTrue(!!n, `${name} 存在`);
            assert.isTrue(n!.height === undefined, `${name} 不可寫死 height`);
        }
    });

    suite.test('提示列在流程內且排在風險列之後，不再貼底浮在其他列上', () => {
        const intel = find(layout(), 'IntelPanel')!;
        const names = (intel.children ?? []).map((c) => c.name);
        assert.equals('IntelTitleLabel,IntelBodyLabel,EnvScoutPanel,IntelFogMask', names.join(','));
        assert.isTrue(find(intel, 'IntelFogMask')!.widget === undefined, 'IntelFogMask 不可用 widget 貼底');
    });

    suite.test('獎勵在右欄資源下方，左欄只剩概要與情報', () => {
        const root = layout();
        const left = (find(root, 'ColLeft')!.children ?? []).map((c) => c.name);
        const right = (find(root, 'ColRight')!.children ?? []).map((c) => c.name);
        assert.equals('OverviewPanel,IntelPanel', left.join(','));
        assert.equals('ResourcePanel,RewardPanel', right.join(','));
    });

    suite.test('內容契約的 bindPath 都指到版面真實節點', () => {
        const root = layout();
        const contract = read('assets/resources/ui-spec/contracts/lobby-mission-detail-dialog-content.schema.json');
        const paths = (contract.match(/"bindPath":\s*"DialogCard\/[^"]+"/g) ?? []).map((s: string) => s.replace(/^"bindPath":\s*"/, '').replace(/"$/, ''));
        assert.isTrue(paths.length > 0, '契約有 bindPath');
        const missing = paths.filter((p: string) => !byPath(root, p));
        assert.equals('', missing.join(', '), '契約路徑須存在於版面');
    });

    return suite;
}
