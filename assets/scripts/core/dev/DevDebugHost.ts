// @spec-source → 測試工具 2.0（使用者 2026-11-23 定案）；PROG-2-9855
/**
 * DevDebugHost — 測試工具的偵錯宿主：把 debug.* 命令落到 GameSession（純 TS，不依賴 cc）。
 *
 * 命令佇列是串行的，宿主裡的存檔、季結都會再呼叫 save.* 等命令，所以：
 * - 同步能力（兵糧調整、數值設定、匯出快照）只改記憶體並「排程」存檔（不 await，命令結束後才輪到）。
 * - 背景能力（推進季數、開新局、套用匯入存檔）開工時向 DevToolJobs 登記，結束時結案，預設存檔靠它對齊步驟。
 */
import type { DebugHost } from '../api/localserver/DebugCommands';
import type { DevToolJobs, DevToolLog } from './DevToolRuntime';

/** GameSession 中宿主用到的部分（測試可用假物件） */
export interface DevHostSession {
    debugAdjustMilitary(field: 'food' | 'cityTroops', delta: number): { applied: number; value: number };
    debugSetStat(key: 'recruitRegen' | 'woundedCamp' | 'discoveryLevel', value: number): number;
    createSnapshot(): unknown;
    advanceSeason(): Promise<unknown>;
    save(): Promise<unknown>;
    load(): Promise<boolean>;
    startNewGame(): void;
    readonly hasSaveService: boolean;
}

export interface DevDebugHostDeps {
    readonly session: () => DevHostSession;
    readonly jobs: DevToolJobs;
    readonly log: DevToolLog;
    /** 開新局時清掉名冊（單機名冊存在 PlayerRosterService，不在 GameSession） */
    readonly resetRoster?: () => void;
    /** 狀態被改（含背景工作完成）：場景據此刷新資源列等 */
    readonly onStateChanged?: () => void;
    /** 匯入存檔或開新局後整個重載場景才能讓畫面對上新狀態 */
    readonly reloadScene?: () => void;
}

export function createDevDebugHost(deps: DevDebugHostDeps): DebugHost {
    const saveSoon = (): void => {
        const session = deps.session();
        if (!session.hasSaveService) return;
        // 不 await：處理器裡等存檔會卡住命令佇列；排在目前命令之後執行
        void session.save().catch((error) => deps.log.append('fail', `存檔失敗：${error instanceof Error ? error.message : String(error)}`));
    };

    return {
        adjustMilitary: (field, delta) => {
            const out = deps.session().debugAdjustMilitary(field, delta);
            saveSoon();
            deps.onStateChanged?.();
            return out;
        },
        setStat: (key, value) => {
            const applied = deps.session().debugSetStat(key as 'recruitRegen' | 'woundedCamp' | 'discoveryLevel', value);
            saveSoon();
            deps.onStateChanged?.();
            return applied;
        },
        exportSnapshot: () => deps.session().createSnapshot(),
        advanceTime: (seasons) => {
            const done = deps.jobs.begin();
            return (async () => {
                try {
                    let advanced = 0;
                    for (; advanced < seasons; advanced++) await deps.session().advanceSeason();
                    deps.log.append('info', `已推進 ${advanced} 季`);
                } catch (error) {
                    deps.log.append('fail', `推進中斷：${error instanceof Error ? error.message : String(error)}`);
                } finally {
                    done();
                    deps.onStateChanged?.();
                }
            })();
        },
        resetGame: () => {
            const done = deps.jobs.begin();
            return (async () => {
                try {
                    const session = deps.session();
                    session.startNewGame();
                    deps.resetRoster?.();
                    if (session.hasSaveService) await session.save();
                    deps.log.append('info', '已開新局並存檔');
                } catch (error) {
                    deps.log.append('fail', `開新局失敗：${error instanceof Error ? error.message : String(error)}`);
                } finally {
                    done();
                    deps.onStateChanged?.();
                }
            })();
        },
        applyImportedSave: () => {
            const done = deps.jobs.begin();
            return (async () => {
                try {
                    const loaded = await deps.session().load();
                    deps.log.append(loaded ? 'info' : 'fail', loaded ? '已套用匯入的存檔' : '匯入的存檔讀不回來');
                    if (loaded) deps.reloadScene?.();
                } catch (error) {
                    deps.log.append('fail', `套用存檔失敗：${error instanceof Error ? error.message : String(error)}`);
                } finally {
                    done();
                    deps.onStateChanged?.();
                }
            })();
        },
    };
}
