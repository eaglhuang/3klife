
// @spec-source → 見 docs/cross-reference-index.md
// [UCUF M9] 從 BattleScene.ts 提取的純載入 / 資料建構函數。
// 本模組所有函數均無 BattleScene 實例依賴（不使用 this）。
// Unity 對照：BattleDataLoader + BattleHandBuilder 靜態工具類別

import { assetManager, AudioClip } from "cc";
import { services } from "../../core/managers/ServiceLoader";
import { GeneralUnit, GeneralConfig } from "../../core/models/GeneralUnit";
import { Faction } from "../../core/config/Constants";
import type { UltimateEffectFamily } from "../../shared/SkillRuntimeContract";
import type { CreateSortieInput } from '../../core/systems/SortieDeploy';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';

import { VFX_BLOCK_REGISTRY } from '../../core/config/vfx-block-registry';
import { EncounterConfig } from "../../shared/BattleEntryParams";
import { buildIdMap } from "../../shared/SkillRuntimeContract";
import type {
  JsonListEnvelope,
  CanonicalTacticDefinition,
  CanonicalUltimateDefinition,
} from "../../shared/SkillRuntimeContract";
import { isUltimateSlotUnlocked } from '../../core/systems/UltimateSlotUnlock';
import { buildTallyCardCatalog } from '../../core/config/TallyCardCatalog';
import { cinematicProfileOf } from '../../core/systems/UltimateCinematic';
import { TallyCardData } from '../../shared/TallyCardContract';
import { parseAiDifficultyTable, aiDifficultyEntryOf, type AiDifficultyEntry } from '../../core/systems/AiDifficultyTable';
import { deployPreferenceOfGeneral, laneStrategyOfGeneral, parseAiProfileTable, type AiLaneStrategy } from '../../core/systems/AiProfiles';
import type { AiDeployPreference } from '../../core/systems/AiDeployTroopPick';
import { EMPTY_AI_ADAPTIVE_STREAK, adaptiveHintOf, adaptiveScaleOf, type AiAdaptiveStreak } from '../../core/systems/AiAdaptiveDifficulty';
import type { AiDifficulty } from '../../core/systems/AiSpCharge';
import { aiAgeStageOf, scaleAiEnemyConfig } from '../../core/systems/AiStatScaling';
import { evaluateAiPower, matchAiScaleToPlayerPower } from '../../core/systems/AiPowerMatch';
import { getTacticTpCost } from '../../core/systems/SortieDeploy';
import { buildStageChainNodes, stageChapterOf, type EncounterChainSource } from '../../core/systems/StageChainNodes';

export interface BattleTacticSummary {
  count: number;
  label: string;
  message: string;
  names: string[];
}

export interface UltimateSkillItem {
  skillId: string;
  /** 奧義 id（查精力成本用，同一戰法可對應多個奧義） */
  ultimateId?: string;
  label: string;
  costSp: number;
  /** 奧義演出設定檔 id（PROG-2-1320）；一般戰法項目沒有奧義，不帶 */
  cinematicProfile?: string;
}

let tacticDefinitionMap = new Map<string, CanonicalTacticDefinition>();
let ultimateDefinitionMap = new Map<string, CanonicalUltimateDefinition>();
let ultBasePowerTable: Readonly<Record<string, number>> | undefined;

/** 奧義綁定的戰法 id（ultimate-definitions.battleSkillId）；定義沒有綁定或查不到時為 null／undefined（敵方奧義決策用） */
export function findUltimateBattleSkillId(ultimateId: string): string | null | undefined {
  return ultimateDefinitionMap.get(ultimateId)?.battleSkillId;
}

/** 奧義的精力成本比例（例如 0.05 = 5%）；定義尚未載入或查不到時回傳 undefined（PROG-2-0429） */
export function findUltimateVitalityCostPct(ultimateId: string): number | undefined {
  return ultimateDefinitionMap.get(ultimateId)?.vitalityCostPct;
}

/** 奧義的效果家族（ULT-13，敵方 AI 依家族決定施放時機）；定義查不到或沒填時回傳 undefined */
export function findUltimateFamily(ultimateId: string): UltimateEffectFamily | null | undefined {
  const def = ultimateDefinitionMap.get(ultimateId);
  return def?.ultimateFamily ?? def?.family;
}

