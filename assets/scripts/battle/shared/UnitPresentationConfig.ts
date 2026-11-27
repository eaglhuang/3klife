import { ActionClip, UnitAction, UnitPresentationConfig } from './UnitPresentationCore';
import { MOVE_GAIT_TUNING } from './MoveFeedback';

/** 資源存於私有素材包；遊戲端只保存載入路徑與共用動畫映射。 */
export interface UnitSpineConfig extends UnitPresentationConfig {
  path: string;
  labelToFoot: number;
  /** 骨架原點到雙腳腳底中點，骨架單位、y 向上。 */
  footOffset: { x: number; y: number };
  mirrorSkin?: string;
  /**
   * 小隊其餘隊員的站位（畫面像素，x 為面向的後方、y 向上）與動作時間差（0～1）。
   * 不設就是單人。隊員共用帶頭者的骨架與圖集。
   */
  squad?: ReadonlyArray<{ x: number; y: number; phase: number }>;
  /** 兩次落腳間隔（動畫秒），揚塵與腳步／蹄聲依此同拍；不設 = 小兵 walk 一步 0.4 秒。 */
  footfallIntervalSec?: number;
  /** 整隊走路起伏（畫面像素）；不設 = MOVE_GAIT_TUNING.bobPx。骨架自己有起伏的（騎兵的馬）設 0。 */
  bobPx?: number;
  /** 施法專用動作（騎乘包的通用 cast）；沒設就沿用 attack。 */
  castClip?: ActionClip;
  /** 骨架整體染色（相乘，白 = 不變）。敵方騎兵沿用藍騎兵骨架時用紅色調暫代，見 ENEMY_CAVALRY_TINT。 */
  tint?: { r: number; g: number; b: number };
}
/** 小兵一隊最多 3 人：帶頭者在前，兩名隊員在後方上下錯開。站位以 0.18 顯示縮放（人寬約 58 像素）、格寬約 144 像素抓：要看得出是三個人，又不能站出自己的格子。 */
export const SOLDIER_SQUAD_SLOTS: ReadonlyArray<{ x: number; y: number; phase: number }> = [
  { x: 36, y: 17, phase: 0.35 },
  { x: 42, y: -15, phase: 0.7 },
];
/** 依兵力比例決定小隊顯示人數：滿編 3 人，掉到 2/3 以下剩 2 人，1/3 以下剩 1 人，讓玩家不看數字也知道這隊快沒了。 */
export function squadMemberCount(currentHp: number, maxHp: number, squadSize = SOLDIER_SQUAD_SLOTS.length + 1): number {
  if (!(maxHp > 0) || !(currentHp > 0)) return 1;
  return Math.max(1, Math.min(squadSize, Math.ceil(currentHp / maxHp * squadSize)));
}
const clip = (name: string, duration: number, loop = false, fallback?: string): ActionClip => ({ name, duration, loop, ...(fallback ? { fallback } : {}) });
/**
 * 步態倍率上限（PROG-2-9407）。倍率 1 時 walk 一個週期 0.8 秒、左右腳各一步；
 * 1.6 倍時約每 0.25 秒落一腳，是肉眼還讀得出「走路」的上限，再快就像快轉。
 * 位移時間（BattlePresentationTiming）固定為 2 秒起跳、總長不能超過 2.5 秒（movementIdleMaxWaitMs），
 * 所以多格合併時不靠加快步伐追位移：步頻封頂，位移照時間走完。
 */
