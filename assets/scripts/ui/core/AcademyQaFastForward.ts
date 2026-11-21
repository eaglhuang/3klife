// @spec-source → 學府修業畫面與接線設計.md (doc_spec_1179) §9.4 debug.fastForward；PROG-2-9192
/**
 * AcademyQaFastForward — 學府 QA 快進（純邏輯，不依賴 cc）。
 *
 * 網址參數 `qaAcademy=<回合數>`（沿用 QaTimeScale 慣例：沒帶就完全不介入）：入學後連續 commit 訓練／休息，
 * 直到「已完成 N 回合」為止，停在下一回合開始前，此時第 12／24 回合的打斷點已掛上，供截圖打斷彈窗。
 * 只由本機 adapter 的 debug.fastForward 呼叫；網路 adapter 一律拒絕，避免變成外掛入口。
 *
 * 它不改引擎規則：每一步仍走修業控制器的 act／confirm（先 commit、再落盤），只是替玩家選動作。
 * 動作選擇：有專屬互動擋住就用學府的 autoInteraction；有打斷點就選第一個選項；精力夠就訓練智力，不夠就休息。
 *
 * Unity 對照：像 EditMode 測試裡的「快轉 N 回合」輔助函式，只存在於偵錯入口。
 */
import { ACADEMY_TUNING } from '../../core/systems/nurture/AcademyTrainingEngine';
import { ACADEMY_TOTAL_TURNS, type AcademyActionPayload, type AcademyStateSnapshot, type IAcademyGimmickHandler } from '../../core/systems/nurture/AcademyTypes';

/** 網址參數名稱（單一出處，文件與測試共用） */
export const QA_ACADEMY_QUERY = 'qaAcademy';

/** 快進一次最多推進的動作數（36 回合 × 結算確認 × 專屬互動 × 打斷點的寬鬆上限，防止卡死迴圈） */
export const QA_ACADEMY_MAX_STEPS = 400;

export interface QaAcademyParams {
    /** 要完成的回合數（1~36） */
    turns: number;
}

/** 解析網址查詢字串；沒帶、不是正整數或超出 1~36 都回 null（視為沒啟用） */
export function parseQaAcademyParams(search: string | undefined | null): QaAcademyParams | null {
    if (typeof search !== 'string' || search.length === 0) return null;
    const raw = new URLSearchParams(search).get(QA_ACADEMY_QUERY);
    if (raw === null || !/^\d+$/.test(raw.trim())) return null;
    const turns = Number(raw.trim());
    if (!Number.isInteger(turns) || turns < 1 || turns > ACADEMY_TOTAL_TURNS) return null;
    return { turns };
}

type GimmickLike = Pick<IAcademyGimmickHandler, 'blockingInteraction' | 'autoInteraction'>;

/** 下一步要送給引擎的動作；已結業回 null */
export function nextFastForwardAction(snapshot: Readonly<AcademyStateSnapshot>, gimmick?: GimmickLike): AcademyActionPayload | null {
    if (snapshot.graduated) return null;
    if (snapshot.pendingInterrupt) {
        const option = snapshot.interruptOptions[0];
        return option === undefined ? { actionType: 'RESOLVE_INTERRUPT' } : { actionType: 'RESOLVE_INTERRUPT', selectedOptionId: option };
    }
    const state = snapshot as AcademyStateSnapshot;
    if (gimmick?.blockingInteraction?.(state) && gimmick.autoInteraction) {
        return { actionType: 'GIMMICK_INTERACT', selectedOptionId: gimmick.autoInteraction(state) };
    }
    // 平衡策略的 BALANCE 方針每次多耗 5 精力，留足餘裕避免因精力不足被引擎拒絕
    const need = ACADEMY_TUNING.trainEnergyCost + ACADEMY_TUNING.midtermBalanceExtraEnergy;
    return snapshot.energy >= need ? { actionType: 'TRAIN', targetStat: 'int' } : { actionType: 'REST' };
}

/** 快進需要的修業控制器能力（AcademyFlowController 實作；測試用假物件） */
export interface AcademyFastForwardPort {
    snapshot(): Readonly<AcademyStateSnapshot> | null;
    /** 目前畫面模式；settling 時要先 confirm 才能再動作 */
    mode(): string;
    act(action: AcademyActionPayload): Promise<boolean>;
    confirm(): Promise<void>;
}

export type AcademyFastForwardStop = 'target' | 'graduated' | 'no-record' | 'blocked' | 'failed' | 'max-steps';

export interface AcademyFastForwardResult {
    /** 停下時已完成的回合數（currentTurn − 1；已結業為 36） */
    completedTurns: number;
    steps: number;
    stoppedBy: AcademyFastForwardStop;
}

/** 已完成的回合數：currentTurn 是「正要進行的回合」，已結業算滿 36 */
export function completedTurnsOf(snapshot: Readonly<AcademyStateSnapshot>): number {
    return snapshot.graduated ? ACADEMY_TOTAL_TURNS : snapshot.currentTurn - 1;
}

/**
 * 快進到「已完成 turns 回合」。到達當下若有打斷點（第 12／24 回合）不處理，留給畫面彈出。
 * turns 為 36 時，最後的結業確認會被自動處理（走完整個結業流程）。
 */
export async function fastForwardAcademy(port: AcademyFastForwardPort, turns: number, gimmick?: GimmickLike): Promise<AcademyFastForwardResult> {
    let steps = 0;
    const done = (stoppedBy: AcademyFastForwardStop): AcademyFastForwardResult => {
        const snap = port.snapshot();
        return { completedTurns: snap ? completedTurnsOf(snap) : 0, steps, stoppedBy };
    };
    for (; steps < QA_ACADEMY_MAX_STEPS; steps++) {
        const snap = port.snapshot();
        if (!snap) return done('no-record');
        if (snap.graduated) return done('graduated');
        if (completedTurnsOf(snap) >= turns && turns < ACADEMY_TOTAL_TURNS) return done('target');
        if (port.mode() === 'settling') {
            await port.confirm();
            continue;
        }
        const action = nextFastForwardAction(snap, gimmick);
        if (!action) return done('blocked');
        if (!(await port.act(action))) return done('failed');
    }
    return done('max-steps');
}
