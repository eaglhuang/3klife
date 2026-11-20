/**
 * IMissionService — 任務服務統一接口與 DTO（只定義，不含宿主實作；實作屬卡 C）
 *
 * 規則：
 *  - 查詢一律回傳「已依情報投影」的資料，絕不含隱藏變體、被選分支、確切機率（情報不夠時）。
 *  - 動作都帶 requestId（冪等）；可帶 baseRevision 作衝突偵測。
 *  - 副作用以帳本 ledger 回傳，由宿主 port 套用；接 server 後由 server 套用並下發新快照。
 */
import type { MissionDifficulty } from '../MissionBalance';
import type {
    MissionBlock, MissionDetailView, MissionIntelBand, MissionLedgerEntry, MissionRecord, MissionSyncSnapshot,
    MissionTier, Revealable,
} from '../MissionTypes';

export type MissionErrorCode =
    | 'NO_MISSION' | 'NOT_OPEN' | 'BLOCKED' | 'SHORT_RESOURCE' | 'ALREADY_WAITED' | 'INTEL_FULL'
    | 'REVISION_CONFLICT' | 'DUP_REQUEST' | 'NO_EXECUTOR';

export interface MissionShortage { resource: 'grain' | 'troops' | 'silver' | 'energy'; need: number; have: number }

export type MissionEventKind = 'recon' | 'wait' | 'dispatch' | 'settled' | 'spawned' | 'expired';
export interface MissionEvent { kind: MissionEventKind; missionId: string; text: string }

export type MissionResult<T> =
    | { ok: true; value: T; revision: number; ledger: MissionLedgerEntry[]; events: MissionEvent[] }
    | { ok: false; code: MissionErrorCode; text: string; need?: MissionShortage[] };

// ── 查詢 DTO ──

export interface BoardQuery { theme?: string; status?: 'OPEN' | 'ACTIVE' }

/** 任務牆上的一張卡（投影後；情報不足時 rate／reward 只有粗略文字） */
export interface MissionCardView {
    id: string;
    defId: string;
    title: string;
    theme: string;
    difficulty: MissionDifficulty;
    intel: number;
    intelBand: MissionIntelBand;
    status: 'OPEN' | 'ACTIVE';
    expireSeason: number;
    rate: Revealable;
    reward: Revealable;
    /** 進行中：負責的武將與預計回報季 */
    executorName?: string;
    returnSeason?: number;
}

export interface MissionBoardView { revision: number; season: number; missions: MissionCardView[] }

/** 候選武將：顯示全員，被擋者列出全部原因（不從清單消失，不退回設計稿武將） */
export interface CandidateView {
    generalId: string;
    name: string;
    block: MissionBlock[];
    blockText: string;
    rate: Revealable;
    volunteer: boolean;
    /** 來自武將記憶的提示，例「曾三度勝任巡防」；記憶未接上時為空字串 */
    memoryHint: string;
}

export type MissionRecordView = MissionRecord;

// ── 動作命令與結果 ──

export interface MissionCommandBase { requestId: string; baseRevision?: number }

export interface ReconCommand extends MissionCommandBase { missionId: string; scoutGeneralId?: string }
export interface ReconResult { missionId: string; intel: number; gained: number; intelBand: MissionIntelBand; reconCount: number }

export interface WaitCommand extends MissionCommandBase { missionId: string }
export interface WaitResult { missionId: string; intel: number; gained: number; expireSeason: number }

/** generalIds 首版長度 1；'delegate' 由系統選將（吃武將記憶／信心） */
export interface DispatchCommand extends MissionCommandBase { missionId: string; generalIds: string[] | 'delegate' }
export interface DispatchResult {
    missionId: string;
    generalIds: string[];
    delegated: boolean;
    returnSeason: number;
    cost: { grain: number; troops: number; silver: number; energy: number };
}

export interface AdvanceSeasonCommand extends MissionCommandBase { }

export interface SettledMissionView {
    missionId: string;
    title: string;
    generalId: string;
    generalName: string;
    /** 成功率投影前的真相不給；這裡只給結果（已發生，不再是隱藏資訊） */
    branchId: string;
    /** 本筆實際產生的收穫總量（資源、經驗、名聲；上限截斷前的帳本量） */
    gains: Record<string, number>;
    tier: MissionTier;
    narratives: string[];
    /** 結算過程（查看過程／稽核用） */
    traceText: string[];
}
export interface SeasonSettlementView {
    season: number;
    settled: SettledMissionView[];
    spawnedMissionIds: string[];
    expiredMissionIds: string[];
}

export interface MissionChangedEvent { revision: number; reason: MissionEventKind | 'load' }
export type MissionUnsubscribe = () => void;

export interface IMissionService {
    // 查詢（全部為投影後資料）
    getBoard(q?: BoardQuery): MissionResult<MissionBoardView>;
    /** generalId：預覽用執行者（成功率依該武將算）；不給時用目前最適合的可派武將，沒有可派者用中性預估 */
    getDetail(missionId: string, opts?: { generalId?: string }): MissionResult<MissionDetailView>;
    getCandidates(missionId: string): MissionResult<CandidateView[]>;
    getHistory(q?: { limit?: number }): MissionResult<MissionRecordView[]>;

    // 動作
    recon(cmd: ReconCommand): Promise<MissionResult<ReconResult>>;
    wait(cmd: WaitCommand): Promise<MissionResult<WaitResult>>;
    dispatch(cmd: DispatchCommand): Promise<MissionResult<DispatchResult>>;
    advanceSeason(cmd: AdvanceSeasonCommand): Promise<MissionResult<SeasonSettlementView>>;

    // 同步
    getSnapshot(): MissionSyncSnapshot;
    loadSnapshot(s: MissionSyncSnapshot): void;
    onChanged(cb: (e: MissionChangedEvent) => void): MissionUnsubscribe;
}
