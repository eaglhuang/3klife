/**
 * LightingPhase.test.ts — 日夜四季調色與疊層框架（QLIFE-01 第 3.5 節；WP5）
 * 鎖住：4 季 × 7 時段階段判定、深夜 ×0.85、15 秒／0.6 秒 lerp、疊層載入卸載時機、乘色改 JSON 即生效。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { phaseOfHour, phaseOfSlot, seasonOfQuarter, slotToHour } from '../assets/scripts/shared/presentation/lighting/LightingPhase';
import {
    isLightOnInDeepNight, parseHexColor, parseLightingTable, resolveLightingTarget,
} from '../assets/scripts/shared/presentation/lighting/LightingTable';
import type { LightingPhaseId, LightingSeason } from '../assets/scripts/shared/presentation/lighting/LightingTable';
import { SceneLightingController } from '../assets/scripts/shared/presentation/lighting/SceneLightingController';
import { OverlayLifecycle, desiredOverlayIds, shouldHoldAtmosphere } from '../assets/scripts/shared/presentation/lighting/OverlayLifecycle';

const ROOT = path.resolve(__dirname, '..');
const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/life-lighting.json'), 'utf8'));
const table = parseLightingTable(raw);
const SEASONS: LightingSeason[] = ['spring', 'summer', 'autumn', 'winter'];

/** 手算的階段表（規格 3.5.5）：每季時段 1～7 的階段 */
const EXPECT_PHASE: Record<LightingSeason, LightingPhaseId[]> = {
    spring: ['day', 'day', 'day', 'day', 'dusk', 'night', 'night'],
    summer: ['day', 'day', 'day', 'day', 'day', 'night', 'night'],
    autumn: ['dawn', 'day', 'day', 'day', 'dusk', 'night', 'night'],
    winter: ['night', 'day', 'day', 'day', 'dusk', 'night', 'night'],
};
/** 手算的光源圖集／星空持有表：前一個時段預載、後一個時段才卸載 */
const EXPECT_HOLD: Record<LightingSeason, boolean[]> = {
    spring: [true, false, false, true, true, true, true],
    summer: [true, false, false, false, true, true, true],
    autumn: [true, true, false, true, true, true, true],
    winter: [true, true, false, true, true, true, true],
};

function near(expected: number, actual: number, eps = 1e-6): void {
    assert.isTrue(Math.abs(expected - actual) <= eps, `expected ${expected}, got ${actual}`);
}

class FakeLayer {
    colors: number[][] = [];
    intensities: number[] = [];
    applyTint(r: number, g: number, b: number): void { this.colors.push([r, g, b]); }
    applyIntensity(v: number): void { this.intensities.push(v); }
    get last(): number[] { return this.colors[this.colors.length - 1]; }
}

function makeController(quarter: number, slot: number) {
    const layer = new FakeLayer();
    const log: string[] = [];
    const lifecycle = new OverlayLifecycle(table, { load: id => log.push('+' + id), unload: id => log.push('-' + id) });
    const ctl = new SceneLightingController(table, { tintTargets: [layer], lightTargets: [layer], lifecycle });
    ctl.enter(quarter, slot);
    return { ctl, layer, log, lifecycle };
}

