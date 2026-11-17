import { SkillSourceType } from '../../shared/SkillRuntimeContract';
import { battleCellLabel } from '../shared/BattleDamageSourceLabel';

/**
 * TurnFlowManager.ts — 回合推進與交互流程管理器
 *
 * [P3-R2b] 從 BattleScene.ts 抽取的回合驅動邏輯，包含：
 *   - 玩家結束回合後的 AI 執行流程
 *   - 部署確認 → 自動進入下一回合
 *   - 武將單挑挑戰系統
 *   - 射線偵測部署邏輯
 *   - 計謀按鈕佔位處理
 *
 * 依賴 BattleSceneContext 中的共享可變狀態（ctx），
 * BattleScene 建立此類並持有引用，委派所有流程控制呼叫。
 *
 * Unity 對照：BattleTurnController (MonoBehaviour, drives turn coroutines)
 */

import { UCUFLogger, LogCategory } from "../../core/utils/UCUFLogger";
import { Color, Component, Node } from 'cc';
import { Faction, GAME_CONFIG } from '../../core/config/Constants';
import { geometry, Vec3 } from 'cc';
import { BattleSceneContext } from './BattleUIBridge';
import { BattleUIBridge } from './BattleUIBridge';
import { DuelChallengeFallback } from './DuelChallengeFallback';
import type { IDuelChallengeLike } from '../../shared/interfaces/IBattleUIComponents';
import { BATTLE_TURN_FLOW_TIMING } from './BattlePresentationTiming';
import { services } from '../../core/managers/ServiceLoader';
import { duelLogType } from '../../core/systems/DailyNewsEngine';

export class TurnFlowManager {
  private _advanceTurnGeneration = 0;
  /**
   * 我方回合已結算、敵方回合還沒收尾。回合推進被中途放掉（安全解鎖、單挑收尾）時要靠它把敵方回合補完，
   * 否則戰鬥流程永遠停在「結算中」，結束回合鍵再也按不動（PROG-2-9350）。
   */
  private _enemyTurnPending = false;
  /** 後備單挑彈窗（僅在 duelChallengePanel 未綁定時建立，整場戰鬥重複使用） */
  private _duelFallback: DuelChallengeFallback | null = null;

  constructor(
    private readonly ctx: BattleSceneContext,
    /** BattleScene Component 本身，用於 scheduleOnce */
    private readonly scene: Component,
    private readonly bridge: BattleUIBridge,
  ) {}

  // ── 回合推進 ─────────────────────────────────────────────────────────────

