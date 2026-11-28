/**
 * QFaceSystem.test.ts — Q 臉部表情核心（QFACE-01，PROG-2-10233）
 * 鎖住：同 seed 眨眼時間相同／不同 seed 錯開、LOD2 不眨眼、只改 JSON 就能加新表情與活動、
 * 說話節拍、心情乘色、臉狀態槽位 1000 次切換不增長、佔位圖集格位不衝突、錨點眼罩側停用、正式資料檔合法。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { parseFaceData, resolveAnchors, cellOf, REQUIRED_EYES, REQUIRED_MOUTHS } from '../assets/scripts/shared/presentation/face/QFaceData';
import { QFaceSystem } from '../assets/scripts/shared/presentation/face/QFaceSystem';
import { buildFacePlaceholderAtlas } from '../assets/scripts/shared/presentation/face/QFacePlaceholder';
import { createFaceState, type IQFaceView, type QFaceData, type QFaceState } from '../assets/scripts/shared/presentation/face/types';

const ROOT = path.resolve(__dirname, '..');
const readJson = (rel: string): any => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const rawExpr = (): any => readJson('assets/resources/data/q-face-expressions.json');
const realData: QFaceData = parseFaceData(rawExpr());

class TestView implements IQFaceView {
    applied = 0;
    last: QFaceState = createFaceState();
    apply(st: Readonly<QFaceState>): void {
        this.applied++;
        this.last = { ...st };
    }
}

/** 以 60fps 推進，回傳每次眨眼開始的時間（秒） */
function blinkTimes(sys: QFaceSystem, h: number, v: TestView, sec: number): number[] {
    const times: number[] = [];
    const dt = 1 / 60;
    let was = false;
    for (let i = 0; i < Math.round(sec / dt); i++) {
        sys.update(dt);
        const now = v.last.eye === realData.blink.blinkEye;
        if (now && !was) times.push(Math.round((i + 1) * dt * 1000) / 1000);
        was = now;
    }
    return times;
}

