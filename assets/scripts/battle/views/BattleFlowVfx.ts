// @spec-source → 主戰場UI規格書.md (doc_ui_0001)；PROG-2-1429 依建檔紀錄補標出處
import { Vec3 } from "cc";
import { SkillSourceType } from "../../shared/SkillRuntimeContract";

export const BATTLE_FLOW_FX = {
  hitDefault: 'battle_hit_default',
  hitNightRaid: 'battle_hit_night',
  deathBurst: 'battle_death_burst',
  deathSmoke: 'battle_death_vanish',
  forcedMove: 'battle_forced_move',
  skillSeed: 'battle_skill_seed',
  skillUltimate: 'battle_skill_ultimate',
  battleWin: 'battle_win',
  battleLose: 'battle_lose',
  battleDraw: 'battle_draw',
} as const;

/**
 * 單位倒下的漫畫式演出（無血腥）：白煙＋小星星＋衝擊線＋短字樣，小兵與武將皆有，武將較大。
 * 白煙：小兵走既有 battle_death_vanish（BattleUIBridge）；武將另補一團放大的白煙（積木必須有 prefabPath，playBlock 才不會回空）。
 * 星星／衝擊線：AttackVfxPlayer.playDefeat；短字樣：FloatText 'defeat'，文案走 i18n 四語。
 */
export const DEFEAT_VFX = {
  smokeBlock: 'p3d_cfxr_smoke_white',
  generalSmokeScale: 1.5,
  generalSmokeSec: 1.6,
  /** 世界座標往上抬一點，讓星星從單位身體中段冒出而不是腳下 */
  liftWorldY: 0.25,
  textKey: { troop: 'battle.defeat.troop', general: 'battle.defeat.general' },
  /**
   * 11/25 實跑：倒下擬聲字與暴擊傷害數字（-163）、「+20 SP」同時出現在同一點會互蓋。
   * 擬聲字延後 0.15 秒、往側上方（UI 像素）偏移，傷害與 SP 先讀完、擬聲字仍保留原大小與彈出強度。
   */
  textDelaySec: 0.15,
  /** 偏移以「字級倍數」表示（不寫死畫面像素／寬高），日後直式或手機橫式只需調這裡 */
  textOffsetEmX: 1.3,
  textOffsetEmY: 0.8,
} as const;

/** 擬聲字偏移的方向：依單位 id 奇偶左右交錯，兩側同時倒下的單位字不會又疊在一起。純函式。 */
export function defeatTextOffsetOf(unitId: string, fontSize = 44): { x: number; y: number } {
  let h = 0;
  for (let i = 0; i < unitId.length; i++) h = (h * 31 + unitId.charCodeAt(i)) | 0;
  const side = (h & 1) === 0 ? 1 : -1;
  return { x: side * DEFEAT_VFX.textOffsetEmX * fontSize, y: DEFEAT_VFX.textOffsetEmY * fontSize };
}

/** 玩家與敵方的主將化身單位 id 前綴（與 UnitRenderer.isGeneralAvatarUnit 同一規則） */
export function isGeneralAvatarUnitId(unitId: string): boolean {
  return unitId.startsWith('player-general-') || unitId.startsWith('enemy-general-');
}

export function defeatTextKeyOf(isGeneral: boolean): string {
  return isGeneral ? DEFEAT_VFX.textKey.general : DEFEAT_VFX.textKey.troop;
}

/** 量測用（QA 探針讀 globalThis.__DEFEAT_VFX_STATS__）：各演出元件實際播出的次數 */
export const defeatVfxStats = { troop: 0, general: 0, smoke: 0, text: 0, burst: 0 };

export interface BattleFlowEffectSystem {
  getEffectDef(effectKey: string): unknown;
  playFullEffect(effectKey: string, position: Vec3): void;
  playBlock(effectKey: string, position: Vec3, override?: unknown, duration?: number): void;
}

export interface BattleFlowBoardRenderer {
  getCellWorldPosition(lane: number, depth: number, yOffset?: number): Vec3 | null | undefined;
  getBoardMetrics(): { center: Vec3 } | null | undefined;
}

