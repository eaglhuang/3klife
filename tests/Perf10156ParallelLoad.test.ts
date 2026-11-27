// @spec-source → PROG-2-10156（戰場載入：VFX 池預熱與 Spine 預載改並行）
import { assert, TestSuite } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

function sceneSource(): string {
    return fs.readFileSync(path.resolve(__dirname, '../assets/scripts/battle/views/BattleScene.ts'), 'utf8').replace(/\r\n/g, '\n');
}

function at(src: string, needle: string): number {
    const i = src.indexOf(needle);
    assert.isTrue(i >= 0, `BattleScene.ts 找不到：${needle}`);
    return i;
}

export function createPerf10156ParallelLoadSuite(): TestSuite {
    const suite = new TestSuite('Perf10156ParallelLoad (VFX 池與 Spine 預載並行，單位出現前／開戰前才等)');

    suite.test('VFX 池預熱在資料載入前就送出，且 initBattle 之前才等（開戰前池要好）', () => {
        const s = sceneSource();
        const send = at(s, 'const vfxWarm');
        assert.isTrue(send < at(s, 'await this.ctrl.loadData()'), 'VFX 預熱要在戰場資料載入之前送出');
        const wait = at(s, 'await vfxWarm');
        assert.isTrue(wait < at(s, 'this.ctrl.initBattle('), '開戰前要等 VFX 池好');
        assert.isTrue(wait > at(s, 'await loadEncounter('), '等的位置在資料載入之後，才有並行空間');
        assert.isTrue(!s.includes('await prewarmVfxPools()'));
    });

    suite.test('Spine 預載先送出不等，訂閱事件與 refreshBattleViews（單位出現）前才等，保留預載行為', () => {
        const s = sceneSource();
        const send = at(s, 'const spineWarm');
        assert.isTrue(send > at(s, 'ensureUnitRenderer('), 'Spine 預載需要 unitRenderer，要在建立之後');
        assert.isTrue(s.includes('prewarmTroopSpines(battleTroopPreloadList(AI_USABLE_TYPES, initialCards))'));
        const wait = at(s, 'await spineWarm');
        assert.isTrue(wait > send);
        assert.isTrue(wait < at(s, 'this.battleUIBridge?.subscribeEvents('), '訂閱事件前要等 Spine 預載');
        assert.isTrue(!s.includes('await this.unitRenderer?.prewarmTroopSpines'));
    });

    suite.test('兩段預載失敗都有處理：只警告、不擋戰場載入（不丟出）', () => {
        const s = sceneSource();
        const v = s.slice(at(s, 'const vfxWarm'), at(s, 'const vfxWarm') + 700);
        assert.contains(v, '(e) => UCUFLogger.warn');
        const sp = s.slice(at(s, 'const spineWarm'), at(s, 'const spineWarm') + 900);
        assert.contains(sp, '(e) => UCUFLogger.warn');
    });

    suite.test('capture mode 仍略過兩段預載', () => {
        const s = sceneSource();
        const v = s.slice(at(s, 'const vfxWarm'), at(s, 'const vfxWarm') + 200);
        assert.contains(v, 'isBattleCaptureMode');
        const sp = s.slice(at(s, 'const spineWarm'), at(s, 'const spineWarm') + 200);
        assert.contains(sp, 'isBattleCaptureMode');
    });

    return suite;
}
