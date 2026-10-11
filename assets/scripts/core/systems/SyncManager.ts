import { sys } from 'cc';
import { EventSystem } from './EventSystem';
import { NetworkService, EVENT_NETWORK_ONLINE } from './NetworkService';
import type {
    ActionRecord,
    CompressedActionsSyncRequest,
    DeltaSyncRequest,
    FullSyncRequest,
    SyncEndpointResponse,
    SyncRequest,
    SyncResponse,
} from '../../../../shared/protocols';
import { computeSyncTxHash } from './SyncHash';
import { IndexedDbAdapter } from '../storage/IndexedDbAdapter';
import { DataStorageAdapter } from '../storage/DataStorageAdapter';
import { UCUFLogger, LogCategory } from '../utils/UCUFLogger';

interface SyncLocalMeta {
    currentSeq: number;
    deviceId: string;
    sessionSecret: string;
    lastHash: string;
    /** 伺服器確認過的同步錨點；舊版 meta 沒有此欄位 */
    anchorHash?: string;
}

export interface SyncDebugSnapshot {
    storageMode: string;
    deviceId: string;
    currentSeq: number;
    lastHash: string;
    pendingCount: number;
    isHydrated: boolean;
    records: ActionRecord[];
}

export const EVENT_SYNCING = 'EVENT_SYNCING';
export const EVENT_SYNC_COMPLETE = 'EVENT_SYNC_COMPLETE';
export const EVENT_OFFLINE_REMINDER = 'EVENT_OFFLINE_REMINDER'; 

export enum SyncActionType {
    DEFERRABLE = 'DEFERRABLE',               // 可延遲上傳 (本機先算 Hash 存佇列，等連線後背景上傳)
    IMMEDIATE_REQUIRED = 'IMMEDIATE_REQUIRED' // 必即時上傳 (若斷線則直接阻擋操作，如：轉蛋 / 商城 / 課金)
}

export class SyncManager {
    private static readonly ONLINE_ONLY_ACTION_PATTERNS: RegExp[] = [
        /^GACHA_/i,
        /^SHOP_(BUY|PURCHASE|REFRESH)/i,
        /^STORE_/i,
        /^PURCHASE_/i,
        /^IAP_/i,
        /^PAY(MENT)?_/i,
        /^RECHARGE_/i,
        /^BILLING_/i,
    ];

    private eventSystem: EventSystem | null = null;
    private network: NetworkService | null = null;

    private actionRecords: ActionRecord[] = [];
    private currentSeq: number = 0;
    private sessionSecret: string = 'MOCK_SECRET_KEY'; // 當前有效金鑰 (Server 成功連線時下發)
    private lastHash: string = 'INIT_HASH';          // 本地雜湊鏈的鏈頭（最後一筆待同步紀錄的 Tx_Hash）
    private anchorHash: string = 'INIT_HASH';        // 伺服器確認過的同步錨點（下次同步的 Previous_Hash）
    private deviceId: string = '';

    private isSyncing: boolean = false;
    private reminderTimer: any = null;

    private storageAdapter: DataStorageAdapter | null = null;
    private storageInitPromise: Promise<DataStorageAdapter | null> | null = null;
    private restorePromise: Promise<void> | null = null;
    private hasHydratedLocalState = false;

    private readonly LEGACY_STORAGE_KEY = 'OFFLINE_ACTION_LOGS';
    private readonly DEVICE_KEY = 'CLIENT_DEVICE_ID';
    private readonly ACTION_LOG_STORAGE_KEY = 'sync.action-log';
    private readonly META_STORAGE_KEY = 'sync.meta';
    private readonly PLAYER_ID = 'PLAYER_TEST_01';
    private serverUrl = 'http://localhost:3000'; // 模擬伺服器位址
    private persistChain: Promise<void> = Promise.resolve();

    public getActionRecords(): ActionRecord[] {
        return [...this.actionRecords];
    }

