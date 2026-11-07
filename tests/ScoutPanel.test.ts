/**
 * ScoutPanel — 大廳出征前的戰前偵查面板（LVL-03；PROG-2-2076）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import type { EncounterConfig } from '../assets/scripts/shared/BattleEntryParams';
import { findScoutLeaks } from '../assets/scripts/core/systems/ScoutIntel';
import { buildLobbyScout, ScoutPanelController, SCOUT_PANEL_TEXTS } from '../assets/scripts/ui/core/ScoutPanelController';

const UI_SPEC = path.resolve(__dirname, '../assets/resources/ui-spec');

interface SpecNode {
    id?: string;
    children?: SpecNode[];
}

function ids(node: SpecNode, out = new Set<string>()): Set<string> {
    if (node.id) out.add(node.id);
    for (const child of node.children ?? []) ids(child, out);
    return out;
}

const readSpec = <T>(rel: string): T => JSON.parse(fs.readFileSync(path.join(UI_SPEC, rel), 'utf8')) as T;

const SIEGE = {
    id: 'encounter-001', name: '虎牢關之戰', theme: '攻城', battleKind: 'siege',
    playerGeneralId: 'zhang-fei', enemyGeneralId: 'lu-bu',
    requiredLoadout: ['破城'], highlyRecommendedLoadout: ['鼓舞'],
    enemyInitialDeployment: [{ type: 'cavalry', lane: 3 }],
} as unknown as EncounterConfig;

const TAGS = { TAC_SIEGE: ['破城'], TAC_RALLY: ['鼓舞'] };
const LU_BU = { name: '呂布', title: '飛將' };

export function createScoutPanelSuite(): TestSuite {
    const suite = new TestSuite('ScoutPanel (戰前偵查面板 LVL-03 PROG-2-2076)');

    suite.test('view key 全部對得到 layout 節點 id；screen 指向自己的 layout/skin', () => {
        const layoutIds = ids(readSpec<{ root: SpecNode }>('layouts/scout-panel-main.json').root);
        const ctrl = new ScoutPanelController();
        void ctrl.ask(buildLobbyScout(SIEGE, LU_BU, [], TAGS));
        const view = ctrl.getView();
        for (const key of [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled)]) {
            assert.isTrue(layoutIds.has(key), key);
        }
        const screen = readSpec<{ layout: string; skin: string }>('screens/scout-panel-screen.json');
        assert.equals('scout-panel-main', screen.layout);
        assert.equals('scout-panel-screen.skin', screen.skin);
        const skin = readSpec<{ slots: Record<string, unknown> }>('skins/scout-panel-screen.skin.json');
        const layoutText = fs.readFileSync(path.join(UI_SPEC, 'layouts/scout-panel-main.json'), 'utf8');
        for (const slot of layoutText.match(/"(?:skinSlot|styleSlot)": "([^"]+)"/g) ?? []) {
            const name = slot.replace(/^.*: "|"$/g, '');
            assert.isTrue(name in skin.slots, name);
        }
    });

    suite.test('四區塊情資：敵將、主題、風險、三態檢核；站位不進面板', () => {
        const scout = buildLobbyScout(SIEGE, LU_BU, ['TAC_SIEGE'], TAGS);
        assert.equals('missing', scout.intel.loadoutState);
        assert.equals(0, findScoutLeaks(scout.intel).length);
        assert.isFalse(JSON.stringify(scout.intel).includes('cavalry'));
        const ctrl = new ScoutPanelController();
        void ctrl.ask(scout);
        const view = ctrl.getView();
        assert.equals('呂布・飛將', view.texts.scoutEnemyBody);
        assert.equals('攻城', view.texts.scoutMechanicBody);
        assert.equals(SCOUT_PANEL_TEXTS.noIntel, view.texts.scoutRiskBody);
        assert.equals('⚠ 缺少：鼓舞', view.texts.scoutLoadoutMissing);
        assert.isTrue(view.actives.scoutLoadoutMissing);
        assert.isFalse(view.actives.scoutLoadoutReady || view.actives.scoutLoadoutRisk || view.actives.scoutLoadoutNone);
    });

    suite.test('沒主題時用戰場類型；沒填推薦對策顯示未指定', () => {
        const plain = { ...SIEGE, theme: undefined, requiredLoadout: [], highlyRecommendedLoadout: [], riskTags: ['騎兵衝擊'] } as EncounterConfig;
        const ctrl = new ScoutPanelController();
        void ctrl.ask(buildLobbyScout(plain, null, [], TAGS));
        const view = ctrl.getView();
        assert.equals('攻城戰', view.texts.scoutMechanicBody);
        assert.equals('【騎兵衝擊】', view.texts.scoutRiskBody);
        assert.equals(SCOUT_PANEL_TEXTS.noIntel, view.texts.scoutEnemyBody);
        assert.isTrue(view.actives.scoutLoadoutNone);
    });

    suite.test('已具備或缺少：按出征直接出發', async () => {
        const ctrl = new ScoutPanelController();
        const result = ctrl.ask(buildLobbyScout(SIEGE, LU_BU, ['TAC_SIEGE', 'TAC_RALLY'], TAGS));
        assert.isTrue(ctrl.getView().actives.scoutLoadoutReady);
        assert.isTrue(ctrl.sortie());
        assert.isTrue(await result);
        assert.isFalse(ctrl.isOpen());
    });

    suite.test('高風險：先跳確認框，再想想回面板，強行出征才出發；出征鈕從不鎖死', async () => {
        const ctrl = new ScoutPanelController();
        const result = ctrl.ask(buildLobbyScout(SIEGE, LU_BU, [], TAGS));
        const before = ctrl.getView();
        assert.isTrue(before.actives.scoutLoadoutRisk);
        assert.equals('☠ 高風險：缺少破城、鼓舞', before.texts.scoutLoadoutRisk);
        assert.isTrue(before.enabled.btnScoutSortie);
        assert.isFalse(ctrl.sortie());
        assert.isTrue(ctrl.getView().actives.scoutConfirm);
        assert.equals('兵勢凶險，仍可強行出征', ctrl.getView().texts.scoutConfirmBody);
        ctrl.back();
        assert.isFalse(ctrl.getView().actives.scoutConfirm);
        assert.isFalse(ctrl.sortie());
        ctrl.confirm();
        assert.isTrue(await result);
    });

    suite.test('暫不出征 resolve false；重開時前一輪視為取消', async () => {
        const ctrl = new ScoutPanelController();
        const first = ctrl.ask(buildLobbyScout(SIEGE, LU_BU, [], TAGS));
        const second = ctrl.ask(buildLobbyScout(SIEGE, LU_BU, [], TAGS));
        assert.isFalse(await first);
        ctrl.cancel();
        assert.isFalse(await second);
    });

    suite.test('大廳接線：出征前先開偵查面板，取消就不開戰', () => {
        const lobby = fs.readFileSync(path.join(__dirname, '../assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(lobby.includes("this._mountPreviewScreenHost('ScoutPanelHost', 'scout-panel-screen'"));
        assert.isTrue(lobby.includes('if (!(await this._askScoutBeforeSortie())) return;'));
    });

    return suite;
}
