// @spec-source → 新手開場規格書.md 第三幕「首戰教學與因子解鎖」分鏡 7、戰鬥序列「教學提示浮窗」（PROG-2-0240，WBS OPEN-07）
/**
 * FirstBattleTutorial — 首戰教學戰的提示順序（純邏輯，不依賴 cc）
 *
 * 教學戰使用標準 5 路 x 8 格棋盤（GAME_CONFIG），依序教三件事：部署 → 推進 → 對推。
 * 提示只顯示第一個尚未完成的步驟；順序與完成狀態由呼叫端事件推進。
 *
 * 字串 key 為暫定（UI_TUTORIAL_HINT_*），待 P0 UI_ 字串表定案。
 * 不接場景、不改新手開場流程控制器（由 OPEN-01 負責）；這裡只提供狀態與提示查詢。
 *
 * Unity 對照：像 Tutorial 的 TutorialStep 清單，每完成一步把對應旗標設為 true，
 * UI 只讀「第一個未完成的步驟」顯示浮窗。
 */
import { GAME_CONFIG } from '../config/Constants';

/** 教學戰棋盤：與正式戰場相同（5 路 x 8 格） */
export const FIRST_BATTLE_BOARD = Object.freeze({ lanes: GAME_CONFIG.GRID_LANES, depth: GAME_CONFIG.GRID_DEPTH });

export type FirstBattleStep = 'deploy' | 'advance' | 'clash';

/** 教學順序（規格：部署、推進、對推） */
export const FIRST_BATTLE_STEPS: readonly FirstBattleStep[] = Object.freeze(['deploy', 'advance', 'clash']);

export interface FirstBattleProgress {
    readonly deployed: boolean;
    readonly advanced: boolean;
    readonly clashed: boolean;
}

export const FRESH_FIRST_BATTLE_PROGRESS: FirstBattleProgress = Object.freeze({ deployed: false, advanced: false, clashed: false });

export interface FirstBattleHint {
    step: FirstBattleStep;
    /** 暫定字串 key，對應 P0 UI_ 字串表 */
    key: string;
}

const FLAG_OF: Readonly<Record<FirstBattleStep, keyof FirstBattleProgress>> = {
    deploy: 'deployed',
    advance: 'advanced',
    clash: 'clashed',
};

/** 記錄一次教學事件；回傳新進度，不改輸入。重複事件不會出錯。 */
export function recordFirstBattleEvent(progress: FirstBattleProgress, step: FirstBattleStep): FirstBattleProgress {
    const flag = FLAG_OF[step];
    if (progress[flag]) return progress;
    return { ...progress, [flag]: true };
}

/** 目前要顯示的提示：第一個未完成的步驟；全部完成時為 null */
export function currentFirstBattleHint(progress: FirstBattleProgress): FirstBattleHint | null {
    const step = FIRST_BATTLE_STEPS.find((s) => !progress[FLAG_OF[s]]);
    return step ? { step, key: `UI_TUTORIAL_HINT_${step.toUpperCase()}` } : null;
}

export function isFirstBattleTeachingDone(progress: FirstBattleProgress): boolean {
    return currentFirstBattleHint(progress) === null;
}
