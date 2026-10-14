import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    RED_FACE_SHOW_MAX_ROWS,
    RedFaceShowcaseController,
    RedFaceShowcaseDeps,
} from '../assets/scripts/ui/core/RedFaceShowcaseController';
import type { RedFaceCardLike } from '../assets/scripts/core/systems/RedFaceShowcase';

function readJson(relative: string): any {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf8'));
}

const CARDS: RedFaceCardLike[] = [
    { id: 'a', name: '甲', previewLine: '甲的台詞', effectTags: ['t1', 't2'] },
    { id: 'da-qiao', name: '大喬', previewLine: '江東二喬', effectTags: ['morale-aura'] },
    { id: 'b', name: '乙' },
];

function makeDeps(overrides: Partial<RedFaceShowcaseDeps> = {}): RedFaceShowcaseDeps {
    return {
        pool: () => ({ candidateIds: ['a', 'da-qiao', 'b'] }),
        cards: () => CARDS,
        generalPoolIds: () => [],
        ...overrides,
    };
}

export function createRedFaceShowcaseControllerSuite(): TestSuite {
    const suite = new TestSuite('RedFaceShowcaseController (OPEN-10 畫面流程)');

    suite.test('展示列依 buildRedFaceShowcase 排序：核心置頂，預設選中第一位', () => {
        const controller = new RedFaceShowcaseController(makeDeps());
        const rows = controller.rows();
        assert.equals('da-qiao', rows[0].id);
        assert.equals('大喬', controller.selected()!.name);
        const view = controller.getFlowView();
        assert.equals('大喬', view.texts.redFaceRow0Name);
        assert.equals('核心', view.texts.redFaceRow0Tag);
        assert.equals('江東二喬', view.texts.redFaceDetailLine ?? '');
        assert.isTrue(view.actives.redFaceDetail);
    });

    suite.test('點列切換選中的紅顏，詳情與按鈕文字跟著變', () => {
        const controller = new RedFaceShowcaseController(makeDeps());
        controller.select(1);
        assert.equals('甲', controller.selected()!.name);
        const view = controller.getFlowView();
        assert.equals('甲的台詞', view.texts.redFaceDetailLine);
        assert.equals('t1 · t2', view.texts.redFaceDetailTags);
        assert.equals('檢視中', view.texts.btnRedFaceRow1Label);
        assert.equals('檢視', view.texts.btnRedFaceRow0Label);
    });

    suite.test('超出展示列的索引忽略，不改選中項', () => {
        const controller = new RedFaceShowcaseController(makeDeps());
        controller.select(99);
        assert.equals('大喬', controller.selected()!.name);
    });

    suite.test('名將池重疊的武將不進展示；紅顏池不存在時列為空並顯示提示', () => {
        const excluded = new RedFaceShowcaseController(makeDeps({ generalPoolIds: () => ['a'] }));
        assert.equals(2, excluded.rows().length);
        const none = new RedFaceShowcaseController(makeDeps({ pool: () => null }));
        const view = none.getFlowView();
        assert.equals(0, none.rows().length);
        assert.isFalse(view.actives.redFaceRow0);
        assert.isTrue(view.actives.redFaceEmptyLabel);
        assert.equals('目前沒有可展示的紅顏', view.texts.redFaceEmptyLabel);
        assert.isFalse(view.actives.redFaceDetail);
    });

    suite.test('展示列最多 5 格，超出的紅顏不顯示', () => {
        const many: RedFaceCardLike[] = Array.from({ length: 8 }, (_, i) => ({ id: `r${i}`, name: `紅${i}` }));
        const controller = new RedFaceShowcaseController(makeDeps({
            pool: () => ({ candidateIds: many.map(card => card.id) }),
            cards: () => many,
        }));
        assert.equals(RED_FACE_SHOW_MAX_ROWS, controller.rows().length);
        const view = controller.getFlowView();
        assert.isFalse(view.actives[`redFaceRow${RED_FACE_SHOW_MAX_ROWS}`] ?? false);
    });

    suite.test('layout 節點 id 涵蓋所有 flow key，skin slot 都已定義', () => {
        const layout = readJson('assets/resources/ui-spec/layouts/red-face-showcase-main.json');
        const skin = readJson('assets/resources/ui-spec/skins/red-face-showcase-screen.skin.json');
        const screen = readJson('assets/resources/ui-spec/screens/red-face-showcase-screen.json');
        const ids = new Set<string>();
        const slots: string[] = [];
        const walk = (node: any): void => {
            if (!node || typeof node !== 'object') return;
            if (typeof node.id === 'string') ids.add(node.id);
            if (typeof node.skinSlot === 'string') slots.push(node.skinSlot);
            if (typeof node.styleSlot === 'string') slots.push(node.styleSlot);
            for (const child of node.children ?? []) walk(child);
        };
        walk(layout.root);
        const view = new RedFaceShowcaseController(makeDeps()).getFlowView();
        const keys = [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled)];
        for (const key of keys) {
            assert.isTrue(ids.has(key), `layout 缺少節點 ${key}`);
        }
        for (const slot of slots) {
            assert.isTrue(slot in skin.slots, `skin 缺少 ${slot}`);
        }
        assert.equals(layout.id, screen.layout);
        assert.equals(skin.id, `${screen.skin}`);
    });

    suite.test('讀取真實資料：紅顏池 5 位，核心三位置頂，名將池無重疊', () => {
        const gacha = readJson('assets/resources/data/gacha-config.json') as any[];
        const supportPool = gacha.find(pool => pool.poolType === 'support');
        const heroIds = gacha.filter(pool => pool.poolType === 'hero').flatMap(pool => pool.candidateIds ?? []);
        const cards = readJson('assets/resources/data/support-cards.json') as RedFaceCardLike[];
        const controller = new RedFaceShowcaseController({
            pool: () => ({ candidateIds: supportPool.candidateIds }),
            cards: () => cards,
            generalPoolIds: () => heroIds,
        });
        const rows = controller.rows();
        assert.equals(5, rows.length);
        assert.equals(['da-qiao', 'xiao-qiao', 'zhen-mi'].join(','), rows.slice(0, 3).map(row => row.id).join(','));
        assert.isFalse(rows.some(row => heroIds.includes(row.id)));
    });

    return suite;
}
