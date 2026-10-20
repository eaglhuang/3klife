// @spec-source → 經濟系統.md §道具表（補元散 +50、高級補元散 +100）；PM 暫定 2026-10-14 23:58Z（精力已滿拒絕）；PROG-2-0444
/**
 * VitalityPillController — 補元散使用鈕的流程（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 提供補元散與高級補元散的持有數，供按鈕顯示
 *   - 使用鈕按下 → GameSession.usePillOnGeneral()，把結果轉成提示文字
 *   - 拒絕原因（精力已滿、沒有道具）轉成對玩家說明的文字
 *
 * Unity 對照：MVP 的 Presenter。按鈕 onClick 只呼叫 Use，畫面層拿 Text 顯示提示。
 * cc 按鈕的節點綁定待 Codex 實機接線，這裡不碰場景節點。
 */
import type { VitalityPillKind, VitalityPillRejectReason } from '../../core/systems/VitalityPill';
import { ITEM_PREMIUM_VITALITY_PILL, ITEM_VITALITY_PILL, itemCount, PlayerInventory } from '../../core/systems/PlayerInventory';
import { type BreedTextLookup, fallbackBreedText } from './BreedingTexts';
import { VITALITY_SCRIPT_KEYS, vitalityScriptText } from './VitalityScriptTexts';

export const VITALITY_PILL_REJECT_TEXT: Record<VitalityPillRejectReason | 'no-general', string> = {
    'vitality-full': '精力已滿，不需使用補元散',
    'no-item': '補元散不足',
    'no-general': '找不到這位武將',
};

export interface VitalityPillDeps {
    /** 劇本文案（ui.vit.script.*）；正式環境接 i18n.t，未提供時用 zh-TW 預設 */
    text?: BreedTextLookup;
    session: {
        readonly inventory: PlayerInventory;
        usePillOnGeneral(generalId: string, kind: VitalityPillKind): Promise<
            | { readonly ok: true; readonly vitality: number; readonly restored: number }
            | { readonly ok: false; readonly reason: VitalityPillRejectReason | 'no-general' }
        >;
    };
}

export interface VitalityPillView {
    readonly vitalityPillCount: number;
    readonly premiumVitalityPillCount: number;
}

export class VitalityPillController {
    constructor(private readonly deps: VitalityPillDeps) {}

    /** 目前補元散與高級補元散的持有數 */
    public getView(): VitalityPillView {
        const inventory = this.deps.session.inventory;
        return {
            vitalityPillCount: itemCount(inventory, ITEM_VITALITY_PILL),
            premiumVitalityPillCount: itemCount(inventory, ITEM_PREMIUM_VITALITY_PILL),
        };
    }

    /** 對指定武將使用補元散：成功時顯示劇本句（PROG-2-0732），失敗時顯示拒絕原因 */
    public async use(generalId: string, kind: VitalityPillKind, generalName: string): Promise<string> {
        const result = await this.deps.session.usePillOnGeneral(generalId, kind);
        if (result.ok === false) return VITALITY_PILL_REJECT_TEXT[result.reason];
        return vitalityScriptText(this.deps.text ?? fallbackBreedText, VITALITY_SCRIPT_KEYS.pillUsed, generalName);
    }
}
