// @spec-source → Issue #2135（幕府大廳走動）；PROG-2-2251
/**
 * LobbyWanderCore.test.ts — 走動核心狀態機（固定種子可重現）
 *
 * 驗收對應：沒人走出地板帶、idle 2–4 秒、只有 idle 能點、點了停在原地、間距、速度＝步幅常數、面向。
 * Unity 對照：對一個不依賴 MonoBehaviour 的 AI 狀態機跑固定步長模擬。
 */
import { HallWander, LOBBY_DESIGN, WALK_GROUND_SPEED, WANDER_ANIMS, pointAllowed, type WanderConfig } from '../assets/scripts/shared/lobby/wanderCore';
import { TestSuite, assert } from './TestRunner';

const SCALE = 0.22;
const SPEED = WALK_GROUND_SPEED.general * SCALE;
const DT = 1 / 30;

function config(seed = 20261113, ids = ['a', 'b', 'c', 'd']): WanderConfig {
    return {
        seed,
        floor: LOBBY_DESIGN.floor,
        floorPolygon: [...LOBBY_DESIGN.floorPolygon],
        idleSeconds: [2, 4],
        minDistance: 150,
        actors: ids.map((id, i) => ({ id, tier: 'general' as const, speed: SPEED, start: { x: 640 + i * 200, y: 860 + (i % 2) * 40 } })),
    };
}

function run(wander: HallWander, seconds: number, each?: () => void): void {
    for (let t = 0; t < seconds; t += DT) {
        wander.step(DT);
        each?.();
    }
}

