// @spec-source → docs/battle-entry-unification-checklist.md（網頁 QA 直進戰場，PROG-2-9127）
/**
 * QaBattleEntry — 網頁 `?qaBattle=1` 直進戰場入口的參數解析與驗證（純邏輯，不依賴 cc）。
 *
 * 目的：驗證人員不必每次走 登入 → 開場 → 大廳 → 出征；登入場景發現網址參數後，
 * 組出與大廳正式出征相同的 IBattleEntryParams，直接交給 SceneManager.switchScene(Battle, params)。
 *
 * 網址參數（全部選填，除了 qaBattle；代號沿用既有資料表，不寫死名單）：
 *   qaBattle=1                  啟用（也接受 true；0／false 視為沒帶）
 *   qaEncounter=<遭遇代號>       encounters.json 的 id；缺省 = 新手第一場（大廳對全新存檔挑的那一關）
 *   qaPlayer=<武將代號>          我方主將，generals.json 的 id；缺省 = 該遭遇的我方主將
 *   qaEnemy=<武將代號>           敵方主將；缺省 = 該遭遇的敵方主將
 *   qaPlayerTroops=a,b,c         我方出陣兵種（戰場兵種代號 cavalry／infantry／shield／archer／pikeman…），
 *                                換算成對應虎符卡組，最多一手牌張數；缺省 = 既有預設卡組
 *   qaEnemyTroops=a,b            敵軍只出這些兵種（限 AI 會出的五種）；缺省 = 照敵將 Profile
 *   qaTutorial=0|1               是否為教學戰；缺省 = 只有「新手第一場」才是教學戰
 *
 * 合法性：任何一項不合法都回報完整錯誤清單，不靜默忽略；也不認得的 qa* 參數（多半是打錯字）一樣報錯。
 * 不可與 previewMode 併用，否則戰場會落入 capture 模式（行為不同於正式戰場）。
 *
 * Unity 對照：像 Editor 的「Play From Scene」啟動參數，帶著測試陣容直接進場，不改任何遊戲規則。
 */
import { BattleTactic, TroopType, Weather, normalizeWeather } from '../../shared/CommonEnums';
import {
    DEFAULT_BATTLE_ENTRY_PARAMS,
    isTutorialBattle,
    type EncounterConfig,
    type IBattleEntryParams,
} from '../../shared/BattleEntryParams';
import { AI_TROOP_CODE_TO_TYPE } from './AiDeployTroopPick';
import { isStageUnlocked } from './StageChainProgress';
import { provisionalTeachingSpirit } from './TeachingSpiritProvisional';

/** 網址參數名稱（單一出處，文件與測試共用） */
export const QA_BATTLE_QUERY = {
    enable: 'qaBattle',
    encounter: 'qaEncounter',
    player: 'qaPlayer',
    enemy: 'qaEnemy',
    playerTroops: 'qaPlayerTroops',
    enemyTroops: 'qaEnemyTroops',
    tutorial: 'qaTutorial',
} as const;

/** 我方卡組張數上限；與戰場手牌張數 TALLY_HAND_SIZE 相同（測試鎖定兩者一致，shared 不引用 battle） */
export const QA_MAX_PLAYER_TROOPS = 4;

const KNOWN_PARAMS: readonly string[] = Object.keys(QA_BATTLE_QUERY).map((key) => (QA_BATTLE_QUERY as Record<string, string>)[key]);

/** 驗證所需的既有資料表內容（由登入場景載入後傳入，純函式不碰資源） */
export interface QaBattleCatalog {
    /** encounters.json 全部遭遇（含極限任務關） */
    encounters: readonly EncounterConfig[];
    /** generals.json 全部武將代號 */
    generalIds: readonly string[];
    /** 戰場兵種代號 → 虎符卡片代號（目錄中該兵種的卡）；沒有卡的兵種不能指定給我方 */
    tallyCardByTroop: Readonly<Record<string, string>>;
    /** 我方卡組張數上限（手牌張數） */
    maxPlayerTroops: number;
    /** 大廳全新存檔會挑的關卡的非極限遭遇順序（缺省 = encounters 去掉 extreme） */
    lobbyEncounters?: readonly EncounterConfig[];
}

/** 組成參數時需要的執行期資訊（由呼叫端以 session 取得） */
export interface QaBattleBuildOptions {
    /** 對應 session.resolveCampaignStage(encounter.campaignStage).id；沒給就不帶 */
    resolveCampaignStageId?: (encounter: EncounterConfig) => string;
}

export type QaBattleResolution =
    | { requested: false }
    | { requested: true; ok: false; errors: string[] }
    | { requested: true; ok: true; params: IBattleEntryParams };