export const MAX_WALK_ANIMATION_SPEED = MOVE_GAIT_TUNING.maxAnimationSpeed;
function clips(tier: 'general' | 'soldier', attackDuration: number): Record<UnitAction, ActionClip> {
  return {
    idle: clip('idle', tier === 'general' ? 2 : 1.6, true),
    // 小兵前進播 walk（有高低起伏的行走），缺 walk 的骨架退回 dash_in；武將骨架目前只有 dash_in，維持原狀
    move: tier === 'general' ? clip('dash_in', 1.2, true) : clip('walk', 0.8, true, 'dash_in'),
    retreat: clip('retreat', tier === 'general' ? 1.2 : 0.8, true),
    attack: clip('duel_attack', attackDuration), hit: clip('hit', 0.9),
    dodge: clip('dodge', 0.6), fall: clip('fall', 1.8),
  };
}
const generals: Record<string, { name: string; footX: number }> = {
  zhao_yun: { name: 'zhao_v2', footX: 4.5 }, zhang_fei: { name: 'char2', footX: 15 },
  guan_yu: { name: 'guan_yu', footX: 9 }, lu_bu: { name: 'lu_bu', footX: 9 },
};
/**
 * 騎馬武將（PROG-2-9738、PROG-2-9993）：騎馬是「騎術」資格（使用者 11/23 裁決），武將資料的 ridingTier > 0 就騎馬，與帶什麼兵種無關；
 * 騎術三級（1 騎術／2 精騎／3 神駒，見 data/riding-tiers.json）換坐騎外觀：取「不超過該等級的最高一套」，沒有更高等級的外觀時沿用較低一套。
 * 騎馬版素材（騎手＋馬合成骨架）來自 spine-trial export/game，私有、不進倉庫，由 tools_node/sync-mount-spine.js 依 manifest 驗 md5 後同步；
 * 對照表 data/mounted-list.json 也是 spine-trial 產生的（同一支工具複製），這裡不再手寫武將與骨架路徑。
 * 對照表載入前、或表裡沒有該武將時，退回下方 LEGACY_MOUNTED（舊 export/mount 包，等產生器全面接上後再刪）；缺圖時 hasFailed 為真，再退回步行版。
 */
