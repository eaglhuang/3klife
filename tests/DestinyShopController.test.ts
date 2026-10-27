/**
 * DestinyShopController.test.ts — 天命商店畫面 headless 測試（PROG-2-1158）
 *
 * 驗證：view key 全對得到 destiny-shop-main 的節點 id、兌換要按兩次、沒資格不能按、
 * 切換對象會取消待確認、轉蛋頁入口文字，以及轉蛋頁與 LobbyScene 的接線。
 * Unity 對照：EditMode Test，直接驅動 Presenter，不開場景。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { DestinyShopController, destinyBriefTexts, type DestinyShopDeps } from '../assets/scripts/ui/core/DestinyShopController';
import { GACHA_ACTION_NODES } from '../assets/scripts/ui/core/GachaActionBindings';
import type { DestinyShopBlockReason } from '../assets/scripts/core/systems/DestinyShop';

const UI_SPEC = path.resolve(__dirname, '../assets/resources/ui-spec');

interface SpecNode { id?: string; name?: string; children?: SpecNode[] }

function readSpec<T = SpecNode>(rel: string): T {
    return JSON.parse(fs.readFileSync(path.join(UI_SPEC, rel), 'utf8')) as T;
}

function collectIds(node: SpecNode, out: Set<string>): Set<string> {
    if (node.id) out.add(node.id);
    for (const c of node.children ?? []) collectIds(c, out);
    return out;
}

function hasName(node: SpecNode, name: string): boolean {
    return node.name === name || (node.children ?? []).some((c) => hasName(c, name));
}

function fakeDeps(credits: number, pullsToNext = 120) {
    const calls: string[] = [];
    let left = credits;
    const deps: DestinyShopDeps = {
        credits: () => left,
        pullsToNext: () => pullsToNext,
        exchange: (_poolId, targetId) => {
            calls.push(targetId);
            const reason: DestinyShopBlockReason | null = left > 0 ? null : 'no-credit';
            if (!reason) left -= 1;
            return { reason };
        },
    };
    return { deps, calls };
}

const SSR = [{ id: 'lu-bu', name: '呂布' }, { id: 'zhao-yun', name: '趙雲' }];

export function createDestinyShopControllerSuite(): TestSuite {
    const suite = new TestSuite('DestinyShopController (天命商店畫面 PROG-2-1158)');

    suite.test('view key 全部對得到 destiny-shop-main 的節點 id；screen 指向自己的 layout/skin', () => {
        const layout = readSpec<{ root: SpecNode }>('layouts/destiny-shop-main.json');
        const ids = collectIds(layout.root, new Set());
        for (const candidates of [SSR, []]) {
            const ctrl = new DestinyShopController(fakeDeps(1).deps);
            ctrl.open('GENERAL_STANDARD_01', '名將池', candidates);
            const view = ctrl.getView();
            const missing = [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled)].filter((k) => !ids.has(k));
            assert.equals('', missing.join(','), 'destiny-shop-main 缺節點 id');
        }
        const screen = readSpec<{ layout: string; skin: string }>('screens/destiny-shop-screen.json');
        assert.equals('destiny-shop-main', screen.layout);
        assert.equals('destiny-shop-screen.skin', screen.skin);
        assert.isTrue(fs.existsSync(path.join(UI_SPEC, 'skins/destiny-shop-screen.skin.json')));
    });

    suite.test('兌換要按兩次：第一次只標記待確認，第二次才扣資格', () => {
        const { deps, calls } = fakeDeps(1);
        const ctrl = new DestinyShopController(deps);
        ctrl.open('GENERAL_STANDARD_01', '名將池', SSR);
        assert.isFalse(ctrl.exchange());
        assert.equals(0, calls.length);
        assert.equals('確認兌換', ctrl.getView().texts.exchangeDestinyLabel);
        assert.isTrue(ctrl.exchange());
        assert.equals('lu-bu', calls.join(','));
        assert.isTrue(ctrl.getView().texts.dshopNotice.includes('已兌換「呂布」'));
        assert.isFalse(ctrl.getView().enabled.btnExchangeDestiny, '資格用完後兌換鈕不能按');
    });

    suite.test('切換對象會取消待確認；沒有資格時兌換鈕不能按', () => {
        const { deps, calls } = fakeDeps(1);
        const ctrl = new DestinyShopController(deps);
        ctrl.open('GENERAL_STANDARD_01', '名將池', SSR);
        ctrl.exchange();
        ctrl.cycle(1);
        assert.equals('zhao-yun', ctrl.targetId);
        assert.equals('兌換', ctrl.getView().texts.exchangeDestinyLabel);
        assert.isFalse(ctrl.exchange(), '換人後第一次按仍只是標記');
        assert.equals(0, calls.length);

        const poor = new DestinyShopController(fakeDeps(0).deps);
        poor.open('mentor-pool', '教官池', SSR);
        assert.isFalse(poor.getView().enabled.btnExchangeDestiny);
        assert.isTrue(poor.getView().texts.dshopCredits.startsWith('天命值：80/200'));
    });

    suite.test('沒有候選時顯示空狀態，上一位／下一位不能按', () => {
        const ctrl = new DestinyShopController(fakeDeps(2).deps);
        ctrl.open('GENERAL_STANDARD_01', '名將池', []);
        const view = ctrl.getView();
        assert.isFalse(view.actives.dshopPanel);
        assert.isTrue(view.actives.dshopEmptyHint);
        assert.isFalse(view.enabled.btnPrevDestiny);
        assert.isFalse(ctrl.exchange());
    });

    suite.test('轉蛋頁入口文字：天命值 N/200，有資格時標示可兌換；紅顏池不累計', () => {
        assert.equals('天命值：80/200', destinyBriefTexts(0, 120, true).line);
        const ready = destinyBriefTexts(2, 200, true);
        assert.isTrue(ready.tag.includes('可兌換'));
        assert.isTrue(ready.line.includes('可換 2 次'));
        assert.equals('此池不累計天命值', destinyBriefTexts(0, 0, false).line);
    });

    suite.test('接線：轉蛋頁左上角入口節點存在，LobbyScene 掛上天命商店 screen', () => {
        const gacha = readSpec<{ root?: SpecNode; nodes?: SpecNode[] }>('layouts/gacha-ds3.json');
        const roots = gacha.nodes ?? (gacha.root ? [gacha.root] : []);
        for (const name of [GACHA_ACTION_NODES.destiny, 'GachaDs3_div_36', 'GachaDs3_strong_1']) {
            assert.isTrue(roots.some((r) => hasName(r, name)), `gacha-ds3 缺 ${name}`);
        }
        const lobby = fs.readFileSync(path.resolve(__dirname, '../assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(lobby.includes("'destiny-shop-screen'") && lobby.includes('destiny: () => { void this._openDestinyShop(); }'));
    });

    return suite;
}
