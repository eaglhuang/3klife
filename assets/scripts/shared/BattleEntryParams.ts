// @spec-source → 見 docs/cross-reference-index.md
// [統一戰場入口] 定義從任何路徑進入 BattleScene 時的參數介面。
// Unity 對照：BattleEntryData / BattleSessionConfig

import { Weather, BattleTactic, TerrainGrid } from './CommonEnums';

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
  /** 所屬連環破主鏈 id（PROG-2-0215）；沒有就是獨立關卡 */
  chainId?: string;
  /** 主鏈內順序，越小越前面（PROG-2-0215） */
  order?: number;
  /** 所屬全球征途階段 id（MVP-13）；沒有就是第一階段 */
  campaignStage?: string;
}

/**
 * 統一的戰場入口參數。
 * 無論從大廳正式進入、QA 工具 preview、或「再來一場」replay，
 * BattleScene.start() 都透過此介面取得完整的戰鬥設定。
 */
export interface IBattleEntryParams {
  /** 入口來源：lobby = 大廳正式入口, preview = QA 工具 / preview target 5, replay = 再來一場 */
  entrySource: 'lobby' | 'preview' | 'replay';

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
  /** 戰場戰法 */
  battleTactic: BattleTactic;
  /** 背景 ID（覆蓋 encounter 設定；為空時由 encounter 決定） */
  backgroundId?: string;
  /** 首戰教學戰：開啟教學提示浮窗（PROG-2-0241）；預設關閉 */
  tutorial?: boolean;
  /** 全球征途階段 id（MVP-13）；由 GameSession.resolveCampaignStage 驗證後帶入，戰場流程尚未讀取 */
  campaignStageId?: string;
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
};

const SOURCE_TAG: Record<IBattleEntryParams['entrySource'], string> = {
  lobby: '大廳進入戰場',
  preview: 'QA工具進入戰場',
  replay: '再來一場',
};

const PARAM_TAG: Record<IBattleEntryParams['entrySource'], string> = {
  lobby: '正式參數',
  preview: '預設參數',
  replay: '重播參數',
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
