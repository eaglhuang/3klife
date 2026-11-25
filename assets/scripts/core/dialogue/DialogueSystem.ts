// @spec-source → 武將台詞系統（PROG-2-9964）
/**
 * DialogueSystem — 武將台詞 v2 的組裝點：規則檔、友誼事件記錄、請求器、友誼事件反應。
 * ServiceLoader 建立一份（services().dialogue）；各觸發點（頭像點擊、大廳點武將、友誼事件）都從這裡取。
 */
import type { EventSystem } from '../systems/EventSystem';
import type { NpcDialogueService } from '../services/NpcDialogueService';
import type { GameSession } from '../managers/GameSession';
import { GAME_SESSION_EVENTS } from '../managers/GameSession';
import { FriendshipService } from '../services/FriendshipService';
import type { FriendshipActionAppliedPayload } from '../systems/FriendshipActionEngine';
import { DialogueEventLog, normalizeDialogueRules, type DialogueRulesConfig } from './DialogueContextBuilder';
import { DialogueRequester } from './DialogueRequester';
import { DialogueReactionHub } from './DialogueReactionHub';
import type { NpcDialogueRecord } from './NpcDialogueCache';
import { createGameDialogueStateSource } from './GameDialogueStateSource';

export class DialogueSystem {
    private _rules: DialogueRulesConfig | null = null;
    private _requester: DialogueRequester | null = null;
    private _unsubscribe: (() => void) | null = null;
    public readonly log = new DialogueEventLog();

    /** 載入規則檔（data/dialogue-mood-rules.json 原始內容）；壞資料視為未載入，之後的請求一律不送 */
    public setRules(raw: unknown): void {
        this._rules = normalizeDialogueRules(raw);
    }

    public get rules(): DialogueRulesConfig | null {
        return this._rules;
    }

    /** 尚未 setup 時為 null（呼叫端要容許沒有台詞系統） */
    public get requester(): DialogueRequester | null {
        return this._requester;
    }

    public setup(event: EventSystem, session: GameSession, npcDialogue: NpcDialogueService, saveId: () => string, toast: (generalId: string, text: string) => void): void {
        if (this._requester) return;
        const source = createGameDialogueStateSource(session, () => FriendshipService.getInstance(), this.log);
        this._requester = new DialogueRequester({ port: npcDialogue, source, rules: () => this._rules, nowMs: () => Date.now(), saveId });
        const hub = new DialogueReactionHub({
            requester: this._requester, rules: () => this._rules, log: this.log,
            season: () => session.gameTime.totalSeasonsElapsed, nowMs: () => Date.now(),
            show: (generalId, text) => toast(generalId, text),
        });
        this._unsubscribe = event.on<FriendshipActionAppliedPayload>(GAME_SESSION_EVENTS.FriendshipActionApplied, (payload) => { void hub.onFriendshipApplied(payload); });
    }

    /** 本機快取裡目前情境（心情、好感、天下大勢都吻合）的一句；沒有或參數推不齊回 null。不送請求。 */
    public cachedLine(generalId: string, contextKey: string, scene?: string): NpcDialogueRecord | null {
        const text = this._requester?.peek({ generalId, contextKey, ...(scene ? { scene } : {}) });
        if (!text) return null;
        return { kind: 'DISPOSABLE_CACHE', generalId, text, evidenceRefs: [], fallbackUsed: false, provider: 'dialogue-v2', model: null, cachedAtMs: Date.now() };
    }

    /**
     * 任務派出／返回的台詞（PROG-2-9966）：本機快取有就立即回；沒有才問中台，最多等 timeoutMs。
     * 中台不通、參數推不齊、逾時一律回 null，由呼叫端靜默退回本機預設台詞。
     */
    public async missionLine(generalId: string, contextKey: string, timeoutMs: number, scene = 'lobby'): Promise<string | null> {
        const requester = this._requester;
        if (!requester) return null;
        const input = { generalId, contextKey, scene };
        try {
            const cached = requester.peek(input);
            if (cached) return cached;
            let timer: ReturnType<typeof setTimeout> | undefined;
            const result = await Promise.race([
                requester.fetch(input),
                new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs); }),
            ]).finally(() => { if (timer) clearTimeout(timer); });
            return result && result.kind === 'line' && result.text.trim() ? result.text.trim() : null;
        } catch {
            return null;
        }
    }

    /** 背景向中台補句（快取已滿或參數不齊時什麼都不做），供「下次點擊才用」的觸發點 */
    public prefetch(generalId: string, contextKey: string, scene?: string): void {
        this._requester?.prefetch({ generalId, contextKey, ...(scene ? { scene } : {}) });
    }

    public dispose(): void {
        this._unsubscribe?.();
        this._unsubscribe = null;
        this._requester = null;
    }
}
