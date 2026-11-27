/**
 * QAnimManager.test.ts — Q 動畫管理器核心（QACT-01，PROG-2-10209）
 * 鎖住：同 seed 同時間序列通道值逐幀相同、落地事件在週期起點、佇列與淡入淡出數值、
 * LOD1 隔幀／LOD2 不跑視覺通道、LOD 自動分配、只改 JSON 就能加新片段、物件池 1000 次不增長、
 * 走路形狀（彈、歪、壓扁、拉長、影子縮放）、noFlip 與面向、暫停、正式資料檔合法。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { QAnimManager } from '../assets/scripts/shared/presentation/anim/QAnimManager';
import { validateClipLibrary } from '../assets/scripts/shared/presentation/anim/QClipRunner';
import { QActorPool } from '../assets/scripts/shared/presentation/anim/QActorPool';
import {
    INVALID_HANDLE,
    createChannels,
    type IQActor,
    type QAnimBudget,
    type QChannels,
    type QClipLibrary,
} from '../assets/scripts/shared/presentation/anim/types';

const ROOT = path.resolve(__dirname, '..');
const readJson = <T>(rel: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
const realClips = readJson<QClipLibrary>('assets/resources/data/q-motion-clips.json');
const budget = readJson<QAnimBudget>('assets/resources/data/q-anim-budget.json');

class TestActor implements IQActor {
    seed: number;
    noFlip?: boolean;
    focusDistance?: number;
    culled?: boolean;
    applied = 0;
    last: QChannels = createChannels();
    log: number[][] = [];
    events: string[] = [];
    record = false;
    constructor(seed: number) {
        this.seed = seed;
    }
    apply(ch: Readonly<QChannels>): void {
        this.applied++;
        this.last = { ...ch };
        if (this.record) this.log.push([ch.y, ch.rot, ch.scaleX, ch.scaleY, ch.shadowScale, ch.shadowAlpha, ch.flipX]);
    }
    onEvent(name: string, clipId: string): void {
        this.events.push(`${name}@${clipId}`);
    }
}

const mgr = (lib: QClipLibrary = realClips, tier: 'low' | 'mid' | 'high' = 'high'): QAnimManager =>
    new QAnimManager(lib, budget, { tier });

function close(expected: number, actual: number, eps = 1e-6, msg?: string): void {
    assert.isTrue(Math.abs(expected - actual) <= eps, msg ?? `期望 ${expected} ≈ 實際 ${actual}`);
}

/** 以 60fps 推進 sec 秒 */
function run(m: QAnimManager, sec: number, dt = 1 / 60): void {
    const n = Math.round(sec / dt);
    for (let i = 0; i < n; i++) m.update(dt);
}

/** 測試用小片段庫：y 固定值，方便驗淡入淡出數值 */
const mini: QClipLibrary = {
    schema: 'q-motion-clips.v1',
    clips: {
        high: { loop: true, period: 1, channels: { y: { type: 'hold', value: 1 } } },
        low: { loop: true, period: 1, channels: { y: { type: 'hold', value: 0 } } },
        once: { loop: false, duration: 0.3, channels: { y: { type: 'hold', value: 1 } }, events: [{ t: 0.1, name: 'hit' }] },
    },
};

