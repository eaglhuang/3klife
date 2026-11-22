// @spec-source → 見 docs/cross-reference-index.md
import { EVENT_NAMES, Faction, GAME_CONFIG, TroopType } from "../../core/config/Constants";
import { services } from "../../core/managers/ServiceLoader";
import { GeneralUnit } from "../../core/models/GeneralUnit";
import { TroopUnit, type TroopStats } from "../../core/models/TroopUnit";
import { BattleState } from "../models/BattleState";
import { decideDuelAccept, DUEL_ACCEPT_THRESHOLD } from "../../core/systems/AiDuelDecision";
import { type BattleResult, BATTLE_FRONT_DEPTH } from "../BattleTypes";
import { DUEL_FLEE_HP, DUEL_FLEE_SQUAD_LOSS_RATIO, DUEL_WINNER_BUFF_TURNS, DUEL_WINNER_CRIT_BONUS } from "../shared/DuelOutcome";
import { duelVictoryBuffTurns } from "../shared/DuelVictoryBuff";
import { maximizeMorale } from "../shared/Morale";
import { applyGeneralSortieBoost, clearGeneralSortieBoost } from "../shared/GeneralSortieBoost";
import { resolveTimeUpWinner } from "./BattleVictoryResolver";
import { duelEscapeFailedLine, duelFleeImmuneLine, duelSlainCapturedLine } from "../../core/systems/NumericalScriptLines";
import { rollDuelEscape, type GeneralCaptureCause, type GeneralCaptureRecord } from "../../shared/GeneralCaptureContract";

/**
 * 單挑最多交手回合數（暫定，規格未定義）。達上限仍雙方存活 → 平局，單挑結束、不產生死亡、不套用懲罰。
 * 避免骰子異常（例如全部閃躲）時迴圈永不結束。
 */
export const DUEL_MAX_ROUNDS = 50;

export type { BattleResult };

/** 單挑勝負效果事件（PROG-2-9369）：畫面用來寫戰報與提示 */
export interface DuelOutcomeAppliedEvent {
  winner: Faction;
  loser: Faction;
  /**
   * 雙方主將的名冊實例代號（GeneralUnit.id，與存檔名冊同一個值），戰場外的接收端直接用，不必回頭查戰場狀態——
   * 斬將時整場隨即結束，戰場狀態可能已清（PROG-2-9373）。
   */
  winnerGeneralId: string | null;
  loserGeneralId: string | null;
  /** 雙方主將的武將範本代號（GeneralUnit.templateId，例如 zhang-fei）；不是從名冊來的主將為 null。 */
  winnerTemplateId: string | null;
  loserTemplateId: string | null;
  /** 敗方主將被斬 */
  killed: boolean;
  /** 敗方主將負傷逃走（生命歸 1、全軍兵力減半） */
  fled: boolean;
  /** 教學戰：只給勝方獎勵，不套敗方代價 */
  tutorial: boolean;
}

export interface BattleGeneralDuelFlowContext {
  state: BattleState;
  onUnitKilled: (unit: TroopUnit, killer: TroopUnit | null, svc: ReturnType<typeof services>) => void;
  /** 教學戰：敵將一律接受我方發起的單挑，讓新玩家看得到單挑（PROG-2-9335）。沒給視為否 */
  isEnemyForcedToAcceptDuel?: () => boolean;
  /**
   * 教學戰：單挑打到一方主將生命剩這個比例就分勝負，不打死，所以不會直接結束戰鬥（PROG-2-9335）。
   * 回 0 或沒給＝一般戰鬥，照舊打到一方倒下。
   */
  getDuelHpFloorRatio?: () => number;
  /** 單挑分出勝負後通知（戰中升階入帳名聲用，PROG-2-9394）；教學戰不呼叫 */
  onDuelWon?: (winner: Faction) => void;
  /** 這個陣營的主將不可被擒（試用傭兵，戰敗必定安全撤退）；沒給視為可被擒（PROG-2-9393） */
  isCaptureExempt?: (faction: Faction) => boolean;
}

export class BattleGeneralDuelFlow {
  private serial = 0;

