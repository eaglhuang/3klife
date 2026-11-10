// @spec-source → 出征極速決戰推演演算法與武將個性單挑演出規格書.md (doc_spec_1170) §一、§三-1、§四；PROG-2-2205
/**
 * QuickSortie.test.ts — 出征雙軌選擇：極速決戰不載入棋盤直接推演與結算、彈窗流程、版面節點、大廳接線。
 *
 * Unity 對照：EditMode Test，不開 Scene。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import {
    QuickSortiePopupController,
    quickSortieSide,
    resolveQuickSortie,
    type QuickSortieView,
} from '../assets/scripts/ui/core/QuickSortieController';

const ROOT = path.join(__dirname, '..');

function general(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, maxLifespan: 70, str: 70, int: 70, lea: 70, pol: 50, cha: 60, luk: 10, ...extra } as unknown as GeneralConfig;
}

function layoutIds(): Set<string> {
    const file = path.join(ROOT, 'assets', 'resources', 'ui-spec', 'layouts', 'quick-sortie-main.json');
    const ids = new Set<string>();
    const walk = (node: { id?: string; children?: unknown[] }): void => {
        if (node.id) ids.add(node.id);
        for (const c of node.children ?? []) walk(c as { id?: string; children?: unknown[] });
    };
    walk(JSON.parse(fs.readFileSync(file, 'utf8')).root);
    return ids;
}

export function createQuickSortieSuite(): TestSuite {
    const suite = new TestSuite('QuickSortie');

    suite.test('戰場外推演雙方：只有滿血主將，沒有部隊與城寨；沒有武將時為空', () => {
        const side = quickSortieSide({ name: '關羽', str: 97, int: 75, lea: 95, hp: 1200 });
        assert.equals(1200, side.general?.currentHp);
        assert.equals(1200, side.general?.maxHp);
        assert.equals(0, side.troops.length);
        assert.equals(0, side.fortressHp);
        assert.equals(undefined, side.general?.cha, '魅力缺值不補，交給演算法用武統智平均');
        assert.equals(null, quickSortieSide(null).general);
    });

    suite.test('TC-AUTOBATTLE-01：關羽出征相當之敵，極速決戰戰報出現【陣前斬將】並獲勝；結算記為通關', async () => {
        const guanYu = general('guan-yu', { name: '關羽', str: 97, lea: 95, int: 75, cha: 80 });
        const enemy = general('hua-xiong', { name: '華雄', str: 90, lea: 85, int: 60, cha: 50, faction: 'dong' });
        const resolution = resolveQuickSortie(guanYu, enemy, true, () => 0.1);
        assert.equals('player-win', resolution.result);
        assert.isTrue(resolution.spotlights.includes('DUEL'));
        assert.isTrue(resolution.reportLines.some((line) => line.includes('【陣前斬將】關羽')));
        assert.isTrue(resolution.reportLines[0].startsWith('前哨戰') && resolution.reportLines[resolution.reportLines.length - 1].startsWith('終局定勢'), '三幕戰報');
        assert.isFalse(resolution.rescued);

        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([guanYu]));
        session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
        session.setAutoSave(false);
        const settlement = await session.recordBattle(['guan-yu'], resolution.result, { stageId: 'stage-hulao' });
        assert.isTrue(session.clearedStageIds.includes('stage-hulao'));
        assert.equals(1, settlement.entries.length);
        assert.isTrue(settlement.awakenings.length <= 1, '單場最多覺醒 1 個因子');
    });

    suite.test('新手首戰保證勝：戰力懸殊仍判勝並多一行援軍；已通關首戰不改判', () => {
        const weak = general('weak', { str: 20, lea: 20, int: 20, cha: 20 });
        const strong = general('strong', { str: 99, lea: 99, int: 99, cha: 99 });
        const first = resolveQuickSortie(weak, strong, false, () => 0.9);
        assert.equals('player-win', first.result);
        assert.isTrue(first.rescued);
        assert.isTrue(first.reportLines[first.reportLines.length - 1].includes('援軍及時趕到'));
        const later = resolveQuickSortie(weak, strong, true, () => 0.9);
        assert.equals('enemy-win', later.result);
        assert.isFalse(later.rescued);
    });

    suite.test('彈窗：先選模式；親自指揮進戰場；極速決戰換成戰報畫面再收下；取消與偵查返回都不結算', async () => {
        const host = { node: { active: false }, binder: null };
        const views: QuickSortieView[] = [];
        const popup = new QuickSortiePopupController({ mountHost: async () => host as never, apply: (_h, view) => { views.push(view); } });
        await popup.mount();
        assert.isFalse(host.node.active);

        let commanded = 0;
        let resolved = 0;
        const guanYu = general('guan-yu', { name: '關羽', str: 97, lea: 95 });
        const request = (cancelQuick = false) => ({
            stageName: '虎牢關', enemyName: '華雄',
            command: () => { commanded += 1; },
            quick: async () => {
                if (cancelQuick) return null;
                resolved += 1;
                return { resolution: resolveQuickSortie(guanYu, general('e'), true, () => 0.1), details: ['關羽 精力 100→70，功勳 +10'] };
            },
        });

        assert.isTrue(popup.open(request()));
        const choose = views[views.length - 1];
        assert.isTrue(choose.actives.btnQuickBattle && choose.actives.btnCommandBattle && choose.actives.btnSortieCancel);
        assert.isFalse(choose.actives.btnQuickReportClose);
        assert.isTrue(choose.texts.quickSortieBody.includes('華雄'));
        popup.command();
        assert.equals(1, commanded);
        assert.isFalse(host.node.active);

        popup.open(request());
        await popup.quick();
        assert.equals(1, resolved);
        const report = views[views.length - 1];
        assert.equals('【極速決戰】我軍大捷', report.texts.quickSortieTitle);
        assert.isTrue(report.texts.quickSortieBody.includes('陣前斬將'));
        assert.isTrue(report.texts.quickSortieDetail.includes('功勳'));
        assert.isTrue(report.actives.btnQuickReportClose);
        assert.isFalse(report.actives.btnQuickBattle);
        assert.isTrue(host.node.active);
        popup.command();
        assert.equals(1, commanded, '戰報畫面不能再進戰場');
        popup.close();
        assert.isFalse(host.node.active);

        popup.open(request(true));
        await popup.quick();
        assert.isFalse(host.node.active, '偵查返回就關窗');
        popup.open(request());
        popup.close();
        await popup.quick();
        assert.equals(1, resolved, '取消後不結算');
    });

    suite.test('版面節點齊全；大廳「出戰」改走模式選擇、極速決戰會寫快照並呼叫 recordBattle', () => {
        const ids = layoutIds();
        for (const id of ['quickSortieTitle', 'quickSortieBody', 'quickSortieDetail', 'btnCommandBattle', 'commandBattleLabel', 'btnQuickBattle', 'quickBattleLabel', 'btnSortieCancel', 'sortieCancelLabel', 'btnQuickReportClose', 'quickReportCloseLabel']) {
            assert.isTrue(ids.has(id), `版面缺 ${id}`);
        }
        const lobby = fs.readFileSync(path.join(ROOT, 'assets', 'scripts', 'ui', 'scenes', 'LobbyScene.ts'), 'utf8');
        assert.isTrue(/onClickEnterBattle\(\) \{\s*this\._chooseSortieMode\(\);/.test(lobby));
        const quick = lobby.slice(lobby.indexOf('private async _runQuickSortie'), lobby.indexOf('private _syncLineagePopup'));
        assert.isTrue(quick.includes('recordAutoResolveBattle') && quick.includes('recordBattle(') && quick.includes('spendSiegeLifespan'));
        assert.isFalse(quick.includes('switchScene'), '極速決戰不切場景');
    });

    return suite;
}
