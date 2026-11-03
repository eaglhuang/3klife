/**
 * HallMapEventMapper.test.ts — 他國季度事件 → 大廳勢力圖聚焦事件（UI-2-0129，UI-2-0123 子項）
 */
import { assert, TestSuite } from './TestRunner';
import { HallMapEventCatalog, mapSeasonEventsToHallMap } from '../assets/scripts/core/systems/HallMapEventMapper';
import { readProvinceCentroids } from '../assets/scripts/core/systems/HallMapFocusPlanner';
import { NATION_DEFS, nationDef } from '../assets/scripts/core/systems/RivalNations';

function loadJson<T>(rel: string): T {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')) as T;
}

export function createHallMapEventMapperSuite(): TestSuite {
    const suite = new TestSuite('HallMapEventMapper');
    const catalog = loadJson<HallMapEventCatalog>('assets/resources/data/hall-map/hall-map-events.json');
    const provinces = loadJson<{ provinces: { id: string; name: string; centroid?: number[] }[] }>(
        'assets/resources/data/hall-map/han13-provinces.json',
    ).provinces;
    const centroids = readProvinceCentroids(provinces);
    const names = {
        nationName: (id: string) => nationDef(id)?.name,
        provinceName: (id: string) => provinces.find((p) => p.id === id)?.name,
    };

    suite.test('每個勢力都有根據地，且根據地州都有中心點', () => {
        for (const def of NATION_DEFS) {
            const seat = catalog.nationSeats[def.id];
            assert.isTrue(!!seat, `${def.id} 缺根據地`);
            assert.isTrue(!!centroids[seat], `${def.id} 的 ${seat} 沒有中心點`);
        }
    });

    suite.test('進攻事件轉成「戰」字章與帶勢力、州名的標籤', () => {
        const out = mapSeasonEventsToHallMap([{ nationId: 'wei', kind: 'attack' }], catalog, names);
        assert.lengthEquals(1, out);
        assert.equals(catalog.nationSeats.wei, out[0].provinceId);
        assert.equals(catalog.eventKinds.attack.glyph, out[0].glyph);
        assert.contains(out[0].label, '魏');
        assert.contains(out[0].label, names.provinceName(catalog.nationSeats.wei)!);
    });

    suite.test('未知勢力與未設定的事件種類略過，不丟錯', () => {
        const out = mapSeasonEventsToHallMap([
            { nationId: 'nobody', kind: 'attack' },
            { nationId: 'wu', kind: 'unknown-kind' },
            { nationId: 'wu', kind: 'attack' },
        ], catalog, names);
        assert.lengthEquals(1, out);
        assert.equals(catalog.nationSeats.wu, out[0].provinceId);
    });

    suite.test('同一州同一種事件只留一次，保留原本順序', () => {
        const out = mapSeasonEventsToHallMap([
            { nationId: 'yuan', kind: 'attack' },
            { nationId: 'yuan', kind: 'attack' },
            { nationId: 'mateng', kind: 'attack' },
        ], catalog, names);
        assert.lengthEquals(2, out);
        assert.equals(catalog.nationSeats.yuan, out[0].provinceId);
        assert.equals(catalog.nationSeats.mateng, out[1].provinceId);
    });

    suite.test('查不到名稱時標籤退回 id，不留下樣板記號', () => {
        const out = mapSeasonEventsToHallMap([{ nationId: 'wei', kind: 'attack' }], catalog, {
            nationName: () => undefined,
            provinceName: () => undefined,
        });
        assert.contains(out[0].label, 'wei');
        assert.notContains(out[0].label, '{');
    });

    return suite;
}
