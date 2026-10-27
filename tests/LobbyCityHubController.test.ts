/**
 * LobbyCityHubController — 主大廳城池主視覺：頂列、都市卡、五類功能收納（PROG-2-1148）
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { createRivalWorld } from '../assets/scripts/core/systems/RivalNations';
import {
    LOBBY_CATEGORIES, LOBBY_SUB_SLOTS, PLAYER_HOME_CITY, actionAt, buildLobbyCityHubView, categoryButtonId,
    cityMorale, cityPopulation, populationText, toggleCategory, type LobbyCityHubInput,
} from '../assets/scripts/ui/core/LobbyCityHubController';

const ROOT = join(__dirname, '..');

function input(overrides: Partial<LobbyCityHubInput> = {}): LobbyCityHubInput {
    return {
        leadName: '魏延', officerRank: '郡守', gold: 248400, gems: 1820, food: 600,
        cityTroops: 6400, cityTroopsCap: 8000, totalSeasonsElapsed: 4, fame: 100,
        territoryCount: 1, rivals: createRivalWorld(), openCategory: null, ...overrides,
    };
}

function layoutIds(node: { id?: string; children?: unknown[] }, out: Set<string>): Set<string> {
    if (node.id) out.add(node.id);
    for (const child of node.children ?? []) layoutIds(child as { id?: string; children?: unknown[] }, out);
    return out;
}

export function createLobbyCityHubControllerSuite(): TestSuite {
    const suite = new TestSuite('LobbyCityHubController (主大廳城池主視覺)');

    suite.test('五類收納涵蓋大廳所有功能入口，不重複', () => {
        const actions = LOBBY_CATEGORIES.flatMap(c => c.items.map(i => i.id));
        assert.equals(18, actions.length);
        assert.equals(actions.length, new Set(actions).size);
        assert.equals(5, LOBBY_SUB_SLOTS);
    });

    suite.test('點類別展開，再點同一類收起，點別類切換', () => {
        assert.equals('sortie', toggleCategory(null, 'sortie'));
        assert.equals(null, toggleCategory('sortie', 'sortie'));
        assert.equals('shop', toggleCategory('sortie', 'shop'));
        assert.equals('battle', actionAt('sortie', 0));
        assert.equals('rival', actionAt('sortie', 1), '出征分類可直接進外交・征伐（AI 勢力互動）');
        assert.equals(null, actionAt('sortie', 3));
        assert.equals('recruitHall', actionAt('domestic', 1), '內政分類可直接進招賢館（20 位名將可選）');
        assert.equals('governorHall', actionAt('domestic', 4), '內政分類可進太守府（PROG-2-0986）');
        assert.equals('warehouse', actionAt('shop', 2));
        assert.equals(null, actionAt(null, 0));
    });

    suite.test('沒展開時子選單隱藏；展開武將顯示四個子功能', () => {
        const closed = buildLobbyCityHubView(input());
        assert.isFalse(closed.actives.subMenu);
        const open = buildLobbyCityHubView(input({ openCategory: 'generals' }));
        assert.isTrue(open.actives.subMenu);
        assert.equals('武將名冊', open.texts.sub0Label);
        assert.isTrue(open.actives.btnSub4);
        assert.equals('傭兵結義', open.texts.sub1Label, '武將分類可直接進傭兵試用→結義（MVP §E #11）');
        assert.equals('▲ 武將', open.texts.btnCatGeneralsLabel);
        const shop = buildLobbyCityHubView(input({ openCategory: 'shop' }));
        assert.isTrue(shop.actives.btnSub2);
        assert.isFalse(shop.actives.btnSub3);
    });

    suite.test('子功能可帶動態文字（天下沙盤開放狀態）', () => {
        const view = buildLobbyCityHubView(input({ openCategory: 'domestic', actionLabels: { sandtable: '天下沙盤（尚未開放）' } }));
        assert.equals('天下沙盤（尚未開放）', view.texts.sub3Label);
    });

    suite.test('頂列顯示勢力、官職、主將與四項資源', () => {
        const view = buildLobbyCityHubView(input());
        assert.equals(PLAYER_HOME_CITY.faction, view.texts.lordFaction);
        assert.equals('郡守　主將 魏延', view.texts.lordSub);
        assert.equals('金 248,400', view.texts.resGold);
        assert.equals('兵 6,400', view.texts.resTroops);
        assert.equals('白身　主將 未定', buildLobbyCityHubView(input({ leadName: null, officerRank: '' })).texts.lordSub);
    });

    suite.test('都市卡：人口隨季成長、民心隨名聲上升且有上限、天下勢力摘要', () => {
        assert.equals(86000, cityPopulation(4));
        assert.equals('8.6 萬', populationText(86000));
        assert.equals('9,500', populationText(9500));
        assert.equals(65, cityMorale(100));
        assert.equals(90, cityMorale(100000));
        const view = buildLobbyCityHubView(input());
        assert.equals('人口 8.6 萬', view.texts.cityPopulation);
        assert.equals('守軍 6,400 / 8,000', view.texts.cityGarrison);
        assert.isTrue(view.texts.cityRivals.startsWith('天下 8 方勢力'));
    });

    suite.test('版型含所有綁定節點；季度卡只留推進一季', () => {
        const hub = JSON.parse(readFileSync(join(ROOT, 'assets/resources/ui-spec/layouts/lobby-city-hub-main.json'), 'utf8'));
        const ids = layoutIds(hub.root, new Set());
        const view = buildLobbyCityHubView(input({ openCategory: 'generals' }));
        for (const key of [...Object.keys(view.texts), ...Object.keys(view.actives)]) assert.isTrue(ids.has(key), key);
        for (const c of LOBBY_CATEGORIES) assert.isTrue(ids.has(categoryButtonId(c.id)));
        const hud = JSON.parse(readFileSync(join(ROOT, 'assets/resources/ui-spec/layouts/lobby-season-hud-main.json'), 'utf8'));
        const hudIds = layoutIds(hud.root, new Set());
        assert.isTrue(hudIds.has('btnAdvanceSeason'));
        assert.isFalse(hudIds.has('btnOpenNurture'));
    });

    return suite;
}
