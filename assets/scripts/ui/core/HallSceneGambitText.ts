// @spec-source → 戰法場景規格書.md (doc_spec_0039) B-1；WBS SCN-04；PROG-2-2103
/**
 * HallSceneGambitText — 場景戰法的大廳提示文字（純函式，文案暫定）。
 */

import type { BattleTactic } from '../../core/config/Constants';
import type { SceneGambitOutcome } from '../../core/systems/HallSceneGambit';
import { battleTacticLabel } from '../../shared/BattleEntryParams';

/** 接取任務成功後的提示 */
export function sceneGambitPendingNotice(tactic: BattleTactic): string {
    return `下一場戰鬥將嘗試發動【${battleTacticLabel(tactic)}】`;
}

/** 出征編制的勾選列（裁決 11/09 第 12 題） */
export function sceneGambitToggleText(tactic: BattleTactic, armed: boolean): string {
    return `任務戰法加成【${battleTacticLabel(tactic)}】：${armed ? '已勾選' : '未勾選'}`;
}

/** 開戰前的判定結果提示 */
export function sceneGambitNotice(outcome: SceneGambitOutcome): string {
    const label = battleTacticLabel(outcome.tactic);
    if (outcome.kind === 'triggered') return `發動【${label}】！`;
    if (outcome.kind === 'failed') return `【${label}】發動失敗，本場照常開戰`;
    const stat = outcome.reason === 'int' ? '主將智力' : '情報';
    return `${stat} ${outcome.current}，未達 ${outcome.required}，【${label}】留待下一場`;
}
