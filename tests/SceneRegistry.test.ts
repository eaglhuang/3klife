/**
 * SceneRegistry.test.ts — WP4 場景註冊表、切換服務、面板版面（PROG-2-10212）
 * 鎖住：72 場景 id 唯一且區別正確、任一場景直達任一場景且 ≤ 0.8 秒、最近 8／收藏 12 規則與存檔 adapter、
 * 佔位底圖＋施工中、橫直式版面（列高 ≥ 56、元件不出界、拇指鈕在下半部）、四語系 key 完整且無寫死中文。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { SceneRegistry, LIFE_AREA_IDS, LIFE_SCENE_TOTAL, validateAreaMaps, type LifeAreaMapsData } from '../assets/scripts/ui/life/SceneRegistry';
import { SceneSwitchService, InMemoryLifeSceneStore } from '../assets/scripts/ui/life/SceneSwitchService';
import { FindPersonResolver, FAKE_FIND_ROSTER } from '../assets/scripts/ui/life/FindPersonResolver';
import { ScenePanelController, resolveLifeUiLayout, type Rect, type LifeUiLayoutData } from '../assets/scripts/ui/life/ScenePanelController';

const ROOT = path.resolve(__dirname, '..');
const readJson = <T = any>(rel: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'];
const layoutData = readJson<LifeUiLayoutData>('assets/resources/data/life-ui-layout.json');

const inside = (r: Rect, outer: Rect): boolean =>
    r.x >= -0.001 && r.y >= -0.001 && r.x + r.w <= outer.w + 0.001 && r.y + r.h <= outer.h + 0.001;
const overlap = (a: Rect, b: Rect): boolean =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function makePanel(store = new InMemoryLifeSceneStore()) {
    const registry = new SceneRegistry();
    const service = new SceneSwitchService(registry, store);
    const panel = new ScenePanelController({
        registry,
        service,
        resolver: new FindPersonResolver(registry),
        roster: () => FAKE_FIND_ROSTER,
        intel: () => 50,
    });
    return { registry, service, panel, store };
}

export function createSceneRegistrySuite(): TestSuite {
    const suite = new TestSuite('SceneRegistry (PROG-2-10212 WP4)');

    suite.test('註冊表：7 區、72 個場景 id 唯一、區別與前綴一致', () => {
        const reg = new SceneRegistry();
        assert.equals(7, reg.getAreas().length);
        assert.equals(LIFE_SCENE_TOTAL, reg.sceneCount);
        const ids = reg.getAllScenes().map((s) => s.id);
        assert.equals(72, new Set(ids).size);
        const expected: Record<string, number> = { gov: 8, mil: 7, mkt: 23, edu: 12, home: 4, out: 12, mtn: 6 };
        for (const area of LIFE_AREA_IDS) {
            const scenes = reg.getScenesOfArea(area);
            assert.equals(expected[area], scenes.length, `${area} 場景數`);
            for (const s of scenes) {
                assert.equals(area, s.areaId);
                assert.isTrue(s.id.startsWith(`${area}_`), `${s.id} 前綴`);
                assert.equals(area, reg.areaOf(s.id) as string);
            }
        }
    });

    suite.test('註冊表：資料寫錯會被驗出（重複 id、放錯區）', () => {
        const good = readJson<LifeAreaMapsData>('assets/resources/data/life-area-maps.json');
        assert.equals(0, validateAreaMaps(good).length);
        const dup: LifeAreaMapsData = JSON.parse(JSON.stringify(good));
        dup.areas[0].scenes.push({ ...dup.areas[0].scenes[0] });
        assert.isTrue(validateAreaMaps(dup).length > 0, '重複 id');
        const wrong: LifeAreaMapsData = JSON.parse(JSON.stringify(good));
        wrong.areas[0].scenes[0].id = 'mil_hall';
        assert.isTrue(validateAreaMaps(wrong).some((e) => e.includes('prefix')), '放錯區');
        assert.throws(() => new SceneRegistry(wrong));
    });

    suite.test('任一場景可直達任一場景，每次切換總時間 ≤ 0.8 秒', () => {
        const { registry, service } = makePanel();
        const all = registry.getAllScenes();
        for (const from of all) {
            for (const to of all) {
                service.switchTo(from.id);
                const r = service.switchTo(to.id);
                assert.isTrue(r.ok, `${from.id} → ${to.id}`);
                assert.equals(to.id, service.currentSceneId as string);
                assert.isTrue(r.transitionSec <= 0.8, '≤ 0.8 秒');
            }
        }
        const bad = service.switchTo('nowhere');
        assert.isFalse(bad.ok);
        assert.equals('unknown-scene', bad.reason as string);
    });

    suite.test('沒有美術的場景：可進入並標「施工中」（不擋切換）；有美術就不標', () => {
        const { service } = makePanel();
        const r = service.switchTo('mkt_street');
        assert.isTrue(r.ok);
        assert.isTrue(r.underConstruction);
        const art: LifeAreaMapsData = readJson('assets/resources/data/life-area-maps.json');
        art.areas[2].scenes[0].hasArt = true;
        const r2 = new SceneSwitchService(new SceneRegistry(art)).switchTo('mkt_street');
        assert.isFalse(r2.underConstruction);
    });

    suite.test('最近只留 8 筆、同場景只留最新一筆、含時段；大圖只快取 2 張', () => {
        const { registry, service } = makePanel();
        const ids = registry.getAllScenes().filter((_, i) => i % 7 === 0).slice(0, 10).map((s) => s.id);
        ids.forEach((id, i) => service.switchTo(id, { slot: i % 7, now: 1000 + i }));
        assert.equals(8, service.recent.length);
        assert.equals(ids[9], service.recent[0].sceneId);
        service.switchTo(ids[5], { slot: 3, now: 5000 });
        assert.equals(ids[5], service.recent[0].sceneId);
        assert.equals(8, service.recent.length);
        assert.equals(1, service.recent.filter((r) => r.sceneId === ids[5]).length);
        assert.equals(3, service.recent[0].slot as number);
        assert.isTrue(service.cachedAreas.length <= 2);
        assert.equals(registry.areaOf(ids[5]) as string, service.preloadAreaId as string);
    });

    suite.test('收藏上限 12：滿了不能再加、取消後可再加、未知場景拒絕', () => {
        const { registry, service } = makePanel();
        const ids = registry.getAllScenes().slice(0, 14).map((s) => s.id);
        for (let i = 0; i < 12; i++) assert.equals('added', service.toggleFavorite(ids[i]));
        assert.equals('full', service.toggleFavorite(ids[12]));
        assert.equals(12, service.favorites.length);
        assert.equals('removed', service.toggleFavorite(ids[0]));
        assert.equals('added', service.toggleFavorite(ids[12]));
        assert.equals('unknown-scene', service.toggleFavorite('nowhere'));
    });

    suite.test('存檔 adapter：切換與收藏都寫入，重開後載回；存檔裡的舊 id 被丟掉', async () => {
        const store = new InMemoryLifeSceneStore();
        const a = makePanel(store).service;
        a.switchTo('gov_hall', { slot: 2, now: 1 });
        a.toggleFavorite('out_river');
        await Promise.resolve();
        assert.isTrue(store.saveCount >= 2);
        const store2 = new InMemoryLifeSceneStore({
            recent: [{ sceneId: 'gov_hall', slot: 2, at: 1 }, { sceneId: 'removed_scene', at: 2 }],
            favorites: ['out_river', 'removed_scene'],
        });
        const b = makePanel(store2).service;
        await b.init();
        assert.equals(1, b.recent.length);
        assert.equals(1, b.favorites.length);
        assert.equals('out_river', b.favorites[0]);
    });

    suite.test('面板：四分頁、地圖→區→場景列表、一鍵進入、點場景後收起抽屜、長按收藏', () => {
        const { panel, service } = makePanel();
        panel.setViewport(1920, 1080);
        panel.open();
        let view = panel.getView();
        assert.equals(4, view.tabs.length);
        assert.equals(7, view.rows.length);
        assert.equals(3, view.gridColumns);
        panel.tapRow(view.rows[2]);
        view = panel.getView();
        assert.equals('mkt', panel.selectedAreaId as string);
        assert.equals('enterArea', view.rows[0].kind);
        assert.equals(1 + 23, view.rows.length);
        const res = panel.tapRow(view.rows[0]);
        assert.isTrue(res !== null && res.ok);
        assert.isFalse(panel.isOpen);
        assert.equals('mkt_street', service.currentSceneId as string);
        panel.open();
        panel.setTab('recent');
        const recentAction = panel.getView().rows[0].action;
        assert.equals('mkt_street', recentAction.type === 'switch' ? recentAction.sceneId : '');
        panel.setTab('favorites');
        assert.equals('life.panel.empty.favorites', panel.getView().emptyKey as string);
        panel.setTab('map');
        panel.selectArea('edu');
        const edu = panel.getView().rows[1];
        assert.equals('added', panel.longPressRow(edu) as string);
        panel.setTab('favorites');
        assert.equals(1, panel.getView().rows.length);
    });

    suite.test('找人分頁：結果依情報等級，點結果跳到所在場景並帶對焦', () => {
        const { panel, service } = makePanel();
        panel.setTab('find');
        panel.setQuery('zhang');
        const view = panel.getView();
        assert.isTrue(view.showSearch);
        assert.equals(1, view.rows.length);
        const row = view.rows[0];
        assert.equals('張飛', row.titleText as string);
        const res = panel.tapRow(row);
        assert.isTrue(res !== null && res.ok);
        assert.equals('mkt_tavern', service.currentSceneId as string);
        assert.equals('actor', (res as { focus: string }).focus);
    });

    const sizes: Array<[string, number, number]> = [
        ['橫式 1920x1080', 1920, 1080],
        ['橫式手機 844x390', 844, 390],
        ['直式 480x854', 480, 854],
        ['直式手機 360x640', 360, 640],
    ];
    for (const [label, w, h] of sizes) {
        suite.test(`版面 ${label}：列高 ≥ 56、元件不出界不互疊、拇指鈕在下半部、列表至少一列`, () => {
            for (const withSearch of [false, true]) {
                const L = resolveLifeUiLayout(w, h, layoutData, { withSearch });
                assert.equals(h > w, L.portrait);
                assert.isTrue(L.rowHeight >= 56, `列高 ${L.rowHeight}`);
                assert.isTrue(L.tabBar.h >= 56 && L.backToLobby.h >= 56 && L.searchBox.h >= 56);
                assert.isTrue(L.mapFab.w >= 56);
                for (const r of [L.mapFab, L.slotBadge, L.companions, L.scenePanel]) assert.isTrue(inside(r, L.screen), '元件在螢幕內');
                for (const r of [L.tabBar, L.backToLobby, L.list]) assert.isTrue(inside(r, L.scenePanel), '面板子元件在面板內');
                if (withSearch) assert.isTrue(inside(L.searchBox, L.scenePanel));
                assert.isTrue(L.mapFab.y + L.mapFab.h / 2 < h / 2, '地圖鈕在下半部');
                assert.isFalse(overlap(L.slotBadge, L.companions), '時段徽章與同行者不互疊');
                assert.isFalse(overlap(L.tabBar, L.backToLobby), '分頁與回大廳鈕不互疊');
                assert.isFalse(overlap(L.tabBar, L.list), '分頁與列表不互疊');
                assert.isFalse(overlap(L.backToLobby, L.list), '回大廳鈕與列表不互疊');
                if (withSearch) {
                    assert.isFalse(overlap(L.searchBox, L.list), '搜尋框與列表不互疊');
                    assert.isFalse(overlap(L.searchBox, L.backToLobby), '搜尋框與回大廳鈕不互疊');
                    assert.isFalse(overlap(L.searchBox, L.tabBar), '搜尋框與分頁不互疊');
                }
                assert.isTrue(L.visibleRows >= 1, `列表至少能放 1 列（${L.visibleRows}）`);
            }
        });
    }

    suite.test('直式覆蓋：面板 70%、分頁在上；橫式 60%、分頁在下；鏡像只翻地圖鈕', () => {
        const land = resolveLifeUiLayout(1920, 1080, layoutData);
        const port = resolveLifeUiLayout(480, 854, layoutData);
        assert.isTrue(Math.abs(land.scenePanel.h - 1080 * 0.6) < 0.01);
        assert.isTrue(Math.abs(port.scenePanel.h - 854 * 0.7) < 0.01);
        assert.equals('bottom', land.tabsAt);
        assert.equals('top', port.tabsAt);
        assert.isTrue(Math.abs(port.tabBar.y + port.tabBar.h - port.scenePanel.h) < 0.001);
        const mirrored = resolveLifeUiLayout(1920, 1080, layoutData, { mirror: true });
        assert.isTrue(mirrored.mapFab.x > 1920 / 2);
        assert.equals(land.slotBadge.x, mirrored.slotBadge.x);
    });

    suite.test('切換總時間設定 ≤ 0.8 秒、收藏／最近上限與資料檔一致', () => {
        assert.isTrue(layoutData.transition.fadeOutSec + layoutData.transition.fadeInSec <= layoutData.transition.maxTotalSec);
        assert.equals(8, layoutData.limits.recentMax);
        assert.equals(12, layoutData.limits.favoritesMax);
        assert.isTrue(new SceneSwitchService(new SceneRegistry()).transitionSec <= 0.8);
    });

    suite.test('i18n：四語系都有 7 區、72 場景、面板與找人文字 key；四檔 life.scene／life.panel key 集合一致', () => {
        const reg = new SceneRegistry();
        const need: string[] = [];
        for (const a of reg.getAreas()) need.push(a.nameKey);
        for (const s of reg.getAllScenes()) need.push(s.nameKey);
        need.push('life.scene.underConstruction', 'life.scene.placeholderHint');
        for (const k of ['mapButton', 'title', 'close', 'backToLobby', 'enterArea', 'areaSceneCount', 'backToAreas',
            'favorite.add', 'favorite.remove', 'favorite.full', 'current', 'empty.recent', 'empty.favorites',
            'find.placeholder', 'find.noResult', 'find.unknown', 'find.cityOnly', 'find.inArea', 'find.inScene',
            'find.next', 'find.go', 'find.friendBoost', 'slotBadge', 'companions']) need.push(`life.panel.${k}`);
        for (const t of ['map', 'recent', 'favorites', 'find']) need.push(`life.panel.tab.${t}`);
        for (let i = 0; i < 7; i++) need.push(`life.panel.slot.${i}`);
        for (let i = 1; i <= 4; i++) need.push(`life.panel.season.${i}`);
        const dicts = LOCALES.map((l) => readJson<Record<string, string>>(`assets/resources/i18n/${l}.json`));
        dicts.forEach((d, i) => {
            for (const k of need) assert.isTrue(typeof d[k] === 'string' && d[k].length > 0, `${LOCALES[i]} 缺 ${k}`);
        });
        // 面板列用到的 key 都存在（避免 controller 組出不存在的 key）
        const { panel } = makePanel();
        for (const tab of ['map', 'recent', 'favorites', 'find'] as const) {
            panel.setTab(tab);
            for (const row of panel.getView().rows) {
                for (const k of [row.titleKey, row.subtitleKey, ...row.titleArgKeys, ...(row.subtitleArgKeys ?? [])]) {
                    if (k) assert.isTrue(typeof dicts[0][k] === 'string', `zh-TW 缺 ${k}`);
                }
            }
        }
        // 英文場景名不能是中文
        for (const s of reg.getAllScenes()) {
            assert.isFalse(/[一-鿿]/.test(dicts[2][s.nameKey]), `en 場景名含中文 ${s.id}`);
        }
        const keysOf = (d: Record<string, string>): string =>
            Object.keys(d).filter((k) => k.startsWith('life.scene.') || k.startsWith('life.panel.')).sort().join('|');
        assert.equals(keysOf(dicts[0]), keysOf(dicts[1]));
        assert.equals(keysOf(dicts[0]), keysOf(dicts[2]));
        assert.equals(keysOf(dicts[0]), keysOf(dicts[3]));
    });

    suite.test('程式碼不寫死中文顯示字：ui/life 的 ts 只有註解與假名冊含中文', () => {
        const dir = path.join(ROOT, 'assets/scripts/ui/life');
        for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.ts'))) {
            if (f === 'FindPersonResolver.ts') continue; // 假名冊：武將名、勢力、官職是資料
            const code = fs.readFileSync(path.join(dir, f), 'utf8')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .split('\n')
                .map((line) => line.replace(/\/\/.*$/, ''))
                .join('\n');
            assert.isFalse(/[一-鿿]/.test(code), `${f} 有寫死中文`);
        }
    });

    suite.test('ui-spec 版面檔：life-scene-panel.json 結構完整、列高資料 ≥ 56', () => {
        const spec = readJson('assets/resources/ui-spec/layouts/life-scene-panel.json');
        assert.equals('life-scene-panel', spec.id);
        const names: string[] = [];
        const walk = (n: { name: string; children?: unknown[] }): void => {
            names.push(n.name);
            (n.children ?? []).forEach((c) => walk(c as { name: string; children?: unknown[] }));
        };
        walk(spec.root);
        for (const n of ['MapFab', 'SlotBadge', 'CompanionRow', 'ScenePanel', 'TabBar', 'SearchBox', 'ListArea', 'BackToLobby']) {
            assert.isTrue(names.includes(n), `缺節點 ${n}`);
        }
        assert.isTrue(layoutData.panelParts.row.minPx >= 56);
    });

    return suite;
}