/** 網址是否要求直進戰場（只看 qaBattle 開關；不合法的值也算「有要求」，好讓驗證報錯而非靜默忽略） */
export function isQaBattleRequested(search: string | undefined | null): boolean {
    const value = new URLSearchParams(normalizeSearch(search)).get(QA_BATTLE_QUERY.enable);
    if (value === null) return false;
    const v = value.trim().toLowerCase();
    return !(v === '0' || v === 'false');
}

/** 以逗號分隔的清單：去空白、轉小寫、丟掉空項 */
export function splitList(raw: string): string[] {
    return raw.split(',').map((item) => item.trim().toLowerCase()).filter((item) => item.length > 0);
}

/** 解析、驗證並組出戰場入口參數；沒要求時回傳 requested:false，完全不碰其他邏輯 */
export function resolveQaBattle(
    search: string | undefined | null,
    catalog: QaBattleCatalog,
    options: QaBattleBuildOptions = {},
): QaBattleResolution {
    const query = new URLSearchParams(normalizeSearch(search));
    if (!isQaBattleRequested(search)) return { requested: false };

    const errors: string[] = [];
    const enable = (query.get(QA_BATTLE_QUERY.enable) ?? '').trim().toLowerCase();
    if (enable !== '1' && enable !== 'true') errors.push(`${QA_BATTLE_QUERY.enable}=${enable} 不合法，請用 ${QA_BATTLE_QUERY.enable}=1`);

    // 打錯字的 qa* 參數不能靜默忽略
    const keys: string[] = [];
    query.forEach((_value, key) => { keys.push(key); });
    for (const key of keys) {
        if (/^qa/i.test(key) && !KNOWN_PARAMS.includes(key)) {
            errors.push(`不認得的參數 ${key}。可用：${KNOWN_PARAMS.join('、')}`);
        }
    }

    // capture 模式會改變戰場行為，直進入口不可併用
    const previewMode = (query.get('previewMode') ?? query.get('PREVIEW_MODE') ?? '').trim().toLowerCase();
    if (previewMode === 'true' || previewMode === '1') {
        errors.push('qaBattle 不可與 previewMode 併用（previewMode 會讓戰場進入 capture 模式）。請拿掉 previewMode 參數');
    }

    const lobbyList = catalog.lobbyEncounters ?? catalog.encounters.filter((e) => !e.extreme);
    const defaultEncounter = pickDefaultEncounter(lobbyList);

    // 遭遇
    const encounterRaw = optional(query, QA_BATTLE_QUERY.encounter);
    let encounter: EncounterConfig | undefined = defaultEncounter;
    if (encounterRaw !== null) {
        encounter = catalog.encounters.find((e) => e.id === encounterRaw);
        if (!encounter) errors.push(`${QA_BATTLE_QUERY.encounter}=${encounterRaw} 不存在於 encounters.json。可用：${previewList(catalog.encounters.map((e) => e.id))}`);
    } else if (!encounter) {
        errors.push('encounters.json 沒有任何可用遭遇，無法決定預設關卡；請用 qaEncounter 指定');
    }

    // 武將
    const playerRaw = optional(query, QA_BATTLE_QUERY.player);
    const enemyRaw = optional(query, QA_BATTLE_QUERY.enemy);
    for (const [name, raw] of [[QA_BATTLE_QUERY.player, playerRaw], [QA_BATTLE_QUERY.enemy, enemyRaw]] as const) {
        if (raw !== null && !catalog.generalIds.includes(raw)) {
            errors.push(`${name}=${raw} 不存在於 generals.json。可用：${previewList(catalog.generalIds)}`);
        }
    }

    // 兵種
    const playerTroopsRaw = optional(query, QA_BATTLE_QUERY.playerTroops);
    const enemyTroopsRaw = optional(query, QA_BATTLE_QUERY.enemyTroops);
    const allTroops = Object.values(TroopType) as string[];
    const aiTroops = Object.values(AI_TROOP_CODE_TO_TYPE) as string[];
    const playerCards: string[] = [];
    if (playerTroopsRaw !== null) {
        const list = splitList(playerTroopsRaw);
        if (list.length === 0) errors.push(`${QA_BATTLE_QUERY.playerTroops} 是空的，至少要有一個兵種`);
        if (list.length > catalog.maxPlayerTroops) errors.push(`${QA_BATTLE_QUERY.playerTroops} 最多 ${catalog.maxPlayerTroops} 個兵種，收到 ${list.length} 個`);
        for (const code of list) {
            if (!allTroops.includes(code)) { errors.push(`${QA_BATTLE_QUERY.playerTroops} 含未知兵種 ${code}。可用：${allTroops.join('、')}`); continue; }
            const cardId = catalog.tallyCardByTroop[code];
            if (!cardId) { errors.push(`${QA_BATTLE_QUERY.playerTroops} 的兵種 ${code} 沒有對應的虎符卡，無法編入我方卡組`); continue; }
            playerCards.push(cardId);
        }
    }
    const enemyTroops: TroopType[] = [];
    if (enemyTroopsRaw !== null) {
        const list = splitList(enemyTroopsRaw);
        if (list.length === 0) errors.push(`${QA_BATTLE_QUERY.enemyTroops} 是空的，至少要有一個兵種`);
        for (const code of list) {
            if (!allTroops.includes(code)) { errors.push(`${QA_BATTLE_QUERY.enemyTroops} 含未知兵種 ${code}。可用：${aiTroops.join('、')}`); continue; }
            if (!aiTroops.includes(code)) { errors.push(`${QA_BATTLE_QUERY.enemyTroops} 的兵種 ${code} 敵軍 AI 不會出。可用：${aiTroops.join('、')}`); continue; }
            if (!enemyTroops.includes(code as TroopType)) enemyTroops.push(code as TroopType);
        }
    }

    // 教學戰旗標
    const tutorialRaw = optional(query, QA_BATTLE_QUERY.tutorial);
    let tutorialOverride: boolean | null = null;
    if (tutorialRaw !== null) {
        const v = tutorialRaw.toLowerCase();
        if (v === '1' || v === 'true') tutorialOverride = true;
        else if (v === '0' || v === 'false') tutorialOverride = false;
        else errors.push(`${QA_BATTLE_QUERY.tutorial}=${tutorialRaw} 不合法，請用 0 或 1`);
    }

    if (errors.length > 0 || !encounter) return { requested: true, ok: false, errors: errors.length > 0 ? errors : ['無法決定遭遇'] };

    // 組參數：與 LobbyScene._buildBattleEntryParams 的遭遇分支同欄位、同預設（全新存檔：無通關、無指定主將）
    const tutorial = tutorialOverride ?? (encounter === defaultEncounter && isTutorialBattle([]));
    const params: IBattleEntryParams = {
        entrySource: 'qa',
        encounterId: encounter.id,
        playerGeneralId: playerRaw ?? encounter.playerGeneralId,
        enemyGeneralId: enemyRaw ?? encounter.enemyGeneralId,
        playerEquipment: [...(encounter.playerEquipment ?? [])],
        enemyEquipment: [...(encounter.enemyEquipment ?? [])],
        selectedCardIds: playerCards,
        weather: normalizeWeather(encounter.weather) ?? DEFAULT_BATTLE_ENTRY_PARAMS.weather ?? Weather.Clear,
        battleTactic: encounter.battleTactic ?? DEFAULT_BATTLE_ENTRY_PARAMS.battleTactic ?? BattleTactic.Normal,
        backgroundId: encounter.backgroundId,
        tutorial,
        teachingSpirit: tutorial ? provisionalTeachingSpirit() : null,
    };
    const campaignStageId = options.resolveCampaignStageId?.(encounter);
    if (campaignStageId) params.campaignStageId = campaignStageId;
    if (enemyTroops.length > 0) params.enemyDeployTroops = enemyTroops;
    return { requested: true, ok: true, params };
}

