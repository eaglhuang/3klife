// @spec-source → 主戰場UI規格書.md (doc_ui_0001)、武將日誌與離線互動系統.md (doc_spec_0015)；PROG-2-1429 依建檔紀錄補標出處
/**
 * BattleUIBridge.ts — 戰鬥 UI 連結器
 *
 * [P3-R2] 從 BattleScene.ts 抽取的 UI 事件訂閱與 UI 更新職責。
 * BattleScene 作為高層協調器，建立 BattleUIBridge 後透過它訂閱所有遊戲事件並驅動 UI 更新，
 * 不再需要在 BattleScene 中直接實作 700+ 行的 UI 事件處理邏輯。
 *
 * Unity 對照：BattleUIManager (Canvas 根的 Coordinator Component)
 *             + UIEventHandler (純事件轉接，無業務邏輯)
 */

import type { GeneralCaptureRecord } from '../../shared/GeneralCaptureContract';
import { tallyLegendDeploySpec } from '../../core/systems/TallyScripts';
import { battleCellLabel, battleDamageSourceLabel, battleEndLogLine } from '../shared/BattleDamageSourceLabel';
import { formatTallyLine, type TallyTranslate } from '../../core/systems/TallyLineSpec';
import { aptitudeToastPayload } from '../../core/systems/AptitudeDialogue';
import { setBattlePaused, setBattleTimeScale, setEnemyTurnPlayback } from './BattleTimeScale';
import { UltCutinDirector } from './UltCutinDirector';
import { isUltCutinPlaying } from '../../ui/core/UltCutinOverlay';
import { statusEffectFloatText, POISON_STATUS_ID } from '../shared/StatusEffectLabel';
import { ensureBattleUiFeedbackLoaded, getBattleUiFeedback, isPlateFadeTask, planHealSteps, statusFloatWithStacks } from '../shared/BattleUiFeedback';
import { overrideFloatTextStyle } from '../../core/systems/FloatTextStyle';
import { BLOCK_FLOAT_TEXT, shieldHitFeedback, type DamageBlockReason } from '../shared/BlockFeedback';
import { StatusCueThrottle, statusFloatTypeOf, statusMakesTargetFlinch, statusPolarityOf, statusWaveDelaySec } from '../shared/StatusApplyFeedback';
import { salvageSummaryLines } from '../../core/systems/StageSalvageSettlement';
import { AUTO_PLAY_OFF_LINE, AUTO_PLAY_ON_LINE, AUTO_PLAY_SKIP_LINE, AutoPlayState, delegateToggleStopsAutoPlay } from '../../core/systems/AutoPlay';
import { DELEGATE_OFF_LINE, delegateOnLine, FOOD_EMPTY_LINE } from '../../core/systems/SortieDeployScripts';
import { wisdomMeterText, WISDOM_SURGE_LOG } from '../shared/WisdomMeter';
import { strategistHudInputOf } from '../shared/StrategistHudSource';
import { selfBurstNoticeText, type SelfBurstChangedEvent } from '../shared/SelfBurstWindow';
import { teamAuraNoticeText, type TeamAuraChangedEvent } from '../shared/TeamAura';
import { teamRecoverNoticeText, type TeamRecoveredEvent } from '../shared/TeamRecover';
import { enemyMassDebuffNoticeText, type EnemyMassDebuffChangedEvent } from '../shared/EnemyMassDebuff';
import { AWAKENING_FREEZE_TIMING, awakeningFreezeTitles, formatAwakeningReveal } from './AwakeningReveal';
import { discoveryPhaseUnlockLines } from '../../core/systems/DiscoveryProgress';
import { factorAwakeningLines } from '../../core/systems/FactorAwakening';
import { UCUFLogger, LogCategory } from "../../core/utils/UCUFLogger";
import { awaitWithTimeout } from "../../core/utils/AwaitGuard";
import type { TeachingSpiritInput } from '../../core/systems/TeachingSpiritTalisman';
import { Color, Component, EventKeyboard, EventMouse, EventTouch, Input, KeyCode, Node, input } from 'cc';
import { EVENT_NAMES, Faction, SP_PER_KILL, TroopType, TurnPhase } from '../../core/config/Constants';
import { battleAptitudeProfileOf, terrainGradeOf } from '../../core/systems/BattleAptitude';
import { TerrainFeedbackTracker } from '../../core/systems/TerrainAptitudeFeedback';
import { TERRAIN_LABEL } from '../../ui/core/EnvScoutPresenter';
import { finalizeQuickResolve, quickResolveOutcome } from '../runtime/BattleAutoResolve';
import { deployedTroopsOf, quickResolveConfig, resolveEnemyReserve, type QuickResolveStage } from '../../core/systems/QuickResolveGate';
import { FIELD_AUTO_BATTLE_JOURNAL } from '../../core/systems/OfflineBattleSnapshot';
import { services } from '../../core/managers/ServiceLoader';
import { BattlePerformanceTracker, formatPerformance } from '../../core/systems/BattleRecordStats';
import type { DuelOutcomeRecord } from '../../core/systems/DuelAftermath';
import { milestoneAnnouncementLines } from '../../core/systems/BattleMilestoneScripts';
import { formatSortieSummary, isSortiePoolExhausted, SORTIE_POOL_EXHAUSTED_LINE } from '../../core/systems/SortieDeploy';
import { powOptionLabels } from '../../core/systems/PrisonerOfWar';
import { cellarProtectionText } from '../../ui/core/DailySubsidyNotice';
import { generalNameMapOf, relationEventLogLine } from '../../ui/core/RelationEventLogText';
import type { RelationEventHit } from '../../core/systems/RelationEvents';
import { buildTacticSummary, loadGeneralConfig, loadLoadoutCheck } from './BattleSceneLoader';
import { loadoutCheckLogLine } from '../../core/systems/LoadoutCheck';
import { buildTacticAvailability } from '../../ui/core/TacticAvailabilityPresenter';
import { resolveBattleSkillProfile } from '../skills/BattleSkillProfiles';
import { GeneralUnit } from '../../core/models/GeneralUnit';
import { BattleController } from '../controllers/BattleController';
import { playTurnBannerOn } from './TurnBannerPresenter';
import { BATTLE_RESULT_BEAT, battleResultBannerOf, shouldHoldBeforeResult } from '../shared/BattleResultBeat';
import type { BattleResult } from '../BattleTypes';
import { BattleSpecialActionTracker, specialActionDisplayName, toUnitHitObservation, type UnitDamagedPayload } from '../../core/systems/BattleSpecialActions';
import { strategistHudViewOf } from '../shared/StrategistHudView';
import { salvageLootTexts, tacticFlashOf, TACTIC_FLASH_TIMING, TACTIC_GRID_VFX_BLOCKS, tacticGridVfxStats, type TacticGridHookKind } from '../shared/TacticVfxHooks';
import type { StageSalvageGainedEvent } from '../shared/StageSalvage';
import { salvageGainItems } from '../../core/systems/StrategistHud';
import { IBattleHUDLike, IBattleLogLike, IDuelChallengeLike, IResultPopupLike, IDeployRuntimeLike, IBattleScenePanelLike, IStrategistHudLike } from '../../shared/interfaces/IBattleUIComponents';

import { isHeavyHit, BATTLE_TURN_FLOW_TIMING, BATTLE_VISUAL_TIMING } from './BattlePresentationTiming';
import { ATTACK_IMPACT_SEC } from '../shared/AttackShotStyle';
import { attackStyleFor } from '../shared/AttackStyle';
import { generalWeaponOf } from './AttackVfxPlayer';
import { buildBattleSkillUsedMessage, getBattleSkillPresentation } from '../../shared/BattleSkillPresentation';
import { quickViewSkillLines } from '../../shared/QuickViewSkillLines';
import { SkillSourceType } from '../../shared/SkillRuntimeContract';
import { planSkillCast } from '../shared/SkillCastPresentation';
import { tileBuffBadgeOf, tileBuffDeltaText, tileBuffPickupIsDebuff, tileBuffPickupLogLine, tileBuffSourceFromDelta } from '../shared/TileBuffBadge';
import { SkillNameBanner } from './SkillNameBanner';
import { selectDuelExchanges } from '../shared/DuelPresentationCore';
import { timeUpVerdictLine, type TimeUpVerdict } from "../../core/systems/TimeUpJudgement";
import { defeatAdviceLabel, defeatDiagnosisLines, diagnoseDefeat, queueBattleTip, type DefeatReason } from "../../core/systems/DefeatDiagnosis";
import {
  BATTLE_FLOW_FX,
  playBattleFlowEffectAtBoardCenter,
  playBattleGeneralSkillEffect,
  playBattleFlowEffectAtCell,
  resolveBattleGeneralSkillEffectKey,
  resolveBattleResultEffectKey,
  resolveBattleUnitHitEffectKey,
} from './BattleFlowVfx';
import {
  BATTLE_AUDIO_CUE,
  playBattleAudio,
  playBattleClip,
  battleAudioLayers,
  ensureAudioLayersConfig,
  SKILL_CAST_SFX,
  resolveBattleGeneralAttackSfxKey,
  resolveBattleGeneralHitSfxKey,
  resolveBattleUnitAttackSfxKey,
  resolveBattleUnitHitSfxKey,
  resolveBattleDotTickSfx,
  DotTickSfxThrottle,
  type BattleAudioCue,
  type DotTickSfx,
} from '../shared/BattleAudio';
import { attackSfxDelaySec, pickHitSfx, resolveHitTier, shouldPlayCritBoom, type HitTier } from '../shared/BattleAudioLayers';

// ── 型別補充 ─────────────────────────────────────────────────────────────────
// boardRenderer / unitRenderer 使用 any 以解耦 3D 渲染模組（可後續換強型別）
type BoardRenderer  = any;
type UnitRenderer   = any;

interface CombatVisualTask {
  id: number;
  label: string;
  run: () => Promise<void> | void;
}

// 介面已搬移至 shared/interfaces/IBattleUIComponents.ts

// ─────────────────────────────────────────────────────────────────────────────
// 共享可變 Context：BattleScene 建立、Bridge 與 TurnFlowManager 共同讀寫
// ─────────────────────────────────────────────────────────────────────────────

export interface BattleSceneContext {
  hud:               IBattleHUDLike | null;
  deployRuntime:     IDeployRuntimeLike | null;
  battleLogPanel:    IBattleLogLike | null;
  strategistHud:     IStrategistHudLike | null;
  battleScenePanel:  IBattleScenePanelLike | null;
  boardRenderer:     BoardRenderer | null;
  unitRenderer:      UnitRenderer | null;
  resultPopup:       IResultPopupLike | null;
  duelChallengePanel: IDuelChallengeLike | null;
  ctrl:              BattleController | null;
  pg:                GeneralUnit | null;
  eg:                GeneralUnit | null;
  /** 本場的關卡 id（連環破，勝利時記入通關紀錄） */
  encounterId:       string | null;
  /** 本場關卡的極速決戰條件資料（battleKind、allowQuickResolve；PROG-2-9709）；關卡資料讀不到時為 null */
  encounterStage?:   QuickResolveStage | null;
  /** 教學戰的傳說英靈（OPEN-13）；沒有時為 null */
  teachingSpirit:    TeachingSpiritInput | null;
  isAdvancingTurn:   boolean;
  isDuelPanelActive: boolean;
  /** 奧義 cut-in 演出中（含載入）；回合推進與安全解鎖計時都要等它（PROG-2-9352），由 Bridge 保證一定會放掉 */
  isUltCutinActive?: boolean;
  combatVisualQueue: CombatVisualTask[];
  isDrainingCombatVisual: boolean;
  combatVisualTaskId: number;
  skillTargetingFlow?: {
    isPending: boolean;
    beginPlayerSkillFlow(skillId: string, sourceType: SkillSourceType, sourceLabel: string, ultimateId?: string): void;
    handleSkillTargetClick(screenX: number, screenY: number): void;
    cancelPendingSkillTargeting(showToast: boolean): void;
  } | null;
  raycastBoardCell?: ((screenX: number, screenY: number) => { lane: number; depth: number } | null) | null;
  /**
   * 3D 主攝影機（setupCameraForBoard 後設置）。
   * 用 any 避免在 Bridge 裡 import Camera 模組，也防止 Cocos minifier
   * 混淆 BattleScene 私有方法名稱導致射線偵測靜默失敗。
   */
  boardCamera: any | null;
}