    public getActionRecordCount(): number {
        return this.actionRecords.length;
    }

    public getStorageModeLabel(): string {
        if (this.storageAdapter) {
            return this.storageAdapter.adapterName;
        }
        return sys.isNative ? 'localStorage(native)' : 'localStorage(fallback)';
    }

    public getActionLogSnapshot(): SyncDebugSnapshot {
        return {
            storageMode: this.getStorageModeLabel(),
            deviceId: this.deviceId,
            currentSeq: this.currentSeq,
            lastHash: this.lastHash,
            pendingCount: this.actionRecords.length,
            isHydrated: this.hasHydratedLocalState,
            records: [...this.actionRecords],
        };
    }

    /** 切換同步伺服器位址（測試或不同環境用）。 */
    public setServerUrl(url: string): void {
        this.serverUrl = url.replace(/\/+$/, '');
    }

    /** 伺服器確認過的同步錨點。 */
    public getAnchorHash(): string {
        return this.anchorHash;
    }

    /** 等待本地狀態還原完成。 */
    public async whenHydrated(): Promise<void> {
        await this.restorePromise;
    }

    /** 等待所有排隊中的本地持久化寫入完成（IndexedDB 是非同步的）。 */
    public async flushLocalState(): Promise<void> {
        await this.persistChain;
    }

    public getMemorySaveId(): string {
        if (!this.deviceId) {
            this.initDeviceId();
        }
        return this.deviceId;
    }

    public setup(eventSystem: EventSystem, network: NetworkService): void {
        this.eventSystem = eventSystem;
        this.network = network;

        this.initDeviceId();
        this.restorePromise = this.restoreLocalState();

        // 當底層 Service 通知網路復原時，立刻喚醒背景同步
        this.eventSystem.on(EVENT_NETWORK_ONLINE, this.handleNetworkRestored.bind(this));
        
        // 啟動離線提醒監控
        this.startOfflineReminder();
    }

