// @spec-source → 學府修業畫面與接線設計.md (doc_spec_1179) §9.4 QA 快進入口 debug.fastForward；PROG-2-9192
/**
 * DebugCommands — 偵錯命令（debug.fastForward）在本機 adapter 的處理器。
 *
 * 只由本機 adapter 掛上，而且宿主要場景在網址帶 qa* 參數時才綁定（沒綁定一律 E107）；
 * 網路 adapter 不掛處理器，等於一律拒絕，避免變成外掛入口。命令本身不碰資料，只轉給宿主，
 * 宿主（大廳場景）用既有的修業流程一步一步推進，規則與存檔路徑與玩家操作完全相同。
 *
 * 注意：本機 adapter 的命令是串行佇列，處理器裡不能等宿主跑完（宿主推進時要呼叫 save.* 等命令，會排在自己後面造成死結），
 * 所以只啟動快進並立刻回 ack；跑完的結果由宿主自行公布（大廳場景寫在 window.__qaAcademy）。
 */
import type { DebugFastForwardAck, DebugFastForwardResult } from '../../../shared/api/ApiCommands';
import { ApiError } from '../../../shared/api/ApiErrors';
import type { LocalApiAdapter } from './LocalApiAdapter';

/** 偵錯宿主：單機由大廳場景提供 */
export interface DebugHost {
    /** 學府快進到「已完成 turns 回合」 */
    fastForwardAcademy(turns: number): Promise<DebugFastForwardResult>;
}

export function registerDebugCommands(adapter: LocalApiAdapter, getHost: () => DebugHost | null): void {
    adapter.register('debug.fastForward', async (args) => {
        const host = getHost();
        if (!host) throw new ApiError('DEBUG_UNAVAILABLE', '偵錯入口未啟用（網址未帶 qa 參數）');
        if (args.target !== 'academy') throw new ApiError('INVALID_SCHEMA', 'target 目前只支援 academy');
        const turns = args.turns;
        if (typeof turns !== 'number' || !Number.isInteger(turns) || turns < 1 || turns > 36) {
            throw new ApiError('INVALID_SCHEMA', 'turns 必須是 1~36 的整數');
        }
        const ack: DebugFastForwardAck = { accepted: true, turns };
        // 不 await：讓出佇列，快進才能呼叫其他命令；失敗由宿主自己回報，這裡只防止未處理的 Promise 拒絕
        void host.fastForwardAcademy(turns).catch(() => undefined);
        return { result: ack };
    });
}
