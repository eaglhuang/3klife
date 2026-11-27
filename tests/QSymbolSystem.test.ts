/**
 * QSymbolSystem.test.ts — 頭上生活符號系統（WP2，QLIFE-01 第 5 章，doc_spec_1356）
 *
 * 鎖住：11 種動態公式、LOD1 砍副元素／LOD2 靜態、超量依距離降級且節點不增長、
 * 新增活動只改 JSON、節點池反覆切換不增長、pairSocket 單一元素、心情乘色、佔位圖集格位。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { evalMotion, fadeEnvelope } from '../assets/scripts/shared/presentation/symbol/QSymbolMotion';
import {
    elementCount, hexToRgb, mixTint, moodBand, moodMultiplier, parseSymbolData, planElements,
} from '../assets/scripts/shared/presentation/symbol/QSymbolData';
import { allocateLods, lodForDistance, SYMBOL_BUDGETS } from '../assets/scripts/shared/presentation/symbol/QSymbolBudget';
import { buildPlaceholderAtlas, cellRect, insideShape, makeCellPixels } from '../assets/scripts/shared/presentation/symbol/QSymbolPlaceholder';
import { ISymbolSprite } from '../assets/scripts/shared/presentation/symbol/QSymbolSprites';
import { hash01, ManualSymbolClock, QSymbolSystem } from '../assets/scripts/shared/presentation/symbol/QSymbolSystem';
import { QSymbolData, SymbolLayerDef } from '../assets/scripts/shared/presentation/symbol/types';

const root = path.resolve(__dirname, '..');

function loadRaw(): unknown {
    return JSON.parse(fs.readFileSync(path.join(root, 'assets/resources/data/q-symbol-groups.json'), 'utf8'));
}

function loadData(): QSymbolData {
    return parseSymbolData(loadRaw());
}

/** 紀錄用假子精靈 */
class FakeSprite implements ISymbolSprite {
    visible = false;
    shows = 0;
    part = '';
    x = 0; y = 0; w = 0; h = 0; rot = 0; alpha = 0; flipX = false;
    r = 0; g = 0; b = 0;
    show(part: string, x: number, y: number, w: number, h: number, rot: number, alpha: number, flipX: boolean,
        r: number, g: number, b: number): void {
        this.visible = true;
        this.shows++;
        Object.assign(this, { part, x, y, w, h, rot, alpha, flipX, r, g, b });
    }
    hide(): void { this.visible = false; }
}

function makeSystem(tier: 'low' | 'mid' | 'high' = 'mid', data: QSymbolData = loadData()) {
    const made: FakeSprite[] = [];
    const clock = new ManualSymbolClock();
    const sys = new QSymbolSystem(data, () => { const s = new FakeSprite(); made.push(s); return s; }, tier, clock);
    return { sys, made, clock, data };
}

const near = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) <= eps;