    private initDeviceId(): void {
        this.deviceId = sys.localStorage.getItem(this.DEVICE_KEY);
        if (!this.deviceId) {
            this.deviceId = `DEV_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            sys.localStorage.setItem(this.DEVICE_KEY, this.deviceId);
        }
    }

    private async restoreLocalState(): Promise<void> {
        const legacyRecords = this.loadLegacyActions();
        const adapter = await this.ensureStorageAdapter();

        try {
            const storedMeta = adapter
                ? await adapter.get<SyncLocalMeta>(this.META_STORAGE_KEY)
                : null;
            const storedRecords = adapter
                ? (await adapter.get<ActionRecord[]>(this.ACTION_LOG_STORAGE_KEY)) ?? []
                : [];

            this.actionRecords = this.mergeActionRecords(storedRecords, legacyRecords, this.actionRecords);
            this.currentSeq = Math.max(
                storedMeta?.currentSeq ?? 0,
                ...this.actionRecords.map((record) => record.Seq),
                0,
            );

            if (storedMeta?.sessionSecret) {
                this.sessionSecret = storedMeta.sessionSecret;
            }
            if (storedMeta?.anchorHash) {
                this.anchorHash = storedMeta.anchorHash;
            } else if (storedMeta?.lastHash && this.actionRecords.length === 0) {
                // 舊版 meta：沒有待同步紀錄時，鏈頭就是上次同步的錨點
                this.anchorHash = storedMeta.lastHash;
            }
            // 從錨點重新串鏈：涵蓋 hydration 前寫入的紀錄與舊版摘要算法產生的紀錄
            this.rechainPendingRecords();
            if (storedMeta?.deviceId && storedMeta.deviceId !== this.deviceId) {
                UCUFLogger.warn(
                    LogCategory.DATA,
                    '[SyncManager] 偵測到不同裝置快取，沿用 bootstrap deviceId。',
                    { bootstrapDeviceId: this.deviceId, storedDeviceId: storedMeta.deviceId },
                );
            }

            this.hasHydratedLocalState = true;
            UCUFLogger.info(
                LogCategory.DATA,
                `[SyncManager] 本地同步狀態已還原，pending actions=${this.actionRecords.length}`,
            );

            if (legacyRecords.length > 0 || !storedMeta || storedMeta.deviceId !== this.deviceId) {
                this.queuePersistLocalState();
            }

            if (this.network?.isOnline && this.actionRecords.length > 0) {
                void this.syncNow();
            }
        } catch (error) {
            UCUFLogger.error(LogCategory.DATA, '[SyncManager] 還原本地同步狀態失敗。', error);
        }
    }

    private loadLegacyActions(): ActionRecord[] {
        const stored = sys.localStorage.getItem(this.LEGACY_STORAGE_KEY);
        if (!stored) {
            return [];
        }

        try {
            const parsed = JSON.parse(stored) as ActionRecord[];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            UCUFLogger.error(LogCategory.DATA, '[SyncManager] 舊版 localStorage action log 解析失敗，已忽略。', error);
            return [];
        }
    }

    private mergeActionRecords(...batches: ActionRecord[][]): ActionRecord[] {
        const merged = new Map<string, ActionRecord>();
        for (const batch of batches) {
            for (const record of batch) {
                const key = `${record.Seq}:${record.Tx_Hash}`;
                if (!merged.has(key)) {
                    merged.set(key, record);
                }
            }
        }

        return [...merged.values()].sort((left, right) => left.Seq - right.Seq);
    }

    private queuePersistLocalState(): void {
        // 串行化寫入，避免較舊的快照晚於較新的快照落地
        this.persistChain = this.persistChain
            .then(() => this.persistLocalState())
            .catch((error) => UCUFLogger.error(LogCategory.DATA, '[SyncManager] 本地同步狀態寫入失敗。', error));
    }

    /** 以目前金鑰從 anchorHash 重新計算所有待同步紀錄的 Tx_Hash，並更新鏈頭。 */
    private rechainPendingRecords(): void {
        let previous = this.anchorHash;
        this.actionRecords = this.actionRecords.map((record) => {
            const txHash = computeSyncTxHash(record.Action, record.Payload, this.sessionSecret, previous);
            previous = txHash;
            return { ...record, Tx_Hash: txHash };
        });
        this.lastHash = previous;
    }

    /**
     * 套用伺服器的同步成功結果：移除已送出的紀錄、更新錨點與金鑰，
     * 同步途中新寫入的紀錄改用新金鑰從新錨點重新串鏈。
     */
    private applySyncSuccess(sentCount: number, newHash: string | undefined, newSecret: string | undefined): void {
        this.actionRecords = this.actionRecords.slice(sentCount);
        if (newHash) {
            this.anchorHash = newHash;
        }
        if (newSecret) {
            this.sessionSecret = newSecret;
        }
        this.rechainPendingRecords();
        this.queuePersistLocalState();
    }

    private async persistLocalState(): Promise<void> {
        const meta: SyncLocalMeta = {
            currentSeq: this.currentSeq,
            deviceId: this.deviceId,
            sessionSecret: this.sessionSecret,
            lastHash: this.lastHash,
            anchorHash: this.anchorHash,
        };
        const adapter = await this.ensureStorageAdapter();

        if (adapter) {
            try {
                await adapter.set(this.META_STORAGE_KEY, meta);
                await adapter.set(this.ACTION_LOG_STORAGE_KEY, this.actionRecords);
                sys.localStorage.removeItem(this.LEGACY_STORAGE_KEY);
                return;
            } catch (error) {
                UCUFLogger.warn(LogCategory.DATA, '[SyncManager] IndexedDB 寫入失敗，回退 legacy storage。', error);
            }
        }

        if (this.actionRecords.length === 0) {
            sys.localStorage.removeItem(this.LEGACY_STORAGE_KEY);
        } else {
            sys.localStorage.setItem(this.LEGACY_STORAGE_KEY, JSON.stringify(this.actionRecords));
        }
    }

    private async ensureStorageAdapter(): Promise<DataStorageAdapter | null> {
        if (this.storageAdapter) {
            return this.storageAdapter;
        }
        if (!this.storageInitPromise) {
            this.storageInitPromise = this.createStorageAdapter();
        }
        return this.storageInitPromise;
    }

    private async createStorageAdapter(): Promise<DataStorageAdapter | null> {
        if (sys.isNative) {
            UCUFLogger.warn(
                LogCategory.DATA,
                '[SyncManager] Native SQLite 尚未接線，暫以 bootstrap localStorage 維持最小同步狀態。',
            );
            return null;
        }

        const adapter = new IndexedDbAdapter();
        try {
            await adapter.init();
            this.storageAdapter = adapter;
            return adapter;
        } catch (error) {
            UCUFLogger.warn(LogCategory.DATA, '[SyncManager] IndexedDB 初始化失敗，回退 legacy storage。', error);
            return null;
        }
    }

    public isOnlineOnlyAction(actionName: string): boolean {
        return SyncManager.ONLINE_ONLY_ACTION_PATTERNS.some((pattern) => pattern.test(actionName));
    }

    private resolveActionType(actionName: string, requestedType: SyncActionType): SyncActionType {
        if (requestedType === SyncActionType.IMMEDIATE_REQUIRED) {
            return requestedType;
        }
        return this.isOnlineOnlyAction(actionName)
            ? SyncActionType.IMMEDIATE_REQUIRED
            : requestedType;
    }

    /**
     * 嘗試將一筆操作寫入 Action Log 佇列。
     * 如果是 IMMEDIATE_REQUIRED 且斷線，回傳 false 並拒絕執行，保障資料一致性。
     */
    public pushAction(actionName: string, payload: any, type: SyncActionType = SyncActionType.DEFERRABLE): boolean {
        const effectiveType = this.resolveActionType(actionName, type);
        if (!this.network?.isOnline && effectiveType === SyncActionType.IMMEDIATE_REQUIRED) {
            const isFinancialAction = this.isOnlineOnlyAction(actionName);
            this.eventSystem?.emit('SHOW_TOAST', {
                message: isFinancialAction
                    ? '轉蛋、商城與金流相關操作需連網後才能執行。'
                    : '此操作涉及到帳戶變動，請連接網路後再試',
            });
            return false;
        }

        // 離線下也要確保存檔是同一個裝置
        const currentStoredId = sys.localStorage.getItem(this.DEVICE_KEY);
        if (currentStoredId && currentStoredId !== this.deviceId) {
            this.eventSystem?.emit('SHOW_TOAST', { message: '偵測到裝置不符，離線資料無法同步至此裝置' });
            return false;
        }

        this.currentSeq++;
        
        // 同步契約：HMAC-SHA256(secret, Action + JSON(Payload) + secret + previousHash)，與 server/src/sync.ts 一致。
        // 雜湊是鏈式的，若任何一步被竄改，後續所有雜湊皆會連動失效
        const calculatedHash = computeSyncTxHash(actionName, payload, this.sessionSecret, this.lastHash);
        this.lastHash = calculatedHash;

        const record: ActionRecord = {
            Seq: this.currentSeq,
            Timestamp: Date.now(),
            Action: actionName,
            Payload: payload,
            Tx_Hash: calculatedHash
        };

        this.actionRecords.push(record);
        this.queuePersistLocalState();
        
        if (!this.hasHydratedLocalState) {
            UCUFLogger.warn(LogCategory.DATA, '[SyncManager] action log 在本地狀態完成 hydration 前被寫入。', {
                actionName,
                pendingCount: this.actionRecords.length,
            });
        }
        UCUFLogger.debug(
            LogCategory.DATA,
            `[SyncManager] Action Logged: ${actionName} (${calculatedHash.substring(0, 8)}...)`,
        );

        if (this.network?.isOnline) {
            void this.syncNow();
        }

        return true;
    }

    private startOfflineReminder(): void {
        if (this.reminderTimer) clearInterval(this.reminderTimer);
        // 每 5 分鐘檢查一次，若是離線狀態且有未同步資料，彈出提示
        this.reminderTimer = setInterval(() => {
            if (!this.network?.isOnline && this.actionRecords.length > 0) {
                this.eventSystem?.emit(EVENT_OFFLINE_REMINDER, {
                    message: '您目前處於離線模式，進度僅存於本機。請儘速連網以同步資料並保障帳號安全。'
                });
            }
        }, 300000); // 5 minutes
    }

    private handleNetworkRestored(): void {
        void this.handleDeltaQueueOnRestore();
        if (this.actionRecords.length > 0) {
            UCUFLogger.info(LogCategory.DATA, '[SyncManager] Network restored. Resuming pending actions...');
            void this.syncNow();
        }
    }

    private async syncNow(): Promise<void> {
        if (this.isSyncing || this.actionRecords.length === 0) return;
        
        this.isSyncing = true;
        this.eventSystem?.emit(EVENT_SYNCING);

        const sentRecords = [...this.actionRecords];
        const syncData: SyncRequest = {
            Player_ID: this.PLAYER_ID,
            Session_Secret: this.sessionSecret,
            Action_Records: sentRecords,
            Previous_Hash: this.anchorHash, // 雜湊鏈起點 = 伺服器確認過的錨點
        };

        UCUFLogger.info(LogCategory.DATA, `[SyncManager] Requesting Sync for ${sentRecords.length} records...`);

        try {
            const response = await fetch(`${this.serverUrl}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(syncData)
            });

