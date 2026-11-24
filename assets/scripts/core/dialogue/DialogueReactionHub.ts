// @spec-source → 武將台詞系統（PROG-2-9964）
/**
 * DialogueReactionHub — 友誼事件反應：玩家行為經 GameSession.applyFriendshipAction 結算後，
 * 依 actionId 查情境（規則檔 actionContexts），向中台要一句帶齊 v2 參數的台詞，交給呼叫端顯示。
 * 戰後感言也走這裡（combat_victory_together／combat_defeat_together）。
 * 節流：同一波結算（burstWindowMs）只反應 maxPerBurst 次，兩次反應至少間隔 minIntervalMs，避免洗版與狂打中台。
 * 純邏輯，不依賴 cc。
 */
import type { FriendshipActionAppliedPayload } from '../systems/FriendshipActionEngine';
import type { DialogueEventLog, DialogueRulesConfig } from './DialogueContextBuilder';
import type { DialogueRequester } from './DialogueRequester';

export interface DialogueReactionDeps {
    requester: DialogueRequester;
    rules: () => DialogueRulesConfig | null;
    log: DialogueEventLog;
    season: () => number;
    nowMs: () => number;
    /** 拿到台詞後顯示（例如彈提示）；generalId 是說話者 */
    show: (generalId: string, text: string, contextKey: string) => void;
}

export class DialogueReactionHub {
    private _burstStartMs = -Infinity;
    private _burstCount = 0;
    private _lastShownMs = -Infinity;

    constructor(private readonly _deps: DialogueReactionDeps) {}

    /** 接 GAME_SESSION_EVENTS.FriendshipActionApplied。回傳是否送出了反應請求（測試用）。 */
    public onFriendshipApplied(payload: FriendshipActionAppliedPayload): Promise<boolean> {
        const rules = this._deps.rules();
        if (!payload || !payload.applied || !rules) return Promise.resolve(false);
        const target = payload.targetId ? ({ kind: 'general', id: payload.targetId } as const) : ({ kind: 'player' } as const);
        // 不論有沒有反應，都記下來：之後閒聊的心情會有餘溫
        this._deps.log.record(payload.generalId, target, payload.actionId, this._deps.season());
        if (payload.targetId) return Promise.resolve(false);
        const contextKey = rules.actionContexts[payload.actionId];
        if (!contextKey) return Promise.resolve(false);

        const now = this._deps.nowMs();
        if (now - this._lastShownMs < rules.reaction.minIntervalMs) return Promise.resolve(false);
        if (now - this._burstStartMs > rules.reaction.burstWindowMs) { this._burstStartMs = now; this._burstCount = 0; }
        if (this._burstCount >= rules.reaction.maxPerBurst) return Promise.resolve(false);
        this._burstCount += 1;
        const scene = rules.reaction.sceneOverrides?.[contextKey];
        return this._deps.requester.fetch({ generalId: payload.generalId, contextKey, ...(scene ? { scene } : {}) }).then((result) => {
            if (result.kind !== 'line') return false;
            this._lastShownMs = this._deps.nowMs();
            this._deps.show(payload.generalId, result.text, contextKey);
            return true;
        }, () => false);
    }
}
