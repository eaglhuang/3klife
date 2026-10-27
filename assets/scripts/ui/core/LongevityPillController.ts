// @spec-source → 經濟系統.md §道具表（延壽丹 壽命 +3 歲）、武將壽命系統.md E-6；PROG-2-1347、PROG-2-1348
/**
 * LongevityPillController — 延壽丹使用鈕的流程（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 提供延壽丹持有數，供按鈕顯示與是否可按
 *   - 使用鈕按下 → GameSession.useLongevityPillOnGeneral()，把結果轉成提示文字
 *   - 拒絕原因（沒有道具、已陣亡、找不到武將）轉成對玩家說明的文字
 *
 * 文案規格未定字串 key，先用中文預設（PROG-2-1348 暫定）。按鈕放哪個畫面待 PM 決定，這裡不碰場景節點。
 * Unity 對照：MVP 的 Presenter，同 VitalityPillController。
 */
import type { LongevityPillUseResult } from '../../core/systems/LongevityPill';
import { ITEM_LONGEVITY_PILL, itemCount, PlayerInventory } from '../../core/systems/PlayerInventory';

type RejectReason = Extract<LongevityPillUseResult, { ok: false }>['reason'] | 'no-general';

export const LONGEVITY_PILL_REJECT_TEXT: Record<RejectReason, string> = {
    'no-item': '延壽丹不足',
    dead: '這位武將已經辭世，無法服用延壽丹',
    'no-general': '找不到這位武將',
};

export interface LongevityPillDeps {
    session: {
        readonly inventory: PlayerInventory;
        useLongevityPillOnGeneral(generalId: string): Promise<LongevityPillUseResult | { readonly ok: false; readonly reason: 'no-general' }>;
    };
}

export interface LongevityPillView {
    readonly count: number;
    readonly usable: boolean;
}

export class LongevityPillController {
    constructor(private readonly deps: LongevityPillDeps) {}

    /** 目前延壽丹持有數；沒有時按鈕不可按 */
    public getView(): LongevityPillView {
        const count = itemCount(this.deps.session.inventory, ITEM_LONGEVITY_PILL);
        return { count, usable: count > 0 };
    }

    /** 對指定武將使用延壽丹：成功顯示延長後的壽命上限，失敗顯示拒絕原因 */
    public async use(generalId: string, generalName: string): Promise<string> {
        const result = await this.deps.session.useLongevityPillOnGeneral(generalId);
        if (result.ok === false) return LONGEVITY_PILL_REJECT_TEXT[result.reason];
        const years = result.maxLifespan - result.previousMaxLifespan;
        return `${generalName} 服下延壽丹，壽命上限延長 ${years} 歲（${result.previousMaxLifespan}→${result.maxLifespan}）`;
    }
}
