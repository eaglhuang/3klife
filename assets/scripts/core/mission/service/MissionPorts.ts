/**
 * MissionPorts — 任務服務需要宿主提供的能力（引擎中立）
 *
 * 離線時宿主是 GameSession（名冊、錢包、時鐘、武將心智都在它那裡）；接 server 後這組 ports 由 server 端實作，
 * 服務本身只認這個介面，不直接碰 GameSession 或任何 cc 物件。
 */
import type { MissionDifficulty } from '../MissionBalance';
import type { MissionDefinition, MissionGeneralFacts, MissionLedgerEntry, MissionTier } from '../MissionTypes';

export interface MissionStock { grain: number; gold: number; silver: number; troops: number }

export interface MissionSettlementInfo {
    missionId: string;
    defId: string;
    title: string;
    theme: string;
    wall: string | null;
    difficulty: MissionDifficulty;
    generalId: string;
    branchId: string;
    tier: MissionTier;
    intelAtDispatch: number;
    delegated: boolean;
    volunteered: boolean;
    /** 舊制（legacy-flat）結算：固定獎勵、名聲由宿主依舊規則給 */
    legacy: boolean;
    /** 定義帶的場景戰法 */
    sceneGambit?: string;
    /** 定義對應的舊模板代號（特例判定用，例如開倉賑濟） */
    legacyTemplateId?: string;
    season: number;
    narratives: string[];
    tags: string[];
    /** 受傷的季數（只有大失敗才會有；沒有為 0） */
    injuredSeasons: number;
}

export interface MissionHostPort {
    /** 目前季（totalSeasonsElapsed） */
    season(): number;
    /** 官階（決定看得到的難度） */
    rankTier(): number;
    visibleDifficulties(rankTier: number): MissionDifficulty[];
    /** 玩家名聲（minFame 條件） */
    fame(): number;
    /** 真實名冊的全部武將，含宿主能判斷的阻擋原因；自告奮勇由 volunteerIdsFor 另給 */
    generals(): MissionGeneralFacts[];
    /** 針對某任務會自告奮勇的武將 id（doc_spec_0455） */
    volunteerIdsFor(def: MissionDefinition): ReadonlySet<string>;
    stock(): MissionStock;
    /** 付出耗費；任何一項不足就整筆不扣並回傳 false */
    spend(cost: MissionStock): boolean;
    /** 扣武將精力（派遣、斥候） */
    drainEnergy(generalId: string, amount: number): void;
    /** 武將記憶／信心帶來的適合度偏移（-1～1）；沒有記憶時回傳 0 */
    affinityOf(generalId: string, def: MissionDefinition): number;
    /** 給 UI 的記憶提示，例「曾三度勝任巡防」；沒有時回傳空字串 */
    memoryHintOf(generalId: string, def: MissionDefinition): string;
    /** 套用帳本到資源／武將／名聲等；上限截斷在這裡。回傳實際入帳資訊供回報 */
    applyLedger(entries: readonly MissionLedgerEntry[], info: MissionSettlementInfo): void;
    /** 每筆任務結算後呼叫（寫武將心智、日誌、官職經驗） */
    onSettled(info: MissionSettlementInfo): void;
    /** 狀態改變後請宿主存檔（離線＝寫入 PlayerSaveService） */
    persist?(): void;
}
