// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §5.2 分層、§5.4 冪等、§5.8 同一介面雙 adapter；PROG-2-9201
/**
 * LocalApiAdapter — 本機伺服器 adapter（單機時的「伺服器」）。
 *
 * 實作 IApiClient：命令路由、版本與權威欄位檢查、冪等重送、同玩家命令序列化、saveRev 遞增、事件推送。
 * 結算、扣款、存檔都在這層（透過各命令處理器掛上的 port）。日後換成網路 adapter，玩法程式零修改。
 * 純邏輯，不 import cc。
 *
 * Unity 對照：像一個同進程的 BackendStub，介面與真後端一致，只是函式呼叫而非 HTTP。
 */
import { API_COMMANDS, FORBIDDEN_AUTHORITY_FIELDS, type ApiCommandName } from '../../../shared/api/ApiCommands';
import { API_ERRORS, ApiError, buildFail, type ApiErrorKey } from '../../../shared/api/ApiErrors';
import { buildIdemKey, IdempotencyStore } from '../../../shared/api/ApiIdempotency';
import {
    API_PROTOCOL_VERSION,
    type ApiCmdOptions, type ApiDeltaOp, type ApiEvent, type ApiReadModel, type ApiRequest, type ApiResult, type Unsubscribe,
} from '../../../shared/api/ApiProtocol';
import type { IApiClient } from '../../../shared/api/IApiClient';

export interface HandlerContext {
    request: ApiRequest;
    nowMs: number;
    /** 目前存檔版本戳（本命令成功遞增之前） */
    saveRev: number;
    /** 讀檔後把持久化的版本戳併進來（取較大者） */
    syncRev(rev: number): void;
}

export interface HandlerOutcome<T = unknown> {
    result: T;
    delta?: ApiDeltaOp[];
    /** rev 由 adapter 填；事件名稱見總綱 §5.6 */
    events?: Array<{ evt: string; data?: unknown }>;
}

export type CommandHandler = (args: Record<string, unknown>, ctx: HandlerContext) => Promise<HandlerOutcome> | HandlerOutcome;

export interface LocalApiAdapterOptions {
    now?: () => number;
    /** 起始存檔版本戳；讀檔後由 save.load 併入 */
    initialRev?: number;
    /** 維護中旗標（E104）；回傳 true 時拒絕所有命令 */
    maintenance?: () => boolean;
}

export class LocalApiAdapter implements IApiClient {
    public readonly mode = 'local' as const;
    private readonly _handlers = new Map<string, CommandHandler>();
    private readonly _idem = new IdempotencyStore();
    private readonly _subscribers = new Map<string, Array<(e: ApiEvent) => void>>();
    private readonly _now: () => number;
    private readonly _maintenance: () => boolean;
    private _rev: number;
    private _serverTime = 0;
    private _reqSeq = 0;
    /** 同一玩家的命令在權威端序列化執行 */
    private _tail: Promise<unknown> = Promise.resolve();

    public constructor(opts: LocalApiAdapterOptions = {}) {
        this._now = opts.now ?? (() => Date.now());
        this._maintenance = opts.maintenance ?? (() => false);
        this._rev = Math.max(0, Math.floor(opts.initialRev ?? 0));
    }

    public get view(): ApiReadModel {
        return { saveRev: this._rev, serverTime: this._serverTime };
    }

    /** 掛上命令處理器；命令名必須先登錄在 API_COMMANDS，重複掛上以後者為準（換 port 用） */
    public register(name: ApiCommandName, handler: CommandHandler): void {
        this._handlers.set(name, handler);
    }

    public unregister(name: ApiCommandName): void {
        this._handlers.delete(name);
    }

    /**
     * 命令層互相呼叫（獎勵發物品走 item.grant、發貨幣走錢包…）：直接執行已掛上的處理器，
     * 不經佇列、冪等與 saveRev 檢查。只能在「已經在某個命令處理器裡」使用（外層命令已排進佇列並負責冪等）；
     * 從外部呼叫請用 cmd／query。處理器丟出的 ApiError 原樣往上丟，讓外層命令整筆失敗或回滾。
     */
    public async invoke(name: ApiCommandName, args: Record<string, unknown>): Promise<HandlerOutcome> {
        const handler = this._handlers.get(name);
        if (!handler) throw new ApiError('COMMAND_UNKNOWN', `未知命令 ${name}`);
        const seq = ++this._reqSeq;
        return handler(args, {
            request: this._buildRequest(name, args, undefined, seq),
            nowMs: this._now(),
            saveRev: this._rev,
            syncRev: () => undefined,
        });
    }

    public subscribe(evt: string, handler: (e: ApiEvent) => void): Unsubscribe {
        const list = this._subscribers.get(evt) ?? [];
        list.push(handler);
        this._subscribers.set(evt, list);
        return () => {
            const current = this._subscribers.get(evt) ?? [];
            this._subscribers.set(evt, current.filter((h) => h !== handler));
        };
    }

    public cmd<T = unknown>(name: string, args: unknown, opts: ApiCmdOptions = {}): Promise<ApiResult<T>> {
        const seq = ++this._reqSeq;
        const idemKey = opts.idemKey ?? buildIdemKey(name, 'self', this._rev, seq);
        return this.handle<T>(this._buildRequest(name, args, idemKey, seq));
    }