export interface MountedListLeaf { skeleton: string; skin?: string; mirror_skin?: string; animations?: Record<string, string> }
export interface MountedListData { generals: Record<string, Record<string, MountedListLeaf>> }
/** 騎術等級 → 產生器的馬型鍵（mounted-list 的 riding_tier）。 */
export const RIDING_TIER_HORSE: Readonly<Record<number, string>> = { 1: 'bay', 2: 'sheet', 3: 'war' };
/** 3KL 武將 id → 產生器 game id；沒列的以同名查。趙雲在產生器叫 zhao（zhao_v2 包的遊戲別名，PNG 位元組相同）。 */
const MOUNTED_LIST_ID: Record<string, string> = { zhao_yun: 'zhao' };
/** 舊版騎乘包（export/mount，tools_node/sync-mount-spine.js --legacy）：對照表沒有該武將時的 fallback。關羽 export/game 尚未發佈，目前只有這一套。 */
const LEGACY_MOUNTED: Record<string, { dir: string; looks: Record<number, string> }> = {
  zhao_yun: { dir: 'zhao_yun_mounted', looks: { 1: 'v2_horse_bay/zhao_v2__mount_horse_bay', 2: 'v2_horse_sheet/zhao_v2__mount_horse_sheet', 3: 'v2_horse_war/zhao_v2__mount_horse_war' } },
  guan_yu: { dir: 'guan_yu_mounted', looks: { 1: 'guan_yu__mount_horse_bay' } },
};
let mountedList: MountedListData | null = null;
const mountedCache = new Map<string, UnitSpineConfig>();
/** 驗證並解析 mounted-list.json 內容；格式不符回 null（呼叫端沿用舊包）。 */
export function parseMountedList(raw: unknown): MountedListData | null {
  const generals = (raw as { generals?: unknown } | null)?.generals;
  if (!generals || typeof generals !== 'object') return null;
  const out: MountedListData = { generals: {} };
  for (const [gid, tiers] of Object.entries(generals as Record<string, unknown>)) {
    if (!tiers || typeof tiers !== 'object') continue;
    const leaves: Record<string, MountedListLeaf> = {};
    for (const [horse, leaf] of Object.entries(tiers as Record<string, MountedListLeaf>)) {
      if (leaf && typeof leaf.skeleton === 'string' && leaf.skeleton.endsWith('.json')) leaves[horse] = leaf;
    }
    if (Object.keys(leaves).length > 0) out.generals[gid] = leaves;
  }
  return out;
}
/** 載入（或換掉）mounted-list；傳 null 清除。 */
export function setMountedList(raw: unknown): void {
  mountedList = raw === null ? null : parseMountedList(raw);
  mountedCache.clear();
}
/** 取「不超過 ridingTier 的最高一套」的等級；沒有就 undefined。 */
function pickTier(tiers: number[], ridingTier: number): number | undefined {
  return tiers.filter(t => t <= ridingTier).sort((a, b) => b - a)[0];
}
function mountedConfig(cacheKey: string, path: string, foot: number, clips: UnitSpineConfig['clips'], castClip?: ActionClip): UnitSpineConfig {
  let config = mountedCache.get(cacheKey);
  if (!config) {
    config = { path, displayScale: 0.17, labelToFoot: 230, footOffset: { x: foot, y: 0 },
      walkGroundSpeed: 1251.14, speedMultiplier: 2, maxAnimationSpeed: MAX_WALK_ANIMATION_SPEED, mirrorSkin: 'hand_mirror',
      footfallIntervalSec: CAVALRY_GALLOP_PERIOD_SEC / 2, bobPx: 0, clips, ...(castClip ? { castClip } : {}) };
    mountedCache.set(cacheKey, config);
  }
  return config;
}
/** 對照表那一套：動作名全走 leaf.animations（產生器已解析 fallback）；施法有專屬動作才設 castClip。 */
function listMountedConfig(key: string, ridingTier: number): UnitSpineConfig | null {
  const tiers = mountedList?.generals[MOUNTED_LIST_ID[key] ?? key];
  if (!tiers) return null;
  const byTier = new Map<number, string>();
  for (const [tier, horse] of Object.entries(RIDING_TIER_HORSE)) if (tiers[horse]) byTier.set(Number(tier), horse);
  const tier = pickTier(Array.from(byTier.keys()), ridingTier);
  if (tier === undefined) return null;
  const leaf = tiers[byTier.get(tier)!];
  const an = (name: string): string => leaf.animations?.[name] ?? name;
  const attack = an('attack_spear');
  const cast = leaf.animations?.cast;
  return mountedConfig(`list:${key}#${tier}`, `spine/${leaf.skeleton.replace(/^spine\//, '').replace(/\.json$/, '')}`, 0, {
    idle: clip(an('idle'), 1.6, true), move: clip(an('gallop'), CAVALRY_GALLOP_PERIOD_SEC, true, 'trot'), retreat: clip(an('retreat'), 1.2, true, an('gallop')),
    attack: clip(attack, 1.2, false, 'thrust'), hit: clip(an('hit'), 0.8), dodge: clip(an('dodge'), 0.9, false, an('hit')), fall: clip(an('fall'), 1.8, false, an('hit')),
  }, cast && cast !== attack ? clip(cast, 2, false, attack) : undefined);
}
function legacyMountedConfig(key: string, ridingTier: number): UnitSpineConfig | null {
  const art = LEGACY_MOUNTED[key];
  if (!art) return null;
  const tier = pickTier(Object.keys(art.looks).map(Number), ridingTier);
  if (tier === undefined) return null;
  return mountedConfig(`legacy:${key}#${tier}`, `spine/generals/${art.dir}/${art.looks[tier]}`, 0, {
    idle: clip('idle', 1.6, true), move: clip('gallop', CAVALRY_GALLOP_PERIOD_SEC, true, 'trot'), retreat: clip('retreat', 1.2, true, 'gallop'),
    attack: clip('attack_spear', 1.2, false, 'thrust'), hit: clip('hit', 0.8), dodge: clip('dodge', 0.9, false, 'hit'), fall: clip('fall', 1.8, false, 'hit'),
  });
}
/** 騎乘設定：先對照表，缺圖或表裡沒有再舊包；都不行回 null（步行版）。 */
function mountedGeneralConfig(key: string, ridingTier: number, hasFailed?: (path: string) => boolean): UnitSpineConfig | null {
  for (const config of [listMountedConfig(key, ridingTier), legacyMountedConfig(key, ridingTier)]) {
    if (config && !hasFailed?.(config.path)) return config;
  }
  return null;
}
/**
 * 武將實際騎術等級：資料欄位 ridingTier 與 data/riding-tiers.json 的天生等級（innate，鍵為 zhao-yun 這類 id）取較高者。
 * 表格由呼叫端讀 JSON 後傳入；讀到前傳 null，只看武將自己的欄位。
 */
