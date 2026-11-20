/**
 * LobbyMountScheduler.test.ts — 大廳背景面板動態加載排程（PROG-2-9196）
 */
import { assert, TestSuite } from './TestRunner';
import { DEFAULT_LOBBY_MOUNT_CONFIG, LobbyMountScheduler, normalizeLobbyMountConfig, type LobbyMountConfig, type LobbyMountEnv } from '../assets/scripts/ui/core/LobbyMountScheduler';
import { isBuildHostAlive } from '../assets/scripts/ui/core/UIBuildHostGuard';

/** 假時鐘：nextFrame 前進 16ms、wait 前進指定毫秒；可在每次前進時插入玩家操作 */
function fakeEnv(opts: { frameMs?: number; onTick?: (now: number) => void } = {}) {
    let t = 10000;
    let lastInput = -1e9;
    const env: LobbyMountEnv & { setInput(): void; time(): number } = {
        now: () => t,
        nextFrame: async () => { t += 16; opts.onTick?.(t); },
        wait: async (ms) => { t += ms; opts.onTick?.(t); },
        lastFrameMs: () => opts.frameMs ?? 16,
        lastInputAt: () => lastInput,
        setInput: () => { lastInput = t; },
        time: () => t,
    };
    return env;
}

const cfg = (over: Partial<LobbyMountConfig> = {}): LobbyMountConfig => ({ ...DEFAULT_LOBBY_MOUNT_CONFIG, ...over });

function entries(ids: string[], log: string[], env?: { time(): number }) {
    return ids.map((id) => ({ id, run: async () => { log.push(env ? `${id}@${env.time()}` : id); } }));
}

const atOf = (log: string[], id: string) => Number(log.find((l) => l.startsWith(`${id}@`))!.split('@')[1]);