  // 武將單挑狀態（所有權屬於此類別）
  public playerGeneralUnitId: string | null = null;
  public enemyGeneralUnitId: string | null = null;
  public isWaitingDuelPlacement = false;
  public duelRejectedFaction: Faction | null = null;
  public duelChallengeResolved = false;
  /** 上一場成立的單挑誰贏；沒分出勝負或沒打過是 null。不打死的教學戰單挑靠它告訴畫面結果（PROG-2-9335） */
  public lastDuelWinner: Faction | null = null;
  public generalSwapUsedThisTurn: Record<Faction, boolean> = {
    [Faction.Player]: false,
    [Faction.Enemy]:  false,
  };

  constructor(private readonly context: BattleGeneralDuelFlowContext) {}

  public resetForBattle(): void {
    this.playerGeneralUnitId   = null;
    this.enemyGeneralUnitId    = null;
    this.isWaitingDuelPlacement = false;
    this.duelRejectedFaction   = null;
    this.duelChallengeResolved = false;
    this.lastDuelWinner = null;
    this.generalSwapUsedThisTurn[Faction.Player] = false;
    this.generalSwapUsedThisTurn[Faction.Enemy]  = false;
  }

  public resetSwapForTurn(): void {
    this.generalSwapUsedThisTurn[Faction.Player] = false;
    this.generalSwapUsedThisTurn[Faction.Enemy]  = false;
  }

  public getPlayerGeneralUnitId(): string | null {
    return this.playerGeneralUnitId;
  }

  public getEnemyGeneralUnitId(): string | null {
    return this.enemyGeneralUnitId;
  }

  public getDuelRejectedFaction(): Faction | null {
    return this.duelRejectedFaction;
  }

  public isDuelChallengeResolved(): boolean {
    return this.duelChallengeResolved;
  }

  public isGeneralUnit(unitId: string): boolean {
    return unitId === this.playerGeneralUnitId || unitId === this.enemyGeneralUnitId;
  }

  /**
   * 檢查玩家武將是否可以出陣：部署列（depth=0）還有空格就可以。
   * 原本是「部署列有任何我方部隊就鎖」，玩家每回合一派兵單挑鈕就鎖住，整場按不到；
   * 規格找不到那條依據，改成全滿才鎖（總PM 2026-11-16 裁決，PROG-2-9325）。
   */
  public canPlayerGeneralDuel(): boolean {
    if (this.playerGeneralUnitId) return false;
    const pg = this.context.state.playerGeneral;
    if (!pg || pg.isDead()) return false;

    for (let lane = 0; lane < GAME_CONFIG.GRID_LANES; lane++) {
      const cell = this.context.state.getCell(lane, 0);
      if (cell && !cell.occupantId) return true;
    }
    return false;
  }

  /**
   * 開始武將出陣流程：進入等待玩家選擇棋盤空格的狀態。
   * @returns "ok" | "already-deployed" | "front-blocked" | "general-dead"
   */
  public startGeneralDuel(): string {
    const blocked = this.generalDuelBlockReason();
    if (blocked) return blocked;

    this.isWaitingDuelPlacement = true;
    return "ok";
  }

  /**
   * 不改狀態的出陣檢查（單挑鈕鎖定用，PROG-2-1873）：可出陣（含正在等選格）回 null，
   * 否則回與 startGeneralDuel 相同的原因字串。
   */
  public generalDuelBlockReason(): string | null {
    const pg = this.context.state.playerGeneral;
    if (!pg || pg.isDead()) return "general-dead";
    if (this.playerGeneralUnitId) return "already-deployed";
    if (this.isWaitingDuelPlacement) return null;
    if (!this.canPlayerGeneralDuel()) return "front-blocked";
    return null;
  }

