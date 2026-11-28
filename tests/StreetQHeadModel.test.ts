/**
 * StreetQHeadModel.test.ts — 市井大街 Q 頭生活雛形的純邏輯測試（PROG-2-10258）
 */
import { TestSuite, assert } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';
import {
    canMeet, clampWalkX, createWalker, estimateBubbleSize, laneYpx, layoutBubbles, nearestLane, pickDialogue, planPath,
    stepWalker, venuePoint,
} from '../assets/scripts/ui/life/StreetQHeadModel';
import type { BubbleRequest, StreetQHeadConfig } from '../assets/scripts/ui/life/StreetQHeadModel';

const DATA = path.join(__dirname, '..', 'assets', 'resources', 'data');
const read = (n: string) => JSON.parse(fs.readFileSync(path.join(DATA, n), 'utf8'));
const I18N = path.join(__dirname, '..', 'assets', 'resources', 'i18n');
const cfg = read('street-qhead-proto.json') as StreetQHeadConfig;
const street = read('life-proto-street.json');
const clips = read('q-motion-clips.json');
const symbols = read('q-symbol-groups.json');

export function createStreetQHeadModelSuite(): TestSuite {
    const suite = new TestSuite('StreetQHeadModel (PROG-2-10258)');

    suite.test('資料：場景都在市井大街、劇本與動作片段都存在、i18n 四語系齊全', () => {
        for (const v of Object.keys(cfg.venues)) assert.isTrue(street.venues.indexOf(v) >= 0, `不是市井大街場景 ${v}`);
        for (const v of street.venues) assert.isTrue(!!cfg.venues[v], `缺站位 ${v}`);
        for (const c of cfg.cast) {
            if (c.forceVenue) assert.isTrue(!!cfg.venues[c.forceVenue]);
            if (c.firstGoto) assert.isTrue(!!cfg.venues[c.firstGoto]);
            assert.isTrue(fs.existsSync(path.join(__dirname, '..', 'assets', 'resources', c.avatar.replace('/texture', '') + '.png')), `缺頭像 ${c.avatar}`);
        }
        for (const clip of ['walk', 'jump', 'idle', 'sip', 'nod']) assert.isTrue(!!clips.clips[clip], `缺片段 ${clip}`);
        assert.isTrue(!!symbols.activities[cfg.drink.symbolActivity]);
        const keys = [...cfg.cast.map((c) => c.nameKey), ...cfg.dialogues.flatMap((d) => d.lines.map((l) => l.key))];
        for (const loc of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const d = JSON.parse(fs.readFileSync(path.join(I18N, `${loc}.json`), 'utf8'));
            for (const k of keys) assert.isTrue(!!d[k], `${loc} 缺 ${k}`);
        }
    });

    suite.test('每段對話 2～3 句、中文不超過泡泡容量', () => {
        const zh = JSON.parse(fs.readFileSync(path.join(I18N, 'zh-TW.json'), 'utf8'));
        for (const d of cfg.dialogues) {
            assert.inRange(d.lines.length, 2, 3);
            for (const l of d.lines) {
                const sz = estimateBubbleSize(zh[l.key], cfg);
                assert.isTrue(zh[l.key].length <= Math.floor((cfg.bubble.widthPx - cfg.bubble.padPx * 2) / cfg.bubble.fontPx) * cfg.bubble.maxLinesCjk, `太長 ${l.key}`);
                assert.isTrue(sz.h > 0);
            }
        }
    });

    suite.test('planPath：每個路徑點都落在走道或連通巷上（不會走出遮罩）', () => {
        const s = cfg.world.maskScale;
        const onMask = (x: number, y: number): boolean => {
            const inLane = cfg.lanes.some((l) => Math.abs(y - l.y * s) < 1 && x >= cfg.xMin * s - 1 && x <= cfg.xMax * s + 1);
            const inConn = cfg.connectorsX.some((c) => Math.abs(x - c * s) < 1) && y >= laneYpx(cfg, 0) - 1 && y <= laneYpx(cfg, cfg.lanes.length - 1) + 1;
            return inLane || inConn;
        };
        const ids = Object.keys(cfg.venues);
        for (const a of ids) {
            for (const b of ids) {
                const from = venuePoint(cfg, a);
                const to = venuePoint(cfg, b);
                const w = createWalker(from.x, from.y);
                w.path = planPath(cfg, { x: from.x, y: from.y }, to.lane, to.x);
                let guard = 0;
                while (!stepWalker(w, 0.05, 230) && guard++ < 4000) assert.isTrue(onMask(w.x, w.y), `${a}->${b} 走出遮罩 (${w.x},${w.y})`);
                assert.isTrue(guard < 4000);
                assert.isTrue(Math.abs(w.x - clampWalkX(cfg, to.x)) < 1 && Math.abs(w.y - to.y) < 1, `${a}->${b} 沒走到`);
            }
        }
        assert.equals(0, nearestLane(cfg, 0));
    });

    suite.test('stepWalker：面向跟著水平移動方向、路徑走完回 true', () => {
        const w = createWalker(500, 356);
        w.path = [{ x: 300, y: 356 }];
        assert.isFalse(stepWalker(w, 0.1, 100));
        assert.equals(-1, w.dir);
        assert.isTrue(stepWalker(w, 10, 100));
        assert.equals(300, w.x);
    });

    suite.test('canMeet：同走道且夠近才算相遇', () => {
        assert.isTrue(canMeet(cfg, { x: 1000, y: 356 }, { x: 1150, y: 356 }));
        assert.isFalse(canMeet(cfg, { x: 1000, y: 356 }, { x: 1500, y: 356 }));
        assert.isFalse(canMeet(cfg, { x: 1000, y: 356 }, { x: 1050, y: 632 }));
    });

    suite.test('pickDialogue：指定搭檔優先（含反向）、通用劇本不連續重複', () => {
        const p1 = pickDialogue(cfg, 'zhang_fei', 'guan_yu', 0, null);
        assert.equals('zf_gy', p1.dialogue.id);
        assert.isFalse(p1.swap);
        const p2 = pickDialogue(cfg, 'guan_yu', 'zhang_fei', 0, null);
        assert.equals('zf_gy', p2.dialogue.id);
        assert.isTrue(p2.swap);
        let last: string | null = null;
        for (let i = 0; i < 40; i++) {
            const p = pickDialogue(cfg, 'cao_cao', 'diao_chan', i, last);
            assert.isTrue(!p.dialogue.pair);
            assert.isTrue(p.dialogue.id !== last);
            last = p.dialogue.id;
        }
    });

    suite.test('layoutBubbles：互不重疊、不出畫面（含擠在同一點、貼邊的極端情況）', () => {
        const bounds = { minX: -960, maxX: 960, minY: -444, maxY: 456 };
        const mk = (n: number, ax: (i: number) => number, ay: (i: number) => number): BubbleRequest[] =>
            Array.from({ length: n }, (_, i) => ({ id: `b${i}`, ax: ax(i), ay: ay(i), fx: ax(i), fy: ay(i) - 160, w: 330, h: 110 }));
        const cases = [
            mk(4, (i) => i * 60, () => 100),
            mk(4, (i) => -950 + i * 20, () => 300),
            mk(3, (i) => 940 - i * 30, () => 420),
            mk(5, (i) => -400 + i * 200, (i) => -300 + i * 20),
        ];
        for (const reqs of cases) {
            const obstacles = reqs.map((r) => ({ cx: r.ax, cy: r.ay - 80, w: 100, h: 160 }));
            const placed = layoutBubbles(reqs, bounds, 10, obstacles);
            assert.lengthEquals(reqs.length, placed);
            for (let i = 0; i < placed.length; i++) {
                const p = placed[i];
                assert.isTrue(p.cx - p.w / 2 >= bounds.minX - 0.01 && p.cx + p.w / 2 <= bounds.maxX + 0.01, '超出左右');
                assert.isTrue(p.cy - p.h / 2 >= bounds.minY - 0.01 && p.cy + p.h / 2 <= bounds.maxY + 0.01, '超出上下');
                for (const o of obstacles) {
                    const onBody = Math.abs(p.cx - o.cx) < (p.w + o.w) / 2 && Math.abs(p.cy - o.cy) < (p.h + o.h) / 2;
                    assert.isFalse(onBody, `泡泡 ${i} 蓋到人物`);
                }
                for (let j = i + 1; j < placed.length; j++) {
                    const q = placed[j];
                    const hit = Math.abs(p.cx - q.cx) < (p.w + q.w) / 2 && Math.abs(p.cy - q.cy) < (p.h + q.h) / 2;
                    assert.isFalse(hit, `泡泡 ${i} 與 ${j} 重疊`);
                }
            }
        }
    });

    return suite;
}