export function resolveBattleUnitHitEffectKey(damageSource?: string): string {
  return damageSource === 'night-raid-opening-strike'
    ? BATTLE_FLOW_FX.hitNightRaid
    : BATTLE_FLOW_FX.hitDefault;
}

/** 武將專屬奧義特效在特效表裡的鍵：`battle_ult_` 加武將代號（連字號換底線），例如 zhang-fei → battle_ult_zhang_fei。 */
export function ultimateEffectKeyOf(generalId: string): string {
  return `battle_ult_${generalId.replace(/-/g, '_')}`;
}

/**
 * 主將技能要播哪個特效。
 * 奧義：特效表（vfx-effects.json）有這位武將的專屬效果就用專屬的，沒有就用通用奧義特效（PROG-2-9372）。
 * 新增武將的專屬奧義特效只要在特效表加一筆 `battle_ult_<代號>`，不用改程式。
 * generalIds 依序比對（名冊範本代號優先，其次武將代號）。
 * Unity 對照：像用角色 ID 去 Addressables 查專屬 prefab，查不到就用預設 prefab。
 */
export function resolveBattleGeneralSkillEffectKey(
  sourceType?: SkillSourceType,
  generalIds: ReadonlyArray<string | null | undefined> = [],
  hasEffect?: (effectKey: string) => boolean,
): string {
  if (sourceType !== SkillSourceType.Ultimate) return BATTLE_FLOW_FX.skillSeed;
  if (hasEffect) {
    for (const id of generalIds) {
      if (!id) continue;
      const key = ultimateEffectKeyOf(id);
      if (hasEffect(key)) return key;
    }
  }
  return BATTLE_FLOW_FX.skillUltimate;
}

export function resolveBattleResultEffectKey(result: string): string | null {
  if (result === 'player-win') return BATTLE_FLOW_FX.battleWin;
  if (result === 'enemy-win') return BATTLE_FLOW_FX.battleLose;
  if (result === 'draw') return BATTLE_FLOW_FX.battleDraw;
  return null;
}

export function playBattleFlowEffectAtCell(
  effectSystem: BattleFlowEffectSystem,
  boardRenderer: BattleFlowBoardRenderer | null | undefined,
  effectKey: string,
  lane: number | null | undefined,
  depth: number | null | undefined,
  duration = 1.0,
  yOffset = 0.08,
): void {
  if (lane === null || lane === undefined || depth === null || depth === undefined) {
    return;
  }

  const position = boardRenderer?.getCellWorldPosition(lane, depth, yOffset);
  if (!position) {
    return;
  }

  if (effectSystem.getEffectDef(effectKey)) {
    effectSystem.playFullEffect(effectKey, position);
    return;
  }

  effectSystem.playBlock(effectKey, position, undefined, duration);
}

export function playBattleFlowEffectAtBoardCenter(
  effectSystem: BattleFlowEffectSystem,
  boardRenderer: BattleFlowBoardRenderer | null | undefined,
  effectKey: string,
  duration = 1.5,
): void {
  const metrics = boardRenderer?.getBoardMetrics();
  if (!metrics) {
    return;
  }

  const center = metrics.center.clone();
  center.y += 0.16;

  if (effectSystem.getEffectDef(effectKey)) {
    effectSystem.playFullEffect(effectKey, center);
    return;
  }

  effectSystem.playBlock(effectKey, center, undefined, duration);
}

/**
 * 主將技能光效：打在施放技能的那位主將身上，玩家看得出是誰放的（PROG-2-9365，使用者裁決）。
 * 以前固定打在棋盤正中央，和施放者沒有關聯。拿不到主將位置時（棋盤還沒建好）退回棋盤中央，光效不漏播。
 */
export function playBattleGeneralSkillEffect(
  effectSystem: BattleFlowEffectSystem,
  boardRenderer: BattleFlowBoardRenderer | null | undefined,
  casterPosition: Vec3 | null | undefined,
  effectKey: string,
  duration = 1.5,
): void {
  if (!casterPosition) {
    playBattleFlowEffectAtBoardCenter(effectSystem, boardRenderer, effectKey, duration);
    return;
  }
  if (effectSystem.getEffectDef(effectKey)) {
    effectSystem.playFullEffect(effectKey, casterPosition);
    return;
  }
  effectSystem.playBlock(effectKey, casterPosition, undefined, duration);
}