export function createLobbyWanderCoreSuite(): TestSuite {
    const suite = new TestSuite('LobbyWanderCore (大廳走動核心 Issue #2135)');

    suite.test('步態常數：武將 93.33、動畫名 walk_in_place / idle', () => {
        assert.equals(93.33, WALK_GROUND_SPEED.general);
        assert.equals('walk_in_place', WANDER_ANIMS.general.walk);
        assert.equals('idle', WANDER_ANIMS.general.idle);
    });

    suite.test('固定種子：同一組設定跑兩次，每一幀位置都相同；換種子路徑不同', () => {
        const a = new HallWander(config());
        const b = new HallWander(config());
        const c = new HallWander(config(7));
        let same = true;
        let diff = false;
        for (let i = 0; i < 900; i++) {
            const sa = a.step(DT);
            const sb = b.step(DT);
            const sc = c.step(DT);
            for (let k = 0; k < sa.length; k++) {
                if (sa[k].x !== sb[k].x || sa[k].y !== sb[k].y) same = false;
                if (sa[k].x !== sc[k].x || sa[k].y !== sc[k].y) diff = true;
            }
        }
        assert.isTrue(same, '同種子應完全重現');
        assert.isTrue(diff, '不同種子應走出不同路徑');
    });

    suite.test('走動 60 秒：每個目標點都在地板帶內（矩形＋梯形）', () => {
        const w = new HallWander(config());
        let outside = 0;
        run(w, 60, () => {
            for (const s of w.drawOrder()) {
                if (s.state === 'walk' && !pointAllowed({ x: s.targetX, y: s.targetY }, LOBBY_DESIGN.floor, [...LOBBY_DESIGN.floorPolygon])) outside++;
            }
        });
        assert.equals(0, outside);
    });

    suite.test('停頓 2–4 秒：每次到點後的 idle 長度都落在範圍內', () => {
        const w = new HallWander(config(20261113, ['a']));
        let prev = 'idle';
        let idleStart = 0;
        const lengths: number[] = [];
        let t = 0;
        for (let i = 0; i < 30 * 120; i++) {
            const s = w.step(DT)[0];
            t += DT;
            if (prev === 'walk' && s.state === 'idle') idleStart = t;
            if (prev === 'idle' && s.state === 'walk' && idleStart > 0) lengths.push(t - idleStart);
            prev = s.state;
        }
        assert.isTrue(lengths.length >= 3, '120 秒內至少停過三次');
        for (const len of lengths) assert.isTrue(len >= 1.9 && len <= 4.2, `停頓 ${len.toFixed(2)} 秒超出 2–4 秒`);
    });

    suite.test('走路速度等於步幅常數 × 縮放（勻速，腳不滑）', () => {
        const w = new HallWander(config(20261113, ['a']));
        let walkFrames = 0;
        let maxErr = 0;
        let px = Number.NaN;
        let py = Number.NaN;
        let prevState = 'idle';
        for (let i = 0; i < 30 * 40; i++) {
            const s = w.step(DT)[0];
            // 剛從 idle 切成 walk 的那一幀還沒位移，從第二幀起才量速度
            if (s.state === 'walk' && prevState === 'walk' && !Number.isNaN(px) && Math.hypot(s.targetX - s.x, s.targetY - s.y) > SPEED * 2 * DT) {
                maxErr = Math.max(maxErr, Math.abs(Math.hypot(s.x - px, s.y - py) / DT - SPEED));
                walkFrames++;
            }
            px = s.x;
            py = s.y;
            prevState = s.state;
        }
        assert.isTrue(walkFrames > 30, '要有足夠的走路幀');
        assert.isTrue(maxErr < 1e-6, `走路速度偏離 ${maxErr}`);
    });

    suite.test('面向與動畫：往左走 facing=-1、往右走 +1；走路播 walk_in_place、停頓播 idle', () => {
        const w = new HallWander(config());
        let leftOk = false;
        let rightOk = false;
        let consistent = true;
        const prevX = new Map<string, number>();
        run(w, 60, () => {
            for (const s of w.drawOrder()) {
                const before = prevX.get(s.id);
                if (s.state === 'walk' && before !== undefined && Math.abs(s.x - before) > 1e-6) {
                    if (s.x < before) { if (s.facing === -1) leftOk = true; else consistent = false; }
                    if (s.x > before) { if (s.facing === 1) rightOk = true; else consistent = false; }
                }
                if (s.anim !== (s.state === 'walk' ? 'walk_in_place' : 'idle')) consistent = false;
                prevX.set(s.id, s.x);
            }
        });
        assert.isTrue(leftOk && rightOk, '兩個方向都要出現過');
        assert.isTrue(consistent, '朝向與動畫名必須一致（沒有倒著走）');
    });

    suite.test('只有 idle 能點：走動中點不到；idle 時點得到', () => {
        const w = new HallWander(config());
        let walkPicked = false;
        let idlePicked = false;
        run(w, 40, () => {
            for (const s of w.drawOrder()) {
                const hit = w.pickIdleAt(s.x, s.y, 5);
                const self = hit !== null && hit.id === s.id;
                if (s.state === 'walk' && (self || s.clickable)) walkPicked = true;
                if (s.state === 'idle' && s.clickable && self) idlePicked = true;
            }
        });
        assert.isFalse(walkPicked, '走動中不可點');
        assert.isTrue(idlePicked, '發呆中要點得到');
    });

    suite.test('點擊停住：lockIdle 後原地不動、不可再點，unlock 後繼續走', () => {
        const w = new HallWander(config(20261113, ['a']));
        let s = w.step(DT)[0];
        for (let i = 0; i < 30 * 30 && s.state !== 'idle'; i++) s = w.step(DT)[0];
        assert.equals('idle', s.state);
        const x = s.x;
        const y = s.y;
        w.lockIdle('a');
        for (let i = 0; i < 30 * 10; i++) s = w.step(DT)[0];
        assert.equals(x, s.x);
        assert.equals(y, s.y);
        assert.equals('idle', s.state);
        assert.isFalse(s.clickable, '對話鎖住時不可再點');
        w.unlock('a');
        let moved = false;
        for (let i = 0; i < 30 * 8; i++) {
            s = w.step(DT)[0];
            if (s.state === 'walk') moved = true;
        }
        assert.isTrue(moved, '解鎖後要繼續走');
    });

    suite.test('角色間距：走動 120 秒，任兩人腳底距離不會貼在一起', () => {
        const w = new HallWander(config());
        let min = Number.POSITIVE_INFINITY;
        run(w, 120, () => {
            const st = w.drawOrder();
            for (let i = 0; i < st.length; i++) {
                for (let j = i + 1; j < st.length; j++) min = Math.min(min, Math.hypot(st[i].x - st[j].x, st[i].y - st[j].y));
            }
        });
        assert.isTrue(min > 40, `最近距離 ${min.toFixed(1)} 過近`);
    });

    suite.test('遮擋順序：每一幀回傳都是腳底 y 由小到大', () => {
        const w = new HallWander(config());
        let ordered = true;
        run(w, 60, () => {
            const st = w.drawOrder();
            for (let i = 1; i < st.length; i++) if (st[i - 1].y > st[i].y) ordered = false;
        });
        assert.isTrue(ordered);
    });

    return suite;
}
