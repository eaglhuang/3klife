import { buildTacticSummary } from './BattleSceneLoader';
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

import { UCUFLogger, LogCategory } from "../../core/utils/UCUFLogger";
import { Color, Component, EventKeyboard, EventMouse, EventTouch, Input, KeyCode, Node, input } from 'cc';
import { EVENT_NAMES, Faction, SP_PER_KILL, TroopType, TurnPhase } from '../../core/config/Constants';
import { services } from '../../core/managers/ServiceLoader';
import { BattlePerformanceTracker, formatPerformance, milestoneDisplayName } from '../../core/systems/BattleRecordStats';
import { formatSortieSummary } from '../../core/systems/SortieDeploy';
import { powOptionLabels } from '../../core/systems/PrisonerOfWar';
import { loadGeneralConfig } from './BattleSceneLoader';
import { GeneralUnit } from '../../core/models/GeneralUnit';
import { BattleController } from '../controllers/BattleController';
import type { BattleResult } from '../BattleTypes';
import { BattleSpecialActionTracker, specialActionDisplayName, toUnitHitObservation, type UnitDamagedPayload } from '../../core/systems/BattleSpecialActions';
import { IBattleHUDLike, IBattleLogLike, IDuelChallengeLike, IResultPopupLike, IDeployRuntimeLike, IBattleScenePanelLike } from '../../shared/interfaces/IBattleUIComponents';

