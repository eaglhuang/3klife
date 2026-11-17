// @spec-source → 武將心智提案 §3.1 統一接口（PROG-2-9146）
/**
 * IGeneralMindService — 武將心智的統一接口，純 TS，不依賴 cc。
 * 目前只有離線實作（OfflineGeneralMindService）；日後 server 化只要換一個實作同一介面的類別。
 * MIND-1 只含記憶、心情、台詞、季結算；意見查詢（queryOpinion）、主動請求（pendingRequests／resolveRequest）由 MIND-2／MIND-3 加入。
 */
import type {
    GeneralMindSave,
    MindBarkPlace,
    MindContext,
    MindEventInput,
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
    onSeasonSettle(season: number, rng: () => number, activeGeneralIds?: readonly string[]): SeasonMindReport;
    snapshot(): GeneralMindSave;
    /** 內含正規化；壞值、舊檔缺欄位都視為空心智，不拋例外。 */
    restore(raw: unknown): void;
    reset(): void;
}