export function createQSymbolSystemSuite(): TestSuite {
    const suite = new TestSuite('QSymbolSystem (WP2 頭上生活符號)');
    const layer = (o: Partial<SymbolLayerDef> & Pick<SymbolLayerDef, 'motion'>): SymbolLayerDef => ({ part: 'dot', ...o });

    // ---------------------------------------------------------------- 資料

    suite.test('資料：q-symbol-groups.json 可解析，含 6 活動、6 符號組、3 互動符號', () => {
        const d = loadData();
        assert.equals(6, Object.keys(d.activities).length);
        assert.equals(6, Object.keys(d.symbols).length);
        assert.equals(3, Object.keys(d.pairs).length);
        for (const a of Object.values(d.activities)) assert.isTrue(!!d.symbols[a.symbol]);
    });

    suite.test('資料：引用不存在的符號組／部件／格位重複都丟錯', () => {
        const raw = JSON.parse(JSON.stringify(loadRaw()));
        raw.activities.bad = { symbol: 'S99' };
        let threw = false;
        try { parseSymbolData(raw); } catch { threw = true; }
        assert.isTrue(threw, '活動指向不存在符號組要丟錯');

        const raw2 = JSON.parse(JSON.stringify(loadRaw()));
        raw2.symbols.S01.layers[0].part = 'nope';
        threw = false;
        try { parseSymbolData(raw2); } catch { threw = true; }
        assert.isTrue(threw, '不存在部件要丟錯');

        const raw3 = JSON.parse(JSON.stringify(loadRaw()));
        raw3.atlas.parts.heart.cell = 0;
        threw = false;
        try { parseSymbolData(raw3); } catch { threw = true; }
        assert.isTrue(threw, '格位重複要丟錯');
    });

    // ---------------------------------------------------------------- 動態公式

    suite.test('floatUp：t=0 元素 0 在原點（淡入起點 alpha 0）、半週期上升 rise/2', () => {
        const l = layer({ motion: 'floatUp', count: 1, period: 2, rise: 0.8, fade: [0.2, 0.8] });
        const s0 = evalMotion(l, 0, 1, 0, 'dot');
        assert.isTrue(near(s0.y, 0) && near(s0.alpha, 0));
        const s1 = evalMotion(l, 0, 1, 1, 'dot');
        assert.isTrue(near(s1.y, 0.4) && near(s1.alpha, 1));
        const s2 = evalMotion(l, 0, 1, 1.9, 'dot'); // p=0.95 → 淡出
        assert.isTrue(near(s2.alpha, 0.25, 1e-9));
        assert.isTrue(near(fadeEnvelope(0.1, [0.2, 0.8]), 0.5));
    });

    suite.test('floatUp：3 個元素等相位錯開，rise 為負往下掉', () => {
        const l = layer({ motion: 'floatUp', count: 3, period: 1.5, rise: 0.9 });
        const ys = [0, 1, 2].map((i) => evalMotion(l, i, 3, 0, 'dot').y);
        assert.isTrue(near(ys[0], 0) && near(ys[1], 0.3) && near(ys[2], 0.6));
        const down = evalMotion(layer({ motion: 'floatUp', period: 1, rise: -0.5 }), 0, 1, 0.5, 'dot');
        assert.isTrue(near(down.y, -0.25));
    });

    suite.test('orbit：半徑 0.9、週期 1.2，t=0 在右側、1/4 週期在上方（橢圓比 0.35）、自轉 360 度/週期', () => {
        const l = layer({ motion: 'orbit', radius: 0.9, period: 1.2, spin: 360, ratio: 0.35 });
        const a = evalMotion(l, 0, 1, 0, 'dot');
        assert.isTrue(near(a.x, 0.9) && near(a.y, 0));
        const b = evalMotion(l, 0, 1, 0.3, 'dot');
        assert.isTrue(near(b.x, 0, 1e-9) && near(b.y, 0.9 * 0.35, 1e-9));
        assert.isTrue(near(b.rot, 90, 1e-9));
        const c = evalMotion(layer({ motion: 'orbit', radius: 1, count: 2, period: 1 }), 1, 2, 0, 'dot');
        assert.isTrue(near(c.x, -1, 1e-9)); // 兩個元素相差半圈
    });

    suite.test('pour：傾斜 0→60→0 往返（以負角度表示順時針）', () => {
        const l = layer({ motion: 'pour', angle: [0, 60], period: 2 });
        assert.isTrue(near(evalMotion(l, 0, 1, 0, 'jar').rot, 0));
        assert.isTrue(near(evalMotion(l, 0, 1, 1, 'jar').rot, -60));
        assert.isTrue(near(evalMotion(l, 0, 1, 2, 'jar').rot, 0, 1e-9));
        assert.isTrue(near(evalMotion(l, 0, 1, 0.5, 'jar').rot, -30, 1e-9));
    });

    suite.test('pulse：縮放 0.9～1.1 呼吸', () => {
        const l = layer({ motion: 'pulse', amp: 0.1, period: 1.2 });
        assert.isTrue(near(evalMotion(l, 0, 1, 0, 'dot').scaleX, 1));
        assert.isTrue(near(evalMotion(l, 0, 1, 0.3, 'dot').scaleX, 1.1, 1e-9));
        assert.isTrue(near(evalMotion(l, 0, 1, 0.9, 'dot').scaleY, 0.9, 1e-9));
    });

    suite.test('wobble／swing：角度振幅 ±12／±amp，週期 1/4 達峰值', () => {
        const w = layer({ motion: 'wobble', amp: 12, period: 0.8 });
        assert.isTrue(near(evalMotion(w, 0, 1, 0.2, 'dot').rot, 12, 1e-9));
        assert.isTrue(near(evalMotion(w, 0, 1, 0.6, 'dot').rot, -12, 1e-9));
        const s = layer({ motion: 'swing', amp: 30, period: 0.7 });
        assert.isTrue(near(evalMotion(s, 0, 1, 0.175, 'dot').rot, 30, 1e-9));
        assert.isTrue(near(evalMotion(s, 0, 1, 0, 'dot').rot, 0));
    });

    suite.test('shoot：拉弓往後 → 飛出 → 回彈期不可見，週期 1.6', () => {
        const l = layer({ motion: 'shoot', period: 1.6, draw: 0.3, fly: 0.5, pull: 0.15, dist: 1.2 });
        assert.isTrue(near(evalMotion(l, 0, 1, 0.3, 'dot').x, -0.15, 1e-9));
        const mid = evalMotion(l, 0, 1, 0.55, 'dot');
        assert.isTrue(mid.x > -0.15 && mid.x < 1.2 && near(mid.alpha, 1));
        assert.isTrue(near(evalMotion(l, 0, 1, 1.2, 'dot').alpha, 0));
        assert.isTrue(near(evalMotion(l, 0, 1, 1.6, 'dot').x, 0, 1e-9)); // 下一週期回到起點
    });

    suite.test('spark：爆發期向外擴散淡出，其餘時間透明；半徑隨時間增加', () => {
        const l = layer({ motion: 'spark', count: 4, period: 1, burst: 0.4, radius: 0.5 });
        assert.isTrue(near(evalMotion(l, 0, 4, 0.2, 'dot').alpha, 0.5, 1e-9));
        const r1 = Math.hypot(evalMotion(l, 1, 4, 0.1, 'dot').x, evalMotion(l, 1, 4, 0.1, 'dot').y);
        const r2 = Math.hypot(evalMotion(l, 1, 4, 0.3, 'dot').x, evalMotion(l, 1, 4, 0.3, 'dot').y);
        assert.isTrue(r2 > r1 && near(r1, 0.125, 1e-9));
        assert.isTrue(near(evalMotion(l, 0, 4, 0.7, 'dot').alpha, 0));
    });

    suite.test('drift：淡入淡出（中點最亮）、沿方向漂移', () => {
        const l = layer({ motion: 'drift', period: 3, dir: [0.4, 0.6], wiggle: 0 });
        assert.isTrue(near(evalMotion(l, 0, 1, 0, 'dot').alpha, 0));
        const m = evalMotion(l, 0, 1, 1.5, 'dot');
        assert.isTrue(near(m.alpha, 1, 1e-9) && near(m.x, 0.2, 1e-9) && near(m.y, 0.3, 1e-9));
    });

    suite.test('bounce：|sin| 上下彈，峰值 amp；三顆點錯相與 spread 左右排開', () => {
        const l = layer({ motion: 'bounce', amp: 0.2, period: 1.2, count: 3, stagger: 0.15, spread: 0.3 });
        assert.isTrue(near(evalMotion(l, 0, 3, 0, 'dot').y, 0));
        assert.isTrue(near(evalMotion(l, 0, 3, 0.6, 'dot').y, 0.2, 1e-9));
        const xs = [0, 1, 2].map((i) => evalMotion(l, i, 3, 0, 'dot').x);
        assert.isTrue(near(xs[0], -0.3) && near(xs[1], 0) && near(xs[2], 0.3));
        assert.isTrue(evalMotion(l, 1, 3, 0, 'dot').y > 0);
    });

    suite.test('flip：scaleX = |cos|，過半翻面 flipX', () => {
        const l = layer({ motion: 'flip', period: 1.4 });
        const a = evalMotion(l, 0, 1, 0, 'page');
        assert.isTrue(near(a.scaleX, 1) && !a.flipX);
        assert.isTrue(near(evalMotion(l, 0, 1, 0.35, 'page').scaleX, 0, 1e-9));
        const b = evalMotion(l, 0, 1, 0.7, 'page');
        assert.isTrue(near(b.scaleX, 1, 1e-9) && b.flipX);
    });

    suite.test('同輸入同輸出（純函式可重現）', () => {
        const l = layer({ motion: 'spark', count: 5, period: 0.8 });
        assert.equals(JSON.stringify(evalMotion(l, 3, 5, 12.34, 'dot')), JSON.stringify(evalMotion(l, 3, 5, 12.34, 'dot')));
    });

    // ---------------------------------------------------------------- LOD

    suite.test('LOD：S04 完整 5 個（受每符號上限截斷）、LOD1 只剩主圖層酒罈、LOD2 單一靜態圖、LOD3 無', () => {
        const d = loadData();
        const s04 = d.symbols.S04;
        assert.equals(5, elementCount(s04, 5, 0));
        assert.equals(3, elementCount(s04, 3, 0)); // 低階截斷
        assert.equals(1, elementCount(s04, 5, 1));
        assert.equals(1, elementCount(s04, 5, 2));
        assert.equals(0, elementCount(s04, 5, 3));
        const plan1 = planElements(s04, 5, 1);
        assert.equals(0, plan1[0].layerIdx); // 主圖層（jar）
        // staticFirst：ZZZ LOD1 只留 1 個
        assert.equals(3, elementCount(d.symbols.S01, 5, 0));
        assert.equals(1, elementCount(d.symbols.S01, 5, 1));
        // lod2:hide 時 LOD2 不畫
        const hide = { ...d.symbols.S01, lod2: 'hide' as const };
        assert.equals(0, elementCount(hide, 5, 2));
    });

    suite.test('LOD 距離：0.5 個螢幕寬降 LOD1、0.9 降 LOD2、畫面外不畫', () => {
        assert.equals(0, lodForDistance(0.5, true));
        assert.equals(1, lodForDistance(0.51, true));
        assert.equals(1, lodForDistance(0.9, true));
        assert.equals(2, lodForDistance(0.91, true));
        assert.equals(3, lodForDistance(0.1, false));
    });

    suite.test('系統：LOD1 半速（隔幀更新）、LOD2 靜態不再更新且透明度 0.7', () => {
        const { sys, made, clock } = makeSystem('high');
        sys.setFocus(0, 0, 1000);
        const near1 = sys.addHead({ x: 0, y: 0, size: 100, activity: 'sleep', seed: 'a' });
        const lod1 = sys.addHead({ x: 700, y: 0, size: 100, activity: 'tea', seed: 'b' });
        const lod2 = sys.addHead({ x: 950, y: 0, size: 100, activity: 'tea', seed: 'c' });
        clock.advance(0.016);
        assert.equals(0, sys.lodOf(near1));
        assert.equals(1, sys.lodOf(lod1));
        assert.equals(2, sys.lodOf(lod2));
        assert.equals(1, sys.spriteCountOf(lod1)); // 茶杯，砍掉蒸氣
        assert.equals(1, sys.spriteCountOf(lod2));
        // 找出 lod1／lod2 的精靈：依序建立 near1(3)、lod1(1)、lod2(1)
        const sLod1 = made[3];
        const sLod2 = made[4];
        const before1 = sLod1.shows;
        const before2 = sLod2.shows;
        assert.isTrue(near(sLod2.alpha, 0.7));
        for (let i = 0; i < 10; i++) clock.advance(0.016);
        assert.equals(before2, sLod2.shows); // 靜態：位置不變就不更新
        assert.equals(before1 + 5, sLod1.shows); // 10 幀更新 5 次
        sys.move(lod2, 960, 0);
        clock.advance(0.016);
        assert.equals(before2 + 1, sLod2.shows); // 頭移動時才跟著動
        sys.dispose();
    });

    suite.test('預算：低階 20 顆頭同畫面，完整動畫 ≤8、近的完整遠的降級；30 顆時子精靈與節點仍 ≤28', () => {
        const { sys, made, clock } = makeSystem('low');
        sys.setFocus(0, 0, 1000);
        const ids: number[] = [];
        for (let i = 0; i < 20; i++) ids.push(sys.addHead({ x: i * 10, y: 0, size: 100, activity: i % 2 ? 'drink' : 'sleep', seed: i }));
        for (let i = 0; i < 5; i++) clock.advance(0.1);
        assert.isTrue(sys.animatedCount <= SYMBOL_BUDGETS.low.maxAnimated, `animated=${sys.animatedCount}`);
        assert.isTrue(sys.totalSprites <= 28, `total=${sys.totalSprites}`);
        assert.isTrue(made.length <= 28, `created=${made.length}`);
        // 近的保有完整動畫，遠的先被降級
        assert.equals(0, sys.lodOf(ids[0]));
        assert.isTrue(sys.lodOf(ids[19]) > 0);
        for (let i = 20; i < 30; i++) ids.push(sys.addHead({ x: i * 10, y: 0, size: 100, activity: i % 2 ? 'drink' : 'sleep', seed: i }));
        for (let i = 0; i < 5; i++) clock.advance(0.1);
        assert.isTrue(sys.totalSprites <= 28, `total30=${sys.totalSprites}`);
        assert.isTrue(made.length <= 28, `created30=${made.length}`);
        assert.isTrue(ids.some((id) => sys.lodOf(id) === 3), '放不下時最遠的隱藏');
        sys.dispose();
    });

    suite.test('預算：allocateLods 近的先拿好品質、同距離以 id 小者較近、總量超限逐級降直到放下', () => {
        const items = [1, 2, 3, 4].map((id) => ({ id, dist: 0.1, wantLod: 0 as const, sprites: [5, 2, 1] as [number, number, number] }));
        const budget = { maxAnimated: 2, maxSubPerSymbol: 5, maxTotalSprites: 20, mainPerHead: 1 };
        const a = allocateLods(items, budget);
        assert.equals(0, a.get(1));
        assert.equals(0, a.get(2));
        assert.equals(1, a.get(3));
        assert.equals(1, a.get(4));
        const cost = (m: Map<number, number>): number => {
            let t = 0;
            m.forEach((l, id) => { t += l === 3 ? 0 : (items.find((x) => x.id === id) as typeof items[0]).sprites[l]; });
            return t;
        };
        const tight = allocateLods(items, { ...budget, maxTotalSprites: 5 });
        assert.isTrue(cost(tight) <= 5, `total=${cost(tight)}`);
        assert.isTrue((tight.get(1) as number) < (tight.get(4) as number) || tight.get(1) === tight.get(4));
        assert.notEquals(3, tight.get(1)); // 最近的不會被隱藏
        const tiny = allocateLods(items, { ...budget, maxTotalSprites: 2 });
        assert.isTrue(cost(tiny) <= 2);
        assert.equals(3, tiny.get(4)); // 放不下時最遠的先隱藏
    });

    suite.test('預算：畫面外的頭不佔子精靈', () => {
        const { sys, clock } = makeSystem('mid');
        const a = sys.addHead({ x: 0, y: 0, size: 100, activity: 'drink' });
        clock.advance(0.1);
        assert.equals(4, sys.spriteCountOf(a)); // mid 每符號上限 4
        sys.setOnScreen(a, false);
        clock.advance(0.1);
        assert.equals(0, sys.spriteCountOf(a));
        assert.equals(0, sys.totalSprites);
        sys.dispose();
    });

    suite.test('高階：主＋副符號同頭（副符號只在 LOD0）；低階忽略副符號', () => {
        const hi = makeSystem('high');
        const h = hi.sys.addHead({ x: 0, y: 0, size: 100, activity: 'tea', subActivity: 'idle' });
        hi.clock.advance(0.1);
        assert.equals(6, hi.sys.spriteCountOf(h));
        const lo = makeSystem('low');
        const l = lo.sys.addHead({ x: 0, y: 0, size: 100, activity: 'tea', subActivity: 'idle' });
        lo.clock.advance(0.1);
        assert.equals(3, lo.sys.spriteCountOf(l));
        hi.sys.dispose();
        lo.sys.dispose();
    });

    // ---------------------------------------------------------------- 具體畫面行為

    suite.test('已實作符號：睡覺 ZZZ 往上飄、練武武器繞頭、喝酒酒罈傾斜', () => {
        const { sys, made, clock } = makeSystem('high');
        const sleeper = sys.addHead({ x: 0, y: 0, size: 100, activity: 'sleep', seed: 1 });
        const fighter = sys.addHead({ x: 0, y: 0, size: 100, activity: 'train', weaponPart: 'weapon_spear', seed: 2 });
        const drinker = sys.addHead({ x: 0, y: 0, size: 100, activity: 'drink', seed: 3 });
        clock.advance(0.1);
        const z = made.slice(0, 3);
        assert.equals(3, sys.spriteCountOf(sleeper));
        const y0 = z.map((s) => s.y);
        for (let i = 0; i < 5; i++) clock.advance(0.05);
        const y1 = z.map((s) => s.y);
        // 三個 Z 的相位錯開，但整體往上：至少兩個比先前高（其他是循環回底部）
        assert.isTrue(y1.filter((v, i) => v > y0[i]).length >= 2);
        assert.equals('weapon_spear', made[3].part); // 武器依武將主兵器
        const x0 = made[3].x;
        clock.advance(0.3);
        assert.isTrue(Math.abs(made[3].x - x0) > 1, '武器要繞頭移動');
        assert.equals(1, sys.spriteCountOf(fighter));
        assert.equals(5, sys.spriteCountOf(drinker));
        const jar = made[4];
        assert.equals('jar', jar.part);
        let minRot = 0;
        for (let i = 0; i < 40; i++) { clock.advance(0.05); minRot = Math.min(minRot, jar.rot); }
        assert.isTrue(minRot < -50, `酒罈要傾斜，minRot=${minRot}`);
        sys.dispose();
    });

    suite.test('武將沒指定主兵器時 S02 用預設劍', () => {
        const { sys, made, clock } = makeSystem('mid');
        sys.addHead({ x: 0, y: 0, size: 100, activity: 'train' });
        clock.advance(0.1);
        assert.equals('weapon_sword', made[0].part);
        sys.dispose();
    });

    suite.test('位置與尺寸：像素座標 = 掛點 + 偏移×頭高，元素大小 = 0.5 頭高×倍率', () => {
        const { sys, made, clock } = makeSystem('mid');
        sys.addHead({ x: 300, y: 500, size: 80, activity: 'idle', seed: 0 });
        clock.advance(0.1);
        const s = made[0];
        assert.isTrue(s.visible);
        assert.isTrue(near(s.w, 0.5 * 80 * 0.5, 1e-9)); // 三點 size 0.5
        assert.isTrue(near(s.x, 300 + (-0.28) * 80, 1e-6));
        sys.dispose();
    });

    // ---------------------------------------------------------------- 資料驅動

    suite.test('加一個新活動只改 JSON：新符號組＋新活動立刻可用，程式不用動', () => {
        const raw = JSON.parse(JSON.stringify(loadRaw()));
        raw.atlas.parts.fish = { cell: 20, shape: 'triangle' };
        raw.symbols.S11 = {
            layers: [{ part: 'fish', motion: 'swing', amp: 10, period: 2.4, size: 1.1 }],
            tint: '#7FC8FF', lod1: 'primary', lod2: 'static',
        };
        raw.activities.fishing = { symbol: 'S11', face: 'default', bodyClip: 'idle' };
        const { sys, made, clock } = makeSystem('mid', parseSymbolData(raw));
        const h = sys.addHead({ x: 0, y: 0, size: 100, activity: 'fishing', seed: 'fisher' });
        clock.advance(0.6);
        assert.equals(1, sys.spriteCountOf(h));
        assert.equals('fish', made[0].part);
        const expectRot = 10 * Math.sin(2 * Math.PI * (0.6 + hash01('fisher') * 10) / 2.4);
        assert.isTrue(near(made[0].rot, expectRot, 1e-9), `rot=${made[0].rot} expect=${expectRot}`);
        assert.equals(117, made[0].r); // 0x7F × 平靜乘色 0.92
        sys.dispose();
    });

    suite.test('節點池：反覆切換活動 1000 次，建立的節點數不增長', () => {
        const { sys, made, clock } = makeSystem('mid');
        const acts = ['sleep', 'train', 'drink', 'read', 'tea', 'idle'];
        const ids: number[] = [];
        for (let i = 0; i < 6; i++) ids.push(sys.addHead({ x: i * 50, y: 0, size: 100, activity: acts[i], seed: i }));
        clock.advance(0.1);
        const created0 = sys.pool.created;
        for (let n = 0; n < 1000; n++) {
            for (let i = 0; i < 6; i++) sys.setHeadActivity(ids[i], acts[(i + n + 1) % 6]);
            clock.advance(0.016);
        }
        assert.isTrue(sys.pool.created <= created0 + 6 * 5, `created=${sys.pool.created} start=${created0}`);
        // 再跑第二個 1000 次，這次完全不能再長
        const created1 = sys.pool.created;
        for (let n = 0; n < 1000; n++) {
            for (let i = 0; i < 6; i++) sys.setHeadActivity(ids[i], acts[(i + n) % 6]);
            clock.advance(0.016);
        }
        assert.equals(created1, sys.pool.created);
        assert.isTrue(sys.pool.created <= SYMBOL_BUDGETS.mid.maxTotalSprites);
        assert.equals(sys.totalSprites, sys.pool.inUse);
        sys.dispose();
        assert.equals(0, sys.pool.inUse);
    });

    suite.test('節點池：註冊／註銷 1000 次後節點數不增長，註銷的全部隱藏', () => {
        const { sys, made, clock } = makeSystem('mid');
        for (let n = 0; n < 1000; n++) {
            const id = sys.addHead({ x: 0, y: 0, size: 100, activity: n % 2 ? 'drink' : 'sleep', seed: n });
            clock.advance(0.016);
            sys.remove(id);
        }
        assert.isTrue(made.length <= 5, `created=${made.length}`);
        assert.isTrue(made.every((s) => !s.visible));
        assert.equals(0, sys.pool.inUse);
        sys.dispose();
    });

    // ---------------------------------------------------------------- 互動符號與心情

    suite.test('兩人互動符號：掛中點、單一項目、占 1 個符號名額；不重複畫', () => {
        const { sys, made, clock } = makeSystem('low');
        const a = sys.addHead({ x: 100, y: 200, size: 100, activity: 'idle' });
        const b = sys.addHead({ x: 300, y: 200, size: 100, activity: 'idle' });
        const p = sys.addPair('chat', 200, 260, 100);
        sys.setFocus(200, 200, 2000);
        clock.advance(0.1);
        assert.equals(3, sys.entryCount);
        assert.equals(1, sys.spriteCountOf(p)); // 單一元素
        assert.equals(3, sys.spriteCountOf(a));
        assert.equals(3, sys.spriteCountOf(b));
        const pairSprite = made[6];
        assert.equals('bubble', pairSprite.part);
        assert.isTrue(Math.abs(pairSprite.x - 200) < 1e-6);
        assert.equals(3, sys.animatedCount); // 兩顆頭 + 一個 pair，各占 1 名額
        sys.move(p, 220, 260);
        clock.advance(0.016);
        assert.isTrue(near(pairSprite.x, 220));
        let threw = false;
        try { sys.addPair('nope', 0, 0, 1); } catch { threw = true; }
        assert.isTrue(threw);
        sys.dispose();
    });

    suite.test('心情變色：>+20 開心、鬱悶 ×0.75、不爽偏紅；乘到符號顏色', () => {
        assert.equals('happy', moodBand(21, false));
        assert.equals('calm', moodBand(0, true));
        assert.equals('upset', moodBand(-21, true));
        assert.equals('gloomy', moodBand(-21, false));
        const g = moodMultiplier(-30, false);
        assert.isTrue(near(g[0], 0.75) && near(g[2], 0.75));
        const m = mixTint('#FFFFFF', g);
        assert.equals(191, m[0]); // 255 × 0.75 取整
        assert.equals(255, hexToRgb('#FF0000')[0]);
        const { sys, made, clock } = makeSystem('mid');
        const h = sys.addHead({ x: 0, y: 0, size: 100, activity: 'idle' });
        sys.setMood(h, -40, false);
        clock.advance(0.1);
        // S50 符號色 #D8D8D8(216) × 0.75 = 162
        assert.equals(162, made[0].r);
        sys.setMood(h, 40, false);
        clock.advance(0.1);
        assert.equals(216, made[0].r);
        assert.equals(194, made[0].b); // 216 × 0.9
        sys.dispose();
    });

    // ---------------------------------------------------------------- 驅動與佔位圖

    suite.test('驅動介面：只吃每幀 dt；dispose 後取消訂閱', () => {
        const { sys, clock } = makeSystem('mid');
        assert.equals(1, clock.subscriberCount);
        clock.advance(0.5);
        assert.isTrue(near(sys.now, 0.5));
        sys.dispose();
        assert.equals(0, clock.subscriberCount);
        clock.advance(0.5);
        assert.isTrue(near(sys.now, 0.5));
    });

    suite.test('同 seed 與同時間序列兩套系統輸出逐幀相同；不同 seed 相位不同', () => {
        const run = (seed: number): string => {
            const { sys, made, clock } = makeSystem('mid');
            sys.addHead({ x: 0, y: 0, size: 100, activity: 'sleep', seed });
            const log: string[] = [];
            for (let i = 0; i < 20; i++) {
                clock.advance(0.05);
                log.push(made.map((s) => `${s.x.toFixed(4)},${s.y.toFixed(4)},${s.alpha.toFixed(4)}`).join('|'));
            }
            sys.dispose();
            return log.join('\n');
        };
        assert.equals(run(7), run(7));
        assert.notEquals(run(7), run(8));
    });

    suite.test('佔位圖集：幾何形狀、格位矩形、整張 512×512 且各部件格位有像素', () => {
        assert.isTrue(insideShape('circle', 32, 32, 64));
        assert.isFalse(insideShape('circle', 2, 2, 64));
        assert.isTrue(insideShape('square', 10, 10, 64));
        assert.isFalse(insideShape('square', 1, 1, 64));
        assert.isTrue(insideShape('triangle', 32, 50, 64));
        assert.isFalse(insideShape('triangle', 5, 10, 64)); // 尖端朝上，頂部兩側是空的
        const px = makeCellPixels('circle', 64);
        assert.equals(64 * 64 * 4, px.length);
        assert.equals(255, px[(32 * 64 + 32) * 4 + 3]);
        assert.equals(0, px[3]);
        assert.equals(255, px[0]); // 白色單通道
        const r = cellRect(10, 64, 8);
        assert.isTrue(r.x === 128 && r.y === 64 && r.w === 64);
        const d = loadData();
        const atlas = buildPlaceholderAtlas(d);
        assert.equals(512, atlas.width);
        assert.equals(512 * 512 * 4, atlas.pixels.length);
        for (const def of Object.values(d.atlas.parts)) {
            const rc = cellRect(def.cell, 64, 8);
            const center = ((rc.y + 32) * 512 + (rc.x + 32)) * 4;
            assert.isTrue(atlas.pixels[center + 3] > 0, `格位 ${def.cell} 中心應有像素`);
        }
    });

    return suite;
}
