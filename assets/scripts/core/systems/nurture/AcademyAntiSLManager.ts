// @spec-source → ACAD_CORE_學府培育總控與防SL確定性引擎規格書.md (doc_spec_0302) §2.2 操作即原子落盤、§2.3 異常中斷自愈；C2_R5 待補數據表 (doc_spec_0289) 表 5-8（PROG-2-1902）
/**
 * AcademyAntiSLManager — 學府培育的「先落盤、再演出」與惡意中斷懲罰（純邏輯，不依賴 cc）。
 *
 * 時序：commit(動作) 先算出新快照並寫入存檔（acknowledged = false），寫入失敗就丟 AcademyStorageError、
 * 狀態不前進；畫面播完結算後呼叫 acknowledge()，計數器歸零。
 * 重啟時 recover()：存檔仍是未確認狀態 → 視為異常中斷，直接回傳既定結果並把 sessionCrashCounter +1；
 * 第 2 次給警告，第 3 次起以保底結算重算該動作（+5、精力 -20、鎖 2 回合彩圈）。
 *
 * Unity 對照：像先 File.WriteAllText 再播 Timeline；存檔介面由場景注入（LocalStorage／伺服器皆可）。
 */
import { addAcademyStatCapped, cloneAcademySnapshot, resolveAcademyAction, ACADEMY_TUNING } from './AcademyTrainingEngine';
import { AcademyActionPayload, AcademyStateSnapshot, IAcademyGimmickHandler } from './AcademyTypes';

/** 存檔紀錄：committed 為已決定的結果；before/action 供惡意中斷時重算保底 */
export interface AcademySaveRecord {
    committed: AcademyStateSnapshot;
    before: AcademyStateSnapshot | null;
    action: AcademyActionPayload | null;
    acknowledged: boolean;
}

/** 存檔介面：write 失敗必須丟例外，不得靜默 */
export interface IAcademySaveStore {
    write(record: AcademySaveRecord): void;
    read(): AcademySaveRecord | null;
}

export class AcademyStorageError extends Error {}

export const ACADEMY_CRASH_WARNING_COUNT = 2;
export const ACADEMY_CRASH_ABUSE_COUNT = 3;

export interface AcademyRecoveryResult {
    snapshot: AcademyStateSnapshot;
    /** true = 偵測到未確認的動作，畫面應略過動畫、直接顯示結果請玩家確認 */
    recovered: boolean;
    warning: boolean;
    penalized: boolean;
}

export class AcademyAntiSLManager {
    constructor(private readonly _store: IAcademySaveStore, private readonly _gimmick?: IAcademyGimmickHandler) {}

    /** 入學第 1 回合：寫入初始快照 */
    begin(snapshot: AcademyStateSnapshot): void {
        this._write({ committed: cloneAcademySnapshot(snapshot), before: null, action: null, acknowledged: true });
    }

    /** 玩家按下決策：先落盤才回傳結果；寫入失敗則丟 AcademyStorageError，存檔維持原狀 */
    commit(action: AcademyActionPayload): AcademyStateSnapshot {
        const record = this._readRequired();
        if (!record.acknowledged) {
            throw new AcademyStorageError('上一個動作尚未確認，請先 acknowledge() 或 recover()');
        }
        const next = resolveAcademyAction(record.committed, action, this._gimmick);
        this._write({ committed: next, before: record.committed, action, acknowledged: false });
        return cloneAcademySnapshot(next);
    }

    /** 結算畫面播完（或玩家按確認）：正常結案，異常計數歸零 */
    acknowledge(): AcademyStateSnapshot {
        const record = this._readRequired();
        const committed = cloneAcademySnapshot(record.committed);
        committed.sessionCrashCounter = 0;
        this._write({ committed, before: record.before, action: record.action, acknowledged: true });
        return cloneAcademySnapshot(committed);
    }

    /** 重啟載入；沒有存檔回傳 null */
    recover(): AcademyRecoveryResult | null {
        const record = this._store.read();
        if (!record) return null;
        if (record.acknowledged) {
            return { snapshot: cloneAcademySnapshot(record.committed), recovered: false, warning: false, penalized: false };
        }
        const crashCount = record.committed.sessionCrashCounter + 1;
        const penalized = crashCount >= ACADEMY_CRASH_ABUSE_COUNT && !!record.before && !!record.action;
        const committed = penalized
            ? applyAcademyAbusePenalty(record.before!, record.action!, this._gimmick)
            : cloneAcademySnapshot(record.committed);
        committed.sessionCrashCounter = crashCount;
        this._write({ committed, before: record.before, action: record.action, acknowledged: false });
        return {
            snapshot: cloneAcademySnapshot(committed),
            recovered: true,
            warning: crashCount >= ACADEMY_CRASH_WARNING_COUNT,
            penalized,
        };
    }

    private _readRequired(): AcademySaveRecord {
        const record = this._store.read();
        if (!record) throw new AcademyStorageError('找不到學府存檔，請先 begin()');
        return record;
    }

    private _write(record: AcademySaveRecord): void {
        try {
            this._store.write(record);
        } catch (err) {
            throw new AcademyStorageError(`學府存檔寫入失敗：${(err as Error)?.message ?? err}`);
        }
    }
}

/**
 * 惡意中斷保底結算：照常推進回合與種子，但成長只給保底值、精力再扣、鎖定彩圈。
 * 由 before + action 重算，所以不論中斷幾次結果都一樣。
 */
export function applyAcademyAbusePenalty(
    before: AcademyStateSnapshot, action: AcademyActionPayload, gimmick?: IAcademyGimmickHandler,
): AcademyStateSnapshot {
    // 先上鎖再推進：本回合不觸發彩圈，回合結束時鎖剛好剩 abuseResonanceLockTurns
    const locked = cloneAcademySnapshot(before);
    locked.resonanceLockTurns = ACADEMY_TUNING.abuseResonanceLockTurns + 1;
    const resolved = resolveAcademyAction(locked, action, gimmick);
    resolved.stats = { ...before.stats };
    if (action.actionType === 'TRAIN' && action.targetStat) {
        addAcademyStatCapped(resolved.stats, action.targetStat, ACADEMY_TUNING.abuseFloorGain);
    }
    resolved.energy = Math.max(0, resolved.energy - ACADEMY_TUNING.abuseEnergyPenalty);
    resolved.chronicles.push({ turn: before.currentTurn, title: '學子心浮氣躁', description: '同一決策點連續異常中斷，本回合以保底結算', highlightScore: 0 });
    return resolved;
}
