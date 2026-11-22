// @spec-source → 主戰場UI規格書.md (doc_ui_0001)；PROG-2-1429 依建檔紀錄補標出處
/**
 * BattlePresentationTiming.ts
 *
 * 所有為了「戰場演出節奏」而存在的等待秒數 / 輪詢毫秒 / 提示時長，
 * 都集中在這個檔案維護。
 *
 * 調整原則：
 * 1. 想微調手感時，優先只改這裡。
 * 2. 這些數值允許設成 0，方便做極速 QA 或只驗證流程正確性。
 * 3. BattleScene / BattleUIBridge / TurnFlowManager / UnitRenderer 都應共用這份設定，避免雙路徑漂移。
 */

export const BATTLE_TURN_FLOW_TIMING = {
  /**
   * 玩家部署完成後，自動進入回合推進前的等待秒數。
   * 只給「委任」模式用：一般玩家部署後不自動結束回合，由玩家自己按「結束回合」，
   * 才能先看到部署結果並可連續部署到上限。
   */
  autoAdvanceAfterDeploySec: 2.0,
  /** 部署額度用完後，自動結束回合前的等待秒數（讓玩家看到最後一隊落地，PROG-2-9397）。 */
  autoEndTurnAfterDeployLimitSec: 0.8,
  /** 自動代打（PROG-2-9707）：玩家回合開始後，自動按結束回合前的等待秒數（讓玩家看到上一回合的結果與委任部署）。 */
  autoPlayEndTurnDelaySec: 1.0,
  /** 自動代打遇到敵將發起單挑時，代為接受或拒絕前的停頓秒數（讓玩家看到決定，PROG-2-9712）。 */
  autoDuelDecisionDelaySec: 1.5,
  /** 敵方子回合開始前，保留給「敵軍思考中」提示的前置秒數。 */
  enemyThinkingLeadInSec: 2.0,
  /** 子回合邏輯跑完後，最少等待多久再開始檢查戰鬥視覺佇列。 */
  postSubturnVisualBufferSec: 2.3,
  /** 戰鬥視覺佇列的輪詢間隔秒數。 */
  combatDrainPollIntervalSec: 0.5,
  /** 戰鬥視覺佇列的最多輪詢次數，避免互動永久鎖死。 */
  combatDrainMaxPollAttempts: 12,
  /** 回合推進安全解鎖秒數；超時後會強制回到可操作狀態。 */
  advanceSafetyUnlockSec: 20,
  /**
   * 單挑／奧義 cut-in 演出旗標連續亮著的上限秒數（PROG-2-9404）。
   * 演出不算在 advanceSafetyUnlockSec 內，但演出自己卡死（旗標永不放掉）時，超過這個秒數就強制放掉旗標並解鎖，
   * 否則安全解鎖與戰鬥動畫輪詢都會無限等下去。等玩家決定單挑接不接的時間不計入。
   */
  presentationMaxWaitSec: 45,
  /** 回合開始 Banner 的去抖毫秒，避免短時間重複跳出。 */
  turnBannerDebounceMs: 2500,
  /** 回合開始 Banner 的 Toast 顯示秒數（舊版部署面板沒有橫幅時的退路）。 */
  turnBannerToastSec: 1.0,
  /** 回合開始橫幅的顯示秒數（含淡入淡出）。 */
  turnBannerSec: 1.4,
  /** 玩家部署完成提示的顯示秒數。 */
  deployCompletedToastSec: 1.8,
  /** 敵軍思考提示的顯示秒數。 */
  enemyThinkingToastSec: 2.0,
  /** 一般短提示秒數。 */
  shortToastSec: 1.5,
  /** 需要多讀一點內容的摘要提示秒數。 */
  summaryToastSec: 2.0,
} as const;

