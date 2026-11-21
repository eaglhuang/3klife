// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §5.1 存檔也是 API、§5.7；PROG-2-9201
/**
 * ApiSaveGateway — GameSession 看到的「存檔服務」，背後一律走 IApiClient 的 save.* 命令。
 *
 * GameSession 只需要 save／load／lastLoadRecoveredFromBackup 三件事（見 SessionSaveService），
 * 所以舊的 PlayerSaveService 與本 gateway 都符合同一個形狀；舊測試照常傳 PlayerSaveService。
 * 寫檔由本機 adapter 原子完成並遞增 saveRev，GameSession 不直接碰存檔後端。
 */
import type { SaveFullResult, SaveLoadResult } from '../../../shared/api/ApiCommands';
import type { IApiClient } from '../../../shared/api/IApiClient';
import type { PlayerSaveSnapshot } from '../../services/PlayerSaveService';

export interface SessionSaveService {
    save(snapshot: PlayerSaveSnapshot): Promise<void>;
    load(): Promise<PlayerSaveSnapshot | null>;
    lastLoadRecoveredFromBackup(): boolean;
}

export class ApiSaveGateway implements SessionSaveService {
    private _recovered = false;

    public constructor(private readonly _api: IApiClient) {}

    public lastLoadRecoveredFromBackup(): boolean {
        return this._recovered;
    }

    public async save(snapshot: PlayerSaveSnapshot): Promise<void> {
        const res = await this._api.cmd<SaveFullResult>('save.full', { snapshot });
        if (!res.ok) throw new Error(`[ApiSaveGateway] 存檔失敗 ${res.errorCode} ${res.reason}：${res.message}`);
    }

    public async load(): Promise<PlayerSaveSnapshot | null> {
        const res = await this._api.query<SaveLoadResult>('save.load');
        if (!res.ok) throw new Error(`[ApiSaveGateway] 讀檔失敗 ${res.errorCode} ${res.reason}：${res.message}`);
        this._recovered = res.result.recoveredFromBackup;
        return res.result.snapshot as PlayerSaveSnapshot | null;
    }
}