  public onEndTurn(): void {
    const c = this.ctx;
    if (!c.ctrl || c.isAdvancingTurn || c.isDuelPanelActive) return;
    c.skillTargetingFlow?.cancelPendingSkillTargeting(false);
    if (c.ctrl.isWaitingDuelPlacement) {
      c.deployRuntime?.showToast('請先完成武將出陣', BATTLE_TURN_FLOW_TIMING.shortToastSec);
      return;
    }
    if (!c.ctrl.canAdvanceBattleTurn()) return;

    c.battleLogPanel?.append('執行回合推進');
    c.isAdvancingTurn = true;
    c.boardRenderer?.setDeployHintFaction(Faction.Player);
    this.bridge.refreshBattleViews();
    const gen = ++this._advanceTurnGeneration;
    // 單挑演出（雙方都有動畫時十幾秒）不算在安全時限內：演出結束後重新給一段完整時限，
    // 不然演出一結束時限就到期，後面的敵方回合整段被跳過（PROG-2-9350）
    let duelSeen = false;
    const checkAdvanceSafety = (): void => {
      if (c.isAdvancingTurn && this._advanceTurnGeneration === gen) {
        // 奧義 cut-in 與單挑同理：演出不算在安全時限內，演出結束後重新給一段完整時限（PROG-2-9352）
        if (c.isDuelPanelActive || c.isUltCutinActive) { duelSeen = true; this.scene.scheduleOnce(checkAdvanceSafety, 1); return; }
        if (duelSeen) { duelSeen = false; this.scene.scheduleOnce(checkAdvanceSafety, BATTLE_TURN_FLOW_TIMING.advanceSafetyUnlockSec); return; }
        UCUFLogger.warn(LogCategory.BATTLE, '[TurnFlowManager] isAdvancingTurn safety-reset（超時 20s），強制解鎖');
        this.finalizeAdvance();
      }
    };
    this.scene.scheduleOnce(checkAdvanceSafety, BATTLE_TURN_FLOW_TIMING.advanceSafetyUnlockSec);

    const playerResult = c.ctrl.resolvePlayerTurn();
    this._enemyTurnPending = playerResult === 'ongoing';
    this.scene.scheduleOnce(() => this.pollCombatDrain(0, () => {
      if (!c.isAdvancingTurn || this._advanceTurnGeneration !== gen) return;
      if (playerResult !== 'ongoing') {
        this.finalizeAdvance();
        return;
      }

      this.checkDuelChallenge();
      this.pollCombatDrain(0, () => {
        if (!c.isAdvancingTurn || this._advanceTurnGeneration !== gen) return;
        c.boardRenderer?.setDeployHintFaction(Faction.Enemy);
        this.bridge.playTurnBanner(Faction.Enemy);
        this.bridge.showEnemyThinkingPanel();
        this.scene.scheduleOnce(() => {
          if (!c.isAdvancingTurn || this._advanceTurnGeneration !== gen) return;
          c.ctrl?.resolveEnemyTurn();
          this.scene.scheduleOnce(() => this.pollCombatDrain(0, () => {
            if (!c.isAdvancingTurn || this._advanceTurnGeneration !== gen) return;
            this.checkDuelChallenge();
            this.pollCombatDrain(0, () => {
              if (!c.isAdvancingTurn || this._advanceTurnGeneration !== gen) return;
              c.ctrl?.finalizeEnemyTurn();
              this._enemyTurnPending = false;
              this.finalizeAdvance();
            });
          }), BATTLE_TURN_FLOW_TIMING.postSubturnVisualBufferSec);
        }, BATTLE_TURN_FLOW_TIMING.enemyThinkingLeadInSec);
      });
    }), BATTLE_TURN_FLOW_TIMING.postSubturnVisualBufferSec);
  }

  public finalizeAdvance(): void {
    const c = this.ctx;
    if (!c.isAdvancingTurn) return;
    c.isAdvancingTurn = false;
    this.completePendingEnemyTurn();
    this.bridge.hideEnemyThinkingPanel();
    this.bridge.playTurnBanner(Faction.Player);
    c.boardRenderer?.setDeployHintFaction(Faction.Player);
    this.bridge.refreshBattleViews();
  }

  /**
   * 回合推進沒有走完就被放掉時，把還沒做的敵方回合直接結算完，讓戰鬥流程回到「可下指令」。
   * 兩個呼叫都可重複執行：已結算過的敵方回合不會再算一次。
   */
  private completePendingEnemyTurn(): void {
    if (!this._enemyTurnPending) return;
    this._enemyTurnPending = false;
    const ctrl = this.ctx.ctrl;
    if (!ctrl) return;
    UCUFLogger.warn(LogCategory.BATTLE, '[TurnFlowManager] 回合推進中途結束，補做敵方回合結算');
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
  }

  private pollCombatDrain(attempts: number, onDone: () => void): void {
    const c = this.ctx;
    if (c.isDuelPanelActive || c.isUltCutinActive) {
      this.scene.scheduleOnce(() => this.pollCombatDrain(attempts, onDone), BATTLE_TURN_FLOW_TIMING.combatDrainPollIntervalSec);
      return;
    }

    const maxAttempts = BATTLE_TURN_FLOW_TIMING.combatDrainMaxPollAttempts;
    if (!c.isDrainingCombatVisual || attempts >= maxAttempts) {
      onDone();
      return;
    }

    this.scene.scheduleOnce(() => this.pollCombatDrain(attempts + 1, onDone), BATTLE_TURN_FLOW_TIMING.combatDrainPollIntervalSec);
  }