  /**
   * 玩家武將放置到指定格子（點擊棋盤後調用）。
   * @returns 成功回傳武將化身的 TroopUnit，失敗回傳 null
   */
  public placeGeneralOnBoard(lane: number, depth: number): TroopUnit | null {
    const cell = this.context.state.getCell(lane, depth);
    if (!cell || cell.occupantId) return null;

    const pg = this.context.state.playerGeneral;
    if (!pg || pg.isDead()) return null;

    const stats: TroopStats = {
      hp: pg.currentHp,
      attack: services().formula.calculateGeneralAttack({ str: pg.str, int: pg.int, lea: pg.lea, maxHp: pg.maxHp }),
      defense: 30,
      moveRange: 2,
      attackRange: 1,
    };
    const id = `player-general-${++this.serial}`;
    const unit = new TroopUnit(id, TroopType.Infantry, Faction.Player, stats, pg.name);
    unit.currentHp = pg.currentHp;
    unit.moveTo(lane, depth);
    this.context.state.addUnit(unit);
    this.playerGeneralUnitId = id;
    this.isWaitingDuelPlacement = false;

    this.context.state.units.forEach(u => {
      if (u.faction === Faction.Player && u.id !== id) {
        applyGeneralSortieBoost(u);
      }
    });

    services().event.emit(EVENT_NAMES.GeneralDuelStart, {
      faction: Faction.Player,
      unitId: id,
      lane,
      depth,
    });
    services().event.emit(EVENT_NAMES.UnitDeployed, {
      unitId: id,
      faction: Faction.Player,
      type: TroopType.Infantry,
      lane,
      depth,
      unitName: unit.name,
    });

    return unit;
  }

  /**
   * 判斷武將是否已到達敵將面前（可觸發單挑邀請）。
   */
  public isGeneralFacingEnemyGeneral(faction: Faction): boolean {
    const unitId = faction === Faction.Player ? this.playerGeneralUnitId : this.enemyGeneralUnitId;
    if (!unitId) return false;
    const unit = this.context.state.units.get(unitId);
    if (!unit) return false;
    const frontDepth = BATTLE_FRONT_DEPTH[faction];
    return unit.depth === frontDepth;
  }

  /** 我方主將棋子是否已走到己方數來第 row 排（教學戰提早發起單挑邀請用，PROG-2-9331）；第 1 排是 depth 0 */
  public hasPlayerGeneralReachedRow(row: number): boolean {
    const unit = this.playerGeneralUnitId ? this.context.state.units.get(this.playerGeneralUnitId) : null;
    return !!unit && unit.depth >= row - 1;
  }

  /**
   * 處理單挑邀請結果。
   */
  public resolveDuelChallenge(challengerFaction: Faction, accepted: boolean): void {
    const svc = services();
    const defenderFaction = challengerFaction === Faction.Player ? Faction.Enemy : Faction.Player;
    this.duelChallengeResolved = true;

    svc.event.emit(EVENT_NAMES.GeneralDuelChallenge, {
      challengerFaction,
      defenderFaction,
    });

    if (accepted) {
      svc.event.emit(EVENT_NAMES.GeneralDuelAccepted, {
        challengerFaction,
        defenderFaction,
      });
      this.resolveAcceptedGeneralDuel(challengerFaction, defenderFaction, svc);
      return;
    }

    this.duelRejectedFaction = defenderFaction;
    this.applyDuelPenalty(defenderFaction);
    svc.event.emit(EVENT_NAMES.GeneralDuelRejected, {
      rejectedFaction: defenderFaction,
    });
    // 結果由 BattleController.resolveDuelChallenge() 呼叫 checkVictory() 統一處理
  }

