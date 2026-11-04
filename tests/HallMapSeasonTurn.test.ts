/**
 * HallMapSeasonTurn.test.ts — 他國季事件轉成大廳勢力圖聚焦序列（UI-2-0151）
 */
import { assert, TestSuite } from './TestRunner';
import { nationDef } from '../assets/scripts/core/systems/RivalNations';
import type { HallMapEventCatalog } from '../assets/scripts/core/systems/HallMapEventMapper';
import type { HallMapLayout } from '../assets/scripts/core/systems/HallMapFocusPlanner';
import { buildHallMapTurnSteps, hasHallMapFocus, type HallMapProvinceSource } from '../assets/scripts/core/systems/HallMapSeasonTurn';

function loadJson<T>(rel: string): T {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')) as T;
}

const CONFIG = {
    layout: loadJson<HallMapLayout>('assets/resources/data/hall-map/hall-map-layout.json'),
    catalog: loadJson<HallMapEventCatalog>('assets/resources/data/hall-map/hall-map-events.json'),
    provinces: loadJson<{ provinces: HallMapProvinceSource[] }>('assets/resources/data/hall-map/han13-provinces.json').provinces,
    nationName: (id: string) => nationDef(id)?.name,
};

export function createHallMapSeasonTurnSuite(): TestSuite {
    const suite = new TestSuite('HallMapSeasonTurn');

    suite.test('魏國來犯：聚焦魏國根據地，標籤帶勢力名，最後回到 mini', () => {
        const steps = buildHallMapTurnSteps([{ nationId: 'wei', kind: 'attack' }], CONFIG);
        assert.isTrue(hasHallMapFocus(steps));
        const focus = steps.find((s) => s.mode === 'focus');
        assert.equals(focus!.focus!.provinceId, CONFIG.catalog.nationSeats.wei);
        assert.contains(focus!.event!.label, nationDef('wei')!.name);
        assert.equals(steps[steps.length - 1].mode, 'mini');
    });

    suite.test('沒有可播事件時只有 mini，不需要播', () => {
        const steps = buildHallMapTurnSteps([{ nationId: 'nobody', kind: 'attack' }], CONFIG);
        assert.isFalse(hasHallMapFocus(steps));
        assert.isFalse(hasHallMapFocus(buildHallMapTurnSteps([], CONFIG)));
    });

    return suite;
}