  /**
   * 玩家部署一支後呼叫。還有部署額度時不自動結束回合：玩家可連續部署，或自己按「結束回合」。
   * 部署額度用完（行動力歸 0）就自動結束回合，不用再按（使用者 2026-11-17，PROG-2-9396）。
   * 「委任」開啟時維持每次部署後自動推進，否則委任 AI 的出兵流程會卡在等玩家按結束回合。
   * 「自動戰鬥」是直接算出勝負（AutoBattleToggled → BattleEnded），不經過這裡。
   */
  public onPlayerDeployed(): void {
    const c = this.ctx;
    const progress = c.ctrl?.getPlayerDeployProgress?.() ?? null;
    const reached = progress?.reached === true;
    const text = !progress
      ? '部署完成，可繼續部署或按結束回合'
      : reached
        ? '本回合部署已用完，自動結束回合'
        : `已部署 ${progress.used}/${progress.limit}，可繼續部署或按結束回合`;
    c.deployRuntime?.showToast(text, BATTLE_TURN_FLOW_TIMING.deployCompletedToastSec);

    const delegate = c.ctrl?.isDelegateEnabled?.() === true;
    if (!delegate && !reached) return;

    const gen = this._advanceTurnGeneration;
    const delay = delegate ? BATTLE_TURN_FLOW_TIMING.autoAdvanceAfterDeploySec : BATTLE_TURN_FLOW_TIMING.autoEndTurnAfterDeployLimitSec;
    this.scene.scheduleOnce(() => {
      if (this._advanceTurnGeneration === gen) this.onEndTurn();
    }, delay);
  }

  public onTactics(): void {
    const general = this.ctx.pg;
    if (!general) {
      this.ctx.deployRuntime?.showToast('尚未載入我方主將戰法', BATTLE_TURN_FLOW_TIMING.shortToastSec);
      return;
    }

    const descriptor = this.ctx.ctrl?.getPlayerSeedTacticDescriptor();
    if (!descriptor || !this.ctx.ctrl?.getPlayerTacticPointState().enabled) {
      this.ctx.deployRuntime?.showToast('計謀點不足或尚未配置戰法');
      return;
    }
    this.ctx.skillTargetingFlow?.beginPlayerSkillFlow(descriptor.skillId, SkillSourceType.SeedTactic, services().i18n.t('ui.battle.skill.source_tactic'));
  }

  // ── 武將出陣請求 ──────────────────────────────────────────────────────────

  public onGeneralDuelRequest(): void {
    const c = this.ctx;
    if (!c.ctrl) return;
    const result = c.ctrl.startGeneralDuel();
    switch (result) {
      case 'ok':
        c.deployRuntime?.showToast('請點擊棋盤上的空格放置武將');
        c.battleLogPanel?.append('武將準備出陣，等待選擇位置...');
        break;
      case 'already-deployed':
        c.deployRuntime?.showToast('武將已在戰場上！');
        break;
      case 'front-blocked':
        c.deployRuntime?.showToast('前排沒有空格，武將無法出陣！');
        break;
      case 'general-dead':
        c.deployRuntime?.showToast('武將已陣亡，無法出陣！');
        break;
      case 'battle-locked':
        c.deployRuntime?.showToast('目前流程尚未允許出陣', BATTLE_TURN_FLOW_TIMING.shortToastSec);
        break;
      case 'battle-ended':
        c.deployRuntime?.showToast('戰鬥已結束，無法出陣！', BATTLE_TURN_FLOW_TIMING.shortToastSec);
        break;
    }
  }

  // ── 射線偵測部署 ──────────────────────────────────────────────────────────

