// @spec-source → 學府修業畫面與接線設計.md (doc_spec_1179) §2 資料契約、§5 外界凍結；PROG-2-9189
/**
 * GameAcademySaveStore — 學府修業存檔介面的正式實作（純邏輯，不依賴 cc）。
 *
 * AcademyAntiSLManager 只認 IAcademySaveStore；這裡把紀錄存進 GameSession 的 academyRecord，
 * 隨 PlayerSaveSnapshot.academy 一起落盤（缺值代表沒有進行中的修業，舊存檔相容）。
 *
 * - write 先驗證紀錄結構，不合格就丟錯（不得靜默），存檔維持原狀。
 * - 紀錄另帶「入學當下的外界時鐘」frozenGameTime（doc_spec_0524 的 frozenGameTime）：
 *   入學那一筆（before 為 null）取目前時鐘，之後每筆沿用，讀檔還原時以它為準，防止修業中刷季。
 *
 * Unity 對照：像把 SaveData 的一個欄位包成 ISaveSlot，讓學府引擎不必知道玩家存檔長什麼樣子。
 */
import type { AcademyActionPayload, AcademyStateSnapshot } from '../systems/nurture/AcademyTypes';
import type { AcademySaveRecord, IAcademySaveStore } from '../systems/nurture/AcademyAntiSLManager';
import { ACADEMY_TOTAL_TURNS } from '../systems/nurture/AcademyTypes';
import type { GameTimeState } from '../systems/GameClock';

/** 落盤的學府紀錄：引擎的 AcademySaveRecord 加上入學當下的外界時鐘 */
export interface PersistedAcademyRecord extends AcademySaveRecord {
    frozenGameTime: GameTimeState;
}

/** GameSession 提供給存檔實作的最小介面（同步讀寫記憶體中的紀錄） */
export interface AcademyRecordPort {
    getAcademyRecord(): PersistedAcademyRecord | null;
    setAcademyRecord(record: PersistedAcademyRecord | null): void;
    /** 目前的外界時鐘 */
    readonly gameTime: GameTimeState;
}

const STAT_KEYS = ['str', 'lea', 'int', 'pol', 'cha'] as const;

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

/** 快照最基本的結構檢查：缺欄位或型別不對就視為壞檔 */
export function isValidAcademySnapshot(value: unknown): value is AcademyStateSnapshot {
    const s = value as Partial<AcademyStateSnapshot> | null;
    if (!s || typeof s !== 'object') return false;
    if (s.schemaVersion !== 1) return false;
    if (typeof s.childId !== 'string' || s.childId.length === 0) return false;
    if (typeof s.clanUuid !== 'string' || typeof s.academyId !== 'string' || typeof s.prngSeedHex !== 'string') return false;
    if (!Number.isInteger(s.currentTurn) || s.currentTurn! < 1 || s.currentTurn! > ACADEMY_TOTAL_TURNS) return false;
    if (!isFiniteNumber(s.energy) || !isFiniteNumber(s.stepIndex)) return false;
    if (!s.stats || typeof s.stats !== 'object') return false;
    for (const key of STAT_KEYS) if (!isFiniteNumber(s.stats[key])) return false;
    if (!Array.isArray(s.learnedTactics) || !Array.isArray(s.learnedTraits) || !Array.isArray(s.chronicles)) return false;
    if (!Array.isArray(s.interruptOptions) || typeof s.graduated !== 'boolean') return false;
    return !!s.gimmickStatePayload && typeof s.gimmickStatePayload === 'object';
}

function isValidGameTime(value: unknown): value is GameTimeState {
    const t = value as Partial<GameTimeState> | null;
    return !!t && typeof t === 'object'
        && isFiniteNumber(t.currentYear) && isFiniteNumber(t.currentSeason)
        && isFiniteNumber(t.totalSeasonsElapsed) && typeof t.currentMode === 'string';
}

function copyJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * 讀檔正規化：結構不合格回傳 null（視為沒有進行中的修業）。
 * 缺 frozenGameTime 的紀錄以 fallbackTime（存檔當下時鐘）補上，不讓玩家丟掉修業進度。
 */
export function normalizeAcademyRecord(raw: unknown, fallbackTime: GameTimeState | undefined): PersistedAcademyRecord | null {
    const record = raw as Partial<PersistedAcademyRecord> | null | undefined;
    if (!record || typeof record !== 'object' || !isValidAcademySnapshot(record.committed)) return null;
    const before = record.before !== null && record.before !== undefined && isValidAcademySnapshot(record.before) ? copyJson(record.before) : null;
    const action = record.action && typeof record.action === 'object' && typeof (record.action as AcademyActionPayload).actionType === 'string'
        ? copyJson(record.action as AcademyActionPayload) : null;
    const frozenGameTime = isValidGameTime(record.frozenGameTime) ? { ...record.frozenGameTime } : fallbackTime ? { ...fallbackTime } : null;
    if (!frozenGameTime) return null;
    return {
        committed: copyJson(record.committed),
        before,
        action: before ? action : null,
        acknowledged: record.acknowledged !== false,
        frozenGameTime,
    };
}

/** 有進行中（尚未結業）的學府紀錄 */
export function isAcademyRecordActive(record: Readonly<PersistedAcademyRecord> | null): boolean {
    return !!record && !record.committed.graduated;
}

export class GameAcademySaveStore implements IAcademySaveStore {
    constructor(private readonly _port: AcademyRecordPort) {}

    public write(record: AcademySaveRecord): void {
        if (!record || !isValidAcademySnapshot(record.committed)) {
            throw new Error('學府存檔格式錯誤：committed 快照不合格');
        }
        if (record.before !== null && !isValidAcademySnapshot(record.before)) {
            throw new Error('學府存檔格式錯誤：before 快照不合格');
        }
        const existing = this._port.getAcademyRecord();
        // 入學那一筆（before 為 null）取目前時鐘；之後沿用，確保「入學當下」不被後續寫入覆蓋
        const frozenGameTime = record.before === null || !existing
            ? { ...this._port.gameTime }
            : { ...existing.frozenGameTime };
        this._port.setAcademyRecord({
            committed: copyJson(record.committed),
            before: record.before ? copyJson(record.before) : null,
            action: record.action ? copyJson(record.action) : null,
            acknowledged: record.acknowledged,
            frozenGameTime,
        });
    }

    public read(): PersistedAcademyRecord | null {
        const record = this._port.getAcademyRecord();
        return record ? copyJson(record) : null;
    }

    /** 結業清檔或放棄；沒有紀錄時無事 */
    public clear(): void {
        this._port.setAcademyRecord(null);
    }

    /** 落盤失敗時把紀錄還原成寫入前的樣子（含入學時鐘）；null 代表原本沒有紀錄 */
    public restore(record: PersistedAcademyRecord | null): void {
        this._port.setAcademyRecord(record ? copyJson(record) : null);
    }
}
