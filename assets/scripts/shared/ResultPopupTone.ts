/**
 * ResultPopupTone — 結算面板依勝敗切換的外觀（主戰場UI規格書 §4.2，PROG-2-1877）
 *
 * 規格：勝利有光芒感；失敗色調灰暗。勝利標題用深朱紅，避免金字壓在金色卡面上看不清。純資料，ResultPopupComposite 依結果套用。
 * 彩帶／光芒粒子需要美術素材，這裡只定義不用新圖就能做到的部分：標題色、彈跳、灰階。
 *
 * Unity 對照：ResultPanel 的 ScriptableObject 樣式表（勝／敗／平各一組）。
 */

export type ResultPopupType = 'victory' | 'defeat' | 'stalemate';

export interface ResultPopupTone {
    /** 標題文字色 RGB */
    titleColor: readonly [number, number, number];
    /** 卡片底圖、頭像等是否轉灰 */
    grayscale: boolean;
    /** 標題放大彈入（勝利慶祝感） */
    celebrate: boolean;
}

const TONES: Readonly<Record<ResultPopupType, ResultPopupTone>> = {
    victory: { titleColor: [176, 48, 24], grayscale: false, celebrate: true },
    defeat: { titleColor: [168, 168, 168], grayscale: true, celebrate: false },
    stalemate: { titleColor: [232, 232, 232], grayscale: false, celebrate: false },
};

export function resultPopupTone(type: ResultPopupType): ResultPopupTone {
    return TONES[type] ?? TONES.stalemate;
}
