// @spec-source → 武將心智提案 §3.1 統一接口（PROG-2-9146）
/**
 * IGeneralMindService — 武將心智的統一接口，純 TS，不依賴 cc。
 * 目前只有離線實作（OfflineGeneralMindService）；日後 server 化只要換一個實作同一介面的類別。
 * MIND-1：記憶、心情、台詞、季結算；MIND-2：學習規則、意見查詢、主動請求與信箱；選將 UI 屬 MIND-3。
 */
import type {
    GeneralMindSave,
    MindBarkPlace,
    MindContext,
    MindEventInput,
    MindOpinion,
    MindRequest,
    MindResolveResult,
    MindTaskProfile,
    MindEventView,
    MindLine,
    MindMood,
    MindRecordResult,
    SeasonMindReport,
    TaskSettlementDto,
} from './MindTypes';

export interface IGeneralMindService {
    /** 寫入事件（冪等：同 id 重送忽略）。 */
    record(event: MindEventInput): MindRecordResult;
    /** 任務結算入口：轉成每位武將的事件，含搭檔羈絆累計。 */
    onTaskSettled(dto: TaskSettlementDto): MindRecordResult;
    /** 目前心情；EAGER 供自告奮勇，HIGH／NORMAL／LOW 供派遣情緒。 */
    moodOf(generalId: string, ctx?: MindContext): MindMood;
    recentMemories(generalId: string, limit?: number): MindEventView[];
    /** 取一句該武將此刻想說的話；text 為空代表沒什麼特別想說。同輸入（含 seed）同輸出。 */
    barkFor(generalId: string, place: MindBarkPlace, seed: number, ctx?: MindContext): MindLine;
    /** 季結算：冷落計數、清掉離隊者、回報心情變化。同一季重複呼叫只結算一次。 */
    onSeasonSettle(season: number, rng: () => number, activeGeneralIds?: readonly string[], contextOf?: (generalId: string) => MindContext): SeasonMindReport;
    /** MIND-2：選將時的意見。只勸阻不抗命：DISSUADE 仍可派，successDelta 為小幅下修。 */
    queryOpinion(generalId: string, profile: MindTaskProfile, ctx?: MindContext, opts?: { partnerIds?: readonly string[] }): MindOpinion;
    /** MIND-2：極端抗命（忠誠 <30 且連續受辱，每段受辱只一次）；成立時寫一封信進信箱並回傳，否則 null。 */
    maybeDefy(generalId: string, ctx?: MindContext): MindRequest | null;
    /** MIND-2：信箱（未回應在前、新到舊）；含近期已回應的請求。 */
    mailbox(): MindRequest[];
    pendingRequests(): MindRequest[];
    unreadRequestCount(): number;
    markRequestRead(id: string): void;
    /** MIND-2：玩家答應／拒絕；結果回寫心智事件、更新冷卻。ctx 供武將回應措辭用。 */
    resolveRequest(id: string, accept: boolean, ctx?: MindContext): MindResolveResult;
    /** MIND-2：已准許、尚未被戰場取用的請戰（戰場專家承接用的 DTO 來源）。 */
    grantedBattleRequests(): MindRequest[];
    consumeBattleRequest(requestId: string): boolean;
    /** MIND-2：經歷權重（供季度性格事件抽選），沒經歷為 1。 */
    experienceWeights(generalIds: readonly string[], season?: number): Record<string, number>;
    snapshot(): GeneralMindSave;
    /** 內含正規化；壞值、舊檔缺欄位都視為空心智，不拋例外。 */
    restore(raw: unknown): void;
    reset(): void;
}