/** 奧義的槽位與主屬性（奧義攻擊基準用，PROG-2-0927）；查不到時回傳 undefined */
export function findUltimateDamageDef(ultimateId: string): { slot?: number; scalingStat?: string | null } | undefined {
  const def = ultimateDefinitionMap.get(ultimateId);
  return def ? { slot: def.slot, scalingStat: def.scalingStat } : undefined;
}

/** 奧義 base_power 表（NumericalConfig.Ult_Base_Power）；尚未載入時回傳 undefined（PROG-2-0927） */
export function findUltBasePowerTable(): Readonly<Record<string, number>> | undefined {
  return ultBasePowerTable;
}

/**
 * 無頭測試用：不經資源載入，直接注入奧義定義與 base_power 表（PROG-2-0927）。
 * 測試以 fs 讀 JSON 後呼叫，與其他 headless 測試讀資料的方式一致。
 */
export function seedUltimateDataForHeadless(
  ultimates: CanonicalUltimateDefinition[],
  basePowerTable: Readonly<Record<string, number>>,
): void {
  ultimateDefinitionMap = buildIdMap(ultimates);
  ultBasePowerTable = basePowerTable;
}

let battleSkillMetadataPromise: Promise<void> | null = null;

/**
 * 載入傷害數字 BMFont 並註冊至 FloatTextSystem。
 * Unity 對照：DamageNumberManager.LoadFonts()
 */
export async function loadDamageFonts(): Promise<void> {
  try {
    const res = services().resource;
    const [fontBao, fontJia, fontMiss, fontPu] = await Promise.all([
      res.loadFont("dmgFont/bmfont/bao"),
      res.loadFont("dmgFont/bmfont/jia"),
      res.loadFont("dmgFont/bmfont/miss"),
      res.loadFont("dmgFont/bmfont/pu"),
    ]);

    const floatText = services().floatText;
    if (floatText) {
      floatText.registerFont('dmg_crit', fontBao);
      floatText.registerFont('heal', fontJia);
      floatText.registerFont('dmg_player', fontPu);
      floatText.registerFont('dmg_enemy', fontPu);
      floatText.registerFont('dmg_miss', fontMiss);
    }
    UCUFLogger.info(LogCategory.BATTLE, "[BattleSceneLoader] BMFonts 載入並註冊完成");
  } catch (e) {
    UCUFLogger.warn(LogCategory.BATTLE, "[BattleSceneLoader] BMFonts 載入失敗, 退回使用預設字型:", e);
  }
}

export async function loadBattleSkillMetadata(): Promise<void> {
  if (!battleSkillMetadataPromise) {
    battleSkillMetadataPromise = Promise.all([
      services().resource.loadJson<JsonListEnvelope<CanonicalTacticDefinition>>('data/master/tactic-library', { tags: ['battle'] }),
      services().resource.loadJson<JsonListEnvelope<CanonicalUltimateDefinition>>('data/master/ultimate-definitions', { tags: ['battle'] }),
      services().resource.loadJson<{ NumericalConfig?: { Ult_Base_Power?: Record<string, number> } }>('data/numerical-config', { tags: ['battle'] }),
    ]).then(([tacticJson, ultimateJson, numericalJson]) => {
      tacticDefinitionMap = buildIdMap(tacticJson.data);
      ultimateDefinitionMap = buildIdMap(ultimateJson.data);
      ultBasePowerTable = numericalJson.NumericalConfig?.Ult_Base_Power;
    });
  }
  await battleSkillMetadataPromise;
}

function loadAudioBundleClips(bundleName: string): Promise<Record<string, AudioClip>> {
  return new Promise((resolve, reject) => {
    const addClipAliases = (clipMap: Record<string, AudioClip>, rawName: string | undefined, clip: AudioClip) => {
      const normalizedName = (rawName ?? '').trim();
      if (!normalizedName) {
        return;
      }

      clipMap[normalizedName] = clip;

      const stem = normalizedName.replace(/\.[^.]+$/u, '');
      if (stem && stem !== normalizedName) {
        clipMap[stem] = clip;
      }
    };

    const collectClips = (bundle: any) => {
      bundle.loadDir('clips', AudioClip, (error: any, assets: AudioClip[]) => {
        if (error || !assets) {
          reject(error || new Error(`load audio clips failed: ${bundleName}`));
          return;
        }

        const clipMap: Record<string, AudioClip> = {};
        for (const clip of assets) {
          addClipAliases(clipMap, clip?.name, clip);
          const nativeUrl = (clip as any)?.nativeUrl ?? (clip as any)?.url ?? '';
          const fileName = nativeUrl ? nativeUrl.split('/').pop() : '';
          addClipAliases(clipMap, fileName, clip);
        }
        resolve(clipMap);
      });
    };

    const existing = assetManager.getBundle(bundleName);
    if (existing) {
      collectClips(existing);
      return;
    }

    assetManager.loadBundle(bundleName, (error, bundle) => {
      if (error || !bundle) {
        reject(error || new Error(`loadBundle failed: ${bundleName}`));
        return;
      }
      collectClips(bundle);
    });
  });
}