export function createLobbyMountSchedulerSuite(): TestSuite {
    const suite = new TestSuite('LobbyMountScheduler');

    suite.test('熱門清單先建，其餘維持原順序', async () => {
        const log: string[] = [];
        const s = new LobbyMountScheduler(entries(['A', 'B', 'C', 'D', 'E'], log), cfg({ hotIds: ['D', 'B'], gapBetweenMountsMs: 0, inputPauseMs: 0 }), fakeEnv());
        assert.equals('D,B,A,C,E', s.order.join(','));
        await s.runAll();
        assert.equals('D,B,A,C,E', log.join(','));
        assert.equals(5, s.completed);
        await s.whenSettled();
    });

    suite.test('非熱門項目之間至少隔 gapBetweenMountsMs，熱門項目不用等閒置', async () => {
        const log: string[] = [];
        const env = fakeEnv();
        const s = new LobbyMountScheduler(entries(['H1', 'H2', 'X', 'Y'], log, env), cfg({ hotIds: ['H1', 'H2'], gapBetweenMountsMs: 250, inputPauseMs: 0 }), env);
        await s.runAll();
        assert.isTrue(atOf(log, 'H2') - atOf(log, 'H1') < 100, '熱門連續建');
        assert.isTrue(atOf(log, 'X') - atOf(log, 'H2') >= 250, '非熱門前先隔 gap');
        assert.isTrue(atOf(log, 'Y') - atOf(log, 'X') >= 250, '非熱門之間隔 gap');
    });

    suite.test('玩家操作中暫停非熱門項目，閒置後才繼續', async () => {
        const log: string[] = [];
        const holder: { env?: ReturnType<typeof fakeEnv> } = {};
        // 時間 12000 之前玩家持續操作
        holder.env = fakeEnv({ onTick: (now) => { if (now < 12000) holder.env!.setInput(); } });
        const env = holder.env;
        env.setInput();
        const s = new LobbyMountScheduler(entries(['F', 'X'], log, env), cfg({ inputPauseMs: 1000, gapBetweenMountsMs: 0, maxDeferMs: 60000 }), env);
        await s.runAll();
        assert.isTrue(atOf(log, 'X') >= 12900, `玩家操作到 12000 後還要閒置約 1000，實際 ${atOf(log, 'X')}`);
    });

    suite.test('畫面持續卡頓時，等到 maxDeferMs 仍會建（不會永遠不補齊）', async () => {
        const log: string[] = [];
        const env = fakeEnv({ frameMs: 80 });
        const s = new LobbyMountScheduler(entries(['F', 'X'], log, env), cfg({ startWhenFrameMsBelow: 24, gapBetweenMountsMs: 0, inputPauseMs: 0, maxDeferMs: 1000 }), env);
        await s.runAll();
        const waited = atOf(log, 'X') - 10000;
        assert.isTrue(waited >= 1000 && waited < 1200, `約 1000ms 後建，實際 ${waited}`);
        assert.equals(2, s.completed);
    });

    suite.test('demand：點到未建好的介面立刻補建，且不重複建構', async () => {
        const log: string[] = [];
        let gate: () => void = () => undefined;
        const blocker = new Promise<void>((r) => { gate = r; });
        const list = [
            { id: 'A', run: async () => { log.push('A'); await blocker; } },
            { id: 'B', run: async () => { log.push('B'); } },
            { id: 'C', run: async () => { log.push('C'); } },
        ];
        const s = new LobbyMountScheduler(list, cfg({ gapBetweenMountsMs: 0, inputPauseMs: 0 }), fakeEnv());
        const running = s.runAll();
        await s.demand('C');
        assert.isTrue(s.isMounted('C'));
        assert.isTrue(!s.isMounted('B'), 'B 還沒輪到');
        await Promise.all([s.demand('C'), s.demand('C')]);
        gate();
        await running;
        assert.equals(1, log.filter((x) => x === 'C').length);
        assert.equals(3, s.completed);
    });

    suite.test('cancel：換場景後尚未開始的項目不再建，whenSettled 立刻結束', async () => {
        const log: string[] = [];
        const holder: { s?: LobbyMountScheduler } = {};
        const list = [
            { id: 'A', run: async () => { log.push('A'); holder.s!.cancel(); } },
            { id: 'B', run: async () => { log.push('B'); } },
            { id: 'C', run: async () => { log.push('C'); } },
        ];
        const s = new LobbyMountScheduler(list, cfg({ gapBetweenMountsMs: 0, inputPauseMs: 0 }), fakeEnv());
        holder.s = s;
        await s.runAll();
        await s.whenSettled();
        assert.equals('A', log.join(','));
        assert.isTrue(s.cancelled);
        await s.demand('B');
        assert.equals('A', log.join(','), '取消後 demand 也不建');
    });

    suite.test('單項失敗交給 onError，後面的照建；取消後的失敗不回報', async () => {
        const errors: string[] = [];
        const log: string[] = [];
        const list = [
            { id: 'A', run: async () => { throw new Error('boom'); } },
            { id: 'B', run: async () => { log.push('B'); } },
        ];
        const s = new LobbyMountScheduler(list, cfg({ gapBetweenMountsMs: 0, inputPauseMs: 0 }), fakeEnv());
        await s.runAll((id) => errors.push(id));
        assert.equals('A', errors.join(','));
        assert.equals('B', log.join(','));

        const errors2: string[] = [];
        const holder: { s?: LobbyMountScheduler } = {};
        const s2 = new LobbyMountScheduler([{ id: 'A', run: async () => { holder.s!.cancel(); throw new Error('host null'); } }], cfg(), fakeEnv());
        holder.s = s2;
        await s2.runAll((id) => errors2.push(id));
        assert.equals(0, errors2.length);
    });

    suite.test('進度回報次數等於項目數；idForUi 依 uiId 對應', async () => {
        const seen: string[] = [];
        const list = [{ id: 'A', uiId: 'UI_A', run: async () => undefined }, { id: 'B', run: async () => undefined }];
        const s = new LobbyMountScheduler(list, cfg({ gapBetweenMountsMs: 0, inputPauseMs: 0 }), fakeEnv(), (d, t) => seen.push(`${d}/${t}`));
        await s.runAll();
        assert.equals('1/2,2/2', seen.join(','));
        assert.equals('A', s.idForUi('UI_A') as string);
        assert.equals(null, s.idForUi('none'));
    });

    suite.test('設定檔正規化：缺欄位、型別錯誤用預設值；預設不顯示背景進度條', () => {
        const d = normalizeLobbyMountConfig(null);
        assert.equals(false, d.showBackgroundProgress);
        const c = normalizeLobbyMountConfig({ hotIds: ['A', 3, 'B'], inputPauseMs: 'x', gapBetweenMountsMs: 100, startWhenFrameMsBelow: 0, showBackgroundProgress: true });
        assert.equals('A,B', c.hotIds.join(','));
        assert.equals(DEFAULT_LOBBY_MOUNT_CONFIG.inputPauseMs, c.inputPauseMs);
        assert.equals(100, c.gapBetweenMountsMs);
        assert.equals(DEFAULT_LOBBY_MOUNT_CONFIG.startWhenFrameMsBelow, c.startWhenFrameMsBelow);
        assert.equals(true, c.showBackgroundProgress);
    });

    suite.test('buildScreen host 防護：null／undefined／已銷毀都視為失效', () => {
        assert.equals(false, isBuildHostAlive(null));
        assert.equals(false, isBuildHostAlive(undefined));
        assert.equals(false, isBuildHostAlive({ isValid: false }));
        assert.equals(true, isBuildHostAlive({ isValid: true }));
        assert.equals(true, isBuildHostAlive({}));
    });

    return suite;
}
