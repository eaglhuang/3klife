/**
 * BattlePerfProbe.test.ts — 戰場每幀分段計時（PROG-2-9713）
 * 關閉時完全不計時；開啟後累計次數／總毫秒／最大毫秒與幀數；棋盤底色材質開 instancing、疊加層不開。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import {
    _resetBattlePerfFlagForTest, battlePerfEnabled, perfBegin, perfEnd, perfFrame, resetBattlePerf,
} from '../assets/scripts/battle/views/BattlePerfProbe';

type PerfGlobal = typeof globalThis & { __BATTLE_PERF_ON__?: boolean; __BATTLE_PERF__?: { frames: number; sections: Record<string, { calls: number; totalMs: number; maxMs: number }> } };
const g = globalThis as PerfGlobal;
const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

export function createBattlePerfProbeSuite(): TestSuite {
    const suite = new TestSuite('BattlePerfProbe (戰場分段計時 PROG-2-9713)');

    suite.test('預設關閉：perfBegin 回 0，perfEnd／perfFrame 不建立任何資料', () => {
        delete g.__BATTLE_PERF_ON__;
        delete g.__BATTLE_PERF__;
        _resetBattlePerfFlagForTest();
        assert.isFalse(battlePerfEnabled());
        assert.equals(0, perfBegin());
        perfEnd('x', perfBegin());
        perfFrame();
        assert.isTrue(g.__BATTLE_PERF__ === undefined);
    });

    suite.test('開啟後累計次數、總毫秒、最大毫秒與幀數；reset 清空', () => {
        g.__BATTLE_PERF_ON__ = true;
        resetBattlePerf();
        delete g.__BATTLE_PERF__;
        perfFrame();
        perfFrame();
        perfEnd('seg', perfBegin());
        perfEnd('seg', perfBegin());
        const snap = g.__BATTLE_PERF__!;
        assert.equals(2, snap.frames);
        assert.equals(2, snap.sections.seg.calls);
        assert.isTrue(snap.sections.seg.totalMs >= 0 && snap.sections.seg.maxMs <= snap.sections.seg.totalMs + 1e-9);
        resetBattlePerf();
        assert.equals(0, g.__BATTLE_PERF__!.frames);
        delete g.__BATTLE_PERF_ON__;
        delete g.__BATTLE_PERF__;
    });

    suite.test('棋盤：底色材質開 instancing，shader 走 CCGetWorldMatrix', () => {
        const board = read('assets/scripts/battle/views/BoardRenderer.ts');
        assert.isTrue(board.includes('defines: instanced ? { USE_INSTANCING: true } : undefined'));
        assert.equals(2, board.split('            true\n        );').length - 1);
        const effect = read('assets/resources/effects/board-jelly.effect');
        assert.isTrue(effect.includes('#include <legacy/local-batch>'));
        assert.isTrue(effect.includes('CCGetWorldMatrix(matWorld)'));
        assert.isFalse(effect.includes('cc_matWorld * pos'));
    });

    return suite;
}
