// @spec-source → PROG-2-9713 戰場效能熱點修正（承接 PROG-2-9800 量測）
/**
 * BattlePerfProbe — 戰場每幀分段計時（預設關閉，幾乎零成本）。
 *
 * 開啟方式：網址加 `?battlePerf=1`，或在主控台設 `globalThis.__BATTLE_PERF_ON__ = true`。
 * 開啟後每段累計呼叫次數、總毫秒、單次最大毫秒，結果放在 `globalThis.__BATTLE_PERF__`，
 * 量測工具（playtest-online.js --perf）可在戰鬥結束時讀回。
 *
 * Unity 對照：等同自寫的 Profiler.BeginSample / EndSample，但只在旗標打開時才計時。
 */

export interface BattlePerfSection {
    calls: number;
    totalMs: number;
    maxMs: number;
}

export interface BattlePerfSnapshot {
    frames: number;
    sections: Record<string, BattlePerfSection>;
}

type PerfGlobal = typeof globalThis & {
    __BATTLE_PERF_ON__?: boolean;
    __BATTLE_PERF__?: BattlePerfSnapshot;
    location?: { search?: string };
};

const g = globalThis as PerfGlobal;
let urlFlag: boolean | null = null;

function now(): number {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

/** 是否開啟分段計時（網址旗標只讀一次） */
export function battlePerfEnabled(): boolean {
    if (g.__BATTLE_PERF_ON__ === true) return true;
    if (urlFlag === null) {
        const search = g.location?.search ?? '';
        urlFlag = /[?&]battlePerf=1\b/.test(search);
    }
    return urlFlag;
}

function snapshot(): BattlePerfSnapshot {
    if (!g.__BATTLE_PERF__) g.__BATTLE_PERF__ = { frames: 0, sections: {} };
    return g.__BATTLE_PERF__;
}

/** 開始一段計時；關閉時回傳 0，不做任何事 */
export function perfBegin(): number {
    return battlePerfEnabled() ? now() : 0;
}

/** 結束一段計時並累計到 name；start 為 0（未開啟）時直接略過 */
export function perfEnd(name: string, start: number): void {
    if (start === 0) return;
    const ms = now() - start;
    const sections = snapshot().sections;
    const s = sections[name] ?? (sections[name] = { calls: 0, totalMs: 0, maxMs: 0 });
    s.calls += 1;
    s.totalMs += ms;
    if (ms > s.maxMs) s.maxMs = ms;
}

/** 每幀呼叫一次，累計幀數 */
export function perfFrame(): void {
    if (battlePerfEnabled()) snapshot().frames += 1;
}

/** 清空累計（新戰鬥開始時呼叫） */
export function resetBattlePerf(): void {
    if (g.__BATTLE_PERF__) g.__BATTLE_PERF__ = { frames: 0, sections: {} };
}

/** 測試用：重讀網址旗標 */
export function _resetBattlePerfFlagForTest(): void {
    urlFlag = null;
}