  /**
   * 單挑接受決策（由防守方視角評估）：
   * score = 0.45 * 防守方主將血量（currentHP / maxHP）+ 0.35 * 防守方場上分隊現存兵力 / 上限 + 0.2 * 總戰力優勢（PROG-2-1323）
   */
  public evaluateDuelAcceptance(challengerFaction: Faction): {
    accepted: boolean;
    score: number;
    defenderFaction: Faction;
  } {
    const defenderFaction = challengerFaction === Faction.Player ? Faction.Enemy : Faction.Player;
    const challengerGeneral = this.context.state.getGeneral(challengerFaction);
    const defenderGeneral = this.context.state.getGeneral(defenderFaction);

    if (!challengerGeneral || !defenderGeneral) {
      return { accepted: false, score: 0, defenderFaction };
    }

    // E-7 字面：血量項為防守方主將 currentHP / maxHP
    const defenderHpPct = Math.max(0, defenderGeneral.currentHp) / Math.max(1, defenderGeneral.maxHp);

    const challengerUnits = this.collectFactionUnits(challengerFaction);
    const defenderUnits = this.collectFactionUnits(defenderFaction);
    // 兵力項：防守方場上分隊的現存兵力 / 兵力上限（規格 SquadTroops / MaxTroops；使用者 2026-11-17 裁決改回規格，PROG-2-9384）。
    // 已陣亡的分隊不在場上，不列入分母；場上沒有分隊時為 0。
    const defenderTroopHp = defenderUnits.reduce((sum, u) => sum + Math.max(0, u.currentHp), 0);
    const defenderTroopMaxHp = defenderUnits.reduce((sum, u) => sum + Math.max(0, u.getEffectiveMaxHp()), 0);
    const squadRatio = defenderTroopMaxHp > 0 ? Math.min(1, defenderTroopHp / defenderTroopMaxHp) : 0;

    const calcPower = (units: TroopUnit[], general: GeneralUnit | null): number => {
      const unitPower = units.reduce((sum, u) => {
        return sum + u.getEffectiveAttack() + u.getEffectiveMaxHp() * 0.1;
      }, 0);
      const generalPower = general
        ? (Math.max(0, general.currentHp) * 0.12 + general.attackBonus * 120)
        : 0;
      return unitPower + generalPower;
    };

    const challengerPower = calcPower(challengerUnits, challengerGeneral);
    const defenderPower = calcPower(defenderUnits, defenderGeneral);
    const powerAdvantage = defenderPower / Math.max(0.0001, challengerPower + defenderPower);

    const score = 0.45 * defenderHpPct + 0.35 * squadRatio + 0.2 * powerAdvantage;
    // 防守方是敵方 AI：走 E-7 接受判定（依難度閾值，含抖動）；玩家防守方沿用一般門檻
    const forced = defenderFaction === Faction.Enemy && (this.context.isEnemyForcedToAcceptDuel?.() ?? false);
    const accepted = forced ? true : defenderFaction === Faction.Enemy
      ? decideDuelAccept(
        { hpRatio: defenderHpPct, squadRatio, powerRatio: powerAdvantage },
        services().session.randomSource(),
        this.context.state.aiDuelAcceptThreshold ?? DUEL_ACCEPT_THRESHOLD,
      )
      : score >= DUEL_ACCEPT_THRESHOLD;

    return {
      accepted,
      score,
      defenderFaction,
    };
  }

  /**
   * 武將化身陣亡 → 同步至武將本體，標記武將死亡。
   */
  public onGeneralUnitKilled(faction: Faction): void {
    const svc = services();
    const general = this.context.state.getGeneral(faction);
    if (general) {
      general.currentHp = 0;
      svc.event.emit(EVENT_NAMES.GeneralDamaged, {
        faction,
        hp: 0,
        damage: 0,
        attackerId: null,
      });
    }
    if (faction === Faction.Player) {
      this.playerGeneralUnitId = null;
    } else {
      this.enemyGeneralUnitId = null;
    }
    // Q5=A：主將倒下時全軍加倍消失
    clearGeneralSortieBoost(this.context.state.units.values(), faction);
  }

