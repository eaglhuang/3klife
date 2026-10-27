/**
 * PROG-2-1187：離線戰鬥快照回看（戰報）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { BATTLE_REVIEW_PAGE_SIZE, BattleReviewController } from '../assets/scripts/ui/core/BattleReviewController';
import {
    appendOfflineBattleSnapshot, nextOfflineBattleSnapshotId, OFFLINE_BATTLE_SNAPSHOT_LIMIT, verifyRetainedOfflineBattleChain,
    type OfflineBattleSnapshot,
} from '../assets/scripts/core/systems/OfflineBattleSnapshot';
import type { JournalEntry } from '../assets/scripts/core/systems/JournalLog';
import { UIValidationRunner } from '../assets/scripts/ui/core/UIValidationRunner';
import type { UILayoutSpec, UISkinManifest } from '../assets/scripts/ui/core/UISpecTypes';

const SPEC = 'assets/resources/ui-spec';

function readJson(rel: string): unknown {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8'));
}

function collectIds(node: { id?: string; children?: unknown[] }, out: Set<string>): Set<string> {
    if (node.id) out.add(node.id);
    for (const child of node.children ?? []) collectIds(child as { id?: string; children?: unknown[] }, out);
    return out;
}

function chain(count: number): OfflineBattleSnapshot[] {
    let list: OfflineBattleSnapshot[] = [];
    for (let i = 0; i < count; i++) {
        list = appendOfflineBattleSnapshot(list, nextOfflineBattleSnapshotId(list), {
            battleType: 'AUTO_RESOLVE', seed: `s${i}`, lineup: [i], tileState: {}, tactics: [],
            win: i % 2 === 0, playerStrength: 300, enemyStrength: 100,
        }).snapshots;
    }
    return list;
}

function entry(snapshotRef: string, summary: string): JournalEntry {
    return {
        entryId: `E-${snapshotRef}`, timestamp: '0194-02-01T00:00:00', category: 'BATTLE', relatedGeneralUids: [],
        priority: 60, summary, visibility: 'VISIBLE', snapshotRef,
    } as JournalEntry;
}

export function createBattleReviewControllerSuite(): TestSuite {
    const suite = new TestSuite('BattleReviewController (PROG-2-1187 戰報回看)');

    suite.test('新到舊、帶日誌摘要與結果等級；分頁上下限', () => {
        const snapshots = chain(8);
        const controller = new BattleReviewController({ snapshots: () => snapshots, journal: () => [entry('OBS_0008', '邊境來犯')] });
        const lines = controller.lines();
        assert.equals(BATTLE_REVIEW_PAGE_SIZE, lines.length);
        assert.isTrue(lines[0].includes('邊境來犯') && lines[0].endsWith('小敗'), lines[0]);
        assert.isTrue(lines[1].startsWith('OBS_0007') && lines[1].endsWith('大勝'), lines[1]);
        const view = controller.getFlowView();
        assert.isFalse(view.enabled.btnPrevPage);
        assert.isTrue(view.enabled.btnNextPage);
        assert.equals('第 1／2 頁・共 8 筆', view.texts.reviewPageLabel);
        assert.equals('鏈驗證：完整', view.texts.reviewChainLabel);
        controller.nextPage();
        controller.nextPage();
        assert.equals(2, controller.lines().length);
        assert.isFalse(controller.getFlowView().actives.reviewLine2);
        controller.reset();
        assert.equals(BATTLE_REVIEW_PAGE_SIZE, controller.lines().length);
    });

    suite.test('空狀態', () => {
        const view = new BattleReviewController({ snapshots: () => [], journal: () => [] }).getFlowView();
        assert.isTrue(view.actives.reviewEmptyLabel);
        assert.equals('', view.texts.reviewChainLabel);
        assert.isFalse(view.enabled.btnNextPage);
    });

    suite.test('保留段驗證：截斷後仍可驗；竄改指出第幾筆', () => {
        const full = chain(OFFLINE_BATTLE_SNAPSHOT_LIMIT + 5);
        assert.equals('OBS_0006', full[0].snapshotId);
        assert.equals(-1, verifyRetainedOfflineBattleChain(full));
        const tampered = full.map((s, i) => (i === 3 ? { ...s, resultDigest: 'WIN_MAJOR' as const, seed: 'x' } : s));
        assert.equals(3, verifyRetainedOfflineBattleChain(tampered));
        const head = chain(3).map((s, i) => (i === 0 ? { ...s, seed: 'x' } : s));
        assert.equals(0, verifyRetainedOfflineBattleChain(head));
        const label = new BattleReviewController({ snapshots: () => tampered, journal: () => [] }).chainLabel();
        assert.equals('鏈驗證：第 4 筆不符', label);
    });

    suite.test('畫面規格：驗證無 error、含 FlowView 全部 key；晨報派遣板有入口', () => {
        const layout = readJson(`${SPEC}/layouts/battle-review-main.json`) as UILayoutSpec;
        const skin = readJson(`${SPEC}/skins/battle-review-screen.skin.json`) as UISkinManifest;
        const errors = new UIValidationRunner().validate(layout, skin).issues.filter((i) => i.severity === 'error').map((i) => i.message);
        assert.equals(0, errors.length, errors.join('；'));
        const ids = collectIds((layout as unknown as { root: { id?: string; children?: unknown[] } }).root, new Set<string>());
        const view = new BattleReviewController({ snapshots: () => chain(1), journal: () => [] }).getFlowView();
        const missing = Object.keys(view.texts).concat(Object.keys(view.actives), Object.keys(view.enabled)).filter((k) => !ids.has(k));
        assert.equals(0, missing.length, missing.join(','));
        const hub = readJson(`${SPEC}/layouts/journal-hub-main.json`) as { root: { id?: string; children?: unknown[] } };
        assert.isTrue(collectIds(hub.root, new Set<string>()).has('btnOpenBattleReview'));
    });

    return suite;
}
