/**
 * LobbyHallStageController.test.ts — 幕府大廳舞台控制器（UI-2-0142，UI-2-0123 子項）
 */
import { assert, TestSuite } from './TestRunner';
import { LobbyHallStageController } from '../assets/scripts/ui/core/LobbyHallStageController';
import type { HallStageCast } from '../assets/scripts/core/systems/HallStageDirector';
import type { HallStageLayout, HallStagePlacement } from '../assets/scripts/core/systems/HallStagePlanner';

function loadJson<T>(rel: string): T {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')) as T;
}

const LAYOUT = loadJson<HallStageLayout>('assets/resources/data/hall-map/hall-stage-spots.json');

function rig() {
    const log: string[] = [];
    let cast: HallStageCast = { generals: [{ id: 'liu-bei', name: '劉備' }], taskMarkIds: new Set() };
    const refreshed: number[] = [];
    const controller = new LobbyHallStageController(LAYOUT, {
        refreshSpots: now => { refreshed.push(now); },
        cast: () => cast,
        view: {
            show: (p: readonly HallStagePlacement[]) => { log.push(`show:${p.map(x => x.generalId).join(',')}`); },
            clear: () => { log.push('clear'); },
        },
    });
    return { controller, log, refreshed, setCast: (c: HallStageCast) => { cast = c; } };
}

export function createLobbyHallStageControllerSuite(): TestSuite {
    const suite = new TestSuite('LobbyHallStageController');

    suite.test('open 立刻刷新並排一次站位', () => {
        const { controller, log, refreshed } = rig();
        controller.open(100);
        assert.equals(refreshed.join(','), '100', '刷新時間');
        assert.equals(log.join('|'), 'show:liu-bei', '畫面');
        assert.isTrue(controller.isOpen, '已開啟');
    });

    suite.test('名單沒變的 tick 不重建，換人才重建', () => {
        const { controller, log, setCast } = rig();
        controller.open(0);
        assert.isFalse(controller.tick(30), '沒變');
        setCast({ generals: [{ id: 'guan-yu', name: '關羽' }], taskMarkIds: new Set() });
        assert.isTrue(controller.tick(60), '換人');
        assert.equals(log.join('|'), 'show:liu-bei|show:guan-yu', '兩次畫面');
    });

    suite.test('未開啟時 tick 不刷新也不畫', () => {
        const { controller, log, refreshed } = rig();
        assert.isFalse(controller.tick(10), '未開啟');
        assert.lengthEquals(0, refreshed, '沒刷新');
        assert.lengthEquals(0, log, '沒畫');
    });

    suite.test('close 清空畫面，重新 open 必定重排', () => {
        const { controller, log } = rig();
        controller.open(0);
        controller.close();
        controller.close();
        controller.open(5);
        assert.equals(log.join('|'), 'show:liu-bei|clear|show:liu-bei', '清空一次後重排');
    });

    return suite;
}