  /**
  * deploy runtime 拖曳放手後呼叫：螢幕座標 → 3D 射線 → 格子部署。
   * 此方法為同步，processDragEnd 依賴其同步性判斷是否成功。
   */
  public doDeployRaycast(screenX: number, screenY: number): void {
    const c = this.ctx;
    UCUFLogger.info(LogCategory.BATTLE, `[TurnFlowManager] doDeployRaycast screen=(${screenX.toFixed(0)},${screenY.toFixed(0)}) advancing=${c.isAdvancingTurn}`);

    if (c.isAdvancingTurn || c.isDuelPanelActive) {
      UCUFLogger.info(LogCategory.BATTLE, '[TurnFlowManager] doDeployRaycast: 回合推進中，忽略');
      return;
    }

    if (c.skillTargetingFlow?.isPending) {
      c.skillTargetingFlow.handleSkillTargetClick(screenX, screenY);
      return;
    }

    const cell = c.raycastBoardCell
      ? c.raycastBoardCell(screenX, screenY)
      : this._legacyRaycastBoardCell(screenX, screenY);
    if (!cell) {
      UCUFLogger.info(LogCategory.BATTLE, '[TurnFlowManager] doDeployRaycast: 未命中任何格子');
      return;
    }
    UCUFLogger.info(LogCategory.BATTLE, `[TurnFlowManager] 命中格子 lane=${cell.lane} depth=${cell.depth}`);

    if (c.ctrl?.isWaitingDuelPlacement) {
      if (cell.depth < 0 || cell.depth >= GAME_CONFIG.GRID_DEPTH) return;
      const stateCell = c.ctrl.state.getCell(cell.lane, cell.depth);
      if (stateCell?.occupantId) { c.deployRuntime?.showToast('無法在後方部署', 1.2); return; }
      const unit = c.ctrl.placeGeneralOnBoard(cell.lane, cell.depth);
      if (unit) {
        c.deployRuntime?.showToast('武將出陣！全軍攻擊力加倍！');
        c.battleLogPanel?.append(`我方武將出陣至 ${battleCellLabel(cell.lane, cell.depth)}`);
        this.bridge.refreshBattleViews();
        c.unitRenderer?.playDeploy(unit);
      }
      return;
    }

    if (cell.depth === 0) {
      UCUFLogger.info(LogCategory.BATTLE, `[TurnFlowManager] 部署到 lane=${cell.lane}`);
      c.deployRuntime?.selectLane(cell.lane);
    } else {
      UCUFLogger.info(LogCategory.BATTLE, `[TurnFlowManager] depth=${cell.depth} 非部署列（需 depth=0），忽略`);
    }
  }

  private _legacyRaycastBoardCell(screenX: number, screenY: number): { lane: number; depth: number } | null {
    // [Fix-Bug1] 使用 ctx.boardCamera 取代 (this.scene as any).getMainCamera?.()
    // 避免 Cocos minifier 混淆 private 方法名稱導致靜默失敗
    const cam = this.ctx.boardCamera;
    if (!cam) {
      UCUFLogger.warn(LogCategory.BATTLE, '[TurnFlowManager] doDeployRaycast: boardCamera 為 null，無法射線偵測。請確認 setupCameraForBoard() 已執行');
      return null;
    }

    const ray = new geometry.Ray();
    cam.screenPointToRay(screenX, screenY, ray);
    UCUFLogger.info(LogCategory.BATTLE, `[TurnFlowManager] ray.d=(${ray.d.x.toFixed(3)},${ray.d.y.toFixed(3)},${ray.d.z.toFixed(3)})`);

    if (Math.abs(ray.d.y) < 0.0001) {
      UCUFLogger.warn(LogCategory.BATTLE, '[TurnFlowManager] doDeployRaycast: 射線平行地面，無法偵測');
      return null;
    }
    const t = -ray.o.y / ray.d.y;
    if (t < 0) {
      UCUFLogger.warn(LogCategory.BATTLE, `[TurnFlowManager] doDeployRaycast: t=${t.toFixed(3)} < 0，射線打到背面`);
      return null;
    }
    const hitPoint = new Vec3();
    Vec3.scaleAndAdd(hitPoint, ray.o, ray.d, t);
    UCUFLogger.info(LogCategory.BATTLE, `[TurnFlowManager] hitPoint=(${hitPoint.x.toFixed(2)},${hitPoint.y.toFixed(2)},${hitPoint.z.toFixed(2)})`);

    const cell = this.ctx.boardRenderer?.getCellFromWorldPos(hitPoint);
    if (!cell) {
      UCUFLogger.info(LogCategory.BATTLE, '[TurnFlowManager] doDeployRaycast: 未命中任何格子（hitPoint 不在棋盤範圍內）');
      return null;
    }
    return cell;
  }


  // ── 武將單挑系統 ──────────────────────────────────────────────────────────

  public checkDuelChallenge(): void {
    const c = this.ctx;
    if (!c.ctrl || c.isDuelPanelActive || c.ctrl.isDuelChallengeResolved()) return;

    let challengerFaction: Faction | null = null;
    if (c.ctrl.isGeneralFacingEnemyGeneral(Faction.Player)) {
      challengerFaction = Faction.Player;
      c.battleLogPanel?.append('我方武將已推進到敵將面前，發起單挑邀請！');
    } else if (c.ctrl.isGeneralFacingEnemyGeneral(Faction.Enemy) && c.ctrl.shouldEnemyInitiateDuel()) {
      // E-7（PROG-2-1470）：HARD 以上敵將局勢不利時先不發起，之後回合再判斷
      challengerFaction = Faction.Enemy;
      c.battleLogPanel?.append('敵方武將已推進到我將面前，發起單挑邀請！');
    }
    if (challengerFaction === null) return;

    if (challengerFaction === Faction.Enemy) {
      this._showDuelChallengePanel();
    } else {
      this._resolveEnemyDuelDecision(challengerFaction);
    }
  }