export function createQFaceSystemSuite(): TestSuite {
    const suite = new TestSuite('QFaceSystem (Q 臉部表情核心 PROG-2-10233)');

    suite.test('正式資料檔合法：11 眼＋8 嘴必備、12 個預設表情、4 種心情', () => {
        for (const id of [...REQUIRED_EYES, ...REQUIRED_MOUTHS]) assert.isDefined(realData.atlas.parts[id], id);
        assert.equals(12, Object.keys(realData.presets).length);
        assert.equals(4, Object.keys(realData.moods).length);
        assert.equals(6, realData.atlas.partSets.length);
    });

    suite.test('同 seed 眨眼時間完全相同；不同 seed 相位錯開', () => {
        const run = (seed: number): number[] => {
            const sys = new QFaceSystem(realData);
            const v = new TestView();
            const h = sys.register(v, seed);
            return blinkTimes(sys, h, v, 40);
        };
        const a = run(42);
        const b = run(42);
        const c = run(43);
        assert.isTrue(a.length >= 6, `40 秒內至少眨 6 次，實際 ${a.length}`);
        assert.equals(JSON.stringify(a), JSON.stringify(b));
        assert.isFalse(JSON.stringify(a) === JSON.stringify(c), '不同 seed 不該同時眨');
        for (let i = 1; i < a.length; i++) {
            const gap = a[i] - a[i - 1];
            assert.isTrue(gap >= realData.blink.minSec - 0.05 && gap <= realData.blink.maxSec + 0.2, `間隔 ${gap}`);
        }
    });

    suite.test('24 張臉不同時眨：首次眨眼時間至少 8 種以上', () => {
        const sys = new QFaceSystem(realData);
        const firsts = new Set<number>();
        for (let i = 0; i < 24; i++) {
            const v = new TestView();
            const h = sys.register(v, i * 101 + 7);
            firsts.add(blinkTimes(sys, h, v, 6.5)[0] ?? -1);
            sys.unregister(h);
        }
        assert.isTrue(firsts.size >= 8, `首次眨眼時間種類 ${firsts.size}`);
    });

    suite.test('LOD2 不眨眼；回到 LOD0 又會眨；LOD1 照眨', () => {
        const sys = new QFaceSystem(realData);
        const v = new TestView();
        const h = sys.register(v, 5);
        sys.setLod(h, 2);
        assert.equals(0, blinkTimes(sys, h, v, 30).length);
        assert.equals(realData.presets.neutral.eye, v.last.eye);
        sys.setLod(h, 1);
        assert.isTrue(blinkTimes(sys, h, v, 30).length > 0, 'LOD1 要眨');
        sys.setLod(h, 0);
        assert.isTrue(blinkTimes(sys, h, v, 30).length > 0);
    });

    suite.test('LOD 可掛外部來源（例如動畫管理器 getLod）：來源變 2 就停眨', () => {
        const sys = new QFaceSystem(realData);
        const v = new TestView();
        const h = sys.register(v, 9);
        let lod = 0;
        sys.attachLod(h, () => lod);
        assert.isTrue(blinkTimes(sys, h, v, 20).length > 0);
        lod = 2;
        assert.equals(0, blinkTimes(sys, h, v, 20).length);
        assert.equals(2, sys.getLod(h));
    });

    suite.test('閉眼中被凍結：LOD2 切入時眼睛回到睜開，不會卡在眨眼幀', () => {
        const sys = new QFaceSystem(realData);
        const v = new TestView();
        const h = sys.register(v, 3);
        const dt = 1 / 60;
        for (let i = 0; i < 60 * 10 && !sys.isBlinking(h); i++) sys.update(dt);
        assert.isTrue(sys.isBlinking(h));
        sys.setLod(h, 2);
        sys.update(dt);
        assert.equals('eye_open', v.last.eye);
    });

    suite.test('只改 JSON 就能新增表情、活動對應與心情，不改程式', () => {
        const raw = rawExpr();
        raw.presets.mischief = { eye: 'eye_star', mouth: 'mouth_tongue', blush: 0.3, marks: ['mark_star'] };
        raw.activityMap.prank = 'mischief';
        raw.moods.excited = { tint: '#FFF0C0', brightBoost: 0.1, preset: 'mischief' };
        const data = parseFaceData(raw);
        const sys = new QFaceSystem(data);
        const v = new TestView();
        const h = sys.register(v, 1);
        assert.isTrue(sys.setActivity(h, 'prank'));
        sys.update(1 / 60);
        assert.equals('eye_star', v.last.eye);
        assert.equals(cellOf(data, data.atlas.partSets[0], 'mouth_tongue'), v.last.mouthCell);
        assert.equals(cellOf(data, data.atlas.partSets[0], 'mark_star'), v.last.markCell0);
        assert.isTrue(sys.setMood(h, 'excited'));
        assert.isFalse(sys.setActivity(h, '不存在的活動'));
    });

    suite.test('壞資料直接丟錯：preset 引用不存在的部件、缺必備眼', () => {
        const a = rawExpr();
        a.presets.bad = { eye: 'eye_nope', mouth: 'mouth_closed' };
        assert.throws(() => parseFaceData(a));
        const b = rawExpr();
        delete b.atlas.parts.eye_heart;
        assert.throws(() => parseFaceData(b));
        const c = rawExpr();
        c.atlas.parts.eye_open.cell = c.atlas.parts.eye_blink.cell;
        assert.throws(() => parseFaceData(c));
    });

    suite.test('預設表情：愛心眼＋紅暈漸變到目標；瞪大眼縮放 1.15；暈眼旋轉', () => {
        const sys = new QFaceSystem(realData);
        const v = new TestView();
        const h = sys.register(v, 2);
        sys.setPreset(h, 'love');
        for (let i = 0; i < 60; i++) sys.update(1 / 60);
        assert.equals('eye_heart', v.last.eye);
        assert.isTrue(Math.abs(v.last.blush - 0.5) < 1e-6);
        sys.setPreset(h, 'surprised');
        for (let i = 0; i < 30; i++) sys.update(1 / 60);
        assert.isTrue(Math.abs(v.last.eyeScale - 1.15) < 1e-6);
        sys.setPreset(h, 'dizzy');
        sys.update(0.1);
        const r1 = v.last.eyeRot;
        sys.update(0.1);
        assert.isTrue(v.last.eyeRot !== r1);
    });

    suite.test('說話：依強度切嘴幀，結束回原嘴型；LOD2 不說話', () => {
        const sys = new QFaceSystem(realData);
        const v = new TestView();
        const h = sys.register(v, 11);
        sys.setPreset(h, 'happy');
        sys.speak(h, 1, 'high');
        const seen = new Set<string>();
        for (let i = 0; i < 50; i++) {
            sys.update(1 / 60);
            seen.add(v.last.mouth);
        }
        assert.isTrue(seen.size >= 2, `說話期間嘴型種類 ${seen.size}`);
        for (let i = 0; i < 30; i++) sys.update(1 / 60);
        assert.equals('mouth_smile', v.last.mouth);
        sys.setLod(h, 2);
        sys.speak(h, 1, 'high');
        for (let i = 0; i < 60; i++) sys.update(1 / 60);
        assert.equals('mouth_smile', v.last.mouth);
    });

    suite.test('說話不影響眨眼時間（亂數分流）', () => {
        const mk = (talk: boolean): number[] => {
            const sys = new QFaceSystem(realData);
            const v = new TestView();
            const h = sys.register(v, 77);
            if (talk) sys.speak(h, 30, 'mid');
            return blinkTimes(sys, h, v, 30);
        };
        assert.equals(JSON.stringify(mk(false)), JSON.stringify(mk(true)));
    });

    suite.test('心情乘色：不爽偏紅、鬱悶偏灰、開心有亮度加成；setMoodTint 不動表情', () => {
        const sys = new QFaceSystem(realData);
        const v = new TestView();
        const h = sys.register(v, 4);
        sys.setMood(h, 'angry');
        for (let i = 0; i < 60; i++) sys.update(1 / 60);
        assert.equals(255, Math.round(v.last.tintR));
        assert.equals(0xc8, Math.round(v.last.tintG));
        assert.equals('eye_angry', v.last.eye);
        sys.setMoodTint(h, 'gloomy');
        for (let i = 0; i < 60; i++) sys.update(1 / 60);
        assert.equals(0xb8, Math.round(v.last.tintR));
        assert.equals('eye_angry', v.last.eye);
        sys.setMood(h, 'happy');
        for (let i = 0; i < 60; i++) sys.update(1 / 60);
        assert.isTrue(Math.abs(v.last.brightBoost - 0.06) < 1e-6);
    });

    suite.test('關閉自動眨眼後不再眨', () => {
        const sys = new QFaceSystem(realData);
        const v = new TestView();
        const h = sys.register(v, 6);
        sys.setAutoBlink(h, false);
        assert.equals(0, blinkTimes(sys, h, v, 30).length);
    });

    suite.test('物件池：反覆註冊／註銷／切表情 1000 次，臉槽位數不增長；過期把手被忽略', () => {
        const sys = new QFaceSystem(realData, { maxFaces: 8 });
        const names = Object.keys(realData.presets);
        const keep = sys.register(new TestView(), 1);
        let stale = -1;
        for (let i = 0; i < 1000; i++) {
            const h = sys.register(new TestView(), i);
            assert.isTrue(h >= 0);
            sys.setPreset(h, names[i % names.length]);
            sys.speak(h, 0.3, 'low');
            sys.update(1 / 60);
            if (i === 10) stale = h;
            sys.unregister(h);
        }
        assert.equals(2, sys.created);
        assert.equals(1, sys.inUse);
        sys.setPreset(stale, 'angry');
        assert.isTrue(sys.getState(stale) === null);
        assert.isTrue(sys.getState(keep) !== null);
    });

    suite.test('達到池上限回 -1（呼叫端降級，不新增）', () => {
        const sys = new QFaceSystem(realData, { maxFaces: 2 });
        sys.register(new TestView(), 1);
        sys.register(new TestView(), 2);
        assert.equals(-1, sys.register(new TestView(), 3));
    });

    suite.test('佔位圖集：512×512、所有 partSet 部件有像素、格位不互相覆蓋', () => {
        const atlas = buildFacePlaceholderAtlas(realData);
        assert.equals(512, atlas.width);
        const { cellSize, columns } = realData.atlas;
        for (const set of realData.atlas.partSets) {
            for (const part of Object.keys(realData.atlas.parts)) {
                const cell = cellOf(realData, set, part);
                const cx = (cell % columns) * cellSize;
                const cy = Math.floor(cell / columns) * cellSize;
                let opaque = 0;
                for (let y = 0; y < cellSize; y++) {
                    for (let x = 0; x < cellSize; x++) {
                        if (atlas.pixels[((cy + y) * atlas.width + cx + x) * 4 + 3] > 0) opaque++;
                    }
                }
                assert.isTrue(opaque > 10, `${set}/${part} 佔位圖幾乎全透明`);
            }
        }
    });

    suite.test('錨點：夏侯惇左眼停用且不對稱；張飛換 partSet；未知武將用預設', () => {
        const raw = readJson('assets/resources/data/q-face-anchors.json');
        const xh = resolveAnchors(raw, 'xiahou_dun');
        assert.isTrue(xh.eyeL.disabled === true);
        assert.isTrue(xh.asymmetric);
        assert.isTrue(xh.eyeR.disabled !== true);
        assert.equals('std_male_b', resolveAnchors(raw, 'zhang_fei').partSet);
        const unknown = resolveAnchors(raw, 'nobody');
        assert.equals('std_male_a', unknown.partSet);
        assert.isFalse(unknown.asymmetric);
    });

    return suite;
}