  private resolveAcceptedGeneralDuel(
    challengerFaction: Faction,
    defenderFaction: Faction,
    svc: ReturnType<typeof services>,
  ): void {
    const challengerGeneral = this.context.state.getGeneral(challengerFaction);
    const defenderGeneral = this.context.state.getGeneral(defenderFaction);
    if (!challengerGeneral || !defenderGeneral) return;

    const challengerUnitId = challengerFaction === Faction.Player ? this.playerGeneralUnitId : this.enemyGeneralUnitId;
    const defenderUnitId = defenderFaction === Faction.Player ? this.playerGeneralUnitId : this.enemyGeneralUnitId;
    const challengerUnit = challengerUnitId ? this.context.state.units.get(challengerUnitId) ?? null : null;
    const defenderUnit = defenderUnitId ? this.context.state.units.get(defenderUnitId) ?? null : null;

    const getAttack = (general: GeneralUnit, unit: TroopUnit | null): number => {
      if (unit) return unit.getEffectiveAttack();
      return svc.formula.calculateGeneralAttack({ str: general.str, int: general.int, lea: general.lea, maxHp: general.maxHp });
    };

    const challengerAttack = getAttack(challengerGeneral, challengerUnit);
    const defenderAttack = getAttack(defenderGeneral, defenderUnit);

    // 教學戰的生命下限：打到下限就算輸，傷害不會把生命壓到下限以下
    const floorRatio = Math.max(0, Math.min(0.9, this.context.getDuelHpFloorRatio?.() ?? 0));
    const floorOf = (general: GeneralUnit): number => floorRatio > 0 ? Math.min(general.currentHp, Math.ceil(general.maxHp * floorRatio)) : 0;
    const challengerFloor = floorOf(challengerGeneral);
    const defenderFloor = floorOf(defenderGeneral);
    const capDamage = (general: GeneralUnit, floor: number, damage: number): number =>
      floor > 0 ? Math.min(damage, Math.max(0, general.currentHp - floor)) : damage;
    // 一般戰鬥的敗逃線（使用者 2026-11-17 裁決，PROG-2-9369）：生命掉到這條線以下就落荒而逃，不再打到死；
    // 一擊直接打到 0 仍算斬將。進場時已低於這條線的主將至少要再挨一下才會逃
    const fleeRatio = floorRatio > 0 ? 0 : Math.max(0, Math.min(0.9, GAME_CONFIG.duelFleeHpRatio));
    const fleeLineOf = (general: GeneralUnit): number => fleeRatio > 0 ? Math.min(general.currentHp - 1, Math.ceil(general.maxHp * fleeRatio)) : 0;
    const challengerFleeLine = fleeLineOf(challengerGeneral);
    const defenderFleeLine = fleeLineOf(defenderGeneral);
    const fleeLineFor = (general: GeneralUnit): number => general === challengerGeneral ? challengerFleeLine : defenderFleeLine;
    const isBeaten = (general: GeneralUnit, floor: number): boolean => general.isDead()
      || (floor > 0 && general.currentHp <= floor)
      || (fleeLineFor(general) > 0 && general.currentHp <= fleeLineFor(general));

    for (let round = 0; round < DUEL_MAX_ROUNDS; round += 1) {
      if (isBeaten(challengerGeneral, challengerFloor) || isBeaten(defenderGeneral, defenderFloor)) break;
      const defenderDodged = svc.formula.rollDodge(defenderGeneral.luk);
      let attackDmg = challengerAttack;
      let challengerCrit = false;
      if (defenderDodged) {
        attackDmg = 0;
      } else {
        challengerCrit = svc.formula.rollCrit(challengerGeneral.luk);
        if (challengerCrit) {
          attackDmg = Math.floor(attackDmg * GAME_CONFIG.GENERAL_CRIT_DAMAGE_MULTIPLIER);
        }
        // 部隊攻擊力可能帶小數（士氣），主將 HP 取整；命中至少 1（規則不變，只取整）
        attackDmg = capDamage(defenderGeneral, defenderFloor, Math.max(1, Math.round(attackDmg)));
        defenderGeneral.takeDamage(attackDmg);
      }
      svc.event.emit(EVENT_NAMES.GeneralDamaged, {
        faction: defenderFaction,
        hp: defenderGeneral.currentHp,
        damage: attackDmg,
        attackerId: challengerUnit?.id ?? null,
        isCrit: challengerCrit,
        wasDodged: defenderDodged,
      });

      if (defenderUnit) {
        defenderUnit.currentHp = defenderGeneral.currentHp;
      }

      if (isBeaten(defenderGeneral, defenderFloor)) break;

      const challengerDodged = svc.formula.rollDodge(challengerGeneral.luk);
      let defenseDmg = defenderAttack;
      let defenderCrit = false;
      if (challengerDodged) {
        defenseDmg = 0;
      } else {
        defenderCrit = svc.formula.rollCrit(defenderGeneral.luk);
        if (defenderCrit) {
          defenseDmg = Math.floor(defenseDmg * GAME_CONFIG.GENERAL_CRIT_DAMAGE_MULTIPLIER);
        }
        // 同上：主將 HP 取整，命中至少 1
        defenseDmg = capDamage(challengerGeneral, challengerFloor, Math.max(1, Math.round(defenseDmg)));
        challengerGeneral.takeDamage(defenseDmg);
      }
      svc.event.emit(EVENT_NAMES.GeneralDamaged, {
        faction: challengerFaction,
        hp: challengerGeneral.currentHp,
        damage: defenseDmg,
        attackerId: defenderUnit?.id ?? null,
        isCrit: defenderCrit,
        wasDodged: challengerDodged,
      });

      if (challengerUnit) {
        challengerUnit.currentHp = challengerGeneral.currentHp;
      }
    }

    const challengerBeaten = isBeaten(challengerGeneral, challengerFloor);
    const defenderBeaten = isBeaten(defenderGeneral, defenderFloor);
    this.lastDuelWinner = challengerBeaten === defenderBeaten ? null : challengerBeaten ? defenderFaction : challengerFaction;
    if (this.lastDuelWinner !== null) {
      this.applyDuelOutcome(this.lastDuelWinner, challengerFaction, floorRatio > 0, svc);
    }

    if (challengerGeneral.isDead() && challengerUnit) {
      this.onGeneralUnitKilled(challengerFaction);
      this.context.onUnitKilled(challengerUnit, null, svc);
    }

    if (defenderGeneral.isDead() && defenderUnit) {
      this.onGeneralUnitKilled(defenderFaction);
      this.context.onUnitKilled(defenderUnit, null, svc);
    }
    // 結果由 BattleController.resolveDuelChallenge() 呼叫 checkVictory() 統一處理
  }