/**
 * 依 VFX_BLOCK_REGISTRY 預熱所有 VFX Prefab 至 PoolSystem。
 * 確保 EffectSystem.playBlock 呼叫時資源已就緒，避免即時載入卡頓。
 * Unity 對照：VfxPoolManager.Prewarm()
 */
export async function prewarmVfxPools(): Promise<void> {
  const registry = VFX_BLOCK_REGISTRY.filter(block => !!block.prefabPath);
  if (registry.length === 0) return;

  const res = services().resource;
  const pool = services().pool;

  const missing: string[] = [];
  const promises = registry.map(async (block) => {
    try {
      const prefab = await res.loadBundlePrefab('vfx_core', block.prefabPath!);
      if (prefab) {
        pool.register(block.id, prefab, 1);
      }
    } catch (bundleError) {
      try {
        const prefab = await res.loadPrefab(block.prefabPath!);
        if (prefab) {
          pool.register(block.id, prefab, 1);
        }
      } catch (resourceError) {
        missing.push(block.id);
        UCUFLogger.warn(LogCategory.LIFECYCLE, `[BattleSceneLoader] VFX prefab 預熱失敗: ${block.id} (${block.prefabPath})`, resourceError ?? bundleError);
      }
    }
  });

  await Promise.all(promises);

  if (missing.length > 0) {
    UCUFLogger.warn(LogCategory.LIFECYCLE, `[BattleSceneLoader] 仍有 VFX prefab 未預熱: ${missing.join(', ')}`);
  }
}

/**
 * 預熱戰鬥音效 bundle 中的 clips，避免 BattleScene preview 先播才臨時載入。
 * Unity 對照：AudioManager 預載 SFX clip
 */
export async function prewarmBattleAudioClips(): Promise<void> {
  try {
    const clips = await loadAudioBundleClips('audio');
    if (Object.keys(clips).length === 0) {
      UCUFLogger.warn(LogCategory.LIFECYCLE, '[BattleSceneLoader] audio bundle 沒有可預熱的 clips');
      return;
    }

    services().audio.registerClips(clips);
  } catch (error) {
    UCUFLogger.warn(LogCategory.LIFECYCLE, '[BattleSceneLoader] battle audio clips 預熱失敗', error);
  }
}

// ─── 遭遇戰 / 武將讀取 ──────────────────────────────────────────────────────

/**
 * 從 encounters.json 讀取指定遭遇戰設定。
 * Unity 對照：EncounterRepository.GetById(id)
 */
export async function loadEncounter(encounterId: string): Promise<EncounterConfig | null> {
  try {
    const data = await services().resource.loadJson<{ encounters: EncounterConfig[] }>("data/encounters");
    return data.encounters.find(e => e.id === encounterId) ?? null;
  } catch {
    return null;
  }
}

/** 從 generals.json 讀原始武將設定（俘虜用）；找不到回傳 null */
export async function loadGeneralConfig(id: string): Promise<GeneralConfig | null> {
  try {
    const list = await services().resource.loadJson<GeneralConfig[]>("data/generals");
    return list.find(g => g.id === id) ?? null;
  } catch {
    return null;
  }
}

/** 開戰敵將的 AI 縮放設定（PROG-2-1319）：難度列與關卡章節序位 */
export interface EnemyScaleSetting {
  /** 已套用玩家連勝連敗自適應後的難度列（statScale 已調整） */
  difficulty: AiDifficultyEntry;
  chapter: number;
  /** 自適應上調或下調時的開戰提示文案（AIS-11 G-2）；沒有變化為 null */
  adaptiveHint: string | null;
}

/**
 * 讀取開戰敵將要用的縮放設定；ai-difficulty.json 或關卡資料讀不到時回傳 undefined，敵將維持原數值。
 * 章節 = 關卡所屬主鏈在關卡資料中的序位（stageChapterOf）。
 * Unity 對照：Difficulty 與 Chapter 的 ScriptableObject，開戰前查出來交給 Spawner。
 */