export function createLightingPhaseSuite(): TestSuite {
    const suite = new TestSuite('LightingPhase (日夜四季調色 WP5)');

    suite.test('小時換算：時段代表時 6.5／9.5／12.5／15.5／18.5／22／2.5', () => {
        const hours = [1, 2, 3, 4, 5, 6, 7].map(s => slotToHour(table, s));
        assert.equals(JSON.stringify([6.5, 9.5, 12.5, 15.5, 18.5, 22, 2.5]), JSON.stringify(hours));
        near(5, slotToHour(table, 1, 0));
        near(8, slotToHour(table, 1, 1));
    });

    suite.test('4 季 × 7 時段階段判定與規格 3.5.5 一致', () => {
        for (const season of SEASONS) {
            const got = [1, 2, 3, 4, 5, 6, 7].map(s => phaseOfSlot(table, season, s).phase);
            assert.equals(JSON.stringify(EXPECT_PHASE[season]), JSON.stringify(got), `${season} 階段表`);
        }
    });

    suite.test('冬季晨起 07：晨時段代表時 6.5 判為夜；春季 05 同一時段已是日', () => {
        assert.equals('night', phaseOfSlot(table, 'winter', 1).phase);
        assert.equals('day', phaseOfSlot(table, 'spring', 1).phase);
        assert.equals('dawn', phaseOfSlot(table, 'autumn', 1).phase);
    });

    suite.test('階段邊界：晨起、晨起+1.5、夜開始-2、夜開始各季都落在規則上', () => {
        for (const season of SEASONS) {
            const c = table.seasonClock[season];
            assert.equals('night', phaseOfHour(table, season, c.dawnStart - 0.01).phase);
            assert.equals('dawn', phaseOfHour(table, season, c.dawnStart).phase);
            assert.equals('day', phaseOfHour(table, season, c.dawnStart + 1.5).phase);
            assert.equals('dusk', phaseOfHour(table, season, c.nightStart - 2).phase);
            assert.equals('night', phaseOfHour(table, season, c.nightStart).phase);
        }
        assert.equals(20, table.seasonClock.spring.nightStart);
        assert.equals(21, table.seasonClock.summer.nightStart);
        assert.equals(6, table.seasonClock.autumn.dawnStart);
        assert.equals(7, table.seasonClock.winter.dawnStart);
    });

    suite.test('季度對季節：1 春 2 夏 3 秋 4 冬，循環', () => {
        const got = [1, 2, 3, 4, 5, 8, 9].map(q => seasonOfQuarter(table, q));
        assert.equals('spring,summer,autumn,winter,spring,winter,spring', got.join(','));
    });

    suite.test('深夜：夜階段且 00 時至晨起，乘色 ×0.85；夜（22 時）不乘', () => {
        const deep = resolveLightingTarget(table, 'night', 'spring', true);
        const nightEve = resolveLightingTarget(table, 'night', 'spring', false);
        near(0x5A * 0.85, deep.r);
        near(0x6B * 0.85, deep.g);
        near(0xA0 * 0.85, deep.b);
        assert.equals(0x5A, nightEve.r);
        assert.isTrue(phaseOfSlot(table, 'spring', 7).deepNight);
        assert.isFalse(phaseOfSlot(table, 'spring', 6).deepNight);
        assert.isTrue(phaseOfSlot(table, 'winter', 1).deepNight, '冬季晨時段仍在晨起前，屬深夜');
        assert.isFalse(phaseOfSlot(table, 'autumn', 1).deepNight);
        assert.isTrue(isLightOnInDeepNight(table, 'tavern'));
        assert.isFalse(isLightOnInDeepNight(table, 'smithy'));
    });

    suite.test('乘色表與規格 3.5.4 一致（抽查四階段四季與光源強度）', () => {
        const hex = (p: LightingPhaseId, s: LightingSeason) => {
            const t = resolveLightingTarget(table, p, s, false);
            return [t.r, t.g, t.b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
        };
        assert.equals('FFE6D2', hex('dawn', 'spring'));
        assert.equals('FFFFFF', hex('day', 'spring'));
        assert.equals('FFE6BE', hex('day', 'autumn'));
        assert.equals('F0B8A8', hex('dusk', 'winter'));
        assert.equals('46558C', hex('night', 'winter'));
        assert.equals(0.3, table.lightIntensity.dawn);
        assert.equals(0, table.lightIntensity.day);
        assert.equals(0.7, table.lightIntensity.dusk);
        assert.equals(1, table.lightIntensity.night);
    });

    suite.test('乘色改 JSON 即生效：改一格色碼，查詢結果跟著變，不需改程式', () => {
        const edited = JSON.parse(JSON.stringify(raw));
        edited.phaseTint.day.spring = '102030';
        edited.deepNightMultiplier = 0.5;
        const t2 = parseLightingTable(edited);
        const day = resolveLightingTarget(t2, 'day', 'spring', false);
        assert.equals(0x10, day.r);
        assert.equals(0x20, day.g);
        assert.equals(0x30, day.b);
        near(0x5A * 0.5, resolveLightingTarget(t2, 'night', 'spring', true).r);
        assert.equals(0xFF, resolveLightingTarget(table, 'day', 'spring', false).r, '原表不受影響');
    });

    suite.test('壞資料明確報錯：色碼非法、缺階段、秒數非正', () => {
        const bad1 = JSON.parse(JSON.stringify(raw)); bad1.phaseTint.day.spring = 'ZZZ';
        const bad2 = JSON.parse(JSON.stringify(raw)); delete bad2.phaseTint.dusk;
        const bad3 = JSON.parse(JSON.stringify(raw)); bad3.transition.autoSeconds = 0;
        for (const bad of [bad1, bad2, bad3]) {
            let threw = false;
            try { parseLightingTable(bad); } catch { threw = true; }
            assert.isTrue(threw);
        }
        assert.equals(255, parseHexColor('#FF0000').r);
    });

    suite.test('進入場景：直接套用當下階段乘色，無過場', () => {
        const { ctl, layer } = makeController(4, 6);
        const st = ctl.getState();
        assert.equals('winter', st.season);
        assert.equals('night', st.phase);
        assert.isFalse(st.transitioning);
        assert.equals(JSON.stringify([0x46, 0x55, 0x8C]), JSON.stringify(layer.last));
        assert.equals(1, layer.intensities[layer.intensities.length - 1]);
    });

    suite.test('自動換階段：15 秒 lerp，起點為舊色、中點為平均、終點為新色，之後固定', () => {
        const { ctl, layer } = makeController(1, 4); // 春・下午＝日
        assert.equals(JSON.stringify([255, 255, 255]), JSON.stringify(layer.last));
        ctl.setSlot(5); // 傍晚＝昏 FFC89A
        assert.isTrue(ctl.getState().transitioning);
        ctl.update(0);
        assert.equals(JSON.stringify([255, 255, 255]), JSON.stringify(layer.last), 't=0 為起點');
        ctl.update(7.5);
        assert.equals(JSON.stringify([255, Math.round((255 + 0xC8) / 2), Math.round((255 + 0x9A) / 2)]), JSON.stringify(layer.last));
        near(0.35, ctl.getState().current.intensity);
        ctl.update(7.5);
        assert.equals(JSON.stringify([0xFF, 0xC8, 0x9A]), JSON.stringify(layer.last), 't=15 為終點');
        assert.isFalse(ctl.getState().transitioning);
        const n = layer.colors.length;
        ctl.update(10);
        assert.equals(n, layer.colors.length, '轉場結束後不再重複套用');
    });

    suite.test('手動切時段：0.6 秒 lerp；階段相同則不轉場', () => {
        const { ctl, layer } = makeController(1, 4);
        ctl.setSlot(3, true); // 午＝日，同色
        assert.isFalse(ctl.getState().transitioning);
        ctl.setSlot(6, true); // 夜
        ctl.update(0.3);
        const mid = layer.last;
        near((255 + 0x5A) / 2, mid[0], 0.5);
        ctl.update(0.3);
        assert.equals(JSON.stringify([0x5A, 0x6B, 0xA0]), JSON.stringify(layer.last));
        assert.isFalse(ctl.getState().transitioning);
    });

    suite.test('轉場中途改目標：從當下顯示值出發，不跳色', () => {
        const { ctl, layer } = makeController(1, 4);
        ctl.setSlot(5);
        ctl.update(7.5);
        const before = layer.last.slice();
        ctl.setSlot(3, true); // 手動切回午（日）
        ctl.update(0);
        assert.equals(JSON.stringify(before), JSON.stringify(layer.last), '重新起算時第一幀等於上一幀');
        ctl.update(0.6);
        assert.equals(JSON.stringify([255, 255, 255]), JSON.stringify(layer.last));
    });

    suite.test('深夜終點乘色 ×0.85：春・夜 → 深夜', () => {
        const { ctl, layer } = makeController(1, 6);
        ctl.setSlot(7);
        ctl.update(15);
        assert.equals(JSON.stringify([Math.round(0x5A * 0.85), Math.round(0x6B * 0.85), Math.round(0xA0 * 0.85)]), JSON.stringify(layer.last));
        assert.isTrue(ctl.getState().deepNight);
    });

    suite.test('換季：季度推進換乘色與疊層，季度不變則不動', () => {
        const { ctl, layer, log, lifecycle } = makeController(1, 3); // 春・午
        assert.isTrue(lifecycle.isHeld('front_tree_spring'));
        ctl.setQuarter(1);
        assert.isFalse(ctl.getState().transitioning);
        log.length = 0;
        ctl.setQuarter(2); // 夏・午 FFF6DC
        assert.equals('summer', ctl.getState().season);
        assert.isFalse(lifecycle.isHeld('front_tree_spring'));
        assert.isTrue(lifecycle.isHeld('patch_summer_awning'));
        ctl.update(0.6);
        assert.equals(JSON.stringify([0xFF, 0xF6, 0xDC]), JSON.stringify(layer.last));
    });

    suite.test('更新前未 enter 會報錯', () => {
        const ctl = new SceneLightingController(table);
        let threw = false;
        try { ctl.setSlot(2); } catch { threw = true; }
        assert.isTrue(threw);
    });

    suite.test('載入／卸載時機表：4 季 × 7 時段與手算表一致；午（日間）任何季節都不持有光源與星空', () => {
        for (const season of SEASONS) {
            const got = [1, 2, 3, 4, 5, 6, 7].map(s => shouldHoldAtmosphere(table, season, s));
            assert.equals(JSON.stringify(EXPECT_HOLD[season]), JSON.stringify(got), `${season} 持有表`);
            assert.isFalse(desiredOverlayIds(table, season, 3).includes('lights_atlas'));
            assert.isFalse(desiredOverlayIds(table, season, 3).includes('stars'));
        }
    });

    suite.test('昏前一個時段載入、晨後一個時段卸載（秋季走完一天）', () => {
        const { ctl, log, lifecycle } = makeController(3, 2); // 秋・上午（晨後一個時段，仍持有）
        assert.isTrue(lifecycle.isHeld('lights_atlas'));
        log.length = 0;
        ctl.setSlot(3);
        assert.equals('-lights_atlas,-stars', log.join(','), '午：卸載');
        log.length = 0;
        ctl.setSlot(4);
        assert.equals('+lights_atlas,+stars', log.join(','), '下午（昏的前一個時段）：載入');
    });

    suite.test('季節疊層只常駐當季：走完 4 季每季只持有該季 id，離開後全卸載', () => {
        const { ctl, lifecycle } = makeController(1, 3);
        const all = new Set<string>();
        for (const s of SEASONS) table.overlays.seasonal[s].forEach(id => all.add(id));
        for (let q = 1; q <= 8; q++) {
            ctl.setQuarter(q);
            const season = seasonOfQuarter(table, q);
            for (const s of SEASONS) {
                for (const id of table.overlays.seasonal[s]) {
                    assert.equals(s === season, lifecycle.isHeld(id), `q${q} ${id}`);
                }
            }
        }
        lifecycle.releaseAll();
        assert.equals(0, lifecycle.held().length);
        assert.isTrue(all.size > 0);
    });

    suite.test('載入卸載成對：連續 1000 次換時段換季後，持有數不超過上限', () => {
        const { ctl, lifecycle } = makeController(1, 1);
        const cap = Math.max(...SEASONS.map(s => table.overlays.seasonal[s].length)) + table.overlays.atmosphere.length;
        for (let i = 0; i < 1000; i++) {
            ctl.setQuarter(1 + (i % 4));
            ctl.setSlot(1 + (i % 7), i % 2 === 0);
            assert.isTrue(lifecycle.held().length <= cap);
        }
    });

    suite.test('8 種組合（4 季 × 日夜）各自算得出不同色，且無缺值（預覽頁用）', () => {
        const seen = new Set<string>();
        for (const season of SEASONS) {
            for (const slot of [3, 6]) {
                const p = phaseOfSlot(table, season, slot);
                const t = resolveLightingTarget(table, p.phase, season, p.deepNight);
                assert.isTrue([t.r, t.g, t.b].every(v => Number.isFinite(v) && v >= 0 && v <= 255));
                seen.add(`${t.r},${t.g},${t.b}`);
            }
        }
        assert.equals(8, seen.size);
    });

    return suite;
}