  /**
   * 單挑分出勝負後的效果（doc_spec_0314 §4，PROG-2-9369）。
   * 勝方：全軍士氣拉滿、暴擊率 +15% 持續 2 回合。
   * 敗方負傷逃走：主將生命歸 1、全軍兵力減半、當回合不可被攻擊；教學戰不套敗方代價（使用者 2026-11-17 裁決）。
   * 敗方被斬：戰鬥由 checkVictory 直接結束，這裡只發事件。
   */
  private applyDuelOutcome(winner: Faction, actingFaction: Faction, tutorial: boolean, svc: ReturnType<typeof services>): void {
    const loser = winner === Faction.Player ? Faction.Enemy : Faction.Player;
    const loserGeneral = this.context.state.getGeneral(loser);
    if (!loserGeneral) return;
    const killed = loserGeneral.isDead();
    const loserUnitId = loser === Faction.Player ? this.playerGeneralUnitId : this.enemyGeneralUnitId;

    this.context.state.units.forEach((unit) => {
      if (unit.faction === winner && !unit.isDead()) maximizeMorale(unit);
    });
    this.context.state.setDuelVictoryBuff(winner, {
      critBonus: DUEL_WINNER_CRIT_BONUS,
      remainingTurns: duelVictoryBuffTurns(DUEL_WINNER_BUFF_TURNS, winner === actingFaction),
    });

    const fled = !killed && !tutorial;
    const winnerGeneral = this.context.state.getGeneral(winner);
    // 敗逃要過脫逃判定（使用者 2026-11-17 裁決 Q1 甲，PROG-2-9393）：沒逃掉就被擒，主將離場、該方戰敗
    const captureExempt = this.context.isCaptureExempt?.(loser) === true;
    const escaped = fled && (captureExempt || rollDuelEscape(loserGeneral.luk, winnerGeneral?.luk ?? 0, svc.session.randomSource()));
    if (fled && !escaped) {
      svc.event.emit(EVENT_NAMES.BattleSkillNotice, duelEscapeFailedLine(loserGeneral.name, winnerGeneral?.name ?? null));
      loserGeneral.takeDamage(loserGeneral.currentHp);
      const loserUnit = loserUnitId ? this.context.state.units.get(loserUnitId) ?? null : null;
      if (loserUnit) loserUnit.currentHp = 0;
      svc.event.emit(EVENT_NAMES.GeneralDamaged, { faction: loser, hp: 0, damage: 0, attackerId: null });
      this.recordCapture(loser, 'duel-escape-failed', svc);
    } else if (fled) {
      // 敗逃當回合不可被攻擊，下回合起恢復；雙方都適用（PROG-2-9386）
      this.context.state.duelFleeImmuneTurns.set(loser, svc.battle.getSnapshot().turn);
      svc.event.emit(EVENT_NAMES.BattleSkillNotice, duelFleeImmuneLine(loserGeneral.name));
      loserGeneral.currentHp = Math.min(loserGeneral.currentHp, DUEL_FLEE_HP);
      this.context.state.units.forEach((unit) => {
        if (unit.faction !== loser || unit.isDead()) return;
        if (unit.id === loserUnitId) { unit.currentHp = loserGeneral.currentHp; return; }
        // 兵力減半，至少留 1，不在這裡把部隊打死（陣亡流程不走這條路）
        unit.currentHp = Math.max(1, Math.floor(unit.currentHp * (1 - DUEL_FLEE_SQUAD_LOSS_RATIO)));
      });
      svc.event.emit(EVENT_NAMES.GeneralDamaged, { faction: loser, hp: loserGeneral.currentHp, damage: 0, attackerId: null });
    }
    if (killed && !tutorial && !captureExempt) {
      svc.event.emit(EVENT_NAMES.BattleSkillNotice, duelSlainCapturedLine(loserGeneral.name, winnerGeneral?.name ?? null));
      this.recordCapture(loser, 'duel-slain', svc);
    }
    const payload: DuelOutcomeAppliedEvent = {
      winner, loser,
      winnerGeneralId: winnerGeneral?.id ?? null,
      loserGeneralId: loserGeneral.id,
      winnerTemplateId: winnerGeneral?.templateId ?? null,
      loserTemplateId: loserGeneral.templateId ?? null,
      killed, fled, tutorial,
    };
    svc.event.emit(EVENT_NAMES.DuelOutcomeApplied, payload);
    if (!tutorial) this.context.onDuelWon?.(winner);
  }