export const BATTLE_VISUAL_TIMING = {
  /** 部署登場縮放動畫秒數。 */
  deployAppearSec: 0.22,
  /** 一般直線移動動畫秒數。 */
  moveAdvanceSec: 2.0,
  /** 同一回合連走多格被合併成一段滑行時，每多一格追加的秒數。 */
  moveAdvanceExtraCellSec: 0.25,
  /** 合併滑行最多計入幾格的追加時間；總長 = moveAdvanceSec + (格數-1) * 追加秒數，上限約等於 movementIdleMaxWaitMs。 */
  moveAdvanceMaxCells: 3,
  /** 換位推進動畫的最短秒數。 */
  swapAdvanceMinSec: 2.0,
  /** 死亡消融動畫秒數。 */
  deathDissolveSec: 0.4,
  /** 死亡時 UI 文字淡出秒數。 */
  deathLabelFadeSec: 0.3,
  /** Death async API 對外回報完成的秒數。 */
  deathAwaitSec: 0.4,
  /** 一般兵攻擊後，對外回報完成的秒數。 */
  attackAwaitSec: 0.28,
  /** 騎兵衝鋒後，對外回報完成的秒數。 */
  cavalryAttackAwaitSec: 0.4,
  /** 受擊動畫對外回報完成的秒數。 */
  hitAwaitSec: 0.32,
  /** 邊界扣血時的轉圈演出秒數。 */
  boundaryDamageSpinSec: 0.48,
  /** 主將飄字對外回報完成的秒數。 */
  generalValueAwaitSec: 0.12,
  /** 一般單位飄字對外回報完成的秒數。 */
  unitValueAwaitSec: 0.24,
  /** 等待移動動畫排空時，最多等待多久（毫秒）。 */
  movementIdleMaxWaitMs: 2500,
  /**
   * 戰鬥動畫佇列單一任務的真實時間上限（毫秒，PROG-2-9404）。任務內的 await 若永不回來（資源載入失敗、節點被銷毀），
   * 超過就記 warn 並略過，佇列才會繼續；否則排在後面的奧義 cut-in 永遠不會播、回合推進也一直等。
   */
  combatVisualTaskMaxMs: 20000,
  /** 單挑演出（含載入 Spine 骨架與交鋒動畫）的真實時間上限（毫秒）；超過就強制收尾，單挑旗標才會放掉。 */
  duelPresentationMaxMs: 40000,
  /** 戰鬥單位／主將 3D 模型載入的等待上限（毫秒）；超過就改用戰術棋子，不再等。 */
  modelLoadMaxMs: 15000,
  /** 等待移動動畫排空時，輪詢間隔（毫秒）。 */
  movementIdlePollMs: 50,
  /** 受擊 Rim Flash 持續時間（毫秒）。PROG-2-9401：改為白閃，時間與 hitFlashSec 一致。 */
  hitRimFlashMs: 80,
  /** 受擊閃白持續秒數（全身一次，線性衰減）。PROG-2-9401。 */
  hitFlashSec: 0.08,
  /** 受擊左右抖動總秒數（約兩個來回，結束必回原位）。 */
  hitShakeSec: 0.15,
  /** 受擊抖動幅度，佔格寬的比例（4～6% 之間取中）。 */
  hitShakeAmplitudeRatio: 0.05,
  /**
   * 受擊後退距離，佔格寬的比例（PROG-2-9412）。Spine 單位以前的後退只動到 3D 子節點、畫面上的小兵沒動，
   * 改由 Spine 疊層自己往後推；12% 約一格的八分之一，看得出被打退又不會退出格子。
   */
  hitRecoilRatio: 0.12,
  /** 命中頓格秒數（PROG-2-9412）：打中那一刻攻守雙方的骨架動畫定格，打擊才有「卡一下」的重量感。 */
  hitStopSec: 0.06,
  /** 重擊／爆擊的畫面震動總秒數。 */
  hitScreenShakeSec: 0.12,
  /** 重擊／爆擊的畫面震動幅度（世界單位；一格約 1.0，所以 0.05 只有一格的 5%，刻意很小）。 */
  hitScreenShakeStrength: 0.05,
  /** 單次傷害達到目標最大血量的這個比例就算「重擊」（爆擊一律算重擊）。 */
  heavyHitMaxHpRatio: 0.2,
  /** 傷害數字延後跳出的時間（毫秒），讓飄字對齊撞擊點。 */
  valuePopupDelayMs: 80,
  /** 一般攻擊前衝秒數。 */
  attackBumpForwardSec: 0.08,
  /** 一般攻擊命中頓幀秒數。 */
  attackHitStopSec: 0.08,
  /** 一般攻擊回位秒數。 */
  attackRecoverSec: 0.12,
  /** 受擊開始延遲秒數，確保攻擊方先撞上來。 */
  recoilStartDelaySec: 0.08,
  /** 受擊彈退秒數。 */
  recoilPushSec: 0.06,
  /** 受擊頓幀秒數。 */
  recoilHitStopSec: 0.06,
  /** 受擊回位秒數。 */
  recoilRecoverSec: 0.12,
  /** 騎兵起跳蓄勢秒數。 */
  cavalryLiftSec: 0.11,
  /** 騎兵前衝撞擊秒數。 */
  cavalryImpactSec: 0.08,
  /** 騎兵撞擊頓幀秒數。 */
  cavalryHitStopSec: 0.08,
  /** 騎兵收勢回位秒數。 */
  cavalryRecoverSec: 0.13,
  /** 飄字時小兵抖動上升秒數。 */
  unitValueSoldierPopUpSec: 0.06,
  /** 飄字時小兵抖動回落秒數。 */
  unitValueSoldierPopDownSec: 0.1,
  /** 飄字時主物件縮放壓縮秒數。 */
  unitValueScaleInSec: 0.08,
  /** 飄字時主物件縮放回彈秒數。 */
  unitValueScaleOutSec: 0.12,
} as const;

