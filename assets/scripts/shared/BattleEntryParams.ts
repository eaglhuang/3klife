// @spec-source → 見 docs/cross-reference-index.md
// [統一戰場入口] 定義從任何路徑進入 BattleScene 時的參數介面。
// Unity 對照：BattleEntryData / BattleSessionConfig

import { Weather, BattleTactic, TerrainGrid, TerrainType, TroopType } from './CommonEnums';

/** 天氣排程單一條目（結構與 core/systems/WeatherSchedule 的 WeatherScheduleEntry 相同，shared 不引用 core） */
export interface WeatherScheduleEntry {
  turnStart: number;
  turnEnd: number;
  weather: Weather;
}

/** encounters.json 中單一遭遇戰的設定結構 */
export interface EncounterConfig {
  id: string;
  /** AI 難度（可選，PROG-2-0921）：easy / normal / hard / nightmare / hell；缺省為 normal */
  difficulty?: string;
  name: string;
  playerGeneralId: string;
  enemyGeneralId: string;
  terrain?: TerrainGrid;
  /** 對應 scene-backgrounds.json 中的 id，決定要顯示的背景圖 */
  backgroundId?: string;
  /** 戰場類型（可選，預設野戰）；攻城戰開戰時主將扣攻城壽命（PROG-2-0237） */
  battleKind?: 'field' | 'siege';
  /** 天氣條件（可選，預設 Clear） */
  weather?: Weather | string;
  /** 天氣排程（可選）；有值時每回合依排程切換天氣（PROG-2-0401） */
  weatherSchedule?: WeatherScheduleEntry[];
  /** 場景戰法（可選，預設 Normal） */
  battleTactic?: BattleTactic;
  /** AI 難度（可選，PROG-2-0921）；有值時優先於遭遇資料 */
  aiDifficulty?: string;
  /** 我軍裝備 ID 列表（預留） */
  playerEquipment?: string[];
  /** 敵軍裝備 ID 列表（預留） */
  enemyEquipment?: string[];
  /** 天下征鋒的 BOSS 關（PROG-2-2101）：不進大廳開戰關卡清單，只能從極限任務入口出戰 */
  extreme?: boolean;
  /** 所屬連環破主鏈 id（PROG-2-0215）；沒有就是獨立關卡 */
  chainId?: string;
  /** 主鏈內順序，越小越前面（PROG-2-0215） */
  order?: number;
  /** 所屬全球征途階段 id（MVP-13）；沒有就是第一階段 */
  campaignStage?: string;
  /** 四主題關卡代號（doc_spec_0353，PROG-2-2131）：Canyon／Floodgate／Night_Raid／Ambush */
  stageThemeId?: string;
  /** 必備對策標籤（關卡設計 §D-2，PROG-2-1763）；缺任一即「高風險，仍可挑戰」 */
  requiredLoadout?: string[];
  /** 高建議對策標籤（關卡設計 §D-2，PROG-2-1763）；只缺這些為「缺少」 */
  highlyRecommendedLoadout?: string[];
  /** 關卡主題（例如攻城、夜襲）；戰前偵查面板的核心機制（PROG-2-2076） */
  theme?: string;
  /** 致命威脅標籤（例如騎兵衝擊）；戰前偵查面板的風險標籤（PROG-2-2076） */
  riskTags?: string[];
  /** 敵軍開場布陣（PROG-2-9420）：開戰時在敵方後排生成；type 是 TroopType 字串，lane 從 0 起算 */
  enemyInitialDeployment?: { type: string; lane: number }[];
  /** 關卡回合上限（PROG-2-9423）；不設定就用全域上限 */
  turnLimit?: number;
  /** 回合用盡時的判定（PROG-2-9423）：'by-damage' 依戰果、'enemy-win'／'player-win' 固定勝方；預設 'enemy-win' */
  timeUpRule?: 'by-damage' | 'enemy-win' | 'player-win';
}

