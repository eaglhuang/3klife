// @spec-source → 大廳系統規格書 doc_spec_0002 E-5（原地 Idle、頭頂姓名與官職）；UI-2-0137（UI-2-0123 子項）
/**
 * HallStageCrowdPose — 把一位站好位的武將換成節點姿態（縮放、翻面、名牌與標記位置、idle 相位），純 TS，不依賴 cc。
 *
 * 輸入是 HallStagePlanner 的站位（中心原點、y 向上的腳底座標與顯示高度）與實際圖檔尺寸；
 * 名牌、標記與動作參數來自 hall-stage-decor.json。
 * Unity 對照：像在 Spawn 時依 sprite.bounds 算 localScale，再把名牌 / 驚嘆號掛到固定偏移。
 */

export interface HallStageDecor {
    tagBelowFootPx: number;
    markAboveHeadPx: number;
    idle: { periodSec: number; risePx: number; stretchY: number };
    markBob: { periodSec: number; risePx: number };
    /** 相鄰武將 idle 起始相位錯開的秒數，避免全員同步上下。 */
    phaseStepSec: number;
}

export interface HallStageCrowdInput {
    stageX: number;
    stageY: number;
    height: number;
    flip: boolean;
}

export interface HallStageCrowdPose {
    /** 角色節點（錨點在腳底中心）。 */
    body: { x: number; y: number; scaleX: number; scaleY: number };
    tag: { x: number; y: number };
    mark: { x: number; y: number };
    /** idle 起始延遲（秒），介於 0 與 idle 週期之間。 */
    idleDelaySec: number;
}

/**
 * 算出單一武將的節點姿態。spriteWidth/Height 為圖檔原始尺寸；尺寸無效時以 1:1 處理。
 * index 是繪製順序，只用來錯開 idle 相位。
 */
export function hallStageCrowdPose(
    input: Readonly<HallStageCrowdInput>,
    spriteHeight: number,
    decor: Readonly<HallStageDecor>,
    index: number,
): HallStageCrowdPose {
    const scale = spriteHeight > 0 ? input.height / spriteHeight : 1;
    const period = decor.idle.periodSec > 0 ? decor.idle.periodSec : 1;
    const delay = ((index * decor.phaseStepSec) % period + period) % period;
    return {
        body: { x: input.stageX, y: input.stageY, scaleX: input.flip ? -scale : scale, scaleY: scale },
        tag: { x: input.stageX, y: input.stageY - decor.tagBelowFootPx },
        mark: { x: input.stageX, y: input.stageY + input.height + decor.markAboveHeadPx },
        idleDelaySec: delay,
    };
}
