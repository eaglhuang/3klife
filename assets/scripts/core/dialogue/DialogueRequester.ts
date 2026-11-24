// @spec-source → 武將台詞系統（PROG-2-9964）
/**
 * DialogueRequester — 武將台詞 v2 請求的唯一出口：推導參數 → 查本機快取 → 才送中台 → 回寫快取（純邏輯，不依賴 cc）。
 *
 * - 參數由 DialogueContextBuilder 推導；缺任何一項直接回 invalid，絕不送請求。
 * - 本機快取鍵含全部分桶參數與說話對象；同一鍵累積到 cache.linesPerKey 句後不再請求，輪流使用。
 * - 中台降級句（fallbackUsed）與空句不入快取；請求失敗後 cache.failureCooldownMs 內不再重送（有快取就用快取）。
 * - 同鍵同時只送一個請求。前端只呼叫中台，不碰任何 AI 金鑰。
 */
import type { NpcDialogueRequest, NpcDialogueResponse } from '../services/NpcDialogueService';
import { buildDialogueRequest, type DialogueBuildInput, type DialogueRulesConfig, type DialogueStateSource, type DialogueMood } from './DialogueContextBuilder';

export interface DialogueRequestPort { requestDialogue(request: NpcDialogueRequest): Promise<NpcDialogueResponse> }

export type DialogueFetchResult =
    | { kind: 'line'; text: string; cacheKey: string; fromCache: boolean; mood: DialogueMood; relationBucket: number; request: NpcDialogueRequest }
    | { kind: 'invalid'; missing: string[]; invalid: string[] }
    | { kind: 'unavailable'; reason: 'network' | 'fallback' | 'cooldown' | 'no-rules' };

export interface DialogueRequesterDeps {
    port: DialogueRequestPort;
    source: DialogueStateSource;
    rules: () => DialogueRulesConfig | null;
    nowMs: () => number;
    saveId?: () => string | undefined;
}

interface Bucket { lines: string[]; next: number }

export class DialogueRequester {
    private readonly _cache = new Map<string, Bucket>();
    private readonly _inflight = new Map<string, Promise<DialogueFetchResult>>();
    private _failedUntilMs = 0;
    /** 送出的中台請求次數（測試與除錯用） */
    public sentCount = 0;

    constructor(private readonly _deps: DialogueRequesterDeps) {}

    private _build(input: DialogueBuildInput) {
        const saveId = this._deps.saveId?.();
        return buildDialogueRequest({ ...input, ...(saveId && !input.saveId ? { saveId } : {}) }, this._deps.source, this._deps.rules());
    }

    private _rotate(bucket: Bucket): string {
        const text = bucket.lines[bucket.next % bucket.lines.length];
        bucket.next = (bucket.next + 1) % bucket.lines.length;
        return text;
    }

    /** 只查本機快取（同步）：目前情境有存句就輪流回一句；推導失敗或沒存句回 null。不送請求。 */
    public peek(input: DialogueBuildInput): string | null {
        const built = this._build(input);
        if (!built.ok) return null;
        const bucket = this._cache.get(built.cacheKey);
        return bucket && bucket.lines.length > 0 ? this._rotate(bucket) : null;
    }

    /** 取一句：快取夠就用快取，不夠才請求中台。 */
    public fetch(input: DialogueBuildInput): Promise<DialogueFetchResult> {
        const built = this._build(input);
        if (!built.ok) return Promise.resolve({ kind: 'invalid', missing: built.missing, invalid: built.invalid });
        if (!this._deps.rules()) return Promise.resolve({ kind: 'unavailable', reason: 'no-rules' });
        const rules = this._deps.rules() as DialogueRulesConfig;
        const bucket = this._cache.get(built.cacheKey);
        const base = { cacheKey: built.cacheKey, mood: built.mood, relationBucket: built.relationBucket, request: built.request };
        if (bucket && bucket.lines.length >= rules.cache.linesPerKey) {
            return Promise.resolve({ kind: 'line', text: this._rotate(bucket), fromCache: true, ...base });
        }
        if (this._deps.nowMs() < this._failedUntilMs) {
            return Promise.resolve(bucket && bucket.lines.length > 0
                ? { kind: 'line', text: this._rotate(bucket), fromCache: true, ...base }
                : { kind: 'unavailable', reason: 'cooldown' });
        }
        const pending = this._inflight.get(built.cacheKey);
        if (pending) return pending;
        const run = this._send(built.cacheKey, built.request, base, rules);
        this._inflight.set(built.cacheKey, run);
        void run.finally(() => this._inflight.delete(built.cacheKey));
        return run;
    }

    /** 背景補句（不等結果）：給「下次點擊才用」的情境。 */
    public prefetch(input: DialogueBuildInput): void {
        void this.fetch(input).catch(() => undefined);
    }

    public clear(): void {
        this._cache.clear();
        this._failedUntilMs = 0;
    }

    private async _send(
        cacheKey: string, request: NpcDialogueRequest,
        base: { cacheKey: string; mood: DialogueMood; relationBucket: number; request: NpcDialogueRequest }, rules: DialogueRulesConfig,
    ): Promise<DialogueFetchResult> {
        this.sentCount += 1;
        try {
            const response = await this._deps.port.requestDialogue(request);
            const text = (response.text ?? '').trim();
            if (response.fallbackUsed || !text) {
                this._failedUntilMs = this._deps.nowMs() + Math.min(rules.cache.failureCooldownMs, 5000);
                return { kind: 'unavailable', reason: 'fallback' };
            }
            const bucket = this._cache.get(cacheKey) ?? { lines: [], next: 0 };
            if (!bucket.lines.includes(text)) bucket.lines.push(text);
            this._cache.set(cacheKey, bucket);
            return { kind: 'line', text, fromCache: false, ...base };
        } catch {
            this._failedUntilMs = this._deps.nowMs() + rules.cache.failureCooldownMs;
            return { kind: 'unavailable', reason: 'network' };
        }
    }
}