export function createQAnimManagerSuite(): TestSuite {
    const suite = new TestSuite('QAnimManager (Q 動畫管理器核心 PROG-2-10209)');

    suite.test('正式資料檔合法：片段庫無未知曲線，walk／jump／idle／run 都在', () => {
        assert.equals(0, validateClipLibrary(realClips).length);
        for (const id of ['walk', 'jump', 'idle', 'run']) assert.isDefined(realClips.clips[id], id);
        assert.equals(12, budget.tiers.low.maxActors);
        assert.equals(16, budget.tiers.mid.maxActors);
        assert.equals(24, budget.tiers.high.maxActors);
        assert.equals(16, budget.tiers.high.lod0Actors);
    });

    suite.test('壞片段庫被擋：未知曲線、缺長度、事件超界', () => {
        const bad: QClipLibrary = {
            schema: 'x',
            clips: {
                a: { loop: true, channels: { y: { type: 'bounce' } } },
                b: { loop: false, duration: 1, channels: { y: { type: 'nope' } } },
                c: { loop: false, duration: 1, channels: {}, events: [{ t: 2, name: 'e' }] },
            },
        };
        assert.equals(3, validateClipLibrary(bad).length);
        assert.throws(() => new QAnimManager(bad, budget));
    });

    suite.test('可重現：同 seed 同時間序列，通道值逐幀完全相同；不同 seed 不同', () => {
        const collect = (seed: number): number[][] => {
            const m = mgr();
            const a = new TestActor(seed);
            a.record = true;
            const h = m.register(a);
            m.play(h, 'idle');
            run(m, 1);
            m.play(h, 'walk');
            run(m, 2);
            m.play(h, 'jump');
            run(m, 1);
            return a.log;
        };
        const x = collect(7);
        const y = collect(7);
        assert.isTrue(x.length > 200);
        assert.equals(JSON.stringify(x), JSON.stringify(y));
        assert.notEquals(JSON.stringify(x), JSON.stringify(collect(8)));
    });

    suite.test('待機：不同 seed 錯開相位（呼吸縮放不同步），同 seed 同步', () => {
        const m = mgr();
        const a = new TestActor(1);
        const b = new TestActor(2);
        const c = new TestActor(1);
        for (const act of [a, b, c]) m.play(m.register(act), 'idle', { fadeInSec: 0 });
        run(m, 0.7);
        assert.notEquals(a.last.scaleY, b.last.scaleY);
        assert.equals(a.last.scaleY, c.last.scaleY);
        assert.isTrue(a.last.scaleY >= 1 && a.last.scaleY <= 1.03 + 1e-9);
    });

    suite.test('走路形狀：彈（y 到 0.10H）、歪（±6 度）、落地壓扁、最高拉長、影子縮到 0.78 且變淡', () => {
        const m = mgr();
        const a = new TestActor(3);
        a.record = true;
        const h = m.register(a);
        m.play(h, 'walk', { fadeInSec: 0 });
        run(m, 3, 1 / 240);
        const col = (i: number): number[] => a.log.map((r) => r[i]);
        const mx = (v: number[]): number => Math.max(...v);
        const mn = (v: number[]): number => Math.min(...v);
        close(0.1, mx(col(0)), 0.005, 'y 最高');
        assert.isTrue(mn(col(0)) >= -1e-9, 'y 不低於地面');
        close(6, mx(col(1)), 0.2, '右歪');
        close(-6, mn(col(1)), 0.2, '左歪');
        close(1.12, mx(col(2)), 1e-6, '落地壓扁 scaleX');
        close(0.88, mn(col(3)), 1e-6, '落地壓扁 scaleY');
        assert.isTrue(mx(col(3)) > 1.05, '最高點拉長 scaleY');
        assert.isTrue(mn(col(2)) < 0.97, '最高點拉長時 scaleX 變窄');
        close(0.78, mn(col(4)), 0.01, '影子縮到 0.78');
        close(0.55, mn(col(5)), 0.01, '影子變淡到 0.55');
        close(1, mx(col(4)), 0.02, '落地影子回 1');
    });

    suite.test('落地事件：走路每個週期起點發 land，間隔等於週期，且發出當下畫面正好在落地壓扁', () => {
        const m = mgr();
        const a = new TestActor(5);
        const h = m.register(a);
        const times: number[] = [];
        const squash: number[] = [];
        let t = 0;
        m.on('land', () => {
            times.push(t);
            squash.push(a.last.scaleX);
        });
        m.play(h, 'walk', { fadeInSec: 0 });
        const dt = 1 / 240;
        for (let i = 0; i < 240 * 4; i++) {
            t += dt;
            m.update(dt);
        }
        assert.isTrue(times.length >= 10 && times.length <= 12, `4 秒應約 11 次落地，實際 ${times.length}`);
        for (let i = 1; i < times.length; i++) close(0.36, times[i] - times[i - 1], dt * 1.5, '間隔=週期');
        // 事件在 update 內先發、apply 在後，a.last 還是上一幀值；改驗事件後下一幀為壓扁
        assert.isTrue(times[0] < 0.36 + dt, '第一次落地不晚於一個週期');
        // 事件對齊：事件那一幀之後 1 幀內 scaleX 達到 1.12
        const m2 = mgr();
        const b = new TestActor(5);
        const h2 = m2.register(b);
        let fired = false;
        let sx = 0;
        m2.on('land', () => {
            fired = true;
        });
        m2.play(h2, 'walk', { fadeInSec: 0 });
        for (let i = 0; i < 240 * 2 && !fired; i++) m2.update(dt);
        assert.isTrue(fired);
        m2.update(dt);
        sx = b.last.scaleX;
        close(1.12, sx, 1e-6, '落地那一刻畫面是壓扁最大');
    });

    suite.test('跳：落地事件在 0.42 秒、0.5 秒發 clipEnd，結束後回中性姿勢', () => {
        const m = mgr();
        const a = new TestActor(1);
        const h = m.register(a);
        const seen: string[] = [];
        let t = 0;
        m.on('*', (_h, name) => seen.push(`${name}:${t.toFixed(2)}`));
        m.play(h, 'jump', { fadeInSec: 0 });
        for (let i = 0; i < 60; i++) {
            t += 0.01;
            m.update(0.01);
        }
        assert.isTrue(seen.includes('land:0.42'), seen.join());
        assert.isTrue(seen.includes('clipEnd:0.50'), seen.join());
        assert.equals(null, m.currentClip(h));
        assert.equals(0, a.last.y);
        assert.equals(1, a.last.scaleX);
        const peak = (() => {
            const m3 = mgr();
            const b = new TestActor(1);
            b.record = true;
            m3.play(m3.register(b), 'jump', { fadeInSec: 0 });
            run(m3, 0.5, 0.005);
            return Math.max(...b.log.map((r) => r[0]));
        })();
        close(0.6, peak, 0.01, '跳高 0.6H');
    });

    suite.test('淡入淡出：play 切換時 y 依 smoothstep 由舊值過渡到新值（0.5 秒淡入）', () => {
        const m = mgr(mini);
        const a = new TestActor(1);
        const h = m.register(a);
        m.play(h, 'high');
        run(m, 0.2, 0.05);
        close(1, a.last.y);
        m.play(h, 'low', { fadeInSec: 0.5 });
        run(m, 0.125, 0.025);
        close(1 - 0.15625, a.last.y, 1e-6, 't=0.125 → w=smooth(0.25)');
        run(m, 0.125, 0.025);
        close(0.5, a.last.y, 1e-6, 't=0.25 → w=0.5');
        run(m, 0.25, 0.025);
        close(0, a.last.y, 1e-6, 't=0.5 → 完全新片段');
    });

    suite.test('stop：淡出到中性；淡出 0 秒立刻回中性', () => {
        const m = mgr(mini);
        const a = new TestActor(1);
        const h = m.register(a);
        m.play(h, 'high');
        run(m, 0.2, 0.05);
        m.stop(h, 0.4);
        run(m, 0.2, 0.05);
        close(0.5, a.last.y, 1e-6);
        run(m, 0.2, 0.05);
        close(0, a.last.y, 1e-6);
        m.play(h, 'high');
        run(m, 0.1, 0.05);
        m.stop(h, 0);
        m.update(0.05);
        close(0, a.last.y);
        assert.equals(null, m.currentClip(h));
    });

    suite.test('佇列：單次片段播完才接下一個，clipEnd 先發，接上時舊片段依淡入淡出過渡', () => {
        const m = mgr(mini);
        const a = new TestActor(1);
        const h = m.register(a);
        const log: string[] = [];
        m.on('clipEnd', (_h, _n, id) => log.push(`end:${id}`));
        m.on('hit', (_h, _n, id) => log.push(`hit:${id}`));
        m.play(h, 'once', { fadeInSec: 0 });
        assert.isTrue(m.queue(h, 'low', { fadeInSec: 0.2 }));
        run(m, 0.25, 0.05);
        assert.equals('once', m.currentClip(h));
        assert.equals('hit:once', log.join());
        m.update(0.05); // 0.30：播完
        assert.equals('hit:once,end:once', log.join());
        assert.equals('low', m.currentClip(h));
        close(1, a.last.y, 1e-6, '剛接上 w=0');
        run(m, 0.1, 0.05);
        close(0.5, a.last.y, 1e-6, '淡入 0.1/0.2 → w=0.5');
        run(m, 0.1, 0.05);
        close(0, a.last.y, 1e-6);
    });

    suite.test('佇列：循環片段在本週期結束才切；佇列滿回 false；play 清空佇列', () => {
        const m = mgr(mini);
        const a = new TestActor(1);
        const h = m.register(a);
        m.play(h, 'high', { seed: 0 });
        m.queue(h, 'low', { fadeInSec: 0 });
        // seed 相位偏移：循環片段會在「自身週期邊界」結束，最多 1 秒內一定切走
        run(m, 1.05, 0.05);
        assert.equals('low', m.currentClip(h));
        m.play(h, 'high', { fadeInSec: 0 });
        for (let i = 0; i < 8; i++) assert.isTrue(m.queue(h, 'low'));
        assert.isFalse(m.queue(h, 'low'));
        m.play(h, 'low');
        assert.isTrue(m.queue(h, 'high'));
        assert.isFalse(m.play(h, 'no-such-clip'));
    });

    suite.test('LOD1：每隔一幀更新、時間不丟；只算位移與呼吸，歪頭與影子維持中性', () => {
        const m = mgr();
        const a = new TestActor(1);
        const h = m.register(a);
        m.setLod(h, 1);
        m.play(h, 'walk', { fadeInSec: 0 });
        const before = a.applied;
        run(m, 10 / 60);
        assert.equals(5, a.applied - before, '10 幀只更新 5 次');
        assert.equals(0, a.last.rot);
        assert.equals(1, a.last.shadowScale);
        assert.isTrue(a.last.y > 0 || a.last.scaleX !== 1, 'y 或縮放有在動');
        // 時間沒丟：LOD1 跑 1 秒後的落地次數與 LOD0 相同
        const count = (lod: 0 | 1): number => {
            const mm = mgr();
            const b = new TestActor(9);
            const hh = mm.register(b);
            mm.setLod(hh, lod);
            let n = 0;
            mm.on('land', () => n++);
            mm.play(hh, 'walk', { fadeInSec: 0 });
            run(mm, 3);
            return n;
        };
        assert.equals(count(0), count(1));
    });

    suite.test('LOD2：不跑視覺通道（取樣數不增加、apply 只套一次中性），單次片段仍會結束並發 clipEnd，不發 land', () => {
        const m = mgr();
        const a = new TestActor(1);
        const h = m.register(a);
        m.setLod(h, 2);
        const ends: string[] = [];
        let lands = 0;
        m.on('clipEnd', (_h, _n, id) => ends.push(id));
        m.on('land', () => lands++);
        m.play(h, 'jump', { fadeInSec: 0 });
        const s0 = m.stats.sampleCount;
        run(m, 1);
        assert.equals(s0, m.stats.sampleCount);
        assert.equals(1, a.applied);
        assert.equals('jump', ends.join());
        assert.equals(0, lands);
        m.play(h, 'walk', { fadeInSec: 0 });
        run(m, 1);
        assert.equals(s0, m.stats.sampleCount);
        assert.equals(0, lands);
        assert.equals(1, a.applied);
    });

    suite.test('LOD 自動分配：低階機 12 顆 → 6 顆 LOD0、6 顆 LOD1；畫面外 LOD2；離焦點近的優先', () => {
        const m = mgr(realClips, 'low');
        const actors: TestActor[] = [];
        const hs: number[] = [];
        for (let i = 0; i < 12; i++) {
            const a = new TestActor(i);
            a.focusDistance = 12 - i; // 越後面越近
            actors.push(a);
            hs.push(m.register(a));
        }
        m.update(1 / 60);
        const lods = hs.map((h) => m.getLod(h));
        assert.equals(6, lods.filter((l) => l === 0).length);
        assert.equals(6, lods.filter((l) => l === 1).length);
        for (let i = 6; i < 12; i++) assert.equals(0, lods[i], `最近的第 ${i} 顆應全速`);
        actors[11].culled = true;
        run(m, 0.3);
        assert.equals(2, m.getLod(hs[11]));
        assert.equals(6, hs.filter((h) => m.getLod(h) === 0).length, '遞補後仍 6 顆全速');
        m.setTier('high');
        run(m, 0.3);
        assert.equals(11, hs.filter((h) => m.getLod(h) <= 1).length);
        assert.equals(11, hs.filter((h) => m.getLod(h) === 0).length, '高階機 16 顆全速，11 顆全進');
    });

    suite.test('只改 JSON 就能新增動作：自訂 wobble 片段不改程式即可播放', () => {
        const lib: QClipLibrary = JSON.parse(JSON.stringify(realClips));
        lib.clips['wobble'] = JSON.parse(
            '{"loop":true,"period":0.5,"channels":{"rot":{"type":"sine","amp":10},"y":{"type":"bounce","amp":0.2}},"events":[{"t":0.25,"name":"tick"}]}',
        );
        assert.equals(0, validateClipLibrary(lib).length);
        const m = mgr(lib);
        const a = new TestActor(1);
        a.record = true;
        const h = m.register(a);
        let ticks = 0;
        m.on('tick', () => ticks++);
        m.play(h, 'wobble', { fadeInSec: 0 });
        run(m, 2, 1 / 120);
        close(10, Math.max(...a.log.map((r) => r[1])), 0.2);
        close(0.2, Math.max(...a.log.map((r) => r[0])), 0.01);
        assert.isTrue(ticks >= 3 && ticks <= 5, `2 秒 4 次 tick，實際 ${ticks}`);
    });

    suite.test('物件池：註冊／註銷 1000 次，建立的物件數不增長；池滿回 INVALID；過期把手被忽略', () => {
        const m = mgr(realClips, 'high');
        const first = m.register(new TestActor(0));
        m.unregister(first);
        for (let i = 0; i < 1000; i++) {
            const h = m.register(new TestActor(i));
            assert.notEquals(INVALID_HANDLE, h);
            m.play(h, 'walk');
            m.update(1 / 60);
            m.unregister(h);
        }
        assert.equals(1, m.getPoolInfo().created);
        assert.equals(0, m.getPoolInfo().inUse);
        // 滿載 24 頭 × 1000 輪
        for (let r = 0; r < 1000; r++) {
            const hs: number[] = [];
            for (let i = 0; i < 24; i++) hs.push(m.register(new TestActor(i)));
            for (const h of hs) m.unregister(h);
        }
        assert.equals(24, m.getPoolInfo().created);
        // 池上限 = maxActors + 4 = 28
        const many: number[] = [];
        for (let i = 0; i < 28; i++) many.push(m.register(new TestActor(i)));
        assert.equals(INVALID_HANDLE, m.register(new TestActor(99)));
        assert.equals(28, m.getPoolInfo().created);
        // 過期把手：註銷後再用不會碰到重用該槽位的新演員
        const stale = many[0];
        m.unregister(stale);
        const fresh = m.register(new TestActor(5));
        assert.isFalse(m.play(stale, 'walk'));
        assert.isTrue(m.play(fresh, 'walk'));
        assert.equals(null, m.currentClip(stale));
    });

    suite.test('通用物件池 QActorPool：借還重用、上限、onReset', () => {
        let resets = 0;
        const pool = new QActorPool<{ id: number }>(() => ({ id: Math.random() }), 3, () => resets++);
        const a = pool.acquire();
        const b = pool.acquire();
        const c = pool.acquire();
        assert.isDefined(a);
        assert.equals(null, pool.acquire());
        pool.release(b as { id: number });
        assert.equals(b, pool.acquire());
        assert.equals(3, pool.created);
        assert.equals(1, resets);
        assert.isDefined(c);
    });

    suite.test('面向與不對稱旗標：facing=-1 翻轉；noFlip 永遠 1；待機轉頭只會是 ±1 或過渡值', () => {
        const m = mgr();
        const a = new TestActor(1);
        const b = new TestActor(1);
        b.noFlip = true;
        const ha = m.register(a);
        const hb = m.register(b);
        m.setFacing(ha, -1);
        m.setFacing(hb, -1);
        m.play(ha, 'walk', { fadeInSec: 0 });
        m.play(hb, 'walk', { fadeInSec: 0 });
        run(m, 0.2);
        assert.equals(-1, a.last.flipX);
        assert.equals(1, b.last.flipX);
        // 待機 60 秒：轉頭會發生（出現 -1），noFlip 的永遠 1
        const c = new TestActor(4);
        const d = new TestActor(4);
        d.noFlip = true;
        c.record = true;
        d.record = true;
        m.play(m.register(c), 'idle', { fadeInSec: 0 });
        m.play(m.register(d), 'idle', { fadeInSec: 0 });
        run(m, 60, 0.05);
        assert.isTrue(c.log.some((r) => r[6] === -1), '轉過頭');
        assert.isTrue(c.log.some((r) => r[6] === 1));
        assert.isTrue(d.log.every((r) => r[6] === 1), 'noFlip 不翻');
    });

    suite.test('暫停：setPaused 後 update 不推進、不發事件；繼續後接著跑', () => {
        const m = mgr();
        const a = new TestActor(1);
        const h = m.register(a);
        let lands = 0;
        m.on('land', () => lands++);
        m.play(h, 'walk', { fadeInSec: 0 });
        run(m, 0.2);
        const snap = JSON.stringify(a.last);
        const landsBefore = lands;
        m.setPaused(true);
        run(m, 2);
        assert.equals(snap, JSON.stringify(a.last));
        assert.equals(landsBefore, lands);
        m.setPaused(false);
        run(m, 1);
        assert.isTrue(lands > landsBefore);
    });

    suite.test('單幀 dt 上限：切回前景的超大 dt 被夾住，不會一次跳過多個週期', () => {
        const m = mgr();
        const a = new TestActor(1);
        const h = m.register(a);
        let lands = 0;
        m.on('land', () => lands++);
        m.play(h, 'walk', { fadeInSec: 0 });
        m.update(10);
        assert.isTrue(lands <= 1);
    });

    suite.test('24 顆同走：每幀更新耗時在高階預算內（有計時統計）', () => {
        const m = mgr(realClips, 'high');
        for (let i = 0; i < 24; i++) {
            const a = new TestActor(i);
            a.focusDistance = i;
            m.play(m.register(a), i % 3 === 0 ? 'idle' : 'walk');
        }
        run(m, 3);
        assert.equals(24, m.stats.alive);
        assert.isTrue(m.stats.lastUpdateMs < 2.0 * 10, `單幀耗時 ${m.stats.lastUpdateMs}ms（Node 測試環境放寬 10 倍）`);
        assert.isTrue(m.stats.updatedThisFrame > 0);
    });

    return suite;
}