/** 抖動的關鍵位移倍率：右、左、小右、小左、歸零（兩個來回，幅度遞減，最後一步回到原位）。 */
const HIT_SHAKE_KEYS: ReadonlyArray<number> = [1, -1, 0.6, -0.6, 0];

export interface HitShakeStep {
  /** 這一步的秒數。 */
  durationSec: number;
  /** 這一步結束時相對原位的水平位移（單位與 amplitude 相同）。 */
  offsetX: number;
}

/**
 * 受擊抖動的分段位移（純函式，給 tween 用）。總長 = totalSec；最後一步一定是 0，所以不會改變格子位置。
 * @param amplitude 最大位移，通常是格寬 * hitShakeAmplitudeRatio
 */
export function buildHitShakeSteps(amplitude: number, totalSec: number = BATTLE_VISUAL_TIMING.hitShakeSec): HitShakeStep[] {
  const durationSec = totalSec / HIT_SHAKE_KEYS.length;
  return HIT_SHAKE_KEYS.map(k => ({ durationSec, offsetX: amplitude * k }));
}

/**
 * 在抖動的第 elapsedSec 秒時的水平位移（純函式，不配置物件，給逐幀更新的 Spine 疊層用）。
 * 與 buildHitShakeSteps 同一組關鍵點，各步之間線性內插；超出範圍回 0。
 */
/**
 * 量受擊格寬用的相鄰排（PROG-2-9482）：平常量往後一排；最後一排的下一排在棋盤外，
 * 投影出來的距離約是正常的 4 倍（實測 398px 對 101px），抖動與後退跟著放大 4 倍，所以改量往內一排。
 */
export function hitScaleNeighborDepth(depth: number, gridDepth: number): number {
  return depth + 1 < gridDepth ? depth + 1 : Math.max(0, depth - 1);
}

export function sampleHitShake(elapsedSec: number, amplitude: number, totalSec: number = BATTLE_VISUAL_TIMING.hitShakeSec): number {
  if (!(amplitude > 0) || !(elapsedSec > 0) || elapsedSec >= totalSec) return 0;
  const stepSec = totalSec / HIT_SHAKE_KEYS.length;
  const index = Math.min(HIT_SHAKE_KEYS.length - 1, Math.floor(elapsedSec / stepSec));
  const from = index === 0 ? 0 : HIT_SHAKE_KEYS[index - 1];
  const to = HIT_SHAKE_KEYS[index];
  const t = (elapsedSec - index * stepSec) / stepSec;
  return amplitude * (from + (to - from) * t);
}

/**
 * 受擊後退位移比例（0～1，PROG-2-9412）：先快速推出（recoilPushSec，減速）、停住（recoilHitStopSec）、
 * 再收回原位（recoilRecoverSec，加速）。乘上後退距離就是畫面位移。純函式。
 */
export function sampleHitRecoil(elapsedSec: number): number {
  const push = BATTLE_VISUAL_TIMING.recoilPushSec, hold = BATTLE_VISUAL_TIMING.recoilHitStopSec, back = BATTLE_VISUAL_TIMING.recoilRecoverSec;
  if (!(elapsedSec > 0)) return 0;
  if (elapsedSec < push) { const t = elapsedSec / push; return 1 - (1 - t) * (1 - t); }
  if (elapsedSec < push + hold) return 1;
  if (elapsedSec < push + hold + back) { const t = (elapsedSec - push - hold) / back; return 1 - t * t; }
  return 0;
}

/** 一次受擊回饋（閃白、抖動、後退）全部播完的秒數。 */
export function hitFeedbackTotalSec(): number {
  const t = BATTLE_VISUAL_TIMING;
  return Math.max(t.hitShakeSec, t.hitFlashSec, t.recoilPushSec + t.recoilHitStopSec + t.recoilRecoverSec);
}

/**
 * 受擊閃白曲線（PROG-2-9483）：先全白停 holdFrames 格，再用 fadeSec 秒快速退掉。
 * 退色強度 = (1 - t)^fadePower，次方越大前段掉得越快。數值在 data/battle-hit-feedback.json。
 * 停留用「格」而不是秒：手機 30fps 時 2 格仍是 2 格，畫面上一定看得到全白。
 */
