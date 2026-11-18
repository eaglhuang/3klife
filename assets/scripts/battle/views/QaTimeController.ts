// @spec-source → docs/agent-briefs/tasks/PROG/PROG-2-9405.md（QA 慢動作與定格，PROG-2-9405）
/**
 * QaTimeController — 僅限 QA 的時間控制掛載端：網址參數 → 引擎層統一變慢，並提供 window.__qaTime。
 *
 * 做法：不逐系統改，而是把倍率乘進 director.tick 的 dt（BattleTimeScale 已有同一個入口，
 * 與戰場 x2 加速、奧義暫停相容）。tween、Spine 骨骼（sp.Skeleton.update 吃的是 scheduler 傳入的 dt）、
 * 粒子與 scheduler 計時器因此一起變慢。另外 setTimeout 走牆上時鐘（命中閃白、傷害跳字延遲等），
 * 慢動作期間會把延遲除以倍率補上，才會和畫面同步；定格（pause）時 setTimeout 仍照牆上時鐘跑，這是已知限制。
 *
 * 只有網址帶 qa* 參數才會掛上；沒有任何 qa 參數時 installQaTime 直接回傳，不改任何全域。
 *
 * window.__qaTime：
 *   setScale(n)  改倍率（夾 0.05～1）；resume 後生效
 *   pause()      定格；畫面停住但仍會繪製
 *   resume()     解除定格
 *   step(ms)     定格中推進指定毫秒後再定格（不在定格中會先定格）
 *   state()      目前 { scale, frozen }
 *
 * Unity 對照：Time.timeScale + 手動 Step 的 QA 工具列。
 */
import {
    QA_TIME_SCALE_MAX,
    QA_TIME_SCALE_MIN,
    clampQaScale,
    parseQaTimeParams,
    planStepSlices,
    scaleTimerDelay,
} from '../../core/systems/QaTimeScale';
import { isQaTimeFrozen, qaTimeMultiplier, setQaTimeFrozen, setQaTimeMultiplier, stepDirector } from './BattleTimeScale';

export interface QaTimeApi {
    setScale(scale: number): number;
    pause(): void;
    resume(): void;
    step(ms: number): number;
    state(): { scale: number; frozen: boolean };
}

type TimerFn = (handler: unknown, timeout?: number, ...args: unknown[]) => unknown;

let installed = false;
let timerPatched = false;

/** 讓 setTimeout 的延遲跟著倍率變長；只在 QA 模式裝一次 */
function patchSetTimeout(host: { setTimeout?: TimerFn }): void {
    if (timerPatched || typeof host.setTimeout !== 'function') return;
    timerPatched = true;
    const original = host.setTimeout.bind(host);
    host.setTimeout = (handler, timeout, ...args) => original(handler, scaleTimerDelay(timeout, qaTimeMultiplier()), ...args);
}

/** 建立 window.__qaTime 內容（獨立出來讓單元測試不用碰 window） */
export function createQaTimeApi(): QaTimeApi {
    return {
        setScale(scale: number): number {
            const next = clampQaScale(scale);
            setQaTimeMultiplier(next);
            return next;
        },
        pause(): void { setQaTimeFrozen(true); },
        resume(): void { setQaTimeFrozen(false); },
        step(ms: number): number {
            const slices = planStepSlices(ms);
            setQaTimeFrozen(true);
            stepDirector(slices);
            return slices.reduce((sum, dt) => sum + dt, 0) * 1000;
        },
        state(): { scale: number; frozen: boolean } {
            return { scale: qaTimeMultiplier(), frozen: isQaTimeFrozen() };
        },
    };
}

/**
 * 依網址決定要不要掛 QA 時間控制；回傳是否已掛上。
 * 沒有 qa 參數或非瀏覽器環境一律不動。重複呼叫只會裝一次。
 */
export function installQaTime(search: string | undefined | null): boolean {
    const params = parseQaTimeParams(search);
    if (!params.enabled || installed) return false;
    const host = (globalThis as unknown as { window?: Record<string, unknown> & { setTimeout?: TimerFn } }).window;
    if (!host) return false;
    installed = true;
    for (const warning of params.warnings) console.warn(`[QaTime] ${warning}`);
    const api = createQaTimeApi();
    if (params.scale !== 1) {
        api.setScale(params.scale);
        patchSetTimeout(host);
        console.log(`[QaTime] qaSlow 已啟用，倍率 ${params.scale}（範圍 ${QA_TIME_SCALE_MIN}～${QA_TIME_SCALE_MAX}）`);
    } else {
        // 之後才用 setScale 放慢時也要讓 setTimeout 跟上，所以 QA 模式一律先裝
        patchSetTimeout(host);
    }
    host.__qaTime = api;
    return true;
}
