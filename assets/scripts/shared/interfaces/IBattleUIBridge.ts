/**
 * IBattleUIBridge — 戰場與 UI 通信介面（shared 層）
 * 
 * 用於解除 battle/ 對 ui/ 的直接依賴。
 * BattleScene 透過此介面呼叫 UI 功能，而無需知道具體 UI 元件類別。
 */

export interface IBattleUIBridge {
  /** 顯示戰鬥 HUD */
  showHUD(): void;
  /** 隱藏戰鬥 HUD */
  hideHUD(): void;
  /** 更新部署狀態 */
  updateDeployState(state: string, reasonCode?: string): void;
  /** 顯示戰鬥結果 */
  showResultPopup(isWin: boolean, rewards?: any): void;
  /** 顯示戰鬥日誌 */
  addBattleLog(message: string): void;
}

/**
 * IBattleStateReader — UI 讀取戰場狀態的介面
 * 讓 UI 能夠主動查詢戰場數據，而無需持有 BattleController 實例
 */
export interface IBattleStateReader {
  /** 獲取當前戰鬥階段 */
  getBattlePhase(): string;
  /** 獲取我軍剩餘兵力百分比 */
  getPlayerForceRatio(): number;
  /** 獲取敵軍剩餘兵力百分比 */
  getEnemyForceRatio(): number;
}