/**
 * 統一的戰場入口參數。
 * 無論從大廳正式進入、QA 工具 preview、或「再來一場」replay，
 * BattleScene.start() 都透過此介面取得完整的戰鬥設定。
 */
export interface IBattleEntryParams {
  /** 入口來源：lobby = 大廳正式入口, preview = QA 工具 / preview target 5, replay = 再來一場, qa = 網頁 ?qaBattle=1 直進戰場（PROG-2-9127） */
  entrySource: 'lobby' | 'preview' | 'replay' | 'qa';

  /** 遭遇戰 ID（對應 encounters.json） */
  encounterId: string;

  /** 我軍主將 ID */
  playerGeneralId: string;
  /** 敵軍主將 ID */
  enemyGeneralId: string;

  /** 我軍裝備 ID 列表（預留） */
  playerEquipment?: string[];
  /** 敵軍裝備 ID 列表（預留） */
  enemyEquipment?: string[];

  /** 玩家選定的虎符卡組（卡片 ID = tacticId，依序上手，最多 4 張）。為空或全部無效時使用 demo 預設卡組 */
  selectedCardIds?: string[];

  /** 天氣 */
  weather: Weather;
  /** 天氣排程（可選）；覆蓋 encounter 設定（PROG-2-0401） */
  weatherSchedule?: WeatherScheduleEntry[];
  /** AI 難度（可選，PROG-2-0921）；有值時優先於遭遇資料 */
  aiDifficulty?: string;
  /** 戰場戰法 */
  battleTactic: BattleTactic;
  /** 背景 ID（覆蓋 encounter 設定；為空時由 encounter 決定） */
  backgroundId?: string;
  /** 首戰教學戰：開啟教學提示浮窗（PROG-2-0241）；預設關閉 */
  tutorial?: boolean;
  /** 全球征途階段 id（MVP-13）；由 GameSession.resolveCampaignStage 驗證後帶入，戰場流程尚未讀取 */
  campaignStageId?: string;
  /** 敵軍只出這些兵種（可選，PROG-2-9127，QA 直進入口用）；沒有就照敵將 Profile／虎符配發，正式入口不帶 */
  enemyDeployTroops?: TroopType[];
  /** 我方主將開場生命（可選，PROG-2-9391，QA 直進入口用）；超過生命上限就當成滿血，正式入口不帶 */
  qaPlayerGeneralHp?: number;
  /** 敵方主將開場生命（可選，PROG-2-9391，QA 直進入口用）；規則同上 */
  qaEnemyGeneralHp?: number;
  /** 我方主將進場名聲（可選，PROG-2-9394，QA 直進入口用）：驗證戰中升階用，只影響這一場，不寫存檔；正式入口不帶 */
  qaPlayerGeneralFame?: number;
  /** 英靈夢回教學戰的傳說英靈（OPEN-13）：只有教學戰帶入，勝利時產出初始虎符；預設沒有 */
  teachingSpirit?: { spiritId: string; spiritName: string; geneIds: readonly string[] } | null;
}

/** 戰場頂部關卡標題：沿用版面字距，字與字之間留空格 */
export function formatBattleStageTitle(name: string | undefined): string {
  return Array.from((name ?? '').replace(/\s+/g, '')).join(' ');
}

/** QA 工具 / preview target 5 使用的預設參數 */
export const DEFAULT_BATTLE_ENTRY_PARAMS: IBattleEntryParams = {
  entrySource: 'preview',
  encounterId: 'encounter-001',
  playerGeneralId: 'zhang-fei',
  enemyGeneralId: 'lu-bu',
  playerEquipment: [],
  enemyEquipment: [],
  selectedCardIds: [],
  weather: Weather.Clear,
  battleTactic: BattleTactic.Normal,
};

// ─── 中文映射表（用於 log 輸出）─────────────────────────────────────────────

