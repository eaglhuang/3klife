// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §5.8 單機與連線兩種模式用同一介面；PROG-2-9201
/**
 * IApiClient — 玩法與 UI 程式唯一持有的 API 介面。
 *
 * 單機由 LocalApiAdapter 實作，連線由 RemoteApiAdapter 實作；兩者必須通過同一份契約測試。
 * Unity 對照：像 IBackendService，呼叫端不知道背後是本機模擬還是真伺服器。
 */
import type { ApiCmdOptions, ApiEvent, ApiReadModel, ApiResult, Unsubscribe } from './ApiProtocol';

export interface IApiClient {
    /** 會改狀態的命令（意圖）；結果與數值由權威端算 */
    cmd<T = unknown>(name: string, args: unknown, opts?: ApiCmdOptions): Promise<ApiResult<T>>;
    /** 唯讀查詢 */
    query<T = unknown>(name: string, args?: unknown): Promise<ApiResult<T>>;
    /** 訂閱推送事件（shop.rotated、inventory.changed、save.rev…） */
    subscribe(evt: string, handler: (e: ApiEvent) => void): Unsubscribe;
    /** 只讀檢視快取 */
    readonly view: ApiReadModel;
    readonly mode: 'local' | 'remote';
}