            const result: SyncResponse = await response.json();

            if (result.Success) {
                UCUFLogger.info(LogCategory.DATA, '[SyncManager] Sync OK. New Secret issued.');
                this.applySyncSuccess(sentRecords.length, result.New_Hash, result.New_Session_Secret);
                this.isSyncing = false;
                this.eventSystem?.emit(EVENT_SYNC_COMPLETE);
                // 同步途中又寫入的紀錄（已改用新金鑰串鏈）接著送出
                if (this.actionRecords.length > 0 && this.network?.isOnline) {
                    void this.syncNow();
                }
            } else {
                UCUFLogger.error(LogCategory.DATA, `[SyncManager] Sync Rejected: ${result.Message}`);
                this.isSyncing = false;
            }
        } catch (e) {
            UCUFLogger.error(LogCategory.DATA, '[SyncManager] API Call Failed (Network Error?).', e);
            this.isSyncing = false;
        }
    }

    // ========== DC-5-0002: Delta 同步模式 ==========

    /** delta patch 佇列（最多 10 筆，超過觸發全量同步）*/
    private deltaPatchQueue: unknown[] = [];
    private readonly DELTA_QUEUE_MAX = 10;

    /**
     * 優先使用 DeltaPatchBuilder 生成 delta patch 上傳；
     * 若 delta 失敗（hash 不匹配等）自動 fallback 至全量同步。
     * @param baseSave  上次同步的基準存檔物件
     * @param currentSave 當前存檔物件
     */
    public async syncDelta(baseSave: object, currentSave: object): Promise<void> {
        if (this.isSyncing) return;
        if (!this.network?.isOnline) {
            UCUFLogger.info(LogCategory.DATA, '[SyncManager] offline - queuing delta patch');
            this._enqueueDeltaPatch(baseSave, currentSave);
            return;
        }

        this.isSyncing = true;
        this.eventSystem?.emit(EVENT_SYNCING);

        try {
            // 動態引入以避免循環依賴
            const { DeltaPatchBuilder } = await import('../services/DeltaPatchBuilder');
            const patches = DeltaPatchBuilder.build(baseSave, currentSave);
            const sentRecords = [...this.actionRecords];

            const request: DeltaSyncRequest = {
                playerId: this.PLAYER_ID,
                deviceId: this.deviceId,
                sessionToken: this.sessionSecret,
                baseHash: this.anchorHash,
                patches,
                actionRecords: sentRecords,
                clientTimestamp: Date.now(),
            };

            const response = await fetch(`${this.serverUrl}/sync/delta`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });

            if (response.status === 409) {
                // hash 衝突 → fallback 全量同步
                UCUFLogger.warn(LogCategory.DATA, '[SyncManager] delta conflict (409) - falling back to full sync');
                this.isSyncing = false;
                await this.syncFull(currentSave);
                return;
            }

            if (response.ok) {
                const result: SyncEndpointResponse = await response.json();
                this.applySyncSuccess(sentRecords.length, result.newHash, result.newSessionSecret);
                this.deltaPatchQueue = [];
                this.eventSystem?.emit(EVENT_SYNC_COMPLETE);
                UCUFLogger.info(LogCategory.DATA, '[SyncManager] delta sync OK');
            } else {
                UCUFLogger.error(LogCategory.DATA, `[SyncManager] delta sync failed: ${response.status}`);
                this._enqueueDeltaPatch(baseSave, currentSave);
            }
        } catch (e) {
            UCUFLogger.error(LogCategory.DATA, '[SyncManager] delta sync error:', e);
            this._enqueueDeltaPatch(baseSave, currentSave);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * 全量同步（fallback）。完整存檔已反映所有待同步行動，成功後清空已送出的行動紀錄。
     */
    public async syncFull(saveData: object): Promise<void> {
        if (this.isSyncing) return;
        this.isSyncing = true;
        this.eventSystem?.emit(EVENT_SYNCING);

        try {
            const sentCount = this.actionRecords.length;
            const request: FullSyncRequest = {
                playerId: this.PLAYER_ID,
                deviceId: this.deviceId,
                sessionToken: this.sessionSecret,
                saveData,
                clientTimestamp: Date.now(),
            };

            const response = await fetch(`${this.serverUrl}/sync/full`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });

            if (response.ok) {
                const result: SyncEndpointResponse = await response.json();
                this.applySyncSuccess(sentCount, result.newHash, result.newSessionSecret);
                this.deltaPatchQueue = [];
                this.eventSystem?.emit(EVENT_SYNC_COMPLETE);
                UCUFLogger.info(LogCategory.DATA, '[SyncManager] full sync OK');
            } else {
                UCUFLogger.error(LogCategory.DATA, `[SyncManager] full sync failed: ${response.status}`);
            }
        } catch (e) {
            UCUFLogger.error(LogCategory.DATA, '[SyncManager] full sync error:', e);
        } finally {
            this.isSyncing = false;
        }
    }

    private _enqueueDeltaPatch(base: object, current: object): void {
        this.deltaPatchQueue.push({ base, current, ts: Date.now() });
        if (this.deltaPatchQueue.length > this.DELTA_QUEUE_MAX) {
            UCUFLogger.warn(LogCategory.DATA, '[SyncManager] delta queue full (>10) - will trigger full sync on next online');
            this.deltaPatchQueue = [];
        }
    }

    // ========== DC-5-0004: Action_Records 批次壓縮上傳 ==========

    /**
     * 批次收集 Action_Records，gzip 壓縮後上傳。
     * 自動呼叫 GzipCodec，需確保 pako 已引入。
     */
    public async flushCompressedActions(): Promise<void> {
        if (this.isSyncing || this.actionRecords.length === 0 || !this.network?.isOnline) return;

        this.isSyncing = true;
        try {
            const { GzipCodec } = await import('../serialization/GzipCodec');
            const sentRecords = [...this.actionRecords];
            const compressed = GzipCodec.compressJson(JSON.stringify(sentRecords));

            // 轉為 Base64 供 JSON body 傳送（分段組字串，避免大陣列展開爆 call stack）
            let binary = '';
            const CHUNK = 0x8000;
            for (let offset = 0; offset < compressed.length; offset += CHUNK) {
                binary += String.fromCharCode(...compressed.subarray(offset, offset + CHUNK));
            }

            const request: CompressedActionsSyncRequest = {
                playerId: this.PLAYER_ID,
                deviceId: this.deviceId,
                sessionToken: this.sessionSecret,
                baseHash: this.anchorHash,
                actionRecordsCompressed: btoa(binary),
                count: sentRecords.length,
                clientTimestamp: Date.now(),
            };

            const response = await fetch(`${this.serverUrl}/sync/actions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });

            if (response.ok) {
                const result: SyncEndpointResponse = await response.json();
                this.applySyncSuccess(sentRecords.length, result.newHash, result.newSessionSecret);
                UCUFLogger.info(
                    LogCategory.DATA,
                    `[SyncManager] flushed ${sentRecords.length} actions (compressed)`,
                );
                this.eventSystem?.emit(EVENT_SYNC_COMPLETE);
            } else {
                UCUFLogger.error(LogCategory.DATA, `[SyncManager] flushCompressedActions failed: ${response.status}`);
            }
        } catch (e) {
            UCUFLogger.error(LogCategory.DATA, '[SyncManager] flushCompressedActions error:', e);
        } finally {
            this.isSyncing = false;
        }
    }

    // ========== DC-5-0005: 網路狀態偵測 + 自動重試 + 斷點續傳 ==========

    private _retryCount = 0;
    private readonly MAX_RETRY = 3;
    private _retryTimer: ReturnType<typeof setTimeout> | null = null;
    private _pendingSaveForOnline: object | null = null;

    /**
     * 標記當前存檔，在恢復網路時自動重試 delta/full 同步。
     */
    public scheduleRetryOnRestore(currentSave: object): void {
        this._pendingSaveForOnline = currentSave;
    }

    /**
     * 帶指數退避的重試同步（最多 3 次）。
     * @param saveFn 同步函式（呼叫 syncDelta 或 syncFull）
     */
    public async retrySync(saveFn: () => Promise<void>): Promise<void> {
        if (this._retryCount >= this.MAX_RETRY) {
            UCUFLogger.warn(LogCategory.DATA, '[SyncManager] max retries reached - notifying player');
            this.eventSystem?.emit('SHOW_TOAST', { message: '同步失敗，請稍後手動儲存或重連網路。' });
            this._retryCount = 0;
            return;
        }

        const delayMs = Math.pow(2, this._retryCount) * 1000; // 1s, 2s, 4s
        this._retryCount++;
        UCUFLogger.info(LogCategory.DATA, `[SyncManager] retry #${this._retryCount} in ${delayMs}ms`);

        this._retryTimer = setTimeout(async () => {
            if (this.network?.isOnline) {
                try {
                    await saveFn();
                    this._retryCount = 0;
                } catch {
                    await this.retrySync(saveFn);
                }
            } else {
                await this.retrySync(saveFn);
            }
        }, delayMs);
    }

    /**
     * 網路恢復後，若有排程的 pending 存檔，自動重送。
     * 覆寫 handleNetworkRestored 行為（保留舊邏輯並新增 delta 重送）。
     */
    private async handleDeltaQueueOnRestore(): Promise<void> {
        // 佇列非空 → 觸發全量同步
        if (this.deltaPatchQueue.length > 0 && this._pendingSaveForOnline) {
            UCUFLogger.info(LogCategory.DATA, '[SyncManager] network restored with pending delta queue - full sync');
            await this.syncFull(this._pendingSaveForOnline);
            this._pendingSaveForOnline = null;
        }
    }
}