export function resolveRidingTier(id: string, configTier: number, innate?: Record<string, number> | null): number {
  const own = Math.max(0, Math.floor(configTier || 0));
  const key = id.toLowerCase().replace(/_/g, '-');
  const born = innate && Number.isFinite(innate[key]) ? Math.max(0, Math.floor(innate[key])) : 0;
  return Math.max(own, born);
}
const generalCache = new Map<string, UnitSpineConfig>();
const soldierCache = new Map<string, UnitSpineConfig>();
export function generalSpineConfig(id: string, templateId?: string | null, ridingTier = 0,
  hasFailed?: (path: string) => boolean): UnitSpineConfig | null {
  const template = templateId?.toLowerCase().replace(/-/g, '_');
  const key = template && generals[template] ? template : id.toLowerCase().replace(/-/g, '_');
  const art = generals[key];
  if (!art) return null;
  if (ridingTier > 0) {
    const mounted = mountedGeneralConfig(key, ridingTier, hasFailed);
    if (mounted) return mounted;
  }
  let config = generalCache.get(key);
  if (!config) {
    config = { path: `spine/generals/${key}/${art.name}`, displayScale: 0.22, labelToFoot: 230, footOffset: { x: art.footX, y: 0 },
      walkGroundSpeed: 93.33, speedMultiplier: 2, maxAnimationSpeed: MAX_WALK_ANIMATION_SPEED, mirrorSkin: 'hand_mirror', clips: clips('general', 1.6) };
    generalCache.set(key, config);
  }
  return config;
}
/** 兵種對應的小兵素材名與交鋒動作長度（秒）。素材由 tools_node/battle-chibi/make_troop_variants.py 產出，設計見 docs/battle-chibi-troop-design.md。 */
const SOLDIER_ART: Record<string, { name: string; attack: number; bow?: boolean }> = {
  pikeman: { name: 'spear', attack: 1 }, archer: { name: 'bow', attack: 1.2, bow: true },
  shield: { name: 'shield', attack: 0.9 }, infantry: { name: 'infantry', attack: 1 },
  engineer: { name: 'engineer', attack: 1 }, medic: { name: 'medic', attack: 1 }, navy: { name: 'navy', attack: 1 },
  elite_infantry: { name: 'elite_infantry', attack: 1 }, elite_shield: { name: 'elite_shield', attack: 1 },
};
/** 虎符卡目錄 id（tacticId）對應的精銳外觀；底兵種不符時不套用。 */
const ELITE_ART: Record<string, { troop: string; art: string }> = {
  'tiger-tally-xian-zhen': { troop: 'infantry', art: 'elite_infantry' }, 'tiger-tally-infantry-wall': { troop: 'infantry', art: 'elite_infantry' },
  'tiger-tally-shield-line': { troop: 'shield', art: 'elite_shield' },
};
/**
 * 騎兵（PROG-2-9408）：spine-trial 的騎手＋馬合成骨架（soldier_cavalry_blue × horse_sheet），私有素材。
 * - 前進播 gallop：實機量到騎兵一回合常跑 2 格以上、約 144 疊層單位/秒；gallop 地速 1251 × 0.1 = 125，倍率約 1.15 蹄不滑。
 *   trot（地速 533 → 53）要 2.7 倍、被步態上限 2.2 卡住會滑步；walk 更慢。
 * - 縮放 0.10：實機對照（11/19）0.12 時騎手頭比步兵大一圈；0.10 時騎手頭與步兵相同，馬身約 90 像素、比一格窄。
 * - 隊形比步兵拉開：馬身寬，用步兵站位三匹馬會疊成一團。
 * - gallop 週期 0.567 秒（橫向襲步：後遠→後近→前遠→前近→騰空），揚塵與蹄聲取每半週期一拍（每拍兩聲蹄響）；馬骨架本身有起伏，不再加整隊起伏。
 * - 合成骨架 v2（PROG-2-9738，50 個動作）已有 attack_spear／dodge／fall／retreat；舊骨架缺這些動作時由 fallback 退回 thrust／hit／gallop。
 * - 敵方（PROG-2-9959）：沒有紅騎兵骨架，沿用藍騎兵騎馬骨架加 ENEMY_CAVALRY_TINT 紅色調暫代，不再退回紅方步矛兵。
 */
const CAVALRY_GALLOP_PERIOD_SEC = 0.5667;
const CAVALRY_NAME = 'soldier_cavalry_blue';
/**
 * 敵方騎兵紅方骨架（spine-trial PR #11，export/mount/soldier_cavalry_red/horse_bay）：獨立資料夾 soldier_cavalry_red，動作與藍版相同。
 * 紅方骨架缺檔時的後備：沿用藍騎兵騎馬骨架、以紅色相乘染色（藍甲會偏暗，只剩輪廓，所以只當後備）。
 */
export const ENEMY_CAVALRY_TINT = { r: 255, g: 96, b: 96 } as const;
/**
 * 敵方步／弓／盾等小兵的陣營底色（QA 11/25；騎兵紅骨架維持不染色，缺檔時才走 ENEMY_CAVALRY_TINT）：長坂坡突圍敵我兵看起來都是綠色，一眼分不出誰是敵人。
 * 紅色圖集本身就偏紅，這層淡紅相乘是保險：就算美術或載入路徑出錯、敵兵退到別色素材，
 * 敵方仍偏暖紅、與我方藍／綠色素材區分。只輕壓綠藍通道，不把紅色素材染得過暗。
 */
