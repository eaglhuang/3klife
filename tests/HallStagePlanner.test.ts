/**
 * HallStagePlanner.test.ts — 幕府大廳 Q 版武將站位（UI-2-0136，UI-2-0123 子項）
 */
import { assert, TestSuite } from './TestRunner';
import { generalIdToSnake, HallStageLayout, planHallStage } from '../assets/scripts/core/systems/HallStagePlanner';

function loadJson<T>(rel: string): T {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')) as T;
}

const LAYOUT = loadJson<HallStageLayout>('assets/resources/data/hall-map/hall-stage-spots.json');
const FIVE = [
    { id: 'liu-bei', name: '劉備', title: '主公' },
    { id: 'zhuge-liang', name: '諸葛亮' },
    { id: 'huang-zhong', name: '黃忠' },
    { id: 'guan-yu', name: '關羽' },
    { id: 'zhang-fei', name: '張飛' },
];

export function createHallStagePlannerSuite(): TestSuite {
    const suite = new TestSuite('HallStagePlanner');

    suite.test('點位資料：6~8 個點位，fillOrder 只引用存在的點位且不重複', () => {
        assert.inRange(LAYOUT.spots.length, 6, 8, '點位數');
        const ids = new Set(LAYOUT.spots.map(s => s.id));
        assert.equals(LAYOUT.fillOrder.length, new Set(LAYOUT.fillOrder).size, 'fillOrder 不可重複');
        for (const id of LAYOUT.fillOrder) assert.isTrue(ids.has(id), `fillOrder 引用不存在的點位 ${id}`);
    });

    suite.test('五人照設計稿站位：中央劉備、前排孔明與黃忠，右側的人翻面', () => {
        const byId = new Map(planHallStage(FIVE, LAYOUT).map(p => [p.generalId, p] as const));
        assert.equals(byId.get('liu-bei')!.footX, 960, '劉備在中央');
        assert.equals(byId.get('zhuge-liang')!.footX, 800, '孔明前排左');
        assert.equals(byId.get('huang-zhong')!.footX, 1120, '黃忠前排右');
        assert.isFalse(byId.get('guan-yu')!.flip, '左側關羽不翻面');
        assert.isTrue(byId.get('zhang-fei')!.flip, '右側張飛翻面');
        assert.isTrue(byId.get('huang-zhong')!.flip, '右側黃忠翻面');
        assert.isFalse(byId.get('liu-bei')!.flip, '中線上不翻面');
    });

    suite.test('輸出依腳底 y 排序：後排先畫、前排後畫', () => {
        const ys = planHallStage(FIVE, LAYOUT).map(p => p.footY);
        for (let i = 1; i < ys.length; i++) assert.isTrue(ys[i - 1] <= ys[i], `第 ${i} 位排序錯誤：${ys.join(',')}`);
    });

    suite.test('中心原點座標：x 減半寬、y 翻轉', () => {
        const p = planHallStage([FIVE[0]], LAYOUT)[0];
        assert.equals(p.stageX, 0, '中央 x');
        assert.equals(p.stageY, 540 - 872, '腳底 y 轉為 y 向上');
    });

    suite.test('圖檔候選：Q 版優先、頭像其次，id 轉底線', () => {
        const p = planHallStage([{ id: 'zhuge-liang', name: '諸葛亮' }], LAYOUT)[0];
        assert.equals(p.spriteCandidates.join('|'),
            'sprites/generals/chibi/zhuge_liang_chibi|sprites/generals/avatars/zhuge_liang_avatar', '候選路徑');
        assert.equals(generalIdToSnake('Sima-Yi'), 'sima_yi', 'kebab 轉底線');
    });

    suite.test('任務標記、官職與重複人物', () => {
        const placed = planHallStage([FIVE[0], FIVE[0], FIVE[1]], LAYOUT, new Set(['zhuge-liang']));
        assert.lengthEquals(2, placed, '重複的人只站一次');
        const byId = new Map(placed.map(p => [p.generalId, p] as const));
        assert.isTrue(byId.get('zhuge-liang')!.hasTaskMark, '孔明頭上有「!」');
        assert.isFalse(byId.get('liu-bei')!.hasTaskMark, '劉備沒有標記');
        assert.equals(byId.get('liu-bei')!.title, '主公', '官職');
        assert.equals(byId.get('zhuge-liang')!.title, null, '無官職為 null');
    });

    suite.test('人數超過點位時多的略過；空名單回傳空陣列', () => {
        const many = Array.from({ length: 10 }, (_, i) => ({ id: `g-${i}`, name: `將${i}` }));
        assert.lengthEquals(LAYOUT.fillOrder.length, planHallStage(many, LAYOUT), '最多佔滿點位');
        assert.lengthEquals(0, planHallStage([], LAYOUT), '空名單');
    });

    return suite;
}