/** 大廳對全新存檔挑的關卡：第一個已解鎖且未通關的（沒通關任何關 = 主鏈第一關），沒有就清單第一個 */
export function pickDefaultEncounter(lobbyEncounters: readonly EncounterConfig[]): EncounterConfig | undefined {
    const cleared = new Set<string>();
    return lobbyEncounters.find((e) => !cleared.has(e.id) && isStageUnlocked(e.id, lobbyEncounters, cleared)) ?? lobbyEncounters[0];
}

/** 錯誤清單排成畫面上看得懂的文字 */
export function formatQaBattleErrors(errors: readonly string[]): string {
    return ['【直進戰場參數錯誤】', ...errors.map((line) => `・${line}`), '已回到登入畫面。'].join('\n');
}

function normalizeSearch(search: string | undefined | null): string {
    return typeof search === 'string' ? search : '';
}

/** 取得參數；沒帶回 null；帶了就去前後空白（空字串照樣交給驗證報錯，不當成沒帶） */
function optional(query: URLSearchParams, name: string): string | null {
    const value = query.get(name);
    return value === null ? null : value.trim();
}

function previewList(ids: readonly string[]): string {
    const head = ids.slice(0, 10).join('、');
    return ids.length > 10 ? `${head}…（共 ${ids.length} 個）` : head;
}
