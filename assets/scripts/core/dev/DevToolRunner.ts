// @spec-source → 測試工具 2.0（使用者 2026-11-23 定案）；PROG-2-9852
/**
 * DevToolRunner — 執行面板按鈕的動作（純 TS，不依賴 cc）。
 *
 * 所有會改狀態的動作都走共通 API 命令（debug.* 等），結果與錯誤寫進操作紀錄；
 * 預設存檔（preset）依序跑步驟，每步結束都等背景工作（advanceTime、resetGame 的 ack 後續）完成再往下。
 * 不直接碰畫面數字或存檔後端。
 */
import { isApiFail } from '../../shared/api/ApiProtocol';
import type { IApiClient } from '../../shared/api/IApiClient';
import type { DevToolAction, DevToolPanelConfig } from './DevToolPanelConfig';
import type { DevToolJobs, DevToolLog } from './DevToolRuntime';

export interface DevToolRunnerDeps {
    readonly api: () => IApiClient;
    readonly config: () => DevToolPanelConfig;
    readonly log: DevToolLog;
    readonly jobs: DevToolJobs;
    /** local 動作的實作（複製紀錄、匯出存檔…）；回傳字串會寫進紀錄 */
    readonly local: Readonly<Record<string, () => Promise<string | void> | string | void>>;
    /** 命令成功後通知畫面更新（錢包數字、大廳資源列…） */
    readonly onChanged?: () => void;
}

function briefArgs(args: unknown): string {
    try {
        const text = JSON.stringify(args);
        return text.length > 120 ? `${text.slice(0, 117)}...` : text;
    } catch {
        return '[args]';
    }
}

function briefResult(result: unknown): string {
    if (result === undefined || result === null) return '';
    try {
        const text = JSON.stringify(result);
        return text.length > 160 ? ` ${text.slice(0, 157)}...` : ` ${text}`;
    } catch {
        return '';
    }
}

export class DevToolRunner {
    private _chain: Promise<unknown> = Promise.resolve();

    public constructor(private readonly _deps: DevToolRunnerDeps) {}

    /** 一個動作排進序列（連點時不會兩個預設存檔互相穿插）；回傳是否成功 */
    public run(action: DevToolAction): Promise<boolean> {
        const next = this._chain.then(() => this._run(action));
        this._chain = next.catch(() => undefined);
        return next;
    }

    /** 直接呼叫一個命令（資源列、輸入框用）；kind 由命令表決定 cmd／query */
    public command(cmd: string, args: Record<string, unknown>): Promise<boolean> {
        return this.run({ kind: 'api', cmd, args });
    }

    private async _run(action: DevToolAction): Promise<boolean> {
        const { log } = this._deps;
        switch (action.kind) {
            case 'api':
                return this._call(action.cmd, { ...action.args });
            case 'preset':
                return this._preset(action.preset);
            case 'local': {
                const fn = this._deps.local[action.id];
                if (!fn) { log.append('fail', `local:${action.id} 沒有實作`); return false; }
                try {
                    const out = await fn();
                    log.append('ok', `local:${action.id}${typeof out === 'string' && out ? ` ${out}` : ''}`);
                    return true;
                } catch (error) {
                    log.append('fail', `local:${action.id} ${error instanceof Error ? error.message : String(error)}`);
                    return false;
                }
            }
            default:
                log.append('info', `尚未接線${action.note ? `：${action.note}` : ''}`);
                return false;
        }
    }

    private async _call(cmd: string, args: Record<string, unknown>): Promise<boolean> {
        const { log, api } = this._deps;
        log.append('cmd', `${cmd} ${briefArgs(args)}`);
        const client = api();
        const isQuery = cmd === 'debug.exportSave';
        try {
            const res = isQuery ? await client.query(cmd, args) : await client.cmd(cmd, args);
            if (isApiFail(res)) {
                log.append('fail', `${cmd} ${res.errorCode} ${res.reason}：${res.message}`);
                return false;
            }
            // 匯出的存檔很長，只記大小；完整內容由 local 動作取
            const summary = cmd === 'debug.exportSave' ? '' : briefResult(res.result);
            log.append('ok', `${cmd}${summary}`);
            this._deps.onChanged?.();
            return true;
        } catch (error) {
            log.append('fail', `${cmd} 例外：${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    private async _preset(id: string): Promise<boolean> {
        const { log, jobs } = this._deps;
        const preset = this._deps.config().presets[id];
        if (!preset) { log.append('fail', `預設存檔 ${id} 不存在`); return false; }
        log.append('info', `預設存檔「${preset.label}」開始，共 ${preset.steps.length} 步`);
        for (let i = 0; i < preset.steps.length; i++) {
            const step = preset.steps[i];
            const ok = await this._call(step.cmd, { ...step.args });
            if (!ok) { log.append('fail', `預設存檔在第 ${i + 1} 步中止`); return false; }
            if (!await jobs.whenIdle()) { log.append('fail', `預設存檔第 ${i + 1} 步的背景工作逾時`); return false; }
        }
        log.append('ok', `預設存檔「${preset.label}」完成`);
        return true;
    }
}