  private _showDuelChallengePanel(): void {
    const c = this.ctx;
    if (!c.ctrl) return;
    const state = c.ctrl.state;
    const playerGeneralName = state.playerGeneral?.name ?? '我方武將';
    const enemyGeneralName  = state.enemyGeneral?.name  ?? '敵方武將';
    const decision = c.ctrl.evaluateDuelAcceptance(Faction.Enemy);
    const playerScore = 1.0 - decision.score;
    c.isDuelPanelActive = true;

    // 場景未綁定 duelChallengePanel 時（場景檔為 null）改用執行期建立的後備彈窗，
    // 讓玩家真正選擇接受或拒絕；只有建立或顯示失敗才退回自動接受。
    let panel: IDuelChallengeLike;
    try {
      panel = c.duelChallengePanel ?? this._getOrCreateDuelFallback();
      if (!c.duelChallengePanel) panel.node.off('duelAccepted');
      if (!c.duelChallengePanel) panel.node.off('duelRejected');
      panel.show(enemyGeneralName, playerGeneralName, playerScore);
    } catch (error) {
      UCUFLogger.warn(LogCategory.BATTLE, '[TurnFlowManager] 單挑彈窗建立失敗，退回自動接受單挑', error);
      this._onPlayerDuelDecision(true);
      return;
    }
    panel.node.once('duelAccepted', () => this._onPlayerDuelDecision(true), this.scene);
    panel.node.once('duelRejected', () => this._onPlayerDuelDecision(false), this.scene);
  }

  /** 取得或建立後備單挑彈窗；掛在 Canvas 之下（找不到 Canvas 則掛在 BattleScene 節點下） */
  private _getOrCreateDuelFallback(): IDuelChallengeLike {
    if (this._duelFallback && this._duelFallback.node.isValid) return this._duelFallback;
    let host: Node = this.scene.node;
    for (let n: Node | null = this.scene.node; n; n = n.parent) {
      if (n.getComponent('cc.Canvas')) { host = n; break; }
    }
    this._duelFallback = new DuelChallengeFallback(host);
    return this._duelFallback;
  }

  private async _onPlayerDuelDecision(accepted: boolean): Promise<void> {
    const c = this.ctx;
    if (!c.ctrl) return;
    let duelResult: string;
    try { duelResult = await this.bridge.resolveDuelPresentation(Faction.Enemy, accepted); }
    catch (error) {
      UCUFLogger.error(LogCategory.BATTLE, '[TurnFlowManager] 單挑處理失敗', error);
      c.isDuelPanelActive = false; return;
    }
    if (!this.scene.isValid) return;
    this._showDuelResultToast(duelResult, accepted, Faction.Enemy);
    // 只放掉單挑鎖：回合推進還在等單挑結束，接著會自己做敵方回合收尾並解鎖。
    // 以前在這裡直接解鎖，敵方回合收尾被跳過，流程卡在「結算中」（PROG-2-9350）
    c.isDuelPanelActive = false;
    if (c.isAdvancingTurn) { this.bridge.refreshBattleViews(); return; }
    this.bridge.hideEnemyThinkingPanel();
    this.bridge.playTurnBanner(Faction.Player);
    c.boardRenderer?.setDeployHintFaction(Faction.Player);
    this.bridge.refreshBattleViews();
  }