import { BATTLE_TURN_FLOW_TIMING, BATTLE_VISUAL_TIMING } from './BattlePresentationTiming';
import { buildBattleSkillUsedMessage } from '../../shared/BattleSkillPresentation';
import { SkillSourceType } from '../../shared/SkillRuntimeContract';
import {
  BATTLE_FLOW_FX,
  playBattleFlowEffectAtBoardCenter,
  playBattleFlowEffectAtCell,
  resolveBattleGeneralSkillEffectKey,
  resolveBattleResultEffectKey,
  resolveBattleUnitHitEffectKey,
} from './BattleFlowVfx';
import {
  playBattleAudio,
  resolveBattleGeneralAttackSfxKey,
  resolveBattleGeneralHitSfxKey,
  resolveBattleUnitAttackSfxKey,
  resolveBattleUnitHitSfxKey,
  type BattleAudioCue,
} from '../shared/BattleAudio';

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
  isAdvancingTurn:   boolean;
  isDuelPanelActive: boolean;
  combatVisualQueue: CombatVisualTask[];
  isDrainingCombatVisual: boolean;
  combatVisualTaskId: number;
  skillTargetingFlow?: {
    isPending: boolean;
    beginPlayerSkillFlow(skillId: string, sourceType: SkillSourceType, sourceLabel: string): void;
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
    battleScenePanel: null, boardRenderer: null, unitRenderer: null,
    resultPopup: null, duelChallengePanel: null,
    ctrl: null, pg: null, eg: null, encounterId: null,
    isAdvancingTurn: false, isDuelPanelActive: false,
    combatVisualQueue: [], isDrainingCombatVisual: false,
    combatVisualTaskId: 0,
    boardCamera: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export class BattleUIBridge {
  private readonly unsubs: (() => void)[] = [];
  /** 本場我方的戰場特定動作（騎兵衝鋒、背刺…），戰後交給覺醒判定 */
  private readonly specialActions = new BattleSpecialActionTracker();
  /** 我方主將帶隊的單場表現（擊殺 / 傷害 / 承傷 / 治療），戰後寫進戰績（PROG-2-0072） */
  private readonly performance = new BattlePerformanceTracker(Faction.Player);
  private onBoardPlacement: ((screenX: number, screenY: number) => void) | null = null;

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
  }): void {
    this.unsubscribeEvents();
    this.onBoardPlacement = externalHandlers.onBoardPlacement ?? null;
    this.specialActions.reset();
    this.performance.reset();
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

    this.unsubs.push(
      svc.event.on(EVENT_NAMES.TurnPhaseChanged,        this._onTurnPhaseChanged.bind(this)),
      svc.event.on(EVENT_NAMES.UnitDeployed,            this._onUnitDeployed.bind(this)),
      svc.event.on(EVENT_NAMES.UnitDamaged,             this._onUnitDamaged.bind(this)),
      svc.event.on(EVENT_NAMES.UnitAttackMissed,        this._onUnitAttackMissed.bind(this)),
      svc.event.on(EVENT_NAMES.UnitHealed,              this._onUnitHealed.bind(this)),
      svc.event.on(EVENT_NAMES.UnitMoved,               this._onUnitMoved.bind(this)),
      svc.event.on(EVENT_NAMES.UnitDied,                this._onUnitDied.bind(this)),
      svc.event.on(EVENT_NAMES.GeneralDamaged,          this._onGeneralDamaged.bind(this)),
      svc.event.on(EVENT_NAMES.GeneralSkillUsed,        this._onGeneralSkillUsed.bind(this)),
      svc.event.on(EVENT_NAMES.TileBuffSpawned,         this._onTileBuffSpawned.bind(this)),
      svc.event.on(EVENT_NAMES.TileBuffConsumed,        this._onTileBuffConsumed.bind(this)),
      svc.event.on(EVENT_NAMES.BattleEnded,             this._onBattleEnded.bind(this)),
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
    bindNodeEvent(c.deployRuntime?.node, 'generalDuel', externalHandlers.onGeneralDuelRequest);
    input.on(Input.EventType.TOUCH_END, this._onGlobalBoardTouchEnd, this);
    this.unsubs.push(() => input.off(Input.EventType.TOUCH_END, this._onGlobalBoardTouchEnd, this));
    input.on(Input.EventType.MOUSE_UP, this._onGlobalBoardMouseUp, this);
    this.unsubs.push(() => input.off(Input.EventType.MOUSE_UP, this._onGlobalBoardMouseUp, this));
    input.on(Input.EventType.KEY_UP, this._onGlobalKeyUp, this);
    this.unsubs.push(() => input.off(Input.EventType.KEY_UP, this._onGlobalKeyUp, this));
  }

  public unsubscribeEvents(): void {
    this.unsubs.forEach(fn => fn());
    this.unsubs.length = 0;
    this.onBoardPlacement = null;
  }

  // ── 公開 UI 更新 API（供 TurnFlowManager 呼叫）────────────────────────────

  public refreshBattleViews(): void {
    const c = this.ctx;
    if (!c.ctrl) return;
    const state = c.ctrl.state;
    if (state.playerGeneral) c.battleScenePanel?.setTacticSummary(
      buildTacticSummary(state.playerGeneral).label, c.ctrl.getPlayerTacticPointState());
    // 棋盤格狀態與兵種渲染（對應原 BattleScene.refreshBattleViews）
    c.boardRenderer?.renderState(state);
    c.unitRenderer?.renderState(state);
    // 更新 deploy runtime 的技能可發動狀態
    const pg = state.playerGeneral;
    if (pg && c.deployRuntime) {
      c.deployRuntime.updateSkillStatus(pg.canUseSkill() && c.ctrl.canUsePlayerSkills());
    }
  }

  public playTurnBanner(faction: Faction): void {
    // 全域去抖：避免短時間內被多個元件重複呼叫而導致重複提示
    const now = Date.now();
    const last = (globalThis as any).__lastTurnBannerTime ?? 0;
    if (now - last < BATTLE_TURN_FLOW_TIMING.turnBannerDebounceMs) return;
    (globalThis as any).__lastTurnBannerTime = now;

    const message = faction === Faction.Player ? '我方回合開始' : '敵方回合開始';
    const color   = faction === Faction.Player
      ? new Color(90, 190, 255, 255) : new Color(255, 110, 110, 255);
    this.ctx.deployRuntime?.showToast(message, BATTLE_TURN_FLOW_TIMING.turnBannerToastSec, { color });
  }

  public appendLog(text: string): void {
    if (this.ctx.battleScenePanel) {
      this.ctx.battleScenePanel.appendLog(text);
      return;
    }
    this.ctx.battleLogPanel?.append(text);
  }

  public showEnemyThinkingPanel(): void {
    const acPanel = (this.ctx.battleScenePanel?.actionCommandComposite ?? this.ctx.battleScenePanel?.actionCommandPanel) as any;
    acPanel?.showEnemyThinking?.();
  }

  public hideEnemyThinkingPanel(): void {
    const acPanel = (this.ctx.battleScenePanel?.actionCommandComposite ?? this.ctx.battleScenePanel?.actionCommandPanel) as any;
    acPanel?.hideEnemyThinking?.();
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

  private _scheduleBattleUnitHitFeedback(lane: number, depth: number, damageSource?: string): Promise<void> {
    const hitAudioKey = resolveBattleUnitHitSfxKey(damageSource);
    const hitEffectKey = resolveBattleUnitHitEffectKey(damageSource);

    return new Promise((resolve) => {
      if (BATTLE_VISUAL_TIMING.recoilStartDelaySec <= 0) {
        playBattleAudio(hitAudioKey);
        playBattleFlowEffectAtCell(services().effect, this.ctx.boardRenderer, hitEffectKey, lane, depth, 0.9, 0.12);
        resolve();
        return;
      }

      this.scene.scheduleOnce(() => {
        playBattleAudio(hitAudioKey);
        playBattleFlowEffectAtCell(services().effect, this.ctx.boardRenderer, hitEffectKey, lane, depth, 0.9, 0.12);
        resolve();
      }, BATTLE_VISUAL_TIMING.recoilStartDelaySec);
    });
  }


  // ── 私有事件處理（對應 BattleScene 原有 on* 方法）─────────────────────────

  private _onTurnPhaseChanged(snap: { turn: number; playerFood: number; phase?: TurnPhase }): void {
    const c = this.ctx;
    c.deployRuntime?.updateDp(snap.playerFood);
    this.appendLog(`回合更新：第 ${snap.turn} 回合，糧草 ${snap.playerFood}`);
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
    c.deployRuntime?.updateDp(snap.playerFood);
    const side = data.faction === Faction.Player ? '我方' : '敵方';
    const unitName = data.unitName?.trim() || this.toTroopName(data.type);
    this.appendLog(`${side}部署 ${unitName}（路線 ${data.lane + 1}）`);
    if (data.faction === Faction.Player) {
      c.boardRenderer?.clearDeployHint();
      c.deployRuntime?.showToast(`我方已部署 ${unitName}（路線 ${data.lane + 1}）`);
    }
    this.refreshBattleViews();
    const unit = c.ctrl?.state.units.get(data.unitId) ?? null;
    c.unitRenderer?.playDeploy(unit);
  }

  private _onUnitDamaged(data: {
    unitId: string; damage: number; hp: number;
    attackerId: string | null; attackerLane: number | null; attackerDepth: number | null;
    defenderLane: number | null; defenderDepth: number | null; attackerFaction: Faction | null;
    damageSource?: string;
  }): void {
    const c = this.ctx;
    this._observeSpecialActionHit(data);
    const unit = c.ctrl?.state.units.get(data.unitId);
    this.performance.observeUnitDamaged(data.damage, data.attackerFaction, unit?.faction ?? null);
    if (unit) {
      const side = unit.faction === Faction.Player ? '我方' : '敵方';
      const suffix = data.damageSource === 'night-raid-opening-strike'
        ? '（夜襲先制）'
        : data.damageSource
          ? `（${data.damageSource}）`
          : '';
      this.appendLog(`${side}${unit.name} 受到 ${data.damage} 傷害${suffix}，剩餘 HP ${Math.max(0, data.hp)}`);
      this._enqueueCombatVisual(`unit-damage:${data.unitId}`, async () => {
        UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] unit-damage start unit=${data.unitId}`);
        const isRiverBoundaryDamage = typeof data.damageSource === 'string' && data.damageSource.startsWith('river-current:');
        const attackerUnit = data.attackerId ? c.ctrl?.state.units.get(data.attackerId) ?? null : null;
        const attackPromise = data.attackerId && data.defenderLane !== null && data.defenderDepth !== null && !isRiverBoundaryDamage
          ? (UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] attacker-lunge attacker=${data.attackerId} target=${data.unitId}`), c.unitRenderer?.playAttackAnimationAsync(data.attackerId, data.defenderLane, data.defenderDepth) ?? Promise.resolve())
          : Promise.resolve();

        const hitPromise = isRiverBoundaryDamage
          ? (UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] boundary-spin unit=${data.unitId}`), c.unitRenderer?.playBoundaryDamageSpinAsync(data.unitId) ?? Promise.resolve())
          : (UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] defender-hit unit=${data.unitId}`), c.unitRenderer?.playHitAnimationAsync(data.unitId, data.attackerId) ?? Promise.resolve());

        const valuePromise = (UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] damage-float unit=${data.unitId} hp=${data.hp}`), c.unitRenderer?.playValueChangeAsync(unit, data.damage, 'damage') ?? Promise.resolve());

        const hitLane = data.defenderLane ?? unit.lane;
        const hitDepth = data.defenderDepth ?? unit.depth;
        const hitFeedbackPromise = this._scheduleBattleUnitHitFeedback(hitLane, hitDepth, data.damageSource);
        const attackAudioPromise = data.attackerId && attackerUnit && !isRiverBoundaryDamage
          ? this._scheduleBattleAudio(resolveBattleUnitAttackSfxKey(attackerUnit.type))
          : Promise.resolve();

        await Promise.all([attackPromise, hitPromise, valuePromise, hitFeedbackPromise, attackAudioPromise]);

        if (data.hp > 0) {
          UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] state-commit unit=${data.unitId}`);
          this.refreshBattleViews();
        }
        UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] unit-damage end unit=${data.unitId}`);
      });
    }
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
      await (c.unitRenderer?.playAttackAnimationAsync(data.attackerId, target.lane, target.depth) ?? Promise.resolve());
    });
  }

  private _onUnitHealed(data: { unitId: string; amount: number; hp: number }): void {
    const c = this.ctx;
    this._observeSpecialActionHit(data);
    const unit = c.ctrl?.state.units.get(data.unitId);
    this.performance.observeHealed(data.amount, unit?.faction ?? null);
    if (unit) {
      const side = unit.faction === Faction.Player ? '我方' : '敵方';
      this.appendLog(`${side}${unit.name} 回復 ${data.amount}，目前 HP ${Math.max(0, data.hp)}`);
    }
    this.refreshBattleViews();
  }

  private _onUnitMoved(data: {
    unitId: string; lane: number; depth: number; fromLane: number; fromDepth: number;
    swapWithUnitId?: string; swapDuration?: number; isSwapPassenger?: boolean;
    swapPartnerId?: string; swapPassengerFromLane?: number; swapPassengerFromDepth?: number;
    swapPassengerToLane?: number; swapPassengerToDepth?: number;
    forcedMove?: boolean; forcedMoveReason?: string;
  }): void {
    const c = this.ctx;
    this._observeSpecialActionHit(data);
    const unit = c.ctrl?.state.units.get(data.unitId);
    if (unit) {
      const side = unit.faction === Faction.Player ? '我方' : '敵方';
      if (data.swapWithUnitId) {
        this.appendLog(`${side}${unit.name} 與友軍換位後推進到 L${data.lane + 1} D${data.depth}`);
        c.unitRenderer?.playSwapAdvanceAnimation(unit, data.swapWithUnitId, data.fromLane, data.fromDepth, data.swapDuration ?? BATTLE_VISUAL_TIMING.swapAdvanceMinSec,
          data.swapPassengerFromLane, data.swapPassengerFromDepth, data.swapPassengerToLane, data.swapPassengerToDepth);
      } else if (data.forcedMove) {
        this.appendLog(`${side}${unit.name} 受地格影響位移到 L${data.lane + 1} D${data.depth}`);
        c.unitRenderer?.animateMove(unit, data.fromLane, data.fromDepth, data.forcedMoveReason);
        playBattleFlowEffectAtCell(services().effect, c.boardRenderer, BATTLE_FLOW_FX.forcedMove, data.lane, data.depth, 0.95, 0.1);
      } else if (!data.isSwapPassenger) {
        this.appendLog(`${side}${unit.name} 前進到 L${data.lane + 1} D${data.depth}`);
        c.unitRenderer?.animateMove(unit, data.fromLane, data.fromDepth, data.forcedMoveReason);
      }
    }
    this.refreshBattleViews();
  }

  private _onUnitDied(data: { unitId: string; lane: number; depth: number; faction: Faction; type: TroopType }): void {
    const c = this.ctx;
    this.performance.observeUnitDied(data.faction);
    this.appendLog(`單位陣亡：${data.unitId}`);
    c.unitRenderer?.markDyingUnit?.(data.unitId);
    this._enqueueCombatVisual(`unit-death:${data.unitId}`, async () => {
      UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] death start unit=${data.unitId}`);
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

  private _onGeneralDamaged(data: { faction: Faction; hp: number; damage?: number; attackerId?: string | null; isCrit?: boolean; wasDodged?: boolean }): void {
    const c = this.ctx;
    const target = data.faction === Faction.Player ? '我方主將' : '敵方主將';
    const maxHp = c.ctrl?.state.getGeneral(data.faction)?.maxHp ?? 0;
    if (!data.wasDodged) this.performance.observeGeneralDamaged(data.damage ?? 0, data.faction);
    this.specialActions.observeGeneralHp({ faction: data.faction, hp: data.hp, maxHp });
    if (data.wasDodged) {
      this.appendLog(`${target} 閃躲攻擊！`);
      this._enqueueCombatVisual(`general-dodge:${data.faction}`, async () => {
        UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] general-dodge start faction=${data.faction}`);
        await c.unitRenderer?.playGeneralHitAnimationAsync(data.faction, data.attackerId || null);
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
    this.appendLog(`${target} ${critLabel}受到攻擊，剩餘 HP ${Math.max(0, data.hp)}`);
    this._enqueueCombatVisual(`general-damage:${data.faction}`, async () => {
      UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] general-damage start faction=${data.faction}`);
      const attackerUnit = data.attackerId ? c.ctrl?.state.units.get(data.attackerId) ?? null : null;
      const attackPromise = data.attackerId
        ? (UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] attacker-lunge-general attacker=${data.attackerId} targetFaction=${data.faction}`), c.unitRenderer?.playAttackGeneralAnimationAsync(data.attackerId, data.faction) ?? Promise.resolve())
        : Promise.resolve();
      const hitPromise = (UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] general-hit faction=${data.faction}`), c.unitRenderer?.playGeneralHitAnimationAsync(data.faction, data.attackerId || null) ?? Promise.resolve());
      const valuePromise = data.damage && data.damage > 0
        ? (UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] general-damage-float faction=${data.faction} hp=${data.hp}`), c.unitRenderer?.playGeneralValueChangeAsync(data.faction, data.damage, data.isCrit ?? false) ?? Promise.resolve())
        : Promise.resolve();

      const attackAudioPromise = data.attackerId && attackerUnit
        ? this._scheduleBattleAudio(resolveBattleGeneralAttackSfxKey())
        : Promise.resolve();
      const hitAudioPromise = this._scheduleBattleAudio(resolveBattleGeneralHitSfxKey(), BATTLE_VISUAL_TIMING.recoilStartDelaySec);

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

  private _onGeneralSkillUsed(data: { faction: Faction; skillId?: string; skillName?: string; sourceType?: SkillSourceType }): void {
    this.refreshBattleViews();
    const skillId = data.skillId ?? data.skillName ?? null;
    if (!skillId) return;
    this.appendLog(buildBattleSkillUsedMessage(skillId, data.faction, data.sourceType));

    const effectKey = resolveBattleGeneralSkillEffectKey(data.sourceType);
    playBattleFlowEffectAtBoardCenter(services().effect, this.ctx.boardRenderer, effectKey, 1.35);
  }

  private _onTileBuffSpawned(): void { this.refreshBattleViews(); }

  private _onTileBuffConsumed(data: { unitId: string; faction: Faction; lane: number; depth: number; buffText: string; attackDelta: number; hpDelta: number }): void {
    const c = this.ctx;
    const deltaText = [
      data.attackDelta !== 0 ? `ATK ${data.attackDelta > 0 ? '+' : ''}${data.attackDelta}` : '',
      data.hpDelta !== 0 ? `HP ${data.hpDelta > 0 ? '+' : ''}${data.hpDelta}` : '',
    ].filter(Boolean).join(' ');
    const side = data.faction === Faction.Player ? '我方' : '敵方';
    this.appendLog(`${side}吃到 Buff：${data.buffText} ${deltaText}`);
    c.boardRenderer?.playBuffConsumeBurst(data.lane, data.depth);
    c.unitRenderer?.playBuffConsumeValue(data.lane, data.depth, deltaText || data.buffText);
    if (data.attackDelta !== 0 || data.hpDelta !== 0) {
      c.unitRenderer?.playBuffEffect(data.unitId, data.lane, data.depth, data.attackDelta, data.hpDelta);
    }
    this.refreshBattleViews();
  }

  private _onBattleEnded(data: { result: string }): void {
    const c = this.ctx;
    const effectKey = resolveBattleResultEffectKey(data.result);
    if (effectKey) {
      playBattleFlowEffectAtBoardCenter(services().effect, c.boardRenderer, effectKey, data.result === 'draw' ? 1.6 : 1.8);
    }
    this.appendLog(`戰鬥結束：${data.result}`);
    const details = this._settleRosterBattle(data.result as BattleResult);
    c.resultPopup?.showResult(data.result as any, details.length > 0 ? details.join('\n') : undefined);
    c.boardRenderer?.clearDeployHint();
    c.hud?.clearPersistentStatus();
    c.hud?.clearSceneGambitBadge();
    this.refreshBattleViews();
    c.combatVisualQueue.length = 0;
    c.isDrainingCombatVisual = false;
    c.isAdvancingTurn = false;
    c.isDuelPanelActive = false;
    if (c.deployRuntime) c.deployRuntime.node.active = false;
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
   * 回傳給結果彈窗的結算摘要行（出征軍勢六項 + 本場戰績）；內建 demo 戰鬥回傳空陣列。
   */
  private _settleRosterBattle(result: BattleResult): string[] {
    const actions = this.specialActions.finish(result);
    this.specialActions.reset();
    const performance = this.performance.snapshot();
    this.performance.reset();
    const sortie = this.ctx.ctrl?.finishSortie(services().session.military.cityTroops, services().session.military.recruitRegen) ?? null;
    const details = sortie ? [...formatSortieSummary(sortie), formatPerformance(performance)] : [];
    for (const line of details) this.appendLog(line);
    const pgId = this.ctx.pg?.id;
    if (!pgId) return details;
    if (actions.length > 0) {
      this.appendLog(`戰場特定動作：${actions.map(specialActionDisplayName).join('、')}`);
    }
    const specialActions = actions.length > 0 ? { [pgId]: actions } : undefined;
    if (result === 'player-win' && sortie) this._captureEnemyGeneral();
    const stageId = this.ctx.encounterId ?? undefined;
    void services().session.recordBattle([pgId], result, { specialActions, sortie, performance: { [pgId]: performance }, stageId }).then((settlement) => {
      const entry = settlement.entries[0];
      if (entry) {
        this.appendLog(`${this.ctx.pg?.name ?? pgId} 精力 ${entry.vitalityBefore}→${entry.vitalityAfter}，功勳 +${entry.meritGained}`);
        for (const milestone of entry.newMilestones) {
          this.appendLog(`【${milestoneDisplayName(milestone)}】達成！`);
        }
      }
      for (const awakened of settlement.awakenings) {
        this.appendLog(`【覺醒】${awakened.displayName}！`);
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

  private _onUltimateSkillSelected(data: { skillId?: string | null }): void {
    if (!this.ctx.ctrl || this.ctx.isAdvancingTurn) return;
    const skillId = data.skillId ?? null;
    if (!skillId) {
      this.ctx.deployRuntime?.showToast('尚未配置可施放奧義', 1.5);
      return;
    }

    this.ctx.skillTargetingFlow?.beginPlayerSkillFlow(skillId, SkillSourceType.Ultimate, '奧義');
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

  private _onRequestGeneralQuickView(req: { side: 'player' | 'enemy'; isEnemy: boolean }): void {
    const unit = req.side === 'player' ? this.ctx.pg : this.ctx.eg;
    if (!unit) { UCUFLogger.warn(LogCategory.LIFECYCLE, '[BattleUIBridge] _onRequestGeneralQuickView: 武將資料尚未備妥'); return; }
    const data = {
      name: unit.name, title: req.isEnemy ? '敵方主將' : '我方主將',
      faction: req.isEnemy ? '敵方' : '玩家',
      hp: unit.currentHp, maxHp: unit.maxHp,
      atk: Math.round(unit.str * 10), def: Math.round(unit.lea * 10), spd: unit.luk, int: unit.int,
      skills: unit.skillId ? [`技能：${unit.skillId}`] : [], isEnemy: req.isEnemy,
    };
    services().event.emit(EVENT_NAMES.ShowGeneralQuickView, data);
  }

  // ── 戰鬥動畫佇列（委託給 TurnFlowManager 共享 ctx）────────────────────────

  private _enqueueCombatVisual(label: string, action: () => Promise<void> | void): void {
    const c = this.ctx;
    const task: CombatVisualTask = {
      id: ++c.combatVisualTaskId,
      label,
      run: action,
    };
    c.combatVisualQueue.push(task);
    UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] enqueue id=${task.id} label=${label} queue=${c.combatVisualQueue.length}`);
    if (c.isDrainingCombatVisual) return;
    c.isDrainingCombatVisual = true;
    void this._drainCombatVisualQueue();
  }

  private async _drainCombatVisualQueue(): Promise<void> {
    const c = this.ctx;
    UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] drain-start queue=${c.combatVisualQueue.length}`);
    await (c.unitRenderer?.waitForMovementIdle?.(BATTLE_VISUAL_TIMING.movementIdleMaxWaitMs) ?? Promise.resolve());

    while (c.combatVisualQueue.length > 0) {
      const task = c.combatVisualQueue.shift();
      if (!task) {
        break;
      }

      UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] action-start id=${task.id} label=${task.label}`);
      try {
        await Promise.resolve(task.run());
      } catch (error) {
        UCUFLogger.error(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] action-failed id=${task.id} label=${task.label}`, error);
      }
      UCUFLogger.debug(LogCategory.LIFECYCLE, `[BattleUIBridge][CombatVisual] action-end id=${task.id} label=${task.label} remaining=${c.combatVisualQueue.length}`);
    }

    c.isDrainingCombatVisual = false;
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