/** 未縮放的模板戰力（AIS-09 F-1，供 ±20% 匹配用）；找不到武將回傳 null */
export async function templatePowerOf(generalId: string): Promise<number | null> {
  try {
    const list = await services().resource.loadJson<GeneralConfig[]>("data/generals");
    const general = list.find(g => g.id === generalId);
    if (!general) return null;
    return evaluateAiPower({
      str: general.str ?? 0,
      int: general.int ?? 0,
      lea: general.lea ?? 0,
      pol: general.pol ?? 0,
      cha: general.cha ?? 0,
      luk: general.luk ?? 0,
      ageStage: aiAgeStageOf(general.age ?? 30),
      tacticTpCosts: (general.tacticSlots ?? []).map(slot => getTacticTpCost(slot.tacticId)),
      reincarnation: general.rebirthCount ?? 1,
    });
  } catch {
    return null;
  }
}

/**
 * 出征武將的實際戰力（AIS-09 F-1）：用玩家實際武將的六維、轉生與戰法計算。
 * 年齡目前未在 GeneralUnit 上，暫以壯年（Prime）計。
 */
export function playerPowerOfGeneral(general: GeneralUnit): number {
  return evaluateAiPower({
    str: general.str,
    int: general.int,
    lea: general.lea,
    pol: general.pol,
    cha: general.cha,
    luk: general.luk,
    ageStage: 'Prime',
    tacticTpCosts: general.tacticSlots.map(slot => getTacticTpCost(slot.tacticId)),
    reincarnation: general.rebirthCount ?? 1,
  });
}

export async function loadEnemyScale(
  encounterId: string,
  difficulty: AiDifficulty,
  streak: AiAdaptiveStreak = EMPTY_AI_ADAPTIVE_STREAK,
  playerPower: number | null = null,
  enemyGeneralId: string | null = null,
): Promise<EnemyScaleSetting | undefined> {
  try {
    const { table } = parseAiDifficultyTable(await services().resource.loadJson<unknown>("data/ai-difficulty"));
    if (!table) return undefined;
    const data = await services().resource.loadJson<{ encounters: EncounterChainSource[] }>("data/encounters");
    const chapter = stageChapterOf(buildStageChainNodes(data.encounters), encounterId);
    const base = aiDifficultyEntryOf(table, difficulty);
    // E-8：玩家連勝連敗微調敵方 statScale；沒有連勝連敗時等於基礎值
    const adaptive = adaptiveScaleOf(base.statScale, streak);
    // AIS-09：敵我模板戰力差超過 ±20% 時拉回邊界；沒傳武將 id 就不匹配
    const enemyPower = enemyGeneralId ? await templatePowerOf(enemyGeneralId) : null;
    const scale = playerPower !== null && enemyPower !== null
      ? matchAiScaleToPlayerPower(enemyPower, adaptive, playerPower)
      : adaptive;
    return { difficulty: { ...base, statScale: scale }, chapter, adaptiveHint: adaptiveHintOf(base.statScale, adaptive) };
  } catch {
    return undefined;
  }
}

/**
 * 從 generals.json 或內建預設值建立 GeneralUnit。
 * 傳入 enemyScale 時，敵方武將先用 scaleAiEnemyConfig 縮放 str、int、lea、luk 再建立（不改 readonly 欄位）。
 * Unity 對照：GeneralFactory.Create(id, faction)
 */
export async function createGeneral(id: string, faction: Faction, enemyScale?: EnemyScaleSetting): Promise<GeneralUnit> {
  const general = await createGeneralUnit(id, faction, enemyScale);
  if (faction === Faction.Enemy) {
    general.aiLaneStrategy = await loadAiLaneStrategy(id);
    general.aiDeployPreference = await loadAiDeployPreference(id);
  }
  return general;
}

/**
 * 敵將的 Profile 路線策略（AI武將強度 E-4／E-6，PROG-2-1463）；ai-profiles.json 讀不到或武將未列出時回傳 null（隨機選路）。
 */
export async function loadAiLaneStrategy(generalId: string): Promise<AiLaneStrategy | null> {
  try {
    return laneStrategyOfGeneral(parseAiProfileTable(await services().resource.loadJson<unknown>("data/ai-profiles")), generalId);
  } catch {
    return null;
  }
}