  private async _resolveEnemyDuelDecision(challengerFaction: Faction): Promise<void> {
    const c = this.ctx;
    if (!c.ctrl) return;
    const decision = c.ctrl.evaluateDuelAcceptance(challengerFaction);
    const defenderName = decision.defenderFaction === Faction.Player ? '我將' : '敵將';
    c.battleLogPanel?.append(
      `${defenderName} 單挑評估分數：${decision.score.toFixed(2)}（${decision.accepted ? '接受' : '拒絕'}）`
    );
    if (decision.accepted) {
      c.isDuelPanelActive = true;
      // 發起要有畫面：先報出雙方主將名字，再開始交鋒（PROG-2-9335）
      const state = c.ctrl.state;
      const playerName = state?.playerGeneral?.name ?? '我將';
      const enemyName = state?.enemyGeneral?.name ?? '敵將';
      const startLine = challengerFaction === Faction.Player
        ? `單挑開始！${playerName} 對 ${enemyName}`
        : `單挑開始！${enemyName} 對 ${playerName}`;
      c.deployRuntime?.showToast(startLine, 2.5);
      c.battleLogPanel?.append(startLine);
    }
    let duelResult: string;
    try { duelResult = await this.bridge.resolveDuelPresentation(challengerFaction, decision.accepted); }
    catch (error) {
      UCUFLogger.error(LogCategory.BATTLE, '[TurnFlowManager] 單挑處理失敗', error);
      c.isDuelPanelActive = false; return;
    }
    if (!this.scene.isValid) return;
    c.isDuelPanelActive = false;
    this._showDuelResultToast(duelResult, decision.accepted, decision.defenderFaction);
    this.bridge.refreshBattleViews();
  }

  private _showDuelResultToast(duelResult: string, accepted: boolean, defenderFaction: Faction): void {
    const c = this.ctx;
    // 三國日報素材：單挑勝負（PROG-2-1172）
    const logType = duelLogType(duelResult, accepted);
    if (logType) services().session?.recordPlayerLog(logType);
    if (accepted) {
      if (duelResult === 'player-win') {
        c.deployRuntime?.showToast('單挑成立！我方武將獲勝！', 1.3, { color: new Color(90, 190, 255, 255) });
        c.battleLogPanel?.append('單挑成立！我方武將於單挑中獲勝！');
      } else if (duelResult === 'enemy-win') {
        c.deployRuntime?.showToast('單挑成立！敵方武將獲勝！', 1.3, { color: new Color(255, 110, 110, 255) });
        c.battleLogPanel?.append('單挑成立！敵方武將於單挑中獲勝！');
      } else if (c.ctrl?.getLastDuelWinner?.() === Faction.Player) {
        // 教學戰單挑不打死：贏了重創敵主將、戰鬥繼續（PROG-2-9335）
        // 一般戰鬥：敵主將落荒而逃、敵軍兵力減半；教學戰只給我方獎勵（PROG-2-9369）
        const fled = !c.ctrl?.tutorialBattle;
        c.deployRuntime?.showToast(fled ? '單挑獲勝！敵主將落荒而逃，敵軍兵力折半！我軍士氣大振！' : '單挑獲勝！敵主將身負重傷，我軍士氣大振！', 3, { color: new Color(90, 190, 255, 255) });
        c.battleLogPanel?.append(fled ? '單挑獲勝！敵主將負傷逃走（生命剩 1），敵全軍兵力減半；我方全軍士氣拉滿、暴擊率 +15% 持續 2 回合。' : '單挑獲勝！敵主將身負重傷；我方全軍士氣拉滿、暴擊率 +15% 持續 2 回合。');
      } else if (c.ctrl?.getLastDuelWinner?.() === Faction.Enemy) {
        const fled = !c.ctrl?.tutorialBattle;
        c.deployRuntime?.showToast(fled ? '單挑落敗！我方主將負傷逃回，我軍兵力折半！' : '單挑落敗！我方主將負傷退回，戰鬥繼續！', 3, { color: new Color(255, 110, 110, 255) });
        c.battleLogPanel?.append(fled ? '單挑落敗！我方主將負傷逃回（生命剩 1），我方全軍兵力減半；敵方全軍士氣拉滿、暴擊率 +15% 持續 2 回合。' : '單挑落敗！我方主將負傷；敵方全軍士氣拉滿、暴擊率 +15% 持續 2 回合。');
      } else {
        c.deployRuntime?.showToast('單挑成立！雙方武將交鋒！'); c.battleLogPanel?.append('單挑成立！雙方武將正面對決！');
      }
    } else {
      if (defenderFaction === Faction.Player) {
        c.deployRuntime?.showToast('我將拒絕單挑！我方全軍攻防減半！');
        c.battleLogPanel?.append('我將拒絕單挑！我方全體攻擊力與生命力減半！');
      } else {
        c.deployRuntime?.showToast('敵將拒絕單挑！敵方全軍攻防減半！');
        c.battleLogPanel?.append('敵將拒絕單挑！敵方全體攻擊力與生命力減半！');
      }
    }
  }
}