/** 建立空白的 BattleSceneContext（BattleScene 在 start() 前使用） */
export function createBattleSceneContext(): BattleSceneContext {
  return {
    hud: null, deployRuntime: null, battleLogPanel: null,
    battleScenePanel: null, strategistHud: null, boardRenderer: null, unitRenderer: null,
    resultPopup: null, duelChallengePanel: null,
    ctrl: null, pg: null, eg: null, encounterId: null, teachingSpirit: null,
    isAdvancingTurn: false, isDuelPanelActive: false,
    combatVisualQueue: [], isDrainingCombatVisual: false,
    combatVisualTaskId: 0,
    boardCamera: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

/** 主動撤退時戰報與 Toast 的共用文字（PROG-2-9300）：讓玩家知道是自己退，不是被打垮 */
export const RETREAT_LOG_LINE = '我軍鳴金收兵，撤出戰場';

/** 沒有交鋒動畫時，逐招跳傷害的總時間上限（秒）與單招間隔上下限 */
const DUEL_FALLBACK_TOTAL_SECONDS = 2.4;
const DUEL_FALLBACK_MAX_GAP_SECONDS = 0.4;
const DUEL_FALLBACK_MIN_GAP_SECONDS = 0.06;
/** 最後一招後停一下再出結算，讓玩家看到最後的血量 */
const DUEL_FALLBACK_END_HOLD_SECONDS = 0.5;

/** 逐招間隔：招數少時每招 0.4 秒，招數多時壓縮到總長約 2.4 秒 */
export function duelHitGapSeconds(hitCount: number): number {
  if (hitCount <= 1) return 0;
  return Math.max(DUEL_FALLBACK_MIN_GAP_SECONDS, Math.min(DUEL_FALLBACK_MAX_GAP_SECONDS, DUEL_FALLBACK_TOTAL_SECONDS / hitCount));
}

export class BattleUIBridge {
  private duelCapture: {
    hits: Array<{ faction: Faction; hp: number; damage?: number; attackerId?: string | null; isCrit?: boolean; wasDodged?: boolean }>;
    deaths: Array<{ unitId: string; lane: number; depth: number; faction: Faction; type: TroopType }>;
    ended: { result: string; retreated?: boolean; timeUp?: boolean; cause?: string } | null;
    /** 單挑結算當下發出的戰報提示：等逐招紀錄寫完才寫，順序才對（PROG-2-9389） */
    notices: string[];
  } | null = null;
  /** 已寫進戰鬥紀錄的智謀觸發次數（PROG-2-1577） */
  private _wisdomTriggersLogged = 0;
  /** 上一次寫進日誌的軍師摘要（PROG-2-1744），內容沒變就不重寫 */
  private _lastStrategistLine = '';
  private _foodEmptyLogged = false;
  /** 推薦戰法檢核（PROG-2-1763）：每個關卡只查一次；缺口帶進軍師 HUD 的對策缺口欄 */
  private _loadoutCheckedFor: string | null = null;
  private _loadoutGaps: string[] = [];
  private _lastEndedPayload: { result: string; retreated?: boolean; cause?: string } | null = null;
  /** 戰敗敗因診斷用的整場統計（PROG-2-9712）；每場結算後歸零，重打從頭算 */
  private _defeatStats = BattleUIBridge._emptyDefeatStats();
  /** 這次結算窗「下一步建議」對應的敗因 */
  private _defeatAdvice: DefeatReason | null = null;
  /** 本場是否已提示過「剛部署的部隊下回合才行動」（PROG-2-9302，只提示一次避免洗版） */
  private _deployNextTurnHintShown = false;
  private readonly unsubs: (() => void)[] = [];
  /** 本場我方的戰場特定動作（騎兵衝鋒、背刺…），戰後交給覺醒判定 */
  private readonly specialActions = new BattleSpecialActionTracker();
  /** 我方主將帶隊的單場表現（擊殺 / 傷害 / 承傷 / 治療），戰後寫進戰績（PROG-2-0072） */
  private readonly performance = new BattlePerformanceTracker(Faction.Player);
  /** 本場收到的單挑勝負事件，戰後交給 recordBattle 結算名聲與斬將傳承（PROG-2-9132） */
  private duelOutcomes: DuelOutcomeRecord[] = [];
  /** 本場主將被擒的紀錄，戰後交給 recordBattle 走君主處置（PROG-2-9393） */
  private generalCaptures: GeneralCaptureRecord[] = [];
  private readonly terrainFeedback = new TerrainFeedbackTracker();
  private onBoardPlacement: ((screenX: number, screenY: number) => void) | null = null;
  /** 自動代打剛開啟時通知回合流程排程第一次結束回合（PROG-2-9707） */
  private onAutoPlayStarted: (() => void) | null = null;
  /** 自動鈕的自動代打狀態（PROG-2-9707） */
  private readonly autoPlay = new AutoPlayState();
  /** 奧義漫畫分鏡 cut-in（Issue #2139）：一場戰鬥一個，「第二次施放走重播」以單場為界 */
  private readonly ultCutin = new UltCutinDirector();
  /** 一招打到多個目標時，同一聲只播一次（PROG-2-9435） */
  private readonly statusCueThrottle = new StatusCueThrottle();
  /** 回合扣血 tick 每單位節流（PROG-2-9862）：同一回合火格＋中毒不疊兩聲 */
  private readonly dotTickSfxThrottle = new DotTickSfxThrottle();
  /** PROG-2-9410：放招時畫面中央的招式名橫幅（排隊／合併見 SkillBannerQueue） */
  /** 勝敗停頓計時與待開的結算窗（PROG-2-9427） */
  private _resultBeatTimer: ReturnType<typeof setTimeout> | null = null;
  private _pendingResultShow: (() => void) | null = null;
  private readonly skillBanner = new SkillNameBanner(() => {
    const hud = this.ctx.hud?.node;
    return hud?.isValid ? (hud.parent?.isValid ? hud.parent : hud) : null;
  });

  /** 結算仍同步執行；只延後其視覺事件與戰後畫面，直到單挑演出結束。 */
  public async resolveDuelPresentation(challenger: Faction, accepted: boolean): Promise<string> {
    const ctrl = this.ctx.ctrl;
    if (!ctrl) return '';
    if (!accepted) return ctrl.resolveDuelChallenge(challenger, false);
    const capture = { hits: [] as NonNullable<BattleUIBridge['duelCapture']>['hits'],
      deaths: [] as NonNullable<BattleUIBridge['duelCapture']>['deaths'], ended: null as { result: string; retreated?: boolean } | null,
      notices: [] as string[] };
    this.duelCapture = capture;
    let result: string;
    try { result = ctrl.resolveDuelChallenge(challenger, true); }
    finally { this.duelCapture = null; }
    const playerDead = (ctrl.state.getGeneral(Faction.Player)?.currentHp ?? 1) <= 0;
    const enemyDead = (ctrl.state.getGeneral(Faction.Enemy)?.currentHp ?? 1) <= 0;
    // 教學戰的單挑不打死：沒有人倒下時改看流程記下的勝方
    const duelWinner = ctrl.getLastDuelWinner?.() ?? null;
    const winner: 0 | 1 | null = playerDead !== enemyDead ? (playerDead ? 1 : 0)
      : duelWinner === Faction.Player ? 0 : duelWinner === Faction.Enemy ? 1 : null;
    const exchanges = selectDuelExchanges(capture.hits.map(hit => ({ attacker: (hit.faction === Faction.Player ? 1 : 0) as 0 | 1, dodged: !!hit.wasDodged })));
    let played: unknown;
    // 演出有真實時間上限（PROG-2-9404）：Spine 載入或交鋒動畫沒回來時強制收尾，改走逐招跳傷害，
    // 單挑旗標（isDuelPanelActive）才會放掉，回合推進與結果彈窗才不會被單挑卡住。
    try {
      played = await awaitWithTimeout<unknown>(this.ctx.unitRenderer?.playDuelPresentation?.(winner, playerDead || enemyDead, exchanges) ?? Promise.resolve(),
        BATTLE_VISUAL_TIMING.duelPresentationMaxMs, false,
        { label: 'duel-presentation', onFail: () => this.ctx.unitRenderer?.abortDuelPresentation?.() });
    }
    catch (error) { UCUFLogger.error(LogCategory.BATTLE, '[BattleUIBridge] 單挑演出失敗', error); }
    if (!this.scene.isValid) return result;
    // 任一方主將沒有交鋒動畫時（明確回 false），改成一招一招跳傷害，不要按下接受就直接跳結算
    const gap = played === false && capture.hits.length > 1 ? duelHitGapSeconds(capture.hits.length) : 0;
    for (let i = 0; i < capture.hits.length; i++) {
      if (gap > 0 && i > 0) {
        await new Promise<void>(resolve => this.scene.scheduleOnce(resolve, gap));
        if (!this.scene.isValid) return result;
      }
      this.commitDuelDamage(capture.hits[i]);
    }
    if (gap > 0) {
      await new Promise<void>(resolve => this.scene.scheduleOnce(resolve, DUEL_FALLBACK_END_HOLD_SECONDS));
      if (!this.scene.isValid) return result;
    }
    for (const line of capture.notices) this.appendLog(line);
    for (const death of capture.deaths) this._onUnitDied(death);
    if (capture.ended) this._onBattleEnded(capture.ended);
    return result;
  }

  private commitDuelDamage(data: NonNullable<BattleUIBridge['duelCapture']>['hits'][number]): void {
    const target = data.faction === Faction.Player ? '我方主將' : '敵方主將';
    const maxHp = this.ctx.ctrl?.state.getGeneral(data.faction)?.maxHp ?? 0;
    if (!data.wasDodged) this.performance.observeGeneralDamaged(data.damage ?? 0, data.faction);
    this.specialActions.observeGeneralHp({ faction: data.faction, hp: data.hp, maxHp });
    this.appendLog(data.wasDodged ? `${target} 閃躲攻擊！` : `${target} ${data.isCrit ? '《暴擊》 ' : ''}受到攻擊，剩餘生命 ${Math.max(0, data.hp)}`);
    services().event.emit(EVENT_NAMES.GeneralDamagedVisualCommitted, { faction: data.faction, hp: data.hp, maxHp });
  }

  constructor(
    private readonly ctx: BattleSceneContext,
    /** 用於 scheduleOnce，需傳入 BattleScene Component 本身 */
    private readonly scene: Component,
  ) {}

  // ── 事件訂閱 ─────────────────────────────────────────────────────────────

  /**
   * 訂閱所有全局遊戲事件並更新 UI。
   * @param externalHandlers 由 TurnFlowManager 提供的回合/部署處理器
   */
  public subscribeEvents(externalHandlers: {
    onEndTurn:      () => void;
    onPlayerDeployed: () => void;
    onTactics:      () => void;
    onGeneralDuelRequest: () => void;
    onBoardPlacement?: (screenX: number, screenY: number) => void;
    onReplay:       () => void;
    onBack?:        () => void;
    /** 自動代打剛開啟：由回合流程排程第一次自動結束回合（PROG-2-9707） */
    onAutoPlayStarted?: () => void;
  }): void {
    this.ctx.boardRenderer?.setZocGeneralResolver((unitId: string) => {
      const ctrl = this.ctx.ctrl;
      return !!ctrl && (unitId === ctrl.playerGeneralUnitId || unitId === ctrl.enemyGeneralUnitId);
    });
    this.unsubscribeEvents();
    this.onBoardPlacement = externalHandlers.onBoardPlacement ?? null;
    this.onAutoPlayStarted = externalHandlers.onAutoPlayStarted ?? null;
    this.autoPlay.stop();
    this.specialActions.reset();
    this.performance.reset();
    this.duelOutcomes = [];
    this.generalCaptures = [];
    this.ultCutin.resetBattle();
    this.skillBanner.destroy();
    this.ultCutin.prefetch(this.ctx.pg?.id);
    this.ultCutin.prefetch(this.ctx.eg?.id);
    const svc = services();
    const c = this.ctx;
    const actionCommandNode = (c.battleScenePanel?.actionCommandComposite ?? c.battleScenePanel?.actionCommandPanel)?.node ?? null;
    // 指令區用 { faction } 發出玩家出陣請求；已結算的單挑事件使用 challengerFaction，不能再觸發出陣。
    this.unsubs.push(svc.event.on(EVENT_NAMES.GeneralDuelChallenge, (request: { faction?: Faction }) => {
      if (request?.faction === Faction.Player) externalHandlers.onGeneralDuelRequest();
    }));
    const bindNodeEvent = (node: Node | null | undefined, eventName: string, handler: (...args: any[]) => void): void => {
      if (!node) return;
      node.on(eventName, handler, this.scene);
      this.unsubs.push(() => node.off(eventName, handler, this.scene));
    };

    // PROG-2-9731：戰場 UI 演出調校表（名牌淡出、角標、奧義暫代大字、毒、治療時序）；毒字樣式一併套用
    ensureBattleUiFeedbackLoaded(() => svc.resource.loadJson<unknown>('data/battle-ui-feedback', { tags: ['battle'] }), (cfg) => {
      const f = cfg.poisonHit.float;
      overrideFloatTextStyle('poison', {
        color: { r: f.color[0], g: f.color[1], b: f.color[2], a: f.color[3] },
        outlineColor: { r: f.outlineColor[0], g: f.outlineColor[1], b: f.outlineColor[2], a: f.outlineColor[3] },
        fontSize: f.fontSize, durationMs: f.durationMs,
      });
    });

    this.unsubs.push(
      svc.event.on(EVENT_NAMES.TurnPhaseChanged,        this._onTurnPhaseChanged.bind(this)),
      svc.event.on(EVENT_NAMES.UnitDeployed,            this._onUnitDeployed.bind(this)),
      svc.event.on(EVENT_NAMES.UnitDamaged,             this._onUnitDamaged.bind(this)),
      svc.event.on(EVENT_NAMES.UnitAttackMissed,        this._onUnitAttackMissed.bind(this)),
      svc.event.on(EVENT_NAMES.UnitDamageBlocked,       this._onUnitDamageBlocked.bind(this)),
      svc.event.on(EVENT_NAMES.KinComboAttack,          this._onKinComboAttack.bind(this)),
      svc.event.on(EVENT_NAMES.RelationEventTriggered,  this._onRelationEventTriggered.bind(this)),
      svc.event.on(EVENT_NAMES.LastSpurtEntered,        this._onLastSpurtEntered.bind(this)),
      svc.event.on(EVENT_NAMES.StaminaExhausted,        this._onStaminaExhausted.bind(this)),
      svc.event.on(EVENT_NAMES.UnitHealed,              this._onUnitHealed.bind(this)),
      svc.event.on(EVENT_NAMES.UnitMoved,               this._onUnitMoved.bind(this)),
      svc.event.on(EVENT_NAMES.UnitDied,                this._onUnitDied.bind(this)),
      svc.event.on(EVENT_NAMES.GeneralDamaged,          this._onGeneralDamaged.bind(this)),
      svc.event.on(EVENT_NAMES.GeneralSkillUsed,        this._onGeneralSkillUsed.bind(this)),
      svc.event.on(EVENT_NAMES.GeneralSkillUsed,        this._noteEnemySkillRevealed.bind(this)),
      svc.event.on(EVENT_NAMES.TacticGridVfx,           this._onTacticGridVfx.bind(this)),
      svc.event.on(EVENT_NAMES.SelfBurstChanged,        this._onSelfBurstChanged.bind(this)),
      svc.event.on(EVENT_NAMES.StageSalvageGained, this._onStageSalvageGained.bind(this)),
      svc.event.on(EVENT_NAMES.TeamAuraChanged,         this._onTeamAuraChanged.bind(this)),
      svc.event.on(EVENT_NAMES.TeamRecovered,           this._onTeamRecovered.bind(this)),
      svc.event.on(EVENT_NAMES.MassDebuffChanged,       this._onMassDebuffChanged.bind(this)),
      svc.event.on(EVENT_NAMES.TileBuffSpawned,         this._onTileBuffSpawned.bind(this)),
      svc.event.on(EVENT_NAMES.TileBuffConsumed,        this._onTileBuffConsumed.bind(this)),
      svc.event.on(EVENT_NAMES.BattleEnded,             this._onBattleEnded.bind(this)),
      svc.event.on(EVENT_NAMES.DuelOutcomeApplied,      (e: DuelOutcomeRecord) => { this.duelOutcomes.push(e); }),
      svc.event.on(EVENT_NAMES.GeneralCaptured,         (e: GeneralCaptureRecord) => { this.generalCaptures.push(this.ctx.encounterId ? { ...e, encounterId: this.ctx.encounterId } : e); }),
      svc.event.on(EVENT_NAMES.TallyDeployed,           this._onTallyDeployed.bind(this)),
      svc.event.on(EVENT_NAMES.BattleSkillNotice,       (line: string) => { if (this.duelCapture) this.duelCapture.notices.push(line); else this.appendLog(line); }),
      svc.event.on(EVENT_NAMES.TroopCounterLine,        (line: string) => { this.appendLog(line); }),
      svc.event.on(EVENT_NAMES.AptitudeDialogue,        this._onAptitudeDialogue.bind(this)),
      svc.event.on(EVENT_NAMES.ShowToast,               this._onShowToast.bind(this)),
      // 工兵攻城（PROG-2-1868）：堡壘血量原本只在除錯面板看得到，受損時寫進戰報
      svc.event.on(EVENT_NAMES.FortressDamaged,         this._onFortressDamaged.bind(this)),
      // Buff/Debuff 飄字（主戰場UI規格書 §3.2，PROG-2-1869）
      svc.event.on(EVENT_NAMES.BuffApplied,             this._onBuffApplied.bind(this)),
      // 控制列 x2（PROG-2-1867）：整個戰場畫面加速，離開戰場時在 unsubscribeEvents 還原
      svc.event.on(EVENT_NAMES.BattleSpeedToggled,      (speed: number) => setBattleTimeScale(speed)),
      svc.event.on(EVENT_NAMES.AutoBattleToggled,       this._onAutoBattleToggled.bind(this)),
      svc.event.on(EVENT_NAMES.RetreatRequested,        this._onRetreatRequested.bind(this)),
      svc.event.on(EVENT_NAMES.DelegateToggled,         this._onDelegateToggled.bind(this)),
      svc.event.on(EVENT_NAMES.RequestGeneralQuickView, this._onRequestGeneralQuickView.bind(this)),
      svc.event.on(EVENT_NAMES.UltimateSkillSelected,   this._onUltimateSkillSelected.bind(this)),
    );

    // 節點事件：由 TurnFlowManager 回呼轉接
    bindNodeEvent(c.deployRuntime?.node, 'endTurn', externalHandlers.onEndTurn);
    bindNodeEvent(c.deployRuntime?.node, 'playerDeployed', externalHandlers.onPlayerDeployed);
    bindNodeEvent(c.battleLogPanel?.node, 'endTurn', externalHandlers.onEndTurn);
    bindNodeEvent(c.battleLogPanel?.node, 'tactics', externalHandlers.onTactics);
    bindNodeEvent(actionCommandNode, 'endTurn', externalHandlers.onEndTurn);
    bindNodeEvent(actionCommandNode, 'tactics', externalHandlers.onTactics);
    bindNodeEvent(c.resultPopup?.node, 'replay', externalHandlers.onReplay);
    // 下一步建議（PROG-2-9712）：打法問題就帶著軍師提醒再戰；實力差距就回大廳整備
    bindNodeEvent(c.resultPopup?.node, 'advice', () => {
      const advice = this._defeatAdvice;
      this._defeatAdvice = null;
      if (advice?.advice === 'prepare' && externalHandlers.onBack) { externalHandlers.onBack(); return; }
      if (advice) queueBattleTip(advice.tip);
      externalHandlers.onReplay();
    });
    if (externalHandlers.onBack) bindNodeEvent(c.resultPopup?.node, 'back', externalHandlers.onBack);
    bindNodeEvent(c.deployRuntime?.node, 'generalDuel', externalHandlers.onGeneralDuelRequest);
    input.on(Input.EventType.TOUCH_END, this._onGlobalBoardTouchEnd, this);
    this.unsubs.push(() => input.off(Input.EventType.TOUCH_END, this._onGlobalBoardTouchEnd, this));
    input.on(Input.EventType.MOUSE_UP, this._onGlobalBoardMouseUp, this);
    this.unsubs.push(() => input.off(Input.EventType.MOUSE_UP, this._onGlobalBoardMouseUp, this));
    input.on(Input.EventType.KEY_UP, this._onGlobalKeyUp, this);
    this.unsubs.push(() => input.off(Input.EventType.KEY_UP, this._onGlobalKeyUp, this));
  }

  public unsubscribeEvents(): void {
    // 離開戰場時勝敗停頓還沒走完：不再開結算窗（PROG-2-9427）
    this._cancelResultBeat();
    setBattlePaused(false);
    setEnemyTurnPlayback(false);
    setBattleTimeScale(1);
    this.unsubs.forEach(fn => fn());
    this.unsubs.length = 0;
    this.onBoardPlacement = null;
  }

  // ── 公開 UI 更新 API（供 TurnFlowManager 呼叫）────────────────────────────

  /**
   * 計謀鈕的可用狀態與原因（PROG-2-0408／9333）：Presenter 判定，這裡只套用。
   * BattleScene 的視圖刷新也呼叫這裡，避免它用「只看計謀點」的舊判斷把「待風」等條件蓋回成可按。
   */
  public refreshTacticSummary(): void {
    const c = this.ctx;
    if (!c.ctrl) return;
    const state = c.ctrl.state;
    if (state.playerGeneral) {
      // 戰法按鈕可用狀態與原因（PROG-2-0408）：Presenter 判定，這裡只套用
      const pg = state.playerGeneral;
      const summary = buildTacticSummary(pg).label;
      const tacticPoints = c.ctrl.getPlayerTacticPointState();
      const descriptor = c.ctrl.getPlayerSeedTacticDescriptor();
      const [availability] = buildTacticAvailability(
        descriptor ? [{ id: descriptor.skillId, label: summary, tags: resolveBattleSkillProfile(descriptor.skillId)?.tags ?? [], unmetCondition: c.ctrl.getPlayerSeedTacticUnmetCondition() }] : [],
        { weather: state.weather, tacticPointEnabled: tacticPoints.enabled, generalCanUseSkill: pg.canUseSkill() || !c.ctrl.seedTacticNeedsSp() },
      );
      c.battleScenePanel?.setTacticSummary(
        summary,
        { ...tacticPoints, enabled: availability?.enabled ?? tacticPoints.enabled },
        availability?.reason ?? null,
        availability?.shortReason,
      );
      // 主將已經在棋盤上時寫「已出陣」，不寫「鎖定」，免得玩家以為功能被關掉（PROG-2-9331）
      const duelBlock = c.ctrl.generalDuelBlockReason();
      c.battleScenePanel?.setDuelLocked?.(duelBlock !== null, duelBlock === 'already-deployed' ? '已出陣' : undefined);
    }
  }

  public refreshBattleViews(): void {
    const c = this.ctx;
    if (!c.ctrl) return;
    const state = c.ctrl.state;
    this.refreshTacticSummary();
    // 棋盤格狀態與兵種渲染（對應原 BattleScene.refreshBattleViews）
    c.boardRenderer?.renderState(state);
    c.unitRenderer?.renderState(state);
    // 更新 deploy runtime 的技能可發動狀態
    const pg = state.playerGeneral;
    if (pg) services().event.emit(EVENT_NAMES.GeneralSpChanged, { faction: Faction.Player, sp: pg.currentSp, maxSp: pg.maxSp });
    if (pg && c.deployRuntime) {
      c.deployRuntime.updateSkillStatus(pg.canUseSkill() && c.ctrl.canUsePlayerSkills());
    }
  }

  public playTurnBanner(faction: Faction): void {
    playTurnBannerOn(this.ctx.deployRuntime, faction);
    // 回合切換音效（PROG-2-9357）：換邊時才有橫幅，音效跟著橫幅走，我方／敵方各一聲
    playBattleAudio(faction === Faction.Player ? BATTLE_AUDIO_CUE.turnPlayerStart : BATTLE_AUDIO_CUE.turnEnemyStart, 0.6);
  }

  public appendLog(text: string): void {
    if (this.ctx.battleScenePanel) {
      this.ctx.battleScenePanel.appendLog(text);
      return;
    }
    this.ctx.battleLogPanel?.append(text);
  }

  /** 敵方回合「敵軍行動中…」提示（doc_ui_0001 §4.5，PROG-2-1891）：從敵方回合開始顯示到我方回合開始 */
  public showEnemyThinkingPanel(): void {
    this.ctx.deployRuntime?.setEnemyThinkingVisible?.(true);
  }

  public hideEnemyThinkingPanel(): void {
    this.ctx.deployRuntime?.setEnemyThinkingVisible?.(false);
  }

  private _scheduleBattleAudio(cue: BattleAudioCue, delaySec = 0): Promise<void> {
    return new Promise((resolve) => {
      if (delaySec <= 0) {
        playBattleAudio(cue);
        resolve();
        return;
      }

      this.scene.scheduleOnce(() => {
        playBattleAudio(cue);
        resolve();
      }, delaySec);
    });
  }

  /**
   * 受擊音效＋受擊特效。delaySec 預設沿用 recoilStartDelaySec（舊路徑：等攻擊方撞過來）；
   * PROG-2-9412 命中路徑已經等到命中瞬間才呼叫，傳 0 不再多等。
   */
  private _scheduleBattleUnitHitFeedback(lane: number, depth: number, damageSource?: string, delaySec: number = BATTLE_VISUAL_TIMING.recoilStartDelaySec, hitTier?: HitTier, dotTickSfx?: DotTickSfx | 'none'): Promise<void> {
    const hitAudioKey = resolveBattleUnitHitSfxKey(damageSource);
    // PROG-2-9729：夜襲先機打擊維持雷聲；其餘依輕／重／擋下／致命分層挑變調 clip 與隨機音量
    // PROG-2-9862：回合扣血 tick（dotTickSfx 有值）不走分層受擊音；'none' 代表同回合已響過，整段靜音
    const layered = !dotTickSfx && hitTier && hitAudioKey === BATTLE_AUDIO_CUE.unitHitCommon ? pickHitSfx(hitTier, battleAudioLayers) : null;
    const hitEffectKey = resolveBattleUnitHitEffectKey(damageSource);
    const play = () => {
      if (dotTickSfx === 'none') { /* 同回合同單位已響過 DOT tick */ }
      else if (dotTickSfx) playBattleAudio(dotTickSfx.cue, dotTickSfx.volume);
      else if (layered) playBattleClip(layered.clip, layered.volume);
      else playBattleAudio(hitAudioKey);
      playBattleFlowEffectAtCell(services().effect, this.ctx.boardRenderer, hitEffectKey, lane, depth, 0.9, 0.12);
    };

    return new Promise((resolve) => {
      if (delaySec <= 0) { play(); resolve(); return; }
      this.scene.scheduleOnce(() => { play(); resolve(); }, delaySec);
    });
  }


  // ── 私有事件處理（對應 BattleScene 原有 on* 方法）─────────────────────────

  /** 推薦戰法三態檢核（關卡設計 §D-3，PROG-2-1763）：寫一行戰場日誌，缺口留給之後回合的軍師 HUD */
  private async _runLoadoutCheck(encounterId: string, tacticIds: string[]): Promise<void> {
    const result = await loadLoadoutCheck(encounterId, tacticIds);
    if (!result || this._loadoutCheckedFor !== encounterId) return;
    this._loadoutGaps = result.gaps;
    this.appendLog(loadoutCheckLogLine(result));
    this.syncStrategistHud();
  }

  /** 把智謀能量與軍師摘要推到戰場面板（PROG-2-1851），回傳摘要文字 */
  public syncStrategistHud(): string {
    const c = this.ctx;
    const state = c.ctrl?.state;
    if (!state) return '';
    const view = strategistHudViewOf(strategistHudInputOf(state, this._loadoutGaps, services().session.intel), state.wisdomMeter);
    c.strategistHud?.setView(view);
    return view.summaryText;
  }

  /** 落石擊破／火燒掠奪入帳：在該格飄金色字（戰法系統 §H-3，PROG-2-1852） */
  private _onStageSalvageGained(event: StageSalvageGainedEvent): void {
    const texts = salvageLootTexts(event.source, salvageGainItems(event.gain)).map(loot => loot.text);
    if (texts.length > 0) this.ctx.unitRenderer?.playLootTexts(event.lane, event.depth, texts);
  }

  private _poolEmptyNoticed = false;


  private _onTurnPhaseChanged(snap: { turn: number; playerFood: number; phase?: TurnPhase }): void {
    const c = this.ctx;
    c.deployRuntime?.updateFood(snap.playerFood);
    // 軍師智謀能量（PROG-2-1577）：回合紀錄附上能量，觸發次數增加時另列一行
    const state = c.ctrl?.state;
    const wisdom = state ? `，${wisdomMeterText(state.wisdomMeter)}` : '';
    this.appendLog(`回合更新：第 ${snap.turn} 回合，糧草 ${snap.playerFood}${wisdom}`);
    // 敗因診斷：記下奧義怒氣已滿卻沒放的回合
    const pg = state?.getGeneral(Faction.Player);
    if (pg && pg.maxSp > 0 && pg.currentSp >= pg.maxSp) this._defeatStats.spFullTurns.add(snap.turn);
    this._syncDelegateButton();
    if (snap.playerFood <= 0 && !this._foodEmptyLogged) this.appendLog(FOOD_EMPTY_LINE);
    this._foodEmptyLogged = snap.playerFood <= 0;
    // 軍勢見底：第一次發生時跳提示並寫進戰報，玩家才知道是沒兵可派（PROG-2-9334）
    const sortie = c.ctrl?.getSortieState();
    const poolEmpty = !!sortie && isSortiePoolExhausted(sortie);
    if (poolEmpty && !this._poolEmptyNoticed) {
      this.appendLog(SORTIE_POOL_EXHAUSTED_LINE);
      // 換回合當下常同時跳「殘局爆發」等提示；提示元件會排隊依序播，不用自己延後（PROG-2-9341）
      c.deployRuntime?.showToast(SORTIE_POOL_EXHAUSTED_LINE, 3);
    }
    this._poolEmptyNoticed = poolEmpty;
    if (state && state.wisdomTriggerCount < this._wisdomTriggersLogged) this._wisdomTriggersLogged = 0;
    if (state && state.wisdomTriggerCount > this._wisdomTriggersLogged) {
      this._wisdomTriggersLogged = state.wisdomTriggerCount;
      this.appendLog(WISDOM_SURGE_LOG);
      c.strategistHud?.playSurge();
    }
    if (c.encounterId && c.pg && this._loadoutCheckedFor !== c.encounterId) {
      this._loadoutCheckedFor = c.encounterId;
      this._loadoutGaps = [];
      void this._runLoadoutCheck(c.encounterId, c.pg.tacticSlots.map(slot => slot.tacticId));
    }
    // 軍師 HUD 摘要（關卡設計 §D-4，PROG-2-1744）：寫進戰場日誌，內容與上回合相同時略過；畫面同步見 syncStrategistHud
    const strategistLine = this.syncStrategistHud();
    if (strategistLine && strategistLine !== this._lastStrategistLine) this.appendLog(strategistLine);
    this._lastStrategistLine = strategistLine;
    // 若仍在回合推進或單挑面板開啟中，暫時不要顯示我方回合提示或切回 deployHint
    if (!c.isAdvancingTurn && !c.isDuelPanelActive) {
      c.boardRenderer?.setDeployHintFaction(Faction.Player);
      this.playTurnBanner(Faction.Player);
    }
    this.refreshBattleViews();
  }

  private _onUnitDeployed(data: { unitId: string; faction: Faction; type: TroopType; lane: number; unitName?: string }): void {
    const c = this.ctx;
    const snap = services().battle.getSnapshot();
    c.hud?.setFood(snap.playerFood, services().battle.getMaxFood());
    c.deployRuntime?.updateFood(snap.playerFood);
    const side = data.faction === Faction.Player ? '我方' : '敵方';
    const unitName = data.unitName?.trim() || this.toTroopName(data.type);
    this.appendLog(`${side}部署 ${unitName}（路線 ${data.lane + 1}）`);
    this._noteDefeatStatsDeploy(data.faction, data.unitId);
    if (data.faction === Faction.Player) {
      if (!this._deployNextTurnHintShown) {
        this._deployNextTurnHintShown = true;
        this.appendLog('剛部署的部隊下回合才行動');
      }
      c.boardRenderer?.clearDeployHint();
      c.deployRuntime?.showToast(`我方已部署 ${unitName}（路線 ${data.lane + 1}）`);
    }
    this.refreshBattleViews();
    const unit = c.ctrl?.state.units.get(data.unitId) ?? null;
    c.unitRenderer?.playDeploy(unit);
    playBattleAudio(BATTLE_AUDIO_CUE.unitDeploy);
  }

  /** 虎符劇本句走 i18n（PROG-2-1987） */
  private readonly _tallyTranslate: TallyTranslate = (key, ...args) => services().i18n.t(key, ...args);

  private _onTallyDeployed(templateId: string): void {
    const spec = tallyLegendDeploySpec(templateId);
    if (spec) this.appendLog(formatTallyLine(spec, this._tallyTranslate));
  }

  private _onUnitDamaged(data: {
    unitId: string; damage: number; hp: number;
    attackerId: string | null; attackerLane: number | null; attackerDepth: number | null;
    defenderLane: number | null; defenderDepth: number | null; attackerFaction: Faction | null;
    damageSource?: string; isCrit?: boolean; shieldAbsorbed?: number;
  }): void {
    const c = this.ctx;
    this._observeSpecialActionHit(data);
    // PROG-2-9437：跳字只顯示真的扣掉的生命，護盾吸收的部分改飄「格擋」並播盾擊聲
    const shieldFb = shieldHitFeedback(data.damage, data.shieldAbsorbed);
    // PROG-2-9862：回合扣血 tick 改用專屬輕音；同單位在節流窗內已響過就靜音（事件同步到達，以到達時刻判定）
    const dotTick = resolveBattleDotTickSfx(data.damageSource);
    const dotTickSfx: DotTickSfx | 'none' | undefined = dotTick
      ? (this.dotTickSfxThrottle.shouldPlay(data.unitId, Date.now()) ? dotTick : 'none')
      : undefined;
    const unit = c.ctrl?.state.units.get(data.unitId);
    this.performance.observeUnitDamaged(data.damage, data.attackerFaction, unit?.faction ?? null);
    if (unit) {
      const side = unit.faction === Faction.Player ? '我方' : '敵方';
      // 內部傷害來源代號換成中文說明，不認得的不顯示（PROG-2-9375）
      const sourceLabel = battleDamageSourceLabel(data.damageSource);
      const suffix = sourceLabel ? `（${sourceLabel}）` : '';
      const critLabel = data.isCrit ? '《暴擊》' : '';
      const shieldNote = shieldFb.blocked ? `（護盾吸收 ${data.damage - shieldFb.hpLoss}）` : '';
      this.appendLog(`${side}${unit.name} ${critLabel}受到 ${data.damage} 傷害${shieldNote}${suffix}，剩餘生命 ${Math.max(0, data.hp)}`);
      this._enqueueCombatVisual(`unit-damage:${data.unitId}`, async () => {
        UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] unit-damage start unit=${data.unitId}`);
        const isRiverBoundaryDamage = typeof data.damageSource === 'string' && data.damageSource.startsWith('river-current:');
        const attackerUnit = data.attackerId ? c.ctrl?.state.units.get(data.attackerId) ?? null : null;
        const attackPromise = data.attackerId && data.defenderLane !== null && data.defenderDepth !== null && !isRiverBoundaryDamage
          ? (UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] attacker-lunge attacker=${data.attackerId} target=${data.unitId}`), c.unitRenderer?.playAttackAnimationAsync(data.attackerId, data.defenderLane, data.defenderDepth) ?? Promise.resolve())
          : Promise.resolve();

        // PROG-2-9412：受擊閃白、傷害跳字、受擊音效與暴擊聲等攻擊方「打中」的那一刻才出現（依兵種命中秒數），
        // 揮刀聲維持在出手當下。沒有攻擊動作（河流邊界扣血等）就立刻播。
        const attackPlayed = !!data.attackerId && data.defenderLane !== null && data.defenderDepth !== null && !isRiverBoundaryDamage;
        const impactSec = attackPlayed && attackerUnit ? ATTACK_IMPACT_SEC[attackStyleFor(attackerUnit.type)] : 0;
        // PROG-2-9729：出手音改在揮動中段響（距命中不超過 maxGapToImpactSec），只動音效排程、不動畫
        ensureAudioLayersConfig();
        const attackSfxDelay = attackPlayed && attackerUnit ? attackSfxDelaySec(impactSec, attackStyleFor(attackerUnit.type), battleAudioLayers) : 0;
        const attackAudioPromise = data.attackerId && attackerUnit && !isRiverBoundaryDamage
          ? this._scheduleBattleAudio(this._attackSfxKeyOf(data.attackerId, attackerUnit.type), attackSfxDelay)
          : Promise.resolve();
        const heavy = isHeavyHit(shieldFb.hpLoss, unit.getEffectiveMaxHp(), data.isCrit ?? false);
        const impactPromise = (async () => {
          if (impactSec > 0) await new Promise<void>(resolve => this.scene.scheduleOnce(() => resolve(), impactSec));
          const hitPromise = isRiverBoundaryDamage
            ? (UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] boundary-spin unit=${data.unitId}`), c.unitRenderer?.playBoundaryDamageSpinAsync(data.unitId) ?? Promise.resolve())
            : (UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] defender-hit unit=${data.unitId}`), c.unitRenderer?.playHitAnimationAsync(data.unitId, data.attackerId, { heavy: heavy, lethal: data.hp <= 0, crit: data.isCrit === true }) ?? Promise.resolve());

          const valuePromise = shieldFb.hpLoss > 0
            ? (UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] damage-float unit=${data.unitId} hp=${data.hp}`), c.unitRenderer?.playValueChangeAsync(unit, shieldFb.hpLoss, 'damage', data.isCrit ?? false, heavy, data.damageSource) ?? Promise.resolve())
            : Promise.resolve();

          const hitLane = data.defenderLane ?? unit.lane;
          const hitDepth = data.defenderDepth ?? unit.depth;
          const lethal = data.hp <= 0;
          const hitTier = resolveHitTier({ damage: shieldFb.hpLoss, maxHp: unit.getEffectiveMaxHp(), isCrit: data.isCrit ?? false, lethal, blocked: shieldFb.blocked, defenderType: unit.type }, battleAudioLayers);
          if (shieldFb.blocked) {
            // 擋下的聲音由受擊分層的 block 層負責（原本另播 shield 再疊 hurt）
            c.unitRenderer?.playBuffConsumeValue(hitLane, hitDepth, BLOCK_FLOAT_TEXT.shield);
          }
          const hitFeedbackPromise = this._scheduleBattleUnitHitFeedback(hitLane, hitDepth, data.damageSource, impactSec > 0 ? 0 : undefined, hitTier, dotTickSfx);
          // 暴擊命中額外播 boom（與既有攻擊／受擊音效疊加）
          // 致命暴擊不再疊 boom（已有 hit_lethal＋die）；其餘 boom 與 die 由 playBattleAudio 錯開 80ms
          const critAudioPromise = data.isCrit && shouldPlayCritBoom(lethal, battleAudioLayers)
            ? this._scheduleBattleAudio(BATTLE_AUDIO_CUE.critHit)
            : Promise.resolve();
          await Promise.all([hitPromise, valuePromise, hitFeedbackPromise, critAudioPromise]);
          // 暴擊微頓幀：命中後多停一小段，金色暴擊光與跳字看得清楚（只影響演出節奏）
          if (data.isCrit) await new Promise<void>(resolve => this.scene.scheduleOnce(() => resolve(), BATTLE_VISUAL_TIMING.critHitStopSec));
        })();

        await Promise.all([attackPromise, impactPromise, attackAudioPromise]);

        if (data.hp > 0) {
          UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] state-commit unit=${data.unitId}`);
          this.refreshBattleViews();
        }
        UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] unit-damage end unit=${data.unitId}`);
      });
    }
  }

  /** generals-index 名稱表（關係事件戰報用）；第一次觸發才載入，失敗時為空表 */
  private _generalNames: Promise<Map<string, string>> | null = null;

  /** 戰場關係事件（PROG-2-1421）：名將契合、義兄弟合攻寫一行戰報；我方主將用戰場名字，其餘查 generals-index */
  /** 殘局判斷器進入殘局（FORM-10）：浮一條 Toast 提示玩家戰況已切換 */
  private _onLastSpurtEntered(data?: { turn: number; reason: 'turn' | 'attrition' }): void {
    if (!data) return;
    this.ctx.deployRuntime?.showToast(services().i18n.t('ui.battle.last_spurt.entered', String(data.turn)), 2.5);
  }

  /** 主將體力耗盡（FORM-07）：浮一條 Toast 提示殘局爆發失效 */
  private _onStaminaExhausted(data?: { faction: Faction }): void {
    if (!data) return;
    const key = data.faction === Faction.Player ? 'ui.battle.stamina.exhausted_player' : 'ui.battle.stamina.exhausted_enemy';
    this.ctx.deployRuntime?.showToast(services().i18n.t(key), 2.5);
  }

  private _onRelationEventTriggered(data?: { hit: RelationEventHit }): void {
    if (!data?.hit) return;
    const hit = data.hit;
    if (!this._generalNames) {
      this._generalNames = services().resource.loadJson<unknown>('data/generals-index')
        .then(generalNameMapOf)
        .catch(() => new Map<string, string>());
    }
    void this._generalNames.then((names) => {
      const player = this.ctx.ctrl?.state.getGeneral(Faction.Player);
      const nameOf = (id: string): string | null => (player && player.id === id ? player.name : names.get(id) ?? null);
      const line = relationEventLogLine(hit, nameOf, (key, ...args) => services().i18n.t(key, ...args));
      this.appendLog(line);
      // 觸發當下浮一條 Toast，玩家不必翻戰報也看得到（與回合開始橫幅同一套 deployRuntime）
      this.ctx.deployRuntime?.showToast(line, 2.5);
    });
  }

  /** 史實合攻觸發（KIN-09 演出）：記一行戰報，助攻方撲向目標 */
  private _onKinComboAttack(data?: { attackerId: string; helperId: string; targetId: string }): void {
    if (!data) return;
    const c = this.ctx;
    const attacker = c.ctrl?.state.units.get(data.attackerId);
    const helper = c.ctrl?.state.units.get(data.helperId);
    const target = c.ctrl?.state.units.get(data.targetId);
    if (!attacker || !helper || !target) return;
    const side = helper.faction === Faction.Player ? '我方' : '敵方';
    this.appendLog(`${side}${helper.name} 與${attacker.name}史實合攻，追擊${target.name}`);
    this._enqueueCombatVisual(`kin-combo:${data.helperId}`, async () => {
      await (c.unitRenderer?.playAttackAnimationAsync(data.helperId, target.lane, target.depth) ?? Promise.resolve());
    });
  }

  /** 適性命中落空：記一行戰報、攻方照樣撲上去（PROG-2-0080） */
  private _onUnitAttackMissed(data?: { attackerId: string; targetId: string; hitRate: number }): void {
    if (!data) return;
    const c = this.ctx;
    const attacker = c.ctrl?.state.units.get(data.attackerId);
    const target = c.ctrl?.state.units.get(data.targetId);
    if (!attacker || !target) return;
    const side = attacker.faction === Faction.Player ? '我方' : '敵方';
    this.appendLog(`${side}${attacker.name} 攻擊${target.name}落空（命中率 ${Math.round(data.hitRate * 100)}%）`);
    this._enqueueCombatVisual(`unit-miss:${data.attackerId}`, async () => {
      c.unitRenderer?.playDodgeAnimation?.(target.id);
      c.unitRenderer?.playMissFloat?.(target);
      playBattleAudio(BATTLE_AUDIO_CUE.unitDodge);
      playBattleAudio(resolveBattleUnitAttackSfxKey(attacker.type));
      await (c.unitRenderer?.playAttackAnimationAsync(data.attackerId, target.lane, target.depth) ?? Promise.resolve());
    });
  }

  /** 傷害被整個擋下（PROG-2-9437）：攻擊方照樣出手，命中那一刻播盾擊聲、在目標頭上飄「無敵」／「免戰」 */
  private _onUnitDamageBlocked(data?: { unitId: string; attackerId: string | null; damage: number; reason: DamageBlockReason }): void {
    if (!data) return;
    const c = this.ctx;
    const target = c.ctrl?.state.units.get(data.unitId);
    if (!target) return;
    const attacker = data.attackerId ? c.ctrl?.state.units.get(data.attackerId) ?? null : null;
    const side = target.faction === Faction.Player ? '我方' : '敵方';
    this.appendLog(`${side}${target.name} ${BLOCK_FLOAT_TEXT[data.reason]}，擋下 ${data.damage} 傷害`);
    this._enqueueCombatVisual(`unit-blocked:${data.unitId}`, async () => {
      const impactSec = attacker ? ATTACK_IMPACT_SEC[attackStyleFor(attacker.type)] : 0;
      const attackPromise = attacker
        ? (playBattleAudio(resolveBattleUnitAttackSfxKey(attacker.type)), c.unitRenderer?.playAttackAnimationAsync(attacker.id, target.lane, target.depth) ?? Promise.resolve())
        : Promise.resolve();
      const impactPromise = (async () => {
        if (impactSec > 0) await new Promise<void>(resolve => this.scene.scheduleOnce(() => resolve(), impactSec));
        const live = c.ctrl?.state.units.get(data.unitId);
        if (!live || live.isDead()) return;
        playBattleAudio(BATTLE_AUDIO_CUE.shieldBlock);
        c.unitRenderer?.playBuffConsumeValue(live.lane, live.depth, BLOCK_FLOAT_TEXT[data.reason]);
      })();
      await Promise.all([attackPromise, impactPromise]);
    });
  }

  private _onUnitHealed(data: { unitId: string; amount: number; hp: number }): void {
    const c = this.ctx;
    const unit = c.ctrl?.state.units.get(data.unitId);
    this.performance.observeHealed(data.amount, unit?.faction ?? null);
    if (unit) {
      const side = unit.faction === Faction.Player ? '我方' : '敵方';
      this.appendLog(`${side}${unit.name} 回復 ${data.amount}，目前 HP ${Math.max(0, data.hp)}`);
    }
    // PROG-2-9731：治療三步依序——治療光 → 綠字（＋治療聲）→ 血條增加。
    // 以前事件一到就同時跳字、播聲、刷新血條，比蓄力中的出招還早 0.4 秒；現在排進戰鬥動畫佇列，
    // 出招特效之後才開始。每個目標只佔佇列 queueStaggerSec，多目標治療的三步互相重疊、不會拖長回合。
    c.unitRenderer?.holdHealHp?.(data.unitId, Math.max(0, data.hp - data.amount));
    this._enqueueCombatVisual(`unit-heal:${data.unitId}`, () => {
      const cfg = getBattleUiFeedback().heal;
      const plan = planHealSteps(cfg);
      const live = c.ctrl?.state.units.get(data.unitId);
      c.unitRenderer?.releaseNameplateFade?.(); // 血條在名牌上，治療時先讓名牌回來
      if (live) c.unitRenderer?.playHealLight?.(live.id);
      this.scene.scheduleOnce(() => {
        const u = c.ctrl?.state.units.get(data.unitId);
        if (u) c.unitRenderer?.playHealFloat?.(u, data.amount);
        playBattleAudio(BATTLE_AUDIO_CUE.unitHeal);
      }, plan.floatAtSec);
      this.scene.scheduleOnce(() => { c.unitRenderer?.releaseHealHp?.(data.unitId); this.refreshBattleViews(); }, plan.hpBarAtSec);
      return new Promise<void>((resolve) => this.scene.scheduleOnce(() => resolve(), cfg.queueStaggerSec));
    });
  }

  private _onUnitMoved(data: {
    unitId: string; lane: number; depth: number; fromLane: number; fromDepth: number;
    swapWithUnitId?: string; swapDuration?: number; isSwapPassenger?: boolean;
    swapPartnerId?: string; swapPassengerFromLane?: number; swapPassengerFromDepth?: number;
    swapPassengerToLane?: number; swapPassengerToDepth?: number;
    forcedMove?: boolean; forcedMoveReason?: string;
  }): void {
    const c = this.ctx;
    const unit = c.ctrl?.state.units.get(data.unitId);
    if (unit) {
      const side = unit.faction === Faction.Player ? '我方' : '敵方';
      if (data.swapWithUnitId) {
        this.appendLog(`${side}${unit.name} 與友軍換位後推進到 ${battleCellLabel(data.lane, data.depth)}`);
        c.unitRenderer?.playSwapAdvanceAnimation(unit, data.swapWithUnitId, data.fromLane, data.fromDepth, data.swapDuration ?? BATTLE_VISUAL_TIMING.swapAdvanceMinSec,
          data.swapPassengerFromLane, data.swapPassengerFromDepth, data.swapPassengerToLane, data.swapPassengerToDepth);
      } else if (data.forcedMove) {
        this.appendLog(`${side}${unit.name} 受地格影響位移到 ${battleCellLabel(data.lane, data.depth)}`);
        c.unitRenderer?.animateMove(unit, data.fromLane, data.fromDepth, data.forcedMoveReason);
        playBattleFlowEffectAtCell(services().effect, c.boardRenderer, BATTLE_FLOW_FX.forcedMove, data.lane, data.depth, 0.95, 0.1);
      } else if (!data.isSwapPassenger) {
        this.appendLog(`${side}${unit.name} 前進到 ${battleCellLabel(data.lane, data.depth)}`);
        c.unitRenderer?.animateMove(unit, data.fromLane, data.fromDepth, data.forcedMoveReason);
      }
      if (unit.faction === Faction.Player) this._showTerrainFeedback(unit.id, data);
    }
    this.refreshBattleViews();
  }

  /** 我方部隊踏上主將適性 S、A 或 D 的地形時飄字（戰場適性 §E-10，PROG-2-1850） */
  private _showTerrainFeedback(unitId: string, data: { lane: number; depth: number; fromLane: number; fromDepth: number }): void {
    const c = this.ctx;
    const state = c.ctrl?.state;
    const from = state?.getCell(data.fromLane, data.fromDepth)?.terrain;
    const to = state?.getCell(data.lane, data.depth)?.terrain;
    if (!state || !from || !to) return;
    const grade = terrainGradeOf(battleAptitudeProfileOf(state.getGeneral(Faction.Player)), to);
    const text = this.terrainFeedback.onMoved(unitId, from, to, grade, TERRAIN_LABEL[to]);
    if (text) c.unitRenderer?.playBuffConsumeValue(data.lane, data.depth, text);
  }

  private _onUnitDied(data: { unitId: string; name?: string; lane: number; depth: number; faction: Faction; type: TroopType }): void {
    if (this.duelCapture) { this.duelCapture.deaths.push(data); return; }
    const c = this.ctx;
    this.performance.observeUnitDied(data.faction);
    // 陣亡時單位可能已從狀態移除，名稱優先取事件帶來的
    const side = data.faction === Faction.Player ? '我方' : '敵方';
    const deadName = data.name ?? c.ctrl?.state.units.get(data.unitId)?.name ?? data.unitId;
    this.appendLog(`${side}${deadName} 陣亡`);
    c.unitRenderer?.markDyingUnit?.(data.unitId);
    this._enqueueCombatVisual(`unit-death:${data.unitId}`, async () => {
      UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] death start unit=${data.unitId}`);
      playBattleAudio(BATTLE_AUDIO_CUE.unitDie);
      playBattleFlowEffectAtCell(services().effect, c.boardRenderer, BATTLE_FLOW_FX.deathBurst, data.lane, data.depth, 1.0, 0.16);
      playBattleFlowEffectAtCell(services().effect, c.boardRenderer, BATTLE_FLOW_FX.deathSmoke, data.lane, data.depth, 1.8, 0.05);
      await c.unitRenderer?.playDeathAsync(data.unitId);
      const killerFaction = data.faction === Faction.Player ? Faction.Enemy : Faction.Player;
      const isPlayerKiller = killerFaction === Faction.Player;
      const targetSpNode = isPlayerKiller ? c.hud?.playerSpBarNode ?? null : c.hud?.enemySpBarNode ?? null;
      c.unitRenderer?.playSpGainAnimation(data.lane, data.depth, SP_PER_KILL, isPlayerKiller, targetSpNode);
      this.refreshBattleViews();
      UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] death end unit=${data.unitId}`);
    });
  }

  /** 攻擊方是主將化身時回傳其武器（刀／槍／劍／弓／法術）；小兵或未知回 null */
  private _generalWeaponSfxOf(attackerId: string | null | undefined): string | null {
    const ctrl = this.ctx.ctrl;
    const state = ctrl?.state;
    if (!attackerId || !state) return null;
    const faction = attackerId === ctrl?.playerGeneralUnitId ? Faction.Player : attackerId === ctrl?.enemyGeneralUnitId ? Faction.Enemy : null;
    if (faction === null) return null;
    const g = state.getGeneral(faction);
    return g ? generalWeaponOf({ id: g.id, role: g.role ?? undefined, troopAptitude: g.troopAptitude }) : null;
  }

  /** 攻擊音效鍵：主將化身依武器選，小兵依兵種選 */
  private _attackSfxKeyOf(attackerId: string, troopType: Parameters<typeof resolveBattleUnitAttackSfxKey>[0]): ReturnType<typeof resolveBattleUnitAttackSfxKey> {
    const weapon = this._generalWeaponSfxOf(attackerId);
    return weapon !== null ? resolveBattleGeneralAttackSfxKey(weapon) : resolveBattleUnitAttackSfxKey(troopType);
  }

  private _onGeneralDamaged(data: { faction: Faction; hp: number; damage?: number; attackerId?: string | null; isCrit?: boolean; wasDodged?: boolean }): void {
    if (this.duelCapture) { this.duelCapture.hits.push(data); return; }
    const c = this.ctx;
    const target = data.faction === Faction.Player ? '我方主將' : '敵方主將';
    const maxHp = c.ctrl?.state.getGeneral(data.faction)?.maxHp ?? 0;
    if (!data.wasDodged) this.performance.observeGeneralDamaged(data.damage ?? 0, data.faction);
    this.specialActions.observeGeneralHp({ faction: data.faction, hp: data.hp, maxHp });
    if (data.wasDodged) {
      this.appendLog(`${target} 閃躲攻擊！`);
      this._enqueueCombatVisual(`general-dodge:${data.faction}`, async () => {
        c.unitRenderer?.playGeneralDodge?.(data.faction);
        c.unitRenderer?.playGeneralMissFloat?.(data.faction);
        UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] general-dodge start faction=${data.faction}`);
        // 閃避：只借 recoil 的等待節奏，不閃白、不抖
        await c.unitRenderer?.playGeneralHitAnimationAsync(data.faction, data.attackerId || null, { silent: true });
        UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] hud-commit faction=${data.faction} hp=${data.hp}`);
        services().event.emit(EVENT_NAMES.GeneralDamagedVisualCommitted, {
          faction: data.faction,
          hp: data.hp,
          maxHp,
        });
        this.refreshBattleViews();
        UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] general-dodge end faction=${data.faction}`);
      });
      return;
    }
    const critLabel = data.isCrit ? '《暴擊》 ' : '';
    this.appendLog(`${target} ${critLabel}受到攻擊，剩餘生命 ${Math.max(0, data.hp)}`);
    this._enqueueCombatVisual(`general-damage:${data.faction}`, async () => {
      UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] general-damage start faction=${data.faction}`);
      // 血量歸零由 UnitRenderer 改播陣亡
      if (data.hp > 0) c.unitRenderer?.playGeneralKnockback(data.faction);
      const attackerUnit = data.attackerId ? c.ctrl?.state.units.get(data.attackerId) ?? null : null;
      const attackPromise = data.attackerId
        ? (UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] attacker-lunge-general attacker=${data.attackerId} targetFaction=${data.faction}`), c.unitRenderer?.playAttackGeneralAnimationAsync(data.attackerId, data.faction) ?? Promise.resolve())
        : Promise.resolve();
      const hitPromise = (UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] general-hit faction=${data.faction}`), c.unitRenderer?.playGeneralHitAnimationAsync(data.faction, data.attackerId || null, { heavy: isHeavyHit(data.damage ?? 0, maxHp, data.isCrit ?? false), lethal: data.hp <= 0, crit: data.isCrit === true }) ?? Promise.resolve());
      const valuePromise = data.damage && data.damage > 0
        ? (UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] general-damage-float faction=${data.faction} hp=${data.hp}`), c.unitRenderer?.playGeneralValueChangeAsync(data.faction, data.damage, data.isCrit ?? false) ?? Promise.resolve())
        : Promise.resolve();

      const attackAudioPromise = data.attackerId && attackerUnit
        ? this._scheduleBattleAudio(resolveBattleGeneralAttackSfxKey(this._generalWeaponSfxOf(data.attackerId)))
        : Promise.resolve();
      const hitAudioPromise = this._scheduleBattleAudio(resolveBattleGeneralHitSfxKey(), BATTLE_VISUAL_TIMING.recoilStartDelaySec);
      // 主將受擊特效：照單位受擊的 battle_hit_default，位置用主將化身單位所在格
      const generalAvatarId = data.faction === Faction.Player ? c.ctrl?.playerGeneralUnitId : c.ctrl?.enemyGeneralUnitId;
      const generalAvatar = generalAvatarId ? c.ctrl?.state.units.get(generalAvatarId) ?? null : null;
      if (generalAvatar) {
        playBattleFlowEffectAtCell(services().effect, c.boardRenderer, BATTLE_FLOW_FX.hitDefault, generalAvatar.lane, generalAvatar.depth, 0.9, 0.12);
      }

      await Promise.all([attackPromise, hitPromise, valuePromise, attackAudioPromise, hitAudioPromise]);
      UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] hud-commit faction=${data.faction} hp=${data.hp}`);
      services().event.emit(EVENT_NAMES.GeneralDamagedVisualCommitted, {
        faction: data.faction,
        hp: data.hp,
        maxHp,
      });
      this.refreshBattleViews();
      UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] general-damage end faction=${data.faction}`);
    });
  }

  /** 火計／水計格子 hook（PROG-2-9960）：在命中格播 vfx-block 組合；計數供探針驗證出現次數 */
  private _onTacticGridVfx(data: { kind: TacticGridHookKind; lane: number; depth: number }): void {
    const blocks = TACTIC_GRID_VFX_BLOCKS[data.kind];
    if (!blocks) return;
    tacticGridVfxStats[data.kind] += 1;
    for (const blockId of blocks) {
      playBattleFlowEffectAtCell(services().effect, this.ctx.boardRenderer, blockId, data.lane, data.depth, 1.0, 0.08);
    }
  }

  private _onGeneralSkillUsed(data: { faction: Faction; skillId?: string; skillName?: string; sourceType?: SkillSourceType; generalName?: string }): void {
    if (data.faction === Faction.Player && data.sourceType === SkillSourceType.Ultimate) this._defeatStats.ultimates += 1;
    // 奧義：先播武將的漫畫分鏡 cut-in（戰場暫停；沒有專屬分鏡圖的武將播「暫代圖 待替換」），播完（或玩家點擊跳過）才接奧義特效。
    // 走戰鬥動畫佇列並插隊到最前：回合推進會等佇列清空，敵方奧義也走同一條（PROG-2-9352）
    if (data.sourceType === SkillSourceType.Ultimate) {
      const general = data.faction === Faction.Player ? this.ctx.pg : this.ctx.eg;
      const generalId = general?.id;
      const hud = this.ctx.hud;
      if (hud?.node?.isValid && this.ultCutin.mayPlay(generalId)) {
        const parent = hud.node.parent?.isValid ? hud.node.parent : hud.node;
        const skillId = data.skillId ?? data.skillName;
        const skillName = skillId ? getBattleSkillPresentation(skillId).name : undefined;
        this.ctx.isUltCutinActive = true;
        this._enqueueCombatVisual(`ult-cutin:${generalId}`, async () => {
          try {
            await this.ultCutin.play(generalId, parent, { generalName: data.generalName ?? general?.name, skillName });
          } finally {
            this.ctx.isUltCutinActive = false;
          }
          this._presentGeneralSkillUsed(data);
        }, true);
        return;
      }
    }
    this._castGeneralSkill(data);
  }

  /**
   * PROG-2-9410：沒有漫畫分鏡的放招（戰法、沒有分鏡圖的奧義）先蓄力 0.4 秒再出招。
   * 事件到這裡時，同一次施放的命中與傷害演出已經在戰鬥動畫佇列裡了，所以蓄力也插到佇列最前面，
   * 命中與跳字才會等出招特效之後才播（和奧義分鏡同一個做法）。招式名橫幅在蓄力開始時出現。
   * SSR／UR 戰法已有立繪閃現帶招式名，不再疊橫幅。
   */
  private _castGeneralSkill(data: { faction: Faction; skillId?: string; skillName?: string; sourceType?: SkillSourceType; generalName?: string }): void {
    const skillId = data.skillId ?? data.skillName ?? null;
    if (!skillId) { this._presentGeneralSkillUsed(data); return; }
    const side = data.faction === Faction.Player ? 'player' : 'enemy';
    const plan = planSkillCast({ ultCutin: false, tacticFlash: !!tacticFlashOf(skillId, side) });
    const caster = data.faction === Faction.Player ? this.ctx.pg : this.ctx.eg;
    this._enqueueCombatVisual(`skill-cast:${skillId}`, async () => {
      if (plan.banner) {
        this.skillBanner.push({ side, caster: data.generalName ?? caster?.name ?? '', names: [getBattleSkillPresentation(skillId).name] });
      }
      if (plan.chargeSec > 0) {
        // PROG-2-9438：蓄力有聲（漸強），出手有重音；奧義走立繪分鏡另有音效，不經過這裡
        playBattleAudio(SKILL_CAST_SFX.charge.cue, SKILL_CAST_SFX.charge.volume);
        this.ctx.unitRenderer?.playGeneralCharge(data.faction, plan.chargeSec);
        await new Promise<void>(resolve => this.scene.scheduleOnce(() => resolve(), plan.chargeSec));
        playBattleAudio(SKILL_CAST_SFX.release.cue, SKILL_CAST_SFX.release.volume);
      }
      this._presentGeneralSkillUsed(data);
    }, true);
  }

  private _presentGeneralSkillUsed(data: { faction: Faction; skillId?: string; skillName?: string; sourceType?: SkillSourceType; generalName?: string }): void {
    this.refreshBattleViews();
    this.ctx.unitRenderer?.playGeneralAttackPose(data.faction);
    const skillId = data.skillId ?? data.skillName ?? null;
    if (!skillId) return;
    this.appendLog(buildBattleSkillUsedMessage(skillId, data.faction, data.sourceType, data.generalName));

    const caster = data.faction === Faction.Player ? this.ctx.pg : this.ctx.eg;
    const effectKey = resolveBattleGeneralSkillEffectKey(data.sourceType, [caster?.templateId, caster?.id],
      key => !!services().effect.getEffectDef(key));
    playBattleGeneralSkillEffect(services().effect, this.ctx.boardRenderer,
      this.ctx.unitRenderer?.getGeneralSidelineWorldPosition(data.faction) ?? null, effectKey, 1.35);

    // SSR／UR 戰法：施放方主將半身立繪閃現（戰法系統 §H-2，PROG-2-1861）
    const flash = tacticFlashOf(skillId, data.faction === Faction.Player ? 'player' : 'enemy');
    if (flash) void this.ctx.hud?.playTacticFlash?.(flash, TACTIC_FLASH_TIMING);
  }

  /** 自身爆發開始／結束寫進戰報（SYS-SKILL-ULT-0001）；爆發 icon 待美術 */
  /** 團隊回復結算寫進戰報並刷新血條與狀態 icon（SYS-SKILL-ULT-0003） */
  private _onTeamRecovered(data: TeamRecoveredEvent): void {
    const text = teamRecoverNoticeText(data, data.faction === Faction.Player);
    if (text) this.appendLog(text);
    this.refreshBattleViews();
  }

  /** 敵方全體減益開始／結束寫進戰報（SYS-SKILL-ULT-0004） */
  private _onMassDebuffChanged(data: EnemyMassDebuffChangedEvent): void {
    this.appendLog(enemyMassDebuffNoticeText(data, data.faction === Faction.Player));
    this.refreshBattleViews();
  }

  /** 全隊增益開始／結束寫進戰報（SYS-SKILL-ULT-0002） */
  private _onTeamAuraChanged(data: TeamAuraChangedEvent): void {
    this.appendLog(teamAuraNoticeText(data, data.faction === Faction.Player));
    this.refreshBattleViews();
  }

  private _onSelfBurstChanged(data: SelfBurstChangedEvent): void {
    this.appendLog(selfBurstNoticeText(data, data.faction === Faction.Player));
    this.refreshBattleViews();
  }

  private _onTileBuffSpawned(): void { this.refreshBattleViews(); }

  private _onTileBuffConsumed(data: { unitId: string; faction: Faction; lane: number; depth: number; buffText: string; attackDelta: number; hpDelta: number; factor: number }): void {
    const c = this.ctx;
    const deltaText = tileBuffDeltaText(data.attackDelta, data.hpDelta);
    const isDebuff = tileBuffPickupIsDebuff(data.attackDelta, data.hpDelta);
    // 減益格以前也寫「吃到增益」、播增益音效；PROG-2-9411 起分開
    this.appendLog(tileBuffPickupLogLine({ isPlayer: data.faction === Faction.Player, buffText: data.buffText, attackDelta: data.attackDelta, hpDelta: data.hpDelta }));
    c.boardRenderer?.playBuffConsumeBurst(data.lane, data.depth, isDebuff);
    playBattleAudio(isDebuff ? BATTLE_AUDIO_CUE.debuffGained : BATTLE_AUDIO_CUE.buffGained);
    c.unitRenderer?.playBuffConsumeValue(data.lane, data.depth, deltaText || data.buffText);
    if (data.attackDelta !== 0 || data.hpDelta !== 0) {
      c.unitRenderer?.playBuffEffect(data.unitId, data.lane, data.depth, data.attackDelta, data.hpDelta);
      // 格子上的同款圖示飛到頭頂，抵達時頭頂圖示列彈出＋腳下光環（要在刷新收起標記之前呼叫）
      // 事件到這裡時格子已被吃掉，由增減量反推是哪一種圖示；倍率由事件帶過來，決定腳下特效的層數
      const badge = tileBuffBadgeOf(tileBuffSourceFromDelta(data.attackDelta, data.hpDelta));
      c.unitRenderer?.playTileBuffPickup(data.unitId, data.lane, data.depth, badge, data.factor);
    }
    this.refreshBattleViews();
  }

  /** 委任鈕（PROG-2-1766）：實際開關由控制器決定，按鈕只顯示結果 */
  private _onDelegateToggled(on: boolean): void {
    const c = this.ctx;
    if (!c.ctrl) return;
    // 想拿回控制權：按委任＝同時停掉自動代打（PROG-2-9707）；委任鈕自己的提示已說明，不再重複跳 Toast
    if (delegateToggleStopsAutoPlay(this.autoPlay.active, on, c.ctrl.canDelegate())) this._stopAutoPlay(false);
    if (on && !c.ctrl.canDelegate()) {
      c.deployRuntime?.showToast(services().i18n.t('ui.battle.delegate.unavailable'));
      this._syncDelegateButton();
      return;
    }
    c.ctrl.setDelegateEnabled(on);
    const general = c.ctrl.state.getGeneral(Faction.Player);
    const line = on && general ? delegateOnLine(general.name) : DELEGATE_OFF_LINE;
    this.appendLog(line);
    c.deployRuntime?.showToast(line);
    this._syncDelegateButton();
  }

  private _syncDelegateButton(): void {
    const c = this.ctx;
    c.battleLogPanel?.setDelegateActive?.(c.ctrl?.isDelegateEnabled() ?? false);
  }

  /** 自動代打中（TurnFlowManager 據此在每回合開始後自動結束回合，PROG-2-9707） */
  public get isAutoPlayActive(): boolean { return this.autoPlay.active; }

  /**
   * 自動鈕（PROG-2-9707，使用者 2026-11-21 裁決）：
   * 第一次按＝開啟自動代打（AI 部署、逐回合交戰，玩家看得到過程）；自動代打中再按＝跳過演出，極速決戰結算。
   * 沿用 PROG-2-1091／2202 的極速決戰演算法，只是從「一按就算結果」降為「跳過演出」。
   */
  private _onAutoBattleToggled(_pressed: boolean): void {
    const c = this.ctx;
    const state = c.ctrl?.state;
    if (!c.ctrl || !state || state.battleEndAnnounced) return;
    // 自動代打中再按＝跳過演出：先過極速決戰可用條件（PROG-2-9709），不可用就提示原因、維持自動代打
    if (this.autoPlay.active) {
      const gate = this._quickResolveGate();
      if (!gate.allowed) {
        this.appendLog(`極速決戰不可用：${gate.reason}`);
        c.deployRuntime?.showToast(`極速決戰不可用：${gate.reason}`);
        return;
      }
      this.autoPlay.press();
      this._syncAutoButton();
      void this._skipToQuickResolve(gate.usesWrit);
      return;
    }
    this.autoPlay.press();
    // 有出征軍勢就靠委任機制讓 AI 部署；沒有（demo 戰鬥）仍可自動結束回合，只是不部署
    const canDelegate = c.ctrl.canDelegate();
    if (canDelegate) {
      c.ctrl.setDelegateEnabled(true);
      this._syncDelegateButton();
    } else {
      this.appendLog(services().i18n.t('ui.battle.autoplay.no_sortie'));
    }
    this.appendLog(AUTO_PLAY_ON_LINE);
    c.deployRuntime?.showToast(canDelegate ? AUTO_PLAY_ON_LINE : services().i18n.t('ui.battle.autoplay.no_sortie'));
    this._syncAutoButton();
    this.onAutoPlayStarted?.();
  }

  /** 停止自動代打（委任關閉等）；原本沒開就什麼都不做 */
  private _stopAutoPlay(notify: boolean): void {
    if (!this.autoPlay.stop()) return;
    this._syncAutoButton();
    this.appendLog(AUTO_PLAY_OFF_LINE);
    if (notify) this.ctx.deployRuntime?.showToast(AUTO_PLAY_OFF_LINE);
  }

  private _syncAutoButton(): void {
    this.ctx.battleLogPanel?.setAutoActive?.(this.autoPlay.active);
  }

  /** 極速決戰可用條件（關卡條件＋每日次數＋軍令狀＋守城／單挑，PROG-2-9709）；守城以主將守方判定，不只看關卡資料 */
  private _quickResolveGate() {
    const c = this.ctx;
    const stage: QuickResolveStage = {
      id: c.encounterId,
      battleKind: c.ctrl?.state.siegeDefender === Faction.Player ? 'defense' : c.encounterStage?.battleKind,
      allowQuickResolve: c.encounterStage?.allowQuickResolve,
      enemyReserve: c.encounterStage?.enemyReserve,
    };
    const duelActive = c.isDuelPanelActive || this.duelCapture !== null || c.ctrl?.isWaitingDuelPlacement === true;
    return { stage, duelActive, ...services().session.checkQuickResolve(stage, Date.now(), duelActive) };
  }

  /**
   * 跳過演出：依整支出征部隊（含尚未部署的預備兵力）直接算勝負，走既有 BattleEnded → 結算彈窗流程（cause 'auto'）。
   * 先計一次極速決戰（免費次數或軍令狀）；計次失敗不結算。
   */
  private async _skipToQuickResolve(usesWrit: boolean): Promise<void> {
    const state = this.ctx.ctrl?.state;
    if (!state || state.battleEndAnnounced) return;
    const gate = this._quickResolveGate();
    if (!(await services().session.spendQuickResolveUse(gate.stage, Date.now(), gate.duelActive))) {
      this.ctx.deployRuntime?.showToast(`極速決戰不可用：${gate.reason || '次數不足'}`);
      // 計次失敗：第二次按已把自動代打關掉，戰鬥還在進行就恢復自動代打，不讓玩家卡在無人指揮
      if (!state.battleEndAnnounced && !this.autoPlay.active) { this.autoPlay.press(); this._syncAutoButton(); }
      return;
    }
    // 計次期間戰鬥可能已結束（回合推進出勝負）；已計的次數不退，避免用重複點擊試探
    if (state.battleEndAnnounced) return;
    const skipLine = usesWrit ? `${AUTO_PLAY_SKIP_LINE}（耗軍令狀 ×${quickResolveConfig().writCostPerUse}）` : AUTO_PLAY_SKIP_LINE;
    this.appendLog(skipLine);
    this.ctx.deployRuntime?.showToast(skipLine);
    const side = (faction: Faction, fortressHp: number, reserveTroops: number) => ({
      general: state.getGeneral(faction),
      troops: Array.from(state.units.values()).filter((u) => u.faction === faction && !u.isDead()),
      fortressHp,
      reserveTroops,
    });
    // 我方預備兵力＝出征帳本裡還沒派上場的兵；敵方沒有帳本：關卡 enemyReserve（缺省用設定預設）扣掉場上已有的兵
    const enemyDeployed = deployedTroopsOf(Array.from(state.units.values()).filter((u) => u.faction === Faction.Enemy && !u.isDead()).map((u) => u.type));
    const enemyReserve = resolveEnemyReserve(gate.stage, enemyDeployed);
    const playerReserve = this.ctx.ctrl?.getSortieState()?.poolCurrent ?? 0;
    const quick = quickResolveOutcome(
      side(Faction.Player, state.playerFortressHp, playerReserve),
      side(Faction.Enemy, state.enemyFortressHp, enemyReserve),
      Math.random,
    );
    const outcome = finalizeQuickResolve(quick, services().session.firstBattleCleared);
    for (const line of outcome.reportLines) this.appendLog(line);
    this._recordAutoBattleSnapshot(outcome.result, outcome.playerPower, outcome.enemyPower);
    state.battleEndAnnounced = true;
    // cause 'auto'（PROG-2-9703）：結算說明改講極速決戰，不落到預設的「敵方突破防線」
    services().event.emit(EVENT_NAMES.BattleEnded, { result: outcome.result, cause: 'auto' });
  }

  private static _emptyDefeatStats(): { deploys: number; enemyDeploys: number; ultimates: number; sortied: boolean; spFullTurns: Set<number> } {
    return { deploys: 0, enemyDeploys: 0, ultimates: 0, sortied: false, spFullTurns: new Set<number>() };
  }

  private _noteDefeatStatsDeploy(faction: Faction, unitId: string): void {
    const stats = this._defeatStats;
    const generalUnitId = this.ctx.ctrl?.playerGeneralUnitId ?? null;
    if (faction === Faction.Enemy) { stats.enemyDeploys += 1; return; }
    if (faction !== Faction.Player) return;
    if (generalUnitId && generalUnitId === unitId) stats.sortied = true;
    else stats.deploys += 1;
  }

  /**
   * 戰敗才診斷（PROG-2-9712）：主動撤退是玩家自己的決定、極速決戰沒有打法可評，這兩種不給敗因；
   * 回合用盡也帶 retreated，但那是時限到，照常診斷。
   */
  private _diagnoseDefeat(data: { result: string; retreated?: boolean; cause?: string }): DefeatReason[] {
    if (data.result !== 'enemy-win' || data.cause === 'auto') return [];
    if (data.retreated === true && data.cause !== 'time-up') return [];
    const ctrl = this.ctx.ctrl;
    const state = ctrl?.state;
    if (!ctrl || !state) return [];
    const stats = this._defeatStats;
    const statSum = (faction: Faction): number => {
      const g = state.getGeneral(faction);
      return g ? g.str + g.int + g.lea : 0;
    };
    return diagnoseDefeat({
      playerTurns: services().battle.getSnapshot().turn,
      playerDeploys: stats.deploys,
      deployLimitPerTurn: ctrl.playerDeployLimitPerTurn,
      generalSortied: stats.sortied || ctrl.playerGeneralUnitId !== null,
      cause: data.cause,
      ultimatesUsed: stats.ultimates,
      spFullIdleTurns: stats.spFullTurns.size,
      enemyDeploys: stats.enemyDeploys,
      playerGeneralStats: statSum(Faction.Player),
      enemyGeneralStats: statSum(Faction.Enemy),
    });
  }

  /** 設定面板確認撤退（PROG-2-1890）：判定我方戰敗，走既有 BattleEnded → 結算彈窗流程 */
  private _onRetreatRequested(): void {
    const state = this.ctx.ctrl?.state;
    if (!state) return;
    if (state.battleEndAnnounced) {
      const popup = this.ctx.resultPopup;
      // 勝敗停頓中按撤退：直接把結算窗開出來，不再等（PROG-2-9427）
      if (this._flushResultBeat()) return;
      if (popup && !popup.node.active) {
        const last = this._lastEndedPayload ?? { result: 'enemy-win', retreated: true };
        void popup.showResult(last.result, undefined, this.ctx.pg?.id, last.retreated === true, last.cause);
      }
      return;
    }
    // 撤退要在戰報與 Toast 說清楚「是我方主動退」，否則玩家只看到戰敗結算會誤以為遊戲壞掉
    this.appendLog(RETREAT_LOG_LINE);
    services().event.emit(EVENT_NAMES.ShowToast, { text: RETREAT_LOG_LINE });
    this.ctx.ctrl?.retreatBattle();
  }

  /** 自動鈕結算留 AUTO_RESOLVE 快照與日誌（doc_spec_0015 §F-4，PROG-2-1185）；在 BattleEnded 前寫入，由戰後存檔一併帶走 */
  private _recordAutoBattleSnapshot(result: 'player-win' | 'enemy-win' | 'draw', playerPower: number, enemyPower: number): void {
    const state = this.ctx.ctrl?.state;
    if (!state) return;
    const session = services().session;
    const clock = session.gameTime;
    const general = state.getGeneral(Faction.Player);
    const troops = Array.from(state.units.values())
      .filter((u) => u.faction === Faction.Player && !u.isDead())
      .map((u) => ({ type: u.type, currentHp: u.currentHp, attack: u.attack }));
    const kind = result === 'player-win' ? 'win' : result === 'enemy-win' ? 'lose' : 'draw';
    const pgId = this.ctx.pg?.id;
    session.recordAutoResolveBattle({
      battleType: 'AUTO_RESOLVE',
      seed: `${clock.currentYear}-${clock.currentSeason}-${this.ctx.encounterId ?? 'field'}`,
      lineup: [general ? { id: general.id, str: general.str, int: general.int, lea: general.lea, currentHp: general.currentHp, maxHp: general.maxHp } : null, ...troops],
      tileState: { playerFortressHp: state.playerFortressHp, enemyFortressHp: state.enemyFortressHp },
      tactics: [],
      win: result === 'player-win',
      playerStrength: playerPower,
      enemyStrength: enemyPower,
    }, FIELD_AUTO_BATTLE_JOURNAL[kind], pgId ? [pgId] : []);
  }

  private _onBattleEnded(data: { result: string; retreated?: boolean; timeUp?: boolean; cause?: string; timeUpVerdict?: TimeUpVerdict }): void {
    this._lastEndedPayload = { result: data.result, retreated: data.retreated, cause: data.cause };
    // 戰鬥結束：自動代打一併收掉並讓按鈕恢復（不提示，結算彈窗會接手）
    // 只有真的分出勝負才收（PROG-2-9712）：非終局的通知不該把自動代打靜默關掉
    if (data.result !== 'ongoing' && this.autoPlay.stop()) this._syncAutoButton();
    if (this.duelCapture) { this.duelCapture.ended = data; return; }
    const c = this.ctx;
    const effectKey = resolveBattleResultEffectKey(data.result);
    if (effectKey) {
      playBattleFlowEffectAtBoardCenter(services().effect, c.boardRenderer, effectKey, data.result === 'draw' ? 1.6 : 1.8);
    }
    // 勝敗音效（PROG-2-9357）：平手不播
    if (data.result === 'player-win') playBattleAudio(BATTLE_AUDIO_CUE.battleVictory);
    else if (data.result === 'enemy-win') playBattleAudio(BATTLE_AUDIO_CUE.battleDefeat);
    this.appendLog(battleEndLogLine(data.result));
    this.hideEnemyThinkingPanel();
    // 結算寫回與結果彈窗互相隔離（PROG-2-9404）：寫回名冊丟錯、或彈窗掛載失敗（畫面規格下載 404）都不能讓玩家看不到結果
    let details: string[] = [];
    try { details = this._settleRosterBattle(data.result as BattleResult); }
    catch (error) { UCUFLogger.error(LogCategory.BATTLE, '[BattleUIBridge] 戰後結算寫回失敗，仍顯示結果彈窗', error); }
    // 回合用盡而獲勝（教學戰）：補一行說明，免得玩家不知道為什麼突然贏了
    // 依戰果判定（PROG-2-9423）：寫出雙方戰果百分比，玩家才知道差多少
    if (data.timeUpVerdict) details.unshift(timeUpVerdictLine(data.timeUpVerdict, services().battle.getTimeUpJudgement()));
    else if (data.timeUp === true && data.result === 'player-win') details.unshift('敵軍久攻不下，鳴金退兵。');
    // 軍師敗因診斷（PROG-2-9712）：放在明細最前面，並給結算窗「下一步建議」按鈕
    const diagnosis = this._diagnoseDefeat(data);
    this._defeatAdvice = diagnosis[0] ?? null;
    details.unshift(...defeatDiagnosisLines(diagnosis));
    c.resultPopup?.setDefeatAdvice?.(this._defeatAdvice ? defeatAdviceLabel(this._defeatAdvice.advice) : null);
    this._defeatStats = BattleUIBridge._emptyDefeatStats();
    // 年終守城不可重打（PROG-2-9426）：守方是玩家時藏起「再戰一次」
    c.resultPopup?.setReplayAllowed?.(this.ctx.ctrl?.state.siegeDefender !== Faction.Player);
    const popup = c.resultPopup;
    const generalId = c.pg?.id;
    const showPopup = () => {
      void Promise.resolve(popup?.showResult(data.result as any, details.length > 0 ? details.join('\n') : undefined, generalId, data.retreated === true, data.cause))
        .catch((error) => UCUFLogger.error(LogCategory.BATTLE, '[BattleUIBridge] 結果彈窗顯示失敗', error));
    };
    // 勝敗那一拍（PROG-2-9427）：先打全畫面勝敗橫幅停一拍再開結算窗，停頓期間預載主將頭像；玩家主動撤退照舊立即開
    if (shouldHoldBeforeResult(data)) {
      popup?.preloadAvatar?.(generalId);
      const banner = battleResultBannerOf(data.result, data.retreated === true);
      if (banner) {
        const [r, g, b, a] = banner.rgba;
        c.deployRuntime?.showTurnBanner?.(banner.text, new Color(r, g, b, a), BATTLE_RESULT_BEAT.bannerSec);
      }
      this._scheduleResultBeat(showPopup);
    } else {
      showPopup();
    }
    c.boardRenderer?.clearDeployHint();
    c.hud?.clearPersistentStatus();
    c.hud?.clearSceneGambitBadge();
    this.refreshBattleViews();
    c.combatVisualQueue.length = 0;
    c.isDrainingCombatVisual = false;
    c.isAdvancingTurn = false;
    // 敵方回合中分出勝負時 finalizeAdvance 會因 isAdvancingTurn=false 提早返回，這裡要自己還原 1.5 倍速（PROG-2-9414）
    setEnemyTurnPlayback(false);
    c.isDuelPanelActive = false;
    if (c.deployRuntime) c.deployRuntime.node.active = false;
  }

  /** 排定停頓後開結算窗；同一時間只留一個待開的結算窗 */
  private _scheduleResultBeat(show: () => void): void {
    this._cancelResultBeat();
    this._pendingResultShow = show;
    this._resultBeatTimer = setTimeout(() => { this._flushResultBeat(); }, BATTLE_RESULT_BEAT.popupDelayMs);
  }

  /** 有待開的結算窗就立即開出來；回傳是否真的開了 */
  private _flushResultBeat(): boolean {
    const show = this._pendingResultShow;
    this._cancelResultBeat();
    if (!show) return false;
    show();
    return true;
  }

  private _cancelResultBeat(): void {
    if (this._resultBeatTimer !== null) clearTimeout(this._resultBeatTimer);
    this._resultBeatTimer = null;
    this._pendingResultShow = null;
  }

  /** 把單位受傷事件餵給特定動作偵測；攻方兵種與站位地形從戰場狀態查 */
  private _observeSpecialActionHit(data: UnitDamagedPayload): void {
    const ctrl = this.ctx.ctrl;
    if (!ctrl) return;
    this.specialActions.observeUnitHit(toUnitHitObservation(data, {
      unitType: (unitId) => ctrl.state.units.get(unitId)?.type ?? null,
      isGeneralUnit: (unitId) => unitId === ctrl.playerGeneralUnitId || unitId === ctrl.enemyGeneralUnitId,
      terrainAt: (lane, depth) => ctrl.state.getCell(lane, depth)?.terrain ?? null,
    }));
  }

  /**
   * 戰後結算寫回名冊（精力、戰績、功勳、城市兵源與糧草）並擲覺醒；名冊裡沒有的內建武將會被略過。
   * 回傳給結果彈窗的結算摘要行（出征軍勢六項 + 本場戰績）；內建 demo 戰鬥只有本場戰績（擊殺、回合，PROG-2-1871）。
   */
  private _settleRosterBattle(result: BattleResult): string[] {
    const actions = this.specialActions.finish(result);
    this.specialActions.reset();
    const performance = this.performance.snapshot();
    this.performance.reset();
    const fieldSortie = this.ctx.ctrl?.finishSortie(services().session.military.cityTroops, services().session.military.recruitRegen) ?? null;
    // QA 預覽的模擬帳本（PROG-2-9711）只顯示戰況，不寫回存檔兵源糧草、不觸發擒將
    const previewSortie = this.ctx.ctrl?.isPreviewSortie() ?? false;
    const sortie = previewSortie ? null : fieldSortie;
    // 主戰場UI規格書 §4.2：結算一律顯示本場擊殺數與回合數（PROG-2-1871）
    const recap = formatPerformance(performance, services().battle.getSnapshot().turn);
    const details = fieldSortie ? [...formatSortieSummary(fieldSortie), recap] : [recap];
    // 戰後結算視窗的關卡回收摘要（關卡設計 §I-2，PROG-2-1857）；平手照常入帳
    details.push(...salvageSummaryLines(this.ctx.ctrl?.state.stageSalvage, result !== 'enemy-win'));
    for (const line of details) this.appendLog(line);
    const pgId = this.ctx.pg?.id;
    if (!pgId) return details;
    if (actions.length > 0) {
      this.appendLog(`戰場特定動作：${actions.map(specialActionDisplayName).join('、')}`);
    }
    const specialActions = actions.length > 0 ? { [pgId]: actions } : undefined;
    if (result === 'player-win' && sortie) this._captureEnemyGeneral();
    const stageId = this.ctx.encounterId ?? undefined;
    const deployedTallyIds = this.ctx.ctrl?.deployedTallyIds ?? [];
    // 戰鬥結束時主將的精力（已扣奧義成本）是結算的基準，戰後再扣 30（PM 裁定，2026-10-14）
    const battleVitality = this.ctx.ctrl?.state.playerGeneral?.vitality;
    const vitalityAfterBattle = battleVitality !== undefined ? { [pgId]: battleVitality } : undefined;
    const pgUnit = this.ctx.ctrl?.state.playerGeneral;
    const hpRatioAfterBattle = pgUnit && pgUnit.maxHp > 0 ? { [pgId]: pgUnit.currentHp / pgUnit.maxHp } : undefined;
    // inBattleFame：戰中入帳的名聲（不含單挑，戰後結算已有）；戰場外接好之前 recordBattle 不認這一欄，先用變數帶過去（PROG-2-9395）
    const inBattleFameGain = this.ctx.ctrl?.getInBattleFameForRecord(Faction.Player) ?? 0;
    const inBattleFame = inBattleFameGain > 0 ? { [pgId]: inBattleFameGain } : undefined;
    // encounterEnemyGeneralId：敵方君主（這一場的敵主將），被擒處置用他的數值（PROG-2-9140）
    // 守城戰（PROG-2-9425）：守方是玩家時，勝利另加民心、失敗走守城戰敗；我方主將倒下視為武將全滅（大敗）
    const defense = this.ctx.ctrl?.state.siegeDefender === Faction.Player
      ? { moraleOnVictory: this.ctx.ctrl.defenseBattle.moraleOnVictory, playerGeneralsDown: pgUnit?.isDead() ?? false, defeatMoraleDelta: this.ctx.ctrl.defenseBattle.defeatMoraleDelta, routPopulationLossRatio: this.ctx.ctrl.defenseBattle.routPopulationLossRatio }
      : null;
    const battleOptions = { specialActions, sortie, performance: { [pgId]: performance }, stageId, deployedTallyIds, vitalityAfterBattle, hpRatioAfterBattle, stageSalvage: this.ctx.ctrl?.state.stageSalvage, teachingSpirit: this.ctx.teachingSpirit, duelOutcomes: this.duelOutcomes, generalCaptures: this.generalCaptures, encounterEnemyGeneralId: this.ctx.eg?.id ?? null, inBattleFame, defense };
    void services().session.recordBattle([pgId], result, battleOptions).then((settlement) => {
      // 主將被擒的君主處置結果（PROG-2-9140）：寫進戰報並加進結算細項
      const captureLines = (settlement.captureNotices ?? []).map((line) => formatTallyLine(line, this._tallyTranslate));
      for (const line of captureLines) this.appendLog(line);
      if (captureLines.length > 0) this.ctx.resultPopup?.appendDetails?.(captureLines);
      const entry = settlement.entries[0];
      if (entry) {
        this.appendLog(`${this.ctx.pg?.name ?? pgId} 精力 ${entry.vitalityBefore}→${entry.vitalityAfter}，功勳 +${entry.meritGained}${entry.epGained > 0 ? `，EP +${entry.epGained}` : ''}`);
        const milestoneLines = entry.newMilestones.flatMap((milestone) =>
          milestoneAnnouncementLines(milestone, this.ctx.pg?.name ?? pgId, key => services().i18n.t(key)));
        for (const line of milestoneLines) this.appendLog(line);
        if (milestoneLines.length > 0) this.ctx.resultPopup?.appendDetails?.(milestoneLines);
      }
      // 戰後獎懲（PROG-2-9149）：糧草／黃金／武將經驗／戰利品／兵源回扣／民心，寫日誌並加進結算細項
      for (const line of settlement.aftermathLines ?? []) this.appendLog(line);
      if ((settlement.aftermathLines ?? []).length > 0) this.ctx.resultPopup?.appendDetails?.(settlement.aftermathLines);
      // 因子爆發系統 §G 覺醒提示（PROG-2-1783）
      const awakeningLines = settlement.awakenings.flatMap(factorAwakeningLines);
      for (const line of awakeningLines) this.appendLog(line);
      this.ctx.resultPopup?.appendDetails?.([...formatAwakeningReveal(settlement.awakenings), ...awakeningLines]);
      if (settlement.awakenings.length > 0) {
        void this.ctx.resultPopup?.playAwakeningFreeze?.(awakeningFreezeTitles(settlement.awakenings), AWAKENING_FREEZE_TIMING);
      }
      // 因子階段解鎖（因子解鎖系統 §H，PROG-2-1779）
      const phaseLines = settlement.discovery ? discoveryPhaseUnlockLines(settlement.discovery) : [];
      for (const line of phaseLines) this.appendLog(line);
      if (phaseLines.length > 0) this.ctx.resultPopup?.appendDetails?.(phaseLines);
      const tallyNotices = services().session.consumeTallyNotices(this._tallyTranslate);
      for (const line of tallyNotices) this.appendLog(line);
      if (tallyNotices.length > 0) this.ctx.resultPopup?.appendDetails?.(tallyNotices);
      // 雙卡結算（SPI-12，PROG-2-2084）：名將陣亡時英靈卡定格數值與虎符適性，接在虎符提示後
      const dualCardLines = services().session.consumeDualCardSettlementLines(this._tallyTranslate);
      for (const line of dualCardLines) this.appendLog(line);
      if (dualCardLines.length > 0) this.ctx.resultPopup?.appendDetails?.(dualCardLines);
      // 地窖保護（ECO-06，PROG-2-1342）：戰敗時糧草被保底，寫日誌並加進結算細項
      const cellar = cellarProtectionText(services().session.lastCellarProtectedFood);
      if (cellar) {
        this.appendLog(cellar);
        this.ctx.resultPopup?.appendDetails?.([cellar]);
      }
    }).catch((error) => {
      UCUFLogger.warn(LogCategory.BATTLE, '[BattleUIBridge] 戰後結算寫回名冊失敗', error);
    });
    return details;
  }

  /** 戰勝後俘虜敵將，進待處置清單（四選一在大廳處置；試用傭兵豁免）（PROG-2-0073） */
  private _captureEnemyGeneral(): void {
    const egId = this.ctx.eg?.id;
    if (!egId) return;
    void loadGeneralConfig(egId)
      .then((config) => (config ? services().session.capturePrisoner(config) : null))
      .then((record) => {
        if (!record) return;
        const labels = powOptionLabels(record);
        this.appendLog(`俘虜 ${record.targetName}：${labels.persuade}、${labels.recruit}、${labels.imprison}、${labels.release}`);
      })
      .catch((error) => {
        UCUFLogger.warn(LogCategory.BATTLE, '[BattleUIBridge] 俘虜敵將失敗', error);
      });
  }

  private _onUltimateSkillSelected(data: { skillId?: string | null; ultimateId?: string | null }): void {
    if (!this.ctx.ctrl || this.ctx.isAdvancingTurn) return;
    const skillId = data.skillId ?? null;
    if (!skillId) {
      this.ctx.deployRuntime?.showToast(services().i18n.t('ui.ultimate.unassigned_toast'), 1.5);
      return;
    }

    this.ctx.skillTargetingFlow?.beginPlayerSkillFlow(skillId, SkillSourceType.Ultimate, services().i18n.t('ui.ultimate.label'), data.ultimateId ?? undefined);
  }

  private _onGlobalBoardTouchEnd(ev: EventTouch): void {
    const loc = ev.getLocation();
    this.handleBoardRelease(loc.x, loc.y);
  }

  private _onGlobalBoardMouseUp(ev: EventMouse): void {
    const loc = ev.getLocation();
    this.handleBoardRelease(loc.x, loc.y);
  }

  private handleBoardRelease(screenX: number, screenY: number): void {
    // cut-in 播放中：這次點擊只用來跳過，不能點穿到棋盤落子或選目標
    if (isUltCutinPlaying()) return;
    if (this.ctx.skillTargetingFlow?.isPending) {
      this.ctx.skillTargetingFlow.handleSkillTargetClick(screenX, screenY);
      return;
    }
    if (!this.ctx.ctrl?.isWaitingDuelPlacement || this.ctx.isAdvancingTurn || this.ctx.isDuelPanelActive) return;
    // 沿用 TurnFlowManager 的射線與格子驗證；觸控後的相容 mouse-up 會因放置狀態已清除而被忽略。
    this.onBoardPlacement?.(screenX, screenY);
  }

  private _onGlobalKeyUp(ev: EventKeyboard): void {
    if (!this.ctx.skillTargetingFlow?.isPending) return;
    if (ev.keyCode !== KeyCode.ESCAPE) return;
    this.ctx.skillTargetingFlow.cancelPendingSkillTargeting(true);
  }

  /** 本場已發動過的敵方戰法 id；快覽只對這些顯示名稱（PROG-2-1756） */
  private readonly _revealedEnemySkills = new Set<string>();

  private _noteEnemySkillRevealed(data: { faction: Faction; skillId?: string; skillName?: string }): void {
    const skillId = data.skillId ?? data.skillName;
    if (data.faction === Faction.Enemy && skillId) this._revealedEnemySkills.add(skillId);
  }

  /**
   * 適性台詞（戰場適性系統 §G，APT-14；PROG-2-1866 接上畫面）：寫進戰報並浮一條 Toast。
   * 天氣轉變的台詞（風向突變）也走這條，所以天氣切換時玩家會看到提示。
   */
  private _onAptitudeDialogue(data: { turn: number; line: string }): void {
    if (!data?.line) return;
    this.appendLog(data.line);
    const toast = aptitudeToastPayload(data.line);
    this.ctx.deployRuntime?.showToast(toast.message, toast.duration, { key: toast.key });
  }

  /** 其他元件要求的短提示（如大招充能未滿，PROG-2-1866）：交給同一套 Toast 佇列 */
  /**
   * 狀態上身（PROG-2-9435）：排進戰鬥動畫佇列，不再事件一到就飄字。
   * 奧義的 BuffApplied 比漫畫分鏡早到，以前飄字整段被分鏡蓋住；排隊後會在分鏡與出招特效之後才播。
   * 控制／減益：目標縮一下＋減益聲；增益：增益聲。多個目標依遠近錯開，像震波掃過去。
   */
  private _onBuffApplied(data: { unitId: string; effect: string; turns: number; stacks?: number }): void {
    if (!data) return;
    const polarity = statusPolarityOf(data.effect);
    this._enqueueCombatVisual(`status-apply:${data.unitId}:${data.effect}`, () => {
      const unit = this.ctx.ctrl?.state.units.get(data.unitId);
      if (!unit || unit.isDead()) return;
      const delay = statusWaveDelaySec(polarity, unit.faction === Faction.Player, unit.depth);
      const show = () => {
        const live = this.ctx.ctrl?.state.units.get(data.unitId);
        if (!live || live.isDead()) return;
        const cue = polarity === 'buff' ? BATTLE_AUDIO_CUE.buffGained : BATTLE_AUDIO_CUE.debuffGained;
        if (this.statusCueThrottle.shouldPlay(cue, Date.now())) playBattleAudio(cue);
        if (statusMakesTargetFlinch(polarity)) this.ctx.unitRenderer?.playHitAnimation(live.id, null);
        if (data.effect === POISON_STATUS_ID) {
          // PROG-2-9731：毒箭命中要有上身回饋——紫綠光罩住受擊者＋紫綠「中毒」字（使用者選「毒紫綠」）
          this.ctx.unitRenderer?.playPoisonHit?.(live.id);
          this.ctx.unitRenderer?.playPoisonFloat?.(live.lane, live.depth, getBattleUiFeedback().poisonHit.floatText);
          return;
        }
        const text = statusFloatWithStacks(statusEffectFloatText(data.effect), data.stacks, getBattleUiFeedback().statusBadge.stackFloatSuffix);
        if (text) this.ctx.unitRenderer?.playBuffConsumeValue(live.lane, live.depth, text, statusFloatTypeOf(polarity));
      };
      if (delay > 0) this.scene.scheduleOnce(show, delay);
      else show();
    });
  }

  private _onFortressDamaged(data: { faction: Faction; hp: number }): void {
    if (!data) return;
    this.appendLog(fortressDamagedLogLine(data.faction, data.hp));
    playBattleAudio(BATTLE_AUDIO_CUE.fortressDamaged);
  }

  private _onShowToast(data: { text: string; duration?: number }): void {
    if (!data?.text) return;
    this.ctx.deployRuntime?.showToast(data.text, data.duration);
  }

  private _onRequestGeneralQuickView(req: { side: 'player' | 'enemy'; isEnemy: boolean }): void {
    const unit = req.side === 'player' ? this.ctx.pg : this.ctx.eg;
    if (!unit) { UCUFLogger.warn(LogCategory.LIFECYCLE, '[BattleUIBridge] _onRequestGeneralQuickView: 武將資料尚未備妥'); return; }
    const data = {
      name: unit.name, title: req.isEnemy ? '敵方主將' : '我方主將', generalId: unit.id,
      faction: req.isEnemy ? '敵方' : '玩家',
      hp: unit.currentHp, maxHp: unit.maxHp,
      atk: Math.round(unit.str * 10), def: Math.round(unit.lea * 10), spd: unit.luk, int: unit.int,
      skills: quickViewSkillLines(unit.skillId ? [unit.skillId] : [], req.isEnemy, this._revealedEnemySkills), isEnemy: req.isEnemy,
      buffs: this._generalBuffLabels(req.side),
    };
    services().event.emit(EVENT_NAMES.ShowGeneralQuickView, data);
  }

  /** 主將在棋盤上的化身單位（player-general-*／enemy-general-*）身上的狀態，例「疾行(2)」（PROG-2-1872） */
  private _generalBuffLabels(side: 'player' | 'enemy'): string[] {
    const state = this.ctx.ctrl?.state;
    if (!state) return [];
    const avatar = Array.from(state.units.values()).find((u) => u.id.startsWith(`${side}-general-`) && !u.isDead());
    if (!avatar) return [];
    return services().buff.getBuffs(avatar.id)
      .map((b) => ({ label: statusEffectFloatText(b.effect), turns: b.remainingTurns }))
      .filter((b) => b.label.length > 0)
      .map((b) => `${b.label}(${b.turns})`);
  }

  // ── 戰鬥動畫佇列（委託給 TurnFlowManager 共享 ctx）────────────────────────

  /** front=true：插到佇列最前面（奧義 cut-in 要在同一次施放產生的傷害演出之前） */
  private _enqueueCombatVisual(label: string, action: () => Promise<void> | void, front = false): void {
    const c = this.ctx;
    const task: CombatVisualTask = {
      id: ++c.combatVisualTaskId,
      label,
      run: action,
    };
    if (front) c.combatVisualQueue.unshift(task);
    else c.combatVisualQueue.push(task);
    UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] enqueue id=${task.id} label=${label} queue=${c.combatVisualQueue.length}`);
    if (c.isDrainingCombatVisual) return;
    c.isDrainingCombatVisual = true;
    void this._drainCombatVisualQueue();
  }

  private async _drainCombatVisualQueue(): Promise<void> {
    const c = this.ctx;
    UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] drain-start queue=${c.combatVisualQueue.length}`);
    // 佇列的每一個 await 都加真實時間上限（PROG-2-9404）：任何一個演出的 Promise 永不回來，
    // 佇列就停在那裡，後面排隊的奧義 cut-in 永遠不播、isUltCutinActive 永遠不放，回合推進跟著卡死。
    await awaitWithTimeout(c.unitRenderer?.waitForMovementIdle?.(BATTLE_VISUAL_TIMING.movementIdleMaxWaitMs) ?? Promise.resolve(),
      BATTLE_VISUAL_TIMING.movementIdleMaxWaitMs + 1000, undefined, { label: 'combat-visual:movement-idle' });

    while (c.combatVisualQueue.length > 0) {
      const task = c.combatVisualQueue.shift();
      if (!task) {
        break;
      }

      UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] action-start id=${task.id} label=${task.label}`);
      // PROG-2-9731：攻擊、受擊演出期間名牌淡出（不擋打擊畫面），演出結束由 UnitRenderer 等一小段再淡回
      const fadesPlate = isPlateFadeTask(task.label);
      if (fadesPlate) c.unitRenderer?.beginCombatPresentation?.();
      try {
        // new Promise 讓 task.run 同步執行（維持原本時序），同步丟錯也會被接住
        await awaitWithTimeout(new Promise<void>((resolve) => resolve(task.run())), BATTLE_VISUAL_TIMING.combatVisualTaskMaxMs, undefined,
          { label: `combat-visual:${task.label}` });
      } catch (error) {
        UCUFLogger.error(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] action-failed id=${task.id} label=${task.label}`, error);
      } finally {
        if (fadesPlate) c.unitRenderer?.endCombatPresentation?.();
      }
      UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] action-end id=${task.id} label=${task.label} remaining=${c.combatVisualQueue.length}`);
    }

    c.isDrainingCombatVisual = false;
    c.unitRenderer?.releaseNameplateFade?.(); // 保底：任何一個演出沒成對結束，名牌也會淡回
    // 佇列已清空：不會再有排隊中的奧義 cut-in。任務逾時被略過時它的 finally 可能沒跑，旗標在這裡保底放掉。
    c.isUltCutinActive = false;
    UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] drain-end`);
  }

  private toTroopName(type: TroopType): string {
    if (type === TroopType.Cavalry)  return '騎兵';
    if (type === TroopType.Infantry) return '步兵';
    if (type === TroopType.Shield)   return '盾兵';
    if (type === TroopType.Archer)   return '弓兵';
    if (type === TroopType.Pikeman)  return '長槍兵';
    if (type === TroopType.Engineer) return '工兵';
    if (type === TroopType.Medic)    return '醫護兵';
    return '水軍';
  }
}

/** 堡壘受損戰報（PROG-2-1868）：faction 是被攻擊的一方；血量不低於 0 */
export function fortressDamagedLogLine(faction: Faction, hp: number): string {
  const remain = Math.max(0, Math.round(hp));
  return faction === Faction.Enemy
    ? `工兵攻城：敵方堡壘受損，剩餘 ${remain}`
    : `我方堡壘遭敵軍工兵攻擊，剩餘 ${remain}`;
}
