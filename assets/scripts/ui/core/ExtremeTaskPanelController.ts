// @spec-source → 裁決 2026-11-08 極限任務入口（PROG-2-2101）
/**
 * ExtremeTaskPanelController — 天下征鋒彈窗（純邏輯，不依賴 cc）。
 *
 * 輸出扁平 FlowView，key 與 extreme-task-main 版面節點 id 一一對應。
 * 暫定：文案待企劃定版；劣質高粱、戰法筆記的道具名先寫死在這裡。
 * Unity 對照：Presenter。
 */
import { EXTREME_TASK_ITEM_SORGHUM, EXTREME_TASK_ITEM_TACTIC_NOTE, type ExtremeTaskDrop } from '../../core/systems/ExtremeTaskDrop';
import { EXTREME_TASK_WEEKLY_ATTEMPTS } from '../../core/systems/ExtremeTaskBoard';
import { ITEM_VITALITY_PILL } from '../../core/systems/PlayerInventory';

export interface ExtremeTaskPanelStatus {
    freeLeft: number;
    orders: number;
    bossName: string;
}

export interface ExtremeTaskPanelFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

const ITEM_NAMES: Readonly<Record<string, string>> = {
    [EXTREME_TASK_ITEM_SORGHUM]: '劣質高粱',
    [EXTREME_TASK_ITEM_TACTIC_NOTE]: '戰法筆記',
    [ITEM_VITALITY_PILL]: '補元散',
};

export function extremeDropText(drop: ExtremeTaskDrop): string {
    return drop.kind === 'gold' ? `金幣 ${drop.amount}` : (ITEM_NAMES[drop.itemId] ?? drop.itemId);
}

export function extremeRewardToast(drops: readonly ExtremeTaskDrop[]): string {
    return `天下征鋒通關獎勵：${drops.map(extremeDropText).join('、')}`;
}

export function extremeTaskFlowView(status: ExtremeTaskPanelStatus, message: string): ExtremeTaskPanelFlowView {
    const canChallenge = status.freeLeft > 0 || status.orders > 0;
    return {
        texts: {
            etBossLabel: `本週 BOSS：${status.bossName}`,
            etQuotaLabel: `本週免費次數：${status.freeLeft} / ${EXTREME_TASK_WEEKLY_ATTEMPTS}`,
            etOrderLabel: `極限挑戰令：${status.orders} 張${status.freeLeft > 0 ? '' : '（下一場消耗 1 張）'}`,
            etMessageLabel: message,
        },
        actives: {},
        enabled: { btnChallenge: canChallenge },
    };
}
