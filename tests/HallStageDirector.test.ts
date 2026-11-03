/**
 * HallStageDirector.test.ts — 幕府大廳舞台變動偵測（UI-2-0139，UI-2-0123 子項）
 */
import { assert, TestSuite } from './TestRunner';
import { HallStageDirector } from '../assets/scripts/core/systems/HallStageDirector';
import type { HallStageLayout } from '../assets/scripts/core/systems/HallStagePlanner';

function loadJson<T>(rel: string): T {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')) as T;
}

const LAYOUT = loadJson<HallStageLayout>('assets/resources/data/hall-map/hall-stage-spots.json');
const TWO = [{ id: 'liu-bei', name: '劉備', title: '主公' }, { id: 'guan-yu', name: '關羽' }];
const cast = (generals = TWO, marks: string[] = []) => ({ generals, taskMarkIds: new Set(marks) });

export function createHallStageDirectorSuite(): TestSuite {
    const suite = new TestSuite('HallStageDirector');

    suite.test('第一次必回傳站位，同一份名單再丟回傳 null', () => {
        const director = new HallStageDirector(LAYOUT);
        const first = director.update(cast());
        assert.isTrue(first !== null, '第一次');
        assert.lengthEquals(2, first!, '兩人');
        assert.equals(director.update(cast()), null, '沒變');
    });

    suite.test('換人、換順序或改官職都視為變動', () => {
        const director = new HallStageDirector(LAYOUT);
        director.update(cast());
        assert.isTrue(director.update(cast([TWO[1], TWO[0]])) !== null, '換順序');
        assert.isTrue(director.update(cast([TWO[1], { id: 'zhang-fei', name: '張飛' }])) !== null, '換人');
        assert.isTrue(director.update(cast([TWO[1], { id: 'zhang-fei', name: '張飛', title: '車騎將軍' }])) !== null, '改官職');
    });

    suite.test('任務標記增減視為變動，並反映在站位上', () => {
        const director = new HallStageDirector(LAYOUT);
        director.update(cast());
        const marked = director.update(cast(TWO, ['guan-yu']));
        assert.isTrue(marked !== null, '加標記');
        assert.isTrue(marked!.find(p => p.generalId === 'guan-yu')!.hasTaskMark, '關羽有標記');
        assert.isTrue(director.update(cast()) !== null, '撤標記');
    });

    suite.test('reset 後下一次必回傳站位', () => {
        const director = new HallStageDirector(LAYOUT);
        director.update(cast());
        director.reset();
        assert.isTrue(director.update(cast()) !== null, 'reset 後');
    });

    return suite;
}