    public query<T = unknown>(name: string, args: unknown = {}): Promise<ApiResult<T>> {
        const seq = ++this._reqSeq;
        return this.handle<T>(this._buildRequest(name, args, undefined, seq));
    }

    /**
     * 伺服器端入口：吃一個完整封包、回一個完整回應。網路 adapter 的對端與契約測試都呼叫它。
     * 同一玩家的命令排成佇列依序執行；處理器丟出的例外轉成失敗封包，不會中斷佇列。
     */
    public handle<T = unknown>(req: ApiRequest): Promise<ApiResult<T>> {
        const run = this._tail.then(() => this._execute(req));
        this._tail = run.catch(() => undefined);
        return run as Promise<ApiResult<T>>;
    }

    private _buildRequest(cmd: string, args: unknown, idemKey: string | undefined, seq: number): ApiRequest {
        return {
            v: API_PROTOCOL_VERSION,
            reqId: `r_${this._now()}_${seq}`,
            ...(idemKey !== undefined ? { idemKey } : {}),
            cmd,
            saveRev: this._rev,
            clientTime: this._now(),
            args: args ?? {},
        };
    }

    private async _execute(req: ApiRequest): Promise<ApiResult> {
        const nowMs = this._now();
        this._serverTime = nowMs;
        const fail = (key: ApiErrorKey, message: string): ApiResult => buildFail(req.reqId, API_ERRORS[key], message, nowMs, this._rev);

        if (this._maintenance()) return fail('MAINTENANCE', '維護中');
        if (!Number.isInteger(req.v) || req.v < 0 || req.v > API_PROTOCOL_VERSION) return fail('SCHEMA_TOO_OLD', `不支援的協定版本 ${String(req.v)}`);
        const meta = Object.prototype.hasOwnProperty.call(API_COMMANDS, req.cmd) ? API_COMMANDS[req.cmd as ApiCommandName] : undefined;
        const handler = this._handlers.get(req.cmd);
        if (!meta || !handler) return fail('COMMAND_UNKNOWN', `未知命令 ${String(req.cmd)}`);
        // v=0 視為舊協定，只允許存檔命令（總綱 §5.12）
        if (req.v === 0 && req.cmd.indexOf('save.') !== 0) return fail('SCHEMA_TOO_OLD', '舊協定只允許存檔命令');
        if (!req.args || typeof req.args !== 'object' || Array.isArray(req.args)) return fail('INVALID_SCHEMA', 'args 必須是物件');
        const args = req.args as Record<string, unknown>;

        if (meta.kind === 'cmd') {
            if (!req.idemKey) return fail('INVALID_SCHEMA', '會改狀態的命令必須帶 idemKey');
            const forbidden = FORBIDDEN_AUTHORITY_FIELDS.find((k) => Object.prototype.hasOwnProperty.call(args, k));
            if (forbidden) return fail('FORBIDDEN_FIELD', `命令不得帶權威欄位 ${forbidden}`);
            const hit = this._idem.get(req.idemKey, nowMs);
            if (hit) {
                return { ...hit, reqId: req.reqId, replayed: true, errorCode: 'E101' } as ApiResult;
            }
            if (meta.revGuard && typeof req.saveRev === 'number' && req.saveRev < this._rev) {
                return fail('REV_CONFLICT', `saveRev 落後：客戶端 ${req.saveRev}、權威端 ${this._rev}`);
            }
        }

        let outcome: HandlerOutcome;
        try {
            outcome = await handler(args, {
                request: req,
                nowMs,
                saveRev: this._rev,
                syncRev: (rev) => { if (Number.isInteger(rev) && rev > this._rev) this._rev = rev; },
            });
        } catch (error) {
            if (error instanceof ApiError) return buildFail(req.reqId, error.def, error.message, nowMs, this._rev);
            return buildFail(req.reqId, { code: 'E199', reason: 'INTERNAL_ERROR', retryable: true }, error instanceof Error ? error.message : String(error), nowMs, this._rev);
        }

        if (meta.kind === 'cmd') this._rev += 1;
        const events: ApiEvent[] = (outcome.events ?? []).map((e) => ({ evt: e.evt, rev: this._rev, data: e.data }));
        const ok: ApiResult = {
            v: API_PROTOCOL_VERSION,
            reqId: req.reqId,
            ok: true,
            saveRev: this._rev,
            serverTime: nowMs,
            result: outcome.result,
            ...(outcome.delta ? { delta: outcome.delta } : {}),
            ...(events.length > 0 ? { events } : {}),
        };
        if (meta.kind === 'cmd' && req.idemKey) this._idem.put(req.idemKey, ok, nowMs);
        for (const e of events) this._publish(e);
        return ok;
    }

    private _publish(e: ApiEvent): void {
        const list = this._subscribers.get(e.evt);
        if (!list) return;
        for (const handler of list.slice()) {
            try { handler(e); } catch { /* 訂閱者壞掉不影響命令結果 */ }
        }
    }
}