/**
 * 敵將的 Profile 部署兵種偏好（AI武將強度 E-3／E-6，PROG-2-1468）；讀不到或武將未列出時回傳 null（全兵種隨機）。
 */
export async function loadAiDeployPreference(generalId: string): Promise<AiDeployPreference | null> {
  try {
    return deployPreferenceOfGeneral(parseAiProfileTable(await services().resource.loadJson<unknown>("data/ai-profiles")), generalId);
  } catch {
    return null;
  }
}

async function createGeneralUnit(id: string, faction: Faction, enemyScale?: EnemyScaleSetting): Promise<GeneralUnit> {
  // 我軍主將若是名冊裡可出戰的武將（培育畢業 / 抽卡），用名冊數值（實力層、因子、戰法）建立
  if (faction === Faction.Player) {
    const rosterConfig = services().session.getBattleConfig(id, faction);
    if (rosterConfig) {
      return new GeneralUnit(rosterConfig);
    }
  }

  const DEFAULT: Record<string, GeneralConfig> = {
    "zhang-fei": { id: "zhang-fei", name: "張飛", faction: Faction.Player, hp: 1000, maxSp: 100, str:  90, lea: 85, luk: 40, attackBonus: 0.10, skillId: "zhang-fei-roar" },
    "guan-yu":   { id: "guan-yu",   name: "關羽", faction: Faction.Player, hp: 1200, maxSp: 100, str: 100, lea: 90, luk: 50, attackBonus: 0.15, skillId: "guan-yu-slash"  },
    "lu-bu":     { id: "lu-bu",     name: "呂布", faction: Faction.Enemy,  hp: 1500, maxSp: 100, str: 130, lea: 95, luk: 30, attackBonus: 0.20, skillId: "lu-bu-rampage"  },
    "cao-cao":   { id: "cao-cao",   name: "曹操", faction: Faction.Enemy,  hp: 1000, maxSp: 80,  int: 110, lea: 80, luk: 70, attackBonus: 0.08, skillId: "cao-cao-tactics" },
  };

  try {
    type GeneralsJson = GeneralConfig[];
    const list = await services().resource.loadJson<GeneralsJson>("data/generals");
    const cfg  = list.find(g => g.id === id);
    if (cfg) {
      const scaled = faction === Faction.Enemy && enemyScale
        ? scaleAiEnemyConfig(cfg, enemyScale.difficulty, enemyScale.chapter)
        : cfg;
      return new GeneralUnit({ ...scaled, faction });
    }
  } catch {
    // 靜默失敗，使用預設值
  }

  return new GeneralUnit(DEFAULT[id]);
}

/**
 * 名冊武將出戰時的出征帳本設定（PROG-2-0070/0072）：帶兵上限由統率推算，城市兵源與糧草取存檔儲備。
 * 內建 demo 武將（名冊裡沒有）回傳 null，戰場維持舊版不扣軍勢。
 */
export function buildRosterSortieInput(general: GeneralUnit): CreateSortieInput | null {
  if (general.faction !== Faction.Player) return null;
  const input = services().session.getSortieInput(general.id);
  if (!input) return null;
  // 戰場開局才消耗季末糧不足折扣（TRP-12）；預覽不走這裡
  return { ...input, tallyFoodDiscount: services().session.consumeTallyFoodDiscount() };
}

/** 主將的虎符忠誠（TRP-09）；沒有紀錄或不是我方時回傳 null（不拒令） */
export function buildOrderLoyalty(general: GeneralUnit): number | null {
  if (general.faction !== Faction.Player) return null;
  return services().session.tallyLoyalty[general.id]?.loyalty ?? null;
}

export function buildTacticSummary(general: GeneralUnit): BattleTacticSummary {
  const names = (general.tacticSlots ?? [])
    .map((slot) => tacticDefinitionMap.get(slot.tacticId)?.displayName ?? slot.tacticId)
    .filter((item, index, list) => item.length > 0 && list.indexOf(item) === index);

  if (names.length === 0) {
    return {
      count: 0,
      label: '計謀',
      message: '尚未配置天賦戰法',
      names: [],
    };
  }

  return {
    count: names.length,
    label: `計謀 ${names.length}`,
    message: `可用戰法（${names.length}）：${names.join('、')}`,
    names,
  };
}

// ─── 資料建構 ───────────────────────────────────────────────────────────────