export const ENEMY_TROOP_TINT = { r: 255, g: 170, b: 170 } as const;
const CAVALRY_RED_NAME = 'soldier_cavalry_red';
const CAVALRY_RED_MOUNTED_NAME = `${CAVALRY_RED_NAME}__mount_horse_bay`;
/** 騎乘版骨架檔名（PROG-2-9868）：騎手騎在栗色馬上，動作名稱與舊合成骨架相同；缺圖時退回 CAVALRY_NAME。 */
const CAVALRY_MOUNTED_NAME = `${CAVALRY_NAME}__mount_horse_bay`;
const CAVALRY_SQUAD_SLOTS: ReadonlyArray<{ x: number; y: number; phase: number }> = [
  { x: 30, y: 24, phase: 0.35 },
  { x: 48, y: -22, phase: 0.7 },
];
function cavalrySpineConfig(mounted = true, tint?: UnitSpineConfig['tint'], dir = CAVALRY_NAME, mountedName = CAVALRY_MOUNTED_NAME): UnitSpineConfig {
  const skeleton = mounted ? mountedName : dir;
  const cacheKey = `${dir}/${skeleton}${tint ? `#${tint.r},${tint.g},${tint.b}` : ''}`;
  const cached = soldierCache.get(cacheKey);
  if (cached) return cached;
  const config: UnitSpineConfig = { path: `spine/soldiers/${dir}/${skeleton}`, displayScale: 0.1, labelToFoot: 150, footOffset: { x: 0, y: 0 },
    walkGroundSpeed: 1251.14, speedMultiplier: 2, maxAnimationSpeed: MAX_WALK_ANIMATION_SPEED, mirrorSkin: 'hand_mirror', squad: CAVALRY_SQUAD_SLOTS,
    footfallIntervalSec: CAVALRY_GALLOP_PERIOD_SEC / 2, bobPx: 0, ...(tint ? { tint } : {}),
    clips: {
      idle: clip('idle', 1.6, true), move: clip('gallop', CAVALRY_GALLOP_PERIOD_SEC, true, 'trot'), retreat: clip('retreat', 1.2, true, 'gallop'),
      attack: clip('attack_spear', 1.2, false, 'thrust'), hit: clip('hit', 0.8), dodge: clip('dodge', 0.9, false, 'hit'), fall: clip('fall', 1.8, false, 'hit'),
    } };
  soldierCache.set(cacheKey, config);
  return config;
}
/** 兵種（TroopType 的字串值）選素材；連弩手等尚無專屬素材者沿用槍兵／弓兵；騎兵目前只有我方藍色版。 */
export function troopSpineConfig(troop: string, isEnemy = false, tallyTemplateId?: string | null): UnitSpineConfig {
  if (troop === 'cavalry') return isEnemy ? cavalrySpineConfig(true, undefined, CAVALRY_RED_NAME, CAVALRY_RED_MOUNTED_NAME) : cavalrySpineConfig();
  const elite = tallyTemplateId ? ELITE_ART[tallyTemplateId] : undefined;
  const key = elite && elite.troop === troop ? elite.art : SOLDIER_ART[troop] ? troop : 'pikeman';
  const art = SOLDIER_ART[key];
  const name = `soldier_${art.name}_${isEnemy ? 'red' : 'blue'}`;
  const cached = soldierCache.get(name);
  if (cached) return cached;
  const config: UnitSpineConfig = { path: `spine/soldiers/${name}/${name}`, displayScale: 0.18, ...(isEnemy ? { tint: ENEMY_TROOP_TINT } : {}), labelToFoot: 110, footOffset: { x: 4, y: 0 },
    // walkGroundSpeed 由 walk 骨架估算：踩地腳 foot_f 在 0～0.4 秒、foot_n 在 0.4～0.8 秒各向後掃 40 骨架單位，
    // 身體每步前進 40 單位 / 0.4 秒 = 100 單位/秒，與原值相同，不需調整。
    walkGroundSpeed: 100, speedMultiplier: 2, maxAnimationSpeed: MAX_WALK_ANIMATION_SPEED, mirrorSkin: art.bow ? undefined : 'hand_mirror', squad: SOLDIER_SQUAD_SLOTS,
    clips: clips('soldier', art.attack) };
  soldierCache.set(name, config);
  return config;
}
/**
 * 戰前要預載 Spine 的兵種清單（PROG-2-10078）：敵方取 AI 可用兵種池，我方取手牌虎符（含精銳外觀的模板 id）。
 * 相同素材路徑只留一筆，所以兩邊都有的兵種仍會各載自己的藍／紅版本。
 */
