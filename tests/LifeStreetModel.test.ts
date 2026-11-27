/**
 * LifeStreetModel.test.ts — 生活層原型的純邏輯測試（PROG-2-10214）
 */
import { TestSuite, assert } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';
import {
    activityOf, cellOf, createWalker, filterStreetData, layoutStreet, setWalkTarget, standPoint, stepWalker,
} from '../assets/scripts/ui/life/LifeStreetModel';
import type { StreetConfig } from '../assets/scripts/ui/life/LifeStreetModel';
import { buildSnapshot, defaultStatesFromRoster } from '../assets/scripts/core/life/LifeSceneChooser';
import type { LifeData } from '../assets/scripts/core/life/types';

const DATA_DIR = path.join(__dirname, '..', 'assets', 'resources', 'data');
const read = (n: string) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, n), 'utf8'));
const cfg = read('life-proto-street.json') as StreetConfig;
const symbols = read('q-symbol-groups.json');
const life: LifeData = {
    profiles: read('life-profile.json'),
    factors: read('life-factors.json'),
    scenes: read('life-scenes.json'),
    roster: read('life-roster.json'),
};

export function createLifeStreetModelSuite(): TestSuite {
    const suite = new TestSuite('LifeStreetModel (PROG-2-10214)');

    suite.test('資料：16 個場景 id 都在作息資料裡，且活動 id 都是符號系統有的', () => {
        const ids = new Set(life.scenes.scenes.map((s) => s.id));
        for (const v of cfg.venues) assert.isTrue(ids.has(v), `作息資料缺 ${v}`);
        assert.lengthEquals(16, cfg.venues);
        const acts = [cfg.defaultActivity, 'sleep', ...Object.values(cfg.activityByScene)];
        for (const a of acts) assert.isTrue(!!symbols.activities[a], `符號系統缺活動 ${a}`);
        assert.isTrue(!!symbols.pairs[cfg.pairKind]);
    });

    suite.test('filterStreetData：只剩市井大街場景，其餘欄位不動', () => {
        const d = filterStreetData(life, cfg.venues);
        assert.isTrue(d.scenes.scenes.length > 0 && d.scenes.scenes.length <= 16);
        for (const s of d.scenes.scenes) assert.isTrue(cfg.venues.indexOf(s.id) >= 0);
        assert.equals(life.roster, d.roster);
    });

    suite.test('10 位武將 × 7 時段 × 4 季：全部落在市井大街、人數與名冊相同', () => {
        const d = filterStreetData(life, cfg.venues);
        const states = defaultStatesFromRoster(d);
        assert.lengthEquals(10, states);
        for (let q = 1; q <= 4; q++) {
            for (let seq = 0; seq < 7; seq++) {
                const snap = buildSnapshot({ data: d, quarter: q, slotSeq: seq, states });
                const ids = Object.keys(snap.choices);
                assert.lengthEquals(10, ids);
                for (const id of ids) assert.isTrue(cfg.venues.indexOf(snap.choices[id].sceneId) >= 0, `${id} 不在街上`);
            }
        }
    });

    suite.test('activityOf：旅店夜間睡覺、酒館喝酒、其餘發呆', () => {
        assert.equals('sleep', activityOf(cfg, 'mkt_inn', 6));
        assert.equals('sleep', activityOf(cfg, 'mkt_inn', 7));
        assert.equals(cfg.defaultActivity, activityOf(cfg, 'mkt_inn', 3));
        assert.equals('drink', activityOf(cfg, 'mkt_tavern', 5));
        assert.equals(cfg.defaultActivity, activityOf(cfg, 'mkt_street', 3));
    });

    suite.test('layoutStreet：橫式 8 欄 2 列、直式 4 欄 4 列，格子都在畫面內且不重疊', () => {
        for (const [w, h, cols, rows] of [[1920, 1080, 8, 2], [1080, 1920, 4, 4]] as const) {
            const l = layoutStreet(w, h, cfg);
            assert.equals(cols, l.cols);
            assert.equals(rows, l.rows);
            assert.lengthEquals(16, l.cells);
            for (const c of l.cells) {
                assert.isTrue(c.cell.x >= -w / 2 - 0.01 && c.cell.x + c.cell.w <= w / 2 + 0.01, '超出左右');
                assert.isTrue(c.cell.y >= -h / 2 - 0.01 && c.cell.y + c.cell.h <= h / 2 + 0.01, '超出上下');
                assert.isTrue(c.yard.y + c.yard.h <= c.building.y + 0.01, '空地不可壓到建築');
            }
            assert.inRange(l.headH, cfg.layout.headMinPx, cfg.layout.headMaxPx);
        }
        assert.isTrue(layoutStreet(1080, 1920, cfg).portrait);
        assert.isFalse(layoutStreet(1920, 1080, cfg).portrait);
    });

    suite.test('layoutStreet：下方留給地圖鈕、上方留給徽章（空白比例）', () => {
        const l = layoutStreet(1920, 1080, cfg);
        const minY = Math.min(...l.cells.map((c) => c.cell.y));
        const maxY = Math.max(...l.cells.map((c) => c.cell.y + c.cell.h));
        assert.isTrue(minY - -540 >= 1080 * cfg.layout.marginBottomRel - 0.01);
        assert.isTrue(540 - maxY >= 1080 * cfg.layout.marginTopRel - 0.01);
    });

    suite.test('standPoint：同場景多人橫向不重疊、站在空地內', () => {
        const l = layoutStreet(1920, 1080, cfg);
        const yard = cellOf(l, 'mkt_street')!.yard;
        const pts = [0, 1, 2].map((i) => standPoint(yard, l.headH, i, 3, `g${i}`));
        assert.isTrue(pts[0].x < pts[1].x && pts[1].x < pts[2].x);
        for (const p of pts) {
            assert.isTrue(p.x >= yard.x && p.x <= yard.x + yard.w);
            assert.isTrue(p.y >= yard.y && p.y <= yard.y + yard.h);
        }
    });

    suite.test('stepWalker：走向目標、到了進入發呆、發呆完再挑新目標；同 seed 同結果', () => {
        const l = layoutStreet(1920, 1080, cfg);
        const yard = cellOf(l, 'mkt_tavern')!.yard;
        const run = () => {
            const w = createWalker(yard.x + 10, yard.y + 10);
            setWalkTarget(w, yard.x + 100, yard.y + 30);
            const o = {
                speed: cfg.walk.speedPxPerSec, idleMinSec: cfg.walk.idleMinSec, idleMaxSec: cfg.walk.idleMaxSec,
                stationary: false, yard, headH: l.headH, wanderPx: l.cells[0].cell.w * cfg.walk.wanderRel, seed: 'zhang_fei',
            };
            assert.equals('walk', stepWalker(w, 0.1, o));
            let walked = 0;
            let idled = 0;
            for (let i = 0; i < 2000; i++) {
                if (stepWalker(w, 0.05, o) === 'walk') walked++; else idled++;
                assert.isTrue(w.x >= yard.x - 0.01 && w.x <= yard.x + yard.w + 0.01, '走出空地');
            }
            assert.isTrue(walked > 50 && idled > 50, '走與停都要發生');
            return `${w.x.toFixed(3)},${w.y.toFixed(3)}`;
        };
        assert.equals(run(), run());
    });

    suite.test('stepWalker：靜止活動（睡覺）不會再走', () => {
        const l = layoutStreet(1920, 1080, cfg);
        const yard = cellOf(l, 'mkt_inn')!.yard;
        const w = createWalker(yard.x + 20, yard.y + 20);
        const o = {
            speed: 70, idleMinSec: 1, idleMaxSec: 2, stationary: true, yard, headH: l.headH, wanderPx: 100, seed: 'x',
        };
        for (let i = 0; i < 400; i++) assert.equals('idle', stepWalker(w, 0.1, o));
    });

    return suite;
}