export interface HitFlashCurve { holdFrames: number; fadeSec: number; fadePower: number; }

export const DEFAULT_HIT_FLASH_CURVE: HitFlashCurve = { holdFrames: 2, fadeSec: 0.05, fadePower: 2 };

let activeHitFlashCurve: HitFlashCurve = DEFAULT_HIT_FLASH_CURVE;

/** 讀設定檔的 hitFlash 區段；缺漏或格式錯誤的欄位用預設值。 */
export function parseHitFlashCurve(raw: unknown): HitFlashCurve {
  const src = (raw && typeof raw === 'object' ? (raw as { hitFlash?: unknown }).hitFlash : null) as Record<string, unknown> | null;
  const num = (v: unknown, min: number, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) && v >= min ? v : fallback);
  const d = DEFAULT_HIT_FLASH_CURVE;
  if (!src || typeof src !== 'object') return { ...d };
  return {
    holdFrames: Math.round(num(src.holdFrames, 0, d.holdFrames)),
    fadeSec: num(src.fadeSec, 0, d.fadeSec),
    fadePower: num(src.fadePower, 0.1, d.fadePower),
  };
}

export function setHitFlashCurve(curve: HitFlashCurve): void { activeHitFlashCurve = curve; }
export function getHitFlashCurve(): HitFlashCurve { return activeHitFlashCurve; }

/**
 * 受擊閃白強度（1 = 全白）。純函式。
 * @param frame 受擊後第幾格（受擊當格 = 0）
 * @param fadeElapsedSec 全白停留結束後經過的秒數
 */
export function hitFlashStrength(frame: number, fadeElapsedSec: number, curve: HitFlashCurve = activeHitFlashCurve): number {
  if (frame < 0) return 0;
  if (frame < curve.holdFrames) return 1;
  if (!(curve.fadeSec > 0) || fadeElapsedSec >= curve.fadeSec) return 0;
  const t = Math.max(0, fadeElapsedSec) / curve.fadeSec;
  return Math.pow(1 - t, curve.fadePower);
}

/** 這一下是不是「重擊」：爆擊，或單次傷害達目標最大血量的 heavyHitMaxHpRatio。 */
export function isHeavyHit(damage: number, maxHp: number, isCrit: boolean): boolean {
  if (isCrit) return true;
  return maxHp > 0 && damage >= maxHp * BATTLE_VISUAL_TIMING.heavyHitMaxHpRatio;
}

export interface HitFeedbackPlan {
  /** 全身閃白。 */
  flash: boolean;
  /** 左右抖動。 */
  shake: boolean;
  /** 畫面震動。 */
  screenShake: boolean;
}

/**
 * 決定這次受擊要播哪些回饋（純函式）。
 * 致命一擊只閃白：接下來會播倒地（fall）與 boom，抖動與畫面震動會跟它們疊在一起變混亂。
 */
export function planHitFeedback(lethal: boolean, heavy: boolean): HitFeedbackPlan {
  if (lethal) return { flash: true, shake: false, screenShake: false };
  return { flash: true, shake: true, screenShake: heavy };
}

interface MovePoint { x: number; y: number; z: number }

export interface MoveSegmentPlan {
  /** 滑行起點：上一段還在跑就用節點目前位置，否則用事件的上一格。 */
  start: MovePoint;
  /** 這一段涵蓋幾格（至少 1）。 */
  cells: number;
  /** 滑行秒數。 */
  durationSec: number;
}

/**
 * 決定一段移動 tween 的起點與時間（純函式，不碰引擎節點）。
 * 邏輯層一回合內會同步連發多個 UnitMoved（每格一個），畫面若每次都回到事件的上一格，
 * 就會瞬移到倒數第二格只滑最後一格；單位還在移動中時改由目前畫面位置起算。
 */
export function planMoveSegment(
  eventFrom: MovePoint,
  target: MovePoint,
  currentPos: MovePoint | null,
  wasMoving: boolean,
): MoveSegmentPlan {
  const start = wasMoving && currentPos ? currentPos : eventFrom;
  const dist = (a: MovePoint, b: MovePoint): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  const stepLen = dist(eventFrom, target);
  const cells = stepLen > 1e-4 ? Math.max(1, Math.round(dist(start, target) / stepLen)) : 1;
  const counted = Math.min(cells, BATTLE_VISUAL_TIMING.moveAdvanceMaxCells);
  const durationSec = BATTLE_VISUAL_TIMING.moveAdvanceSec + (counted - 1) * BATTLE_VISUAL_TIMING.moveAdvanceExtraCellSec;
  return { start, cells, durationSec };
}