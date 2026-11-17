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
import type { EncounterConfig, IBattleEntryParams } from '../../shared/BattleEntryParams';
import type { GeneralConfig } from '../../core/models/GeneralUnit';
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

/** 執行端依賴（抽出來讓單元測試能驗證執行順序；正式路徑由 realDeps 提供） */
export interface QaBattleEntryDeps {
    loadCatalog(): Promise<QaBattleCatalog>;
    resolveCampaignStageId(encounter: EncounterConfig): string;
    /** 戰場依賴、但直進入口跳過大廳而沒做的全域初始化；必須在切場景前完成 */
    prepareBattleGlobals(): Promise<void>;
    clearStalePreviewKeys(): void;
    useEphemeralStorage(): void;
    /**
     * 把我方主將放進臨時名冊並設為出戰主將（qaRoster=1 才呼叫，PROG-2-9391）。
     * 必須在改用暫時存檔之後呼叫；成功回 null，失敗回原因。
     */
    enrollTempRoster(generalId: string): Promise<string | null>;
    switchToBattle(params: IBattleEntryParams): void;
}

/**
 * 戰場依賴的全域初始化（PROG-2-9131）。
 * 語系字串：正式流程由 LobbyScene._mountOpeningPanels 以同一個呼叫載入；直進入口不經大廳，
 * 沒載入時戰場所有 t(key) 都回傳鍵名（例如奧義鈕顯示 ui.ultimate.label）。失敗只警告，與大廳一致。
 * 其餘大廳啟動做的事（讀檔、武將模板、奧義母表、他國名冊）戰場不讀，技能／特效／季節／史實配對 BattleScene 自己載。
 */
export async function prepareBattleGlobals(): Promise<void> {
    try {
        await services().i18n.setLocale(services().i18n.locale);
    } catch (error) {
        UCUFLogger.warn(LogCategory.LIFECYCLE, '[QaBattleEntry] 語系字串載入失敗', error);
    }
}

function realDeps(): QaBattleEntryDeps {
    return {
        loadCatalog,
        resolveCampaignStageId: (encounter) => services().session.resolveCampaignStage(encounter.campaignStage).id,
        prepareBattleGlobals,
        clearStalePreviewKeys,
        useEphemeralStorage: () => services().useEphemeralStorage(),
        enrollTempRoster,
        switchToBattle: (params) => services().scene.switchScene(SceneName.Battle, params),
    };
}

/** 登入場景啟動時呼叫：沒帶參數（或已觸發過）回 { entered:false } 且不做任何事 */
export async function runQaBattleEntry(search: string = currentSearch()): Promise<QaBattleEntryOutcome> {
    if (consumed || !isQaBattleRequested(search)) return { entered: false };
    consumed = true;
    return executeQaBattleEntry(search, realDeps());
}

/** 驗證 → 初始化 → 切場景；初始化一定在切場景之前完成 */
export async function executeQaBattleEntry(search: string, deps: QaBattleEntryDeps): Promise<QaBattleEntryOutcome> {
    try {
        const catalog = await deps.loadCatalog();
        const result = resolveQaBattle(search, catalog, { resolveCampaignStageId: deps.resolveCampaignStageId });
        if (!result.requested) return { entered: false };
        if (!result.ok) {
            UCUFLogger.warn(LogCategory.LIFECYCLE, '[QaBattleEntry] 直進戰場參數不合法', result.errors);
            return { entered: false, errors: result.errors };
        }
        // 先前本機預覽殘留的 localStorage 會讓戰場落入 capture 模式；這兩個鍵只屬預覽注入，不是玩家存檔
        deps.clearStalePreviewKeys();
        deps.useEphemeralStorage();
        if (result.tempRoster) {
            const reason = await deps.enrollTempRoster(result.params.playerGeneralId);
            if (reason) {
                UCUFLogger.warn(LogCategory.LIFECYCLE, '[QaBattleEntry] 臨時名冊建立失敗', reason);
                return { entered: false, errors: [reason] };
            }
        }
        await deps.prepareBattleGlobals();
        UCUFLogger.info(LogCategory.LIFECYCLE, '[QaBattleEntry] 直進戰場', result.params);
        deps.switchToBattle(result.params);
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

/**
 * 臨時名冊（PROG-2-9391）：用 generals.json 的原始設定入冊，再設為出戰主將。
 * 走 session 既有的公開方法，規則與轉蛋入冊相同；此時存檔後端已是記憶體，不會寫進玩家存檔。
 */
async function enrollTempRoster(generalId: string): Promise<string | null> {
    const generals = await services().resource.loadJson<GeneralConfig[]>('data/generals', { tags: ['QaBattleEntry'] });
    const config = generals.find((general) => general.id === generalId);
    if (!config) return `qaRoster：generals.json 找不到 ${generalId}`;
    const session = services().session;
    session.enrollGenerals([{ ...config }]);
    if (!await session.setLeadGeneral(generalId)) {
        const reasons = session.checkDeployable(generalId).reasons.join('、');
        return `qaRoster：${generalId} 放進臨時名冊後不能出戰${reasons ? `（${reasons}）` : ''}，請換一位我方主將或拿掉 qaRoster`;
    }
    return null;
}

function clearStalePreviewKeys(): void {
    try {
        sys.localStorage.removeItem('PREVIEW_MODE');
        sys.localStorage.removeItem('PREVIEW_TARGET');
    } catch {
        // localStorage 不可用就沒有殘留可清
    }
}