  /** 記下主將被擒並發事件（PROG-2-9393）；同一陣營一場只記一筆，先發生的為準 */
  public recordCapture(captured: Faction, cause: GeneralCaptureCause, svc: ReturnType<typeof services>, tutorial = false): GeneralCaptureRecord | null {
    const state = this.context.state;
    if (state.generalCaptures.has(captured)) return null;
    const capturedGeneral = state.getGeneral(captured);
    if (!capturedGeneral) return null;
    const captorGeneral = state.getGeneral(captured === Faction.Player ? Faction.Enemy : Faction.Player);
    const record: GeneralCaptureRecord = {
      capturedFaction: captured,
      capturedGeneralId: capturedGeneral.id,
      capturedTemplateId: capturedGeneral.templateId ?? null,
      captorGeneralId: captorGeneral?.id ?? null,
      captorTemplateId: captorGeneral?.templateId ?? null,
      cause, tutorial,
      turn: svc.battle.getSnapshot().turn,
    };
    state.generalCaptures.set(captured, record);
    svc.event.emit(EVENT_NAMES.GeneralCaptured, record);
    return record;
  }

  private applyDuelPenalty(faction: Faction): void {
    this.context.state.units.forEach(unit => {
      if (unit.faction !== faction) return;
      const atkLoss = -Math.floor(unit.getEffectiveAttack() / 2);
      unit.attackBonus += atkLoss;
      const hpLoss = -Math.floor(unit.getEffectiveMaxHp() / 2);
      unit.maxHpBonus += hpLoss;
      unit.currentHp = Math.max(1, Math.floor(unit.currentHp / 2));
      unit.currentHp = Math.min(unit.currentHp, unit.getEffectiveMaxHp());
      unit.currentHp = Math.max(1, unit.currentHp);
    });

    const general = this.context.state.getGeneral(faction);
    if (general) {
      general.currentHp = Math.max(1, Math.floor(general.currentHp / 2));
    }

    services().event.emit(EVENT_NAMES.DuelPenaltyApplied, { faction });
  }

  private checkVictory(): BattleResult {
    const svc = services();
    const pg = this.context.state.playerGeneral;
    const eg = this.context.state.enemyGeneral;

    // 回合用盡的勝方與 resolveBattleVictory 一致（教學戰是玩家勝）
    const timeUp = svc.battle.isTurnLimitReached() && !(pg?.isDead() ?? false) && !(eg?.isDead() ?? false);
    // 依戰果判定（PROG-2-9423）與主流程共用 resolveTimeUpWinner
    const timeUpWinner = timeUp ? resolveTimeUpWinner(this.context.state).winner : null;
    const playerLost = (pg?.isDead() ?? false) || timeUpWinner === 'enemy-win';
    const enemyLost = (eg?.isDead() ?? false) || timeUpWinner === 'player-win';

    let result: BattleResult = "ongoing";
    if (playerLost && enemyLost) result = "draw";
    else if (playerLost) result = "enemy-win";
    else if (enemyLost) result = "player-win";

    // BattleEnded 事件由 BattleController.checkVictory() 統一發出，此處不 emit
    return result;
  }

  private collectFactionUnits(faction: Faction): TroopUnit[] {
    const result: TroopUnit[] = [];
    this.context.state.units.forEach(unit => {
      if (unit.faction === faction) result.push(unit);
    });
    return result;
  }
}
