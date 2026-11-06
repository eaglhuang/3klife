// @spec-source → 主戰場UI規格書.md §4.5 敵方思考中（doc_ui_0001，PROG-2-1891）
/**
 * EnemyThinkingView — 敵方回合「敵軍行動中…」提示的文字與呼吸節奏（純邏輯，不依賴 cc）
 *
 * 規格 §4.5：帶狀 Banner，內容「敵軍行動中...」，簡單的掃光或呼吸效果。
 * 回合開始的大橫幅已占用畫面中央（PROG-2-1888），本提示改放在 HUD 下緣的細帶，
 * 從敵方回合開始顯示到我方回合開始，不遮住棋盤上的敵軍動作。
 *
 * Unity 對照：像 Loading 指示器的 ViewModel，只算目前要顯示幾個點與透明度範圍。
 */

export const ENEMY_THINKING_BASE_TEXT = '敵軍行動中';

/** 句尾點數循環的間隔（秒）：一點、兩點、三點，再回到一點 */
export const ENEMY_THINKING_DOT_STEP_SEC = 0.4;

/** 呼吸效果：透明度在 min 與 max 之間來回，單程秒數 */
export const ENEMY_THINKING_BREATH = { minOpacity: 140, maxOpacity: 255, halfPeriodSec: 0.7 } as const;

/** 依經過秒數回傳提示文字；負數或非有限值視為 0 */
export function enemyThinkingText(elapsedSec: number): string {
    const t = Number.isFinite(elapsedSec) && elapsedSec > 0 ? elapsedSec : 0;
    const dots = (Math.floor(t / ENEMY_THINKING_DOT_STEP_SEC) % 3) + 1;
    return ENEMY_THINKING_BASE_TEXT + '.'.repeat(dots);
}