export const TERRAIN_LABEL: Readonly<Record<TerrainType, string>> = {
  [TerrainType.Plain]: '平原',
  [TerrainType.River]: '水域',
  [TerrainType.Mountain]: '山地',
  [TerrainType.Fortress]: '關隘',
  [TerrainType.Desert]: '沙漠',
  [TerrainType.Forest]: '林地',
};

export const WEATHER_LABEL: Record<Weather, string> = {
  [Weather.Clear]: '晴天',
  [Weather.Rain]: '雨天',
  [Weather.Fog]: '大霧',
  [Weather.Windy]: '大風',
  [Weather.Night]: '夜戰',
  [Weather.Thunder]: '雷暴',
};

const TACTIC_LABEL: Record<BattleTactic, string> = {
  [BattleTactic.Normal]: '普通',
  [BattleTactic.FireAttack]: '火攻',
  [BattleTactic.FloodAttack]: '水淹',
  [BattleTactic.RockSlide]: '落石',
  [BattleTactic.AmbushAttack]: '伏擊',
  [BattleTactic.NightRaid]: '夜襲',
  [BattleTactic.Siege]: '攻城戰',
};

/** 戰法的簡短中文名（夜襲、火攻…）；未知值原樣回傳。 */
export function battleTacticLabel(tactic: BattleTactic): string {
  return TACTIC_LABEL[tactic] ?? tactic;
}

const SOURCE_TAG: Record<IBattleEntryParams['entrySource'], string> = {
  lobby: '大廳進入戰場',
  preview: 'QA工具進入戰場',
  replay: '再來一場',
  qa: 'QA直進戰場',
};

const PARAM_TAG: Record<IBattleEntryParams['entrySource'], string> = {
  lobby: '正式參數',
  preview: '預設參數',
  replay: '重播參數',
  qa: 'QA網址參數',
};

/**
 * 將 IBattleEntryParams 格式化為 console log 用的完整字串。
 *
 * 範例輸出：
 * ```
 * [大廳進入戰場] 正式參數為：我軍主將(張飛) 帶虎符軍隊: 虎豹騎/陷陣營/大戟士/連弩手,
 *   敵軍 呂布, 天氣: 晴天, 遭遇戰: encounter-001, 戰法: 普通
 * ```
 */
export function formatBattleEntryLog(
  params: IBattleEntryParams,
  extra?: {
    playerName?: string;
    enemyName?: string;
    encounterName?: string;
    cardNames?: string[];
  },
): string {
  const tag = SOURCE_TAG[params.entrySource] ?? params.entrySource;
  const paramTag = PARAM_TAG[params.entrySource] ?? '參數';
  const pName = extra?.playerName ?? params.playerGeneralId;
  const eName = extra?.enemyName ?? params.enemyGeneralId;
  const encName = extra?.encounterName ?? params.encounterId;
  const cards = extra?.cardNames?.join('/') || '(預設卡組)';
  const weather = WEATHER_LABEL[params.weather] ?? params.weather;
  const tactic = TACTIC_LABEL[params.battleTactic] ?? params.battleTactic;
  const pEquip = params.playerEquipment?.length ? params.playerEquipment.join('/') : '(無裝備)';
  const eEquip = params.enemyEquipment?.length ? params.enemyEquipment.join('/') : '(無裝備)';

  return `[${tag}] ${paramTag}為：我軍主將(${pName}) 裝備: ${pEquip}, 帶虎符軍隊: ${cards}, 敵軍 ${eName} 裝備: ${eEquip}, 天氣: ${weather}, 遭遇戰: ${encName}, 戰法: ${tactic}`;
}

/**
 * 首戰教學戰（PROG-2-0241）：玩家還沒通關任何關卡時，大廳開的第一場戰鬥開啟教學提示。
 * 通關過任何一關後就不再是教學戰。
 */
export function isTutorialBattle(clearedStageIds: readonly string[]): boolean {
    return clearedStageIds.length === 0;
}