/** 戰場手牌上限（對應 tiger-tally 面板 tally[0..3]） */
export const TALLY_HAND_SIZE = 4;


/**
 * 根據玩家選定卡組建立虎符手牌資料。
 *
 * 卡片 ID 即卡片的 tacticId（例如 `tiger-tally-cavalry-shock`），依 selectedCardIds 的順序查表：
 *   - 查不到的 ID 會略過並記 warn；同一 ID 可重複出現（同款虎符多張）
 *   - 超過 TALLY_HAND_SIZE 的部分截掉
 *   - selectedCardIds 為空、或全部查不到時，退回 demo 預設卡組（getDefaultTallyDeckIds）
 *
 * Unity 對照：BattleHandManager.BuildInitialHand(deckIds) → 用 Dictionary<string, CardDef>
 * 把存檔裡的卡片 ID 轉成 List<CardData>，找不到的 ID 當成壞資料跳過。
 */
export function buildTallyCards(selectedCardIds?: readonly string[]): TallyCardData[] {
  const catalog = buildTallyCardCatalog();
  return resolveTallyDeckIds(selectedCardIds).map((cardId) => ({ ...catalog.get(cardId)! }));
}

/** 卡片目錄中所有可用的虎符卡片 ID（目前 = demo 預設 4 張） */
export function getTallyCardCatalogIds(): string[] {
  return Array.from(buildTallyCardCatalog().keys());
}

/** demo 預設卡組：目錄中的前 TALLY_HAND_SIZE 張 */
export function getDefaultTallyDeckIds(): string[] {
  return getTallyCardCatalogIds().slice(0, TALLY_HAND_SIZE);
}

/**
 * 把玩家選定的卡片 ID 解析成實際上場的卡片 ID 清單（純函式，可 headless 測試）。
 */
export function resolveTallyDeckIds(selectedCardIds?: readonly string[]): string[] {
  const selected = (selectedCardIds ?? []).filter((id) => typeof id === 'string' && id.length > 0);
  if (selected.length === 0) {
    return getDefaultTallyDeckIds();
  }

  const catalogIds = new Set(getTallyCardCatalogIds());
  const unknownIds = selected.filter((id) => !catalogIds.has(id));
  if (unknownIds.length > 0) {
    UCUFLogger.warn(LogCategory.BATTLE, '[BattleSceneLoader] 卡組含未知虎符卡片 ID，已略過', { unknownIds });
  }

  const resolved = selected.filter((id) => catalogIds.has(id)).slice(0, TALLY_HAND_SIZE);
  if (resolved.length === 0) {
    UCUFLogger.warn(LogCategory.BATTLE, '[BattleSceneLoader] 卡組沒有任何有效卡片，改用預設卡組');
    return getDefaultTallyDeckIds();
  }
  return resolved;
}


/**
 * 由武將資料建立必殺技選擇清單。
 * Unity 對照：UltimateSkillBuilder.Build(general)
 */
export function buildUltimateSkills(general: GeneralUnit): UltimateSkillItem[] {
  const slotSkills = [...(general.ultimateSlots ?? [])]
    .filter((slot) => isUltimateSlotUnlocked(slot, general.rebirthCount))
    .sort((left, right) => left.slot - right.slot)
    .map((slot) => {
      const ultimateDef = ultimateDefinitionMap.get(slot.ultimateId);
      const resolvedSkillId = ultimateDef?.battleSkillId ?? general.battlePrimarySkillId ?? general.skillId ?? null;
      if (!resolvedSkillId) {
        return null;
      }

      const skillDef = services().action.getSkill(resolvedSkillId);
      return {
        skillId: resolvedSkillId,
        ultimateId: slot.ultimateId,
        label: ultimateDef?.name ?? skillDef?.label ?? slot.ultimateId,
        costSp: skillDef?.costSp ?? general.maxSp,
        cinematicProfile: cinematicProfileOf({ family: ultimateDef?.family, cinematicProfile: ultimateDef?.cinematicProfile }),
      } as UltimateSkillItem;
    })
    .filter((item): item is UltimateSkillItem => item !== null);

  if (slotSkills.length > 0) {
    return slotSkills;
  }

  if (!general.skillId) {
    return [];
  }
  const skillDef = services().action.getSkill(general.skillId);
  return [{
    skillId: general.skillId,
    label:   skillDef?.label ?? general.skillId,
    costSp:  skillDef?.costSp ?? general.maxSp,
  }];
}
