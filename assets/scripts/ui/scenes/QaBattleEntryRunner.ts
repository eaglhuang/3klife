// @spec-source → docs/battle-entry-unification-checklist.md（網頁 QA 直進戰場，PROG-2-9127）
/**
 * QaBattleEntryRunner — 登入場景的 `?qaBattle=1` 直進戰場執行端。
 *
 * 純邏輯（解析與驗證）在 core/systems/QaBattleEntry.ts；這裡只負責「載入既有資料表 → 驗證 → 交給 SceneManager」：
 * 交接點與大廳出征相同：services().scene.switchScene(SceneName.Battle, IBattleEntryParams)，
 * 之後 BattleScene 走完全相同的初始化與結算流程。不讀寫玩家存檔（ServiceLoader.useEphemeralStorage）。
 *
 * Unity 對照：像 Editor 啟動參數的處理器，驗證通過才 LoadScene，失敗就停在原場景並顯示原因。
 */
import { sys } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { SceneName } from '../../core/config/Constants';
import { buildTallyCardCatalog } from '../../core/config/TallyCardCatalog';
import type { EncounterConfig } from '../../shared/BattleEntryParams';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';
import { QA_MAX_PLAYER_TROOPS, isQaBattleRequested, resolveQaBattle, type QaBattleCatalog } from '../../core/systems/QaBattleEntry';

export interface QaBattleEntryOutcome {
    /** true = 已交給 SceneManager 切往戰場 */
    entered: boolean;
    /** 不合法或載入失敗時的錯誤清單（entered 為 false 且有值才需要顯示） */
    errors?: string[];
}

/** 同一次頁面載入只觸發一次：戰後回登入畫面時網址仍帶參數，不可再次自動進場 */
let consumed = false;

/** 目前網址的查詢字串；非瀏覽器環境回空字串 */
export function currentSearch(): string {
    return (globalThis as { window?: { location?: { search?: string } } }).window?.location?.search ?? '';
}

/** 登入場景啟動時呼叫：沒帶參數（或已觸發過）回 { entered:false } 且不做任何事 */
export async function runQaBattleEntry(search: string = currentSearch()): Promise<QaBattleEntryOutcome> {
    if (consumed || !isQaBattleRequested(search)) return { entered: false };
    consumed = true;
    try {
        const catalog = await loadCatalog();
        const result = resolveQaBattle(search, catalog, {
            resolveCampaignStageId: (encounter) => services().session.resolveCampaignStage(encounter.campaignStage).id,
        });
        if (!result.requested) return { entered: false };
        if (!result.ok) {
            UCUFLogger.warn(LogCategory.LIFECYCLE, '[QaBattleEntry] 直進戰場參數不合法', result.errors);
            return { entered: false, errors: result.errors };
        }
        // 先前本機預覽殘留的 localStorage 會讓戰場落入 capture 模式；這兩個鍵只屬預覽注入，不是玩家存檔
        clearStalePreviewKeys();
        services().useEphemeralStorage();
        UCUFLogger.info(LogCategory.LIFECYCLE, '[QaBattleEntry] 直進戰場', result.params);
        services().scene.switchScene(SceneName.Battle, result.params);
        return { entered: true };
    } catch (error) {
        UCUFLogger.error(LogCategory.LIFECYCLE, '[QaBattleEntry] 直進戰場失敗', error);
        return { entered: false, errors: [`資料表載入失敗：${String(error)}`] };
    }
}

async function loadCatalog(): Promise<QaBattleCatalog> {
    const [encounterEnvelope, generals] = await Promise.all([
        services().resource.loadJson<{ encounters?: EncounterConfig[] }>('data/encounters', { tags: ['QaBattleEntry'] }),
        services().resource.loadJson<Array<{ id: string }>>('data/generals', { tags: ['QaBattleEntry'] }),
    ]);
    const tallyCardByTroop: Record<string, string> = {};
    buildTallyCardCatalog().forEach((card, cardId) => {
        if (!(card.unitType in tallyCardByTroop)) tallyCardByTroop[card.unitType] = cardId;
    });
    return {
        encounters: encounterEnvelope.encounters ?? [],
        generalIds: generals.map((general) => general.id),
        tallyCardByTroop,
        maxPlayerTroops: QA_MAX_PLAYER_TROOPS,
    };
}

function clearStalePreviewKeys(): void {
    try {
        sys.localStorage.removeItem('PREVIEW_MODE');
        sys.localStorage.removeItem('PREVIEW_TARGET');
    } catch {
        // localStorage 不可用就沒有殘留可清
    }
}