export function battleTroopPreloadList(enemyTroops: ReadonlyArray<string>,
  playerCards: ReadonlyArray<{ unitType?: string | null; tacticId?: string | null }>): Array<{ troop: string; isEnemy: boolean; tallyTemplateId: string | null }> {
  const out = new Map<string, { troop: string; isEnemy: boolean; tallyTemplateId: string | null }>();
  const add = (troop: string, isEnemy: boolean, tallyTemplateId: string | null): void => {
    out.set(troopSpineConfig(troop, isEnemy, tallyTemplateId).path, { troop, isEnemy, tallyTemplateId });
  };
  for (const troop of enemyTroops) add(troop, true, null);
  for (const card of playerCards) if (card.unitType) add(card.unitType.trim().toLowerCase(), false, card.tacticId ?? null);
  return Array.from(out.values());
}
/**
 * 兵種素材載不起來時逐層退回：精銳外觀 → 兵種外觀 → 槍兵／弓兵。
 * 原因：兵種專屬素材是私有美術、不進倉庫，沒放素材的環境不能讓單位退回方塊。
 */
export function troopSpineConfigWithFallback(troop: string, isEnemy: boolean, tallyTemplateId: string | null | undefined,
  hasFailed: (path: string) => boolean): UnitSpineConfig {
  // 騎兵：敵方紅騎兵缺檔時退回藍騎兵騎馬骨架染紅（再退無馬版），我方退無馬版；最後才退槍兵，不會退成紅方步矛兵
  const legacyCavalry = troop !== 'cavalry' ? []
    : isEnemy ? [cavalrySpineConfig(true, ENEMY_CAVALRY_TINT), cavalrySpineConfig(false, ENEMY_CAVALRY_TINT)] : [cavalrySpineConfig(false)];
  const candidates = [troopSpineConfig(troop, isEnemy, tallyTemplateId), troopSpineConfig(troop, isEnemy), ...legacyCavalry,
    troopSpineConfig(troop === 'archer' ? 'archer' : 'pikeman', isEnemy)];
  return candidates.find(config => !hasFailed(config.path)) ?? candidates[candidates.length - 1];
}

interface TroopSpineCacheSlot { isEnemy: boolean; template: string | null; failedVersion: number; config: UnitSpineConfig }

/**
 * troopSpineConfigWithFallback 的結果快取（PROG-2-10155）：lateUpdate 每幀每單位都要查，原本每次建 4～6 份設定物件。
 * 兵種／陣營／模板相同且「載不起來的素材數」沒變，後備選擇就不會變，直接回上次的設定物件。
 */
export class TroopSpineConfigCache {
  private readonly byTroop = new Map<string, TroopSpineCacheSlot[]>();

  public get(troop: string, isEnemy: boolean, tallyTemplateId: string | null | undefined, failedVersion: number,
    hasFailed: (path: string) => boolean): UnitSpineConfig {
    const template = tallyTemplateId ?? null;
    let slots = this.byTroop.get(troop);
    if (!slots) { slots = []; this.byTroop.set(troop, slots); }
    for (const slot of slots) {
      if (slot.isEnemy === isEnemy && slot.template === template) {
        if (slot.failedVersion !== failedVersion) {
          slot.config = troopSpineConfigWithFallback(troop, isEnemy, template, hasFailed);
          slot.failedVersion = failedVersion;
        }
        return slot.config;
      }
    }
    const config = troopSpineConfigWithFallback(troop, isEnemy, template, hasFailed);
    slots.push({ isEnemy, template, failedVersion, config });
    return config;
  }
}

/**
 * 小兵依兵種（弓／其餘）與陣營選素材：我方藍、敵方紅，戰場上一眼分得出敵我。
 * 紅色版由藍色圖集換色產生（見 tools_node/battle-chibi/），骨架與動作和藍色版共用。
 */
export function soldierSpineConfig(isArcher: boolean, isEnemy = false): UnitSpineConfig {
  return troopSpineConfig(isArcher ? 'archer' : 'pikeman', isEnemy);
}
