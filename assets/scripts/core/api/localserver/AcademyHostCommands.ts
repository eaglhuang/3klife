// @spec-source → 學府修業畫面與接線設計 (doc_spec_1179) §9.4 第 1、3 項；共用框架總綱 (doc_spec_1182) §12 第 6a 列；PROG-2-9215
/**
 * AcademyHostCommands — 學府修業所需的兩組權威命令在本機 adapter 的處理器。
 *
 * - save.read／save.write（domain=academy）：修業紀錄的讀寫。寫入先驗結構（不合格拋錯）、補「入學當下外界時鐘」，
 *   再整份存檔落盤；落盤失敗就把紀錄還原成寫入前的樣子並回 E190，客戶端不會看到半套狀態。
 * - rng.issueSeed：簽發亂數種子。客戶端不得自行組種子；網路版由伺服器簽發，本機版沿用既有字串規則，
 *   所以同一存檔簽出的值與改接前完全相同（行為不變、確定性重播不受影響）。
 *
 * 紀錄存放與存檔落盤由宿主（單機＝GameSession）提供，這裡不碰存檔後端與 GameSession。純邏輯，不 import cc。
 */
import type {
    RngIssueSeedResult, SaveReadResult, SaveWriteResult,
} from '../../../shared/api/ApiCommands';
import { ApiError } from '../../../shared/api/ApiErrors';
import { GameAcademySaveStore, type AcademyRecordPort, type PersistedAcademyRecord } from '../../services/GameAcademySaveStore';
import type { AcademySaveRecord } from '../../systems/nurture/AcademyAntiSLManager';
import type { SessionSaveService } from './ApiSaveGateway';
import type { LocalApiAdapter } from './LocalApiAdapter';

/** 學府宿主：單機由 GameSession 提供，連線時由伺服器取代 */
export interface AcademyHost {
    port: AcademyRecordPort;
    /**
     * 整份存檔落盤；沒有存檔服務時可為空操作；失敗要丟錯。
     * via＝這個命令處理器專用的存檔出口（走 save.full 的處理器直呼，不排佇列）。處理器裡不能再用 api.cmd 排隊存檔：
     * 佇列是串行的，save.write 還在執行時排進去的 save.full 要等 save.write 結束，而 save.write 又在等它，整條佇列就死結。
     */
    persist(via: Pick<SessionSaveService, 'save'>): Promise<void>;
    clanUuid(): string;
}

/** 種子簽發範圍：學府世界種子（原 AcademyFlowDeps.worldSeed） */
export const RNG_SCOPE_ACADEMY_WORLD = 'academy.world';

const SAVE_READ_ARGS = ['domain'];
const SAVE_WRITE_ARGS = ['domain', 'record'];
const RNG_ARGS = ['scope'];

function rejectExtra(args: Record<string, unknown>, allowed: readonly string[]): void {
    const extra = Object.keys(args).find((k) => allowed.indexOf(k) < 0);
    if (extra) throw new ApiError('FORBIDDEN_FIELD', `命令不得帶欄位 ${extra}`);
}

function requireAcademyDomain(value: unknown): void {
    if (value !== 'academy') throw new ApiError('INVALID_SCHEMA', `不支援的存檔分域 ${String(value)}`);
}

export function registerAcademyHostCommands(adapter: LocalApiAdapter, getHost: () => AcademyHost | null): void {
    const hostOf = (): AcademyHost => {
        const host = getHost();
        if (!host) throw new ApiError('SAVE_FAILED', '學府存檔宿主尚未就緒');
        return host;
    };

    adapter.register('save.read', (args) => {
        rejectExtra(args, SAVE_READ_ARGS);
        requireAcademyDomain(args.domain);
        const result: SaveReadResult = { domain: 'academy', record: new GameAcademySaveStore(hostOf().port).read() };
        return { result };
    });

    adapter.register('save.write', async (args) => {
        rejectExtra(args, SAVE_WRITE_ARGS);
        requireAcademyDomain(args.domain);
        const host = hostOf();
        const store = new GameAcademySaveStore(host.port);
        const previous = store.read();
        try {
            if (args.record === null) store.clear();
            else store.write(args.record as AcademySaveRecord);
            await host.persist({ save: async (snapshot) => { await adapter.invoke('save.full', { snapshot }); } });
        } catch (error) {
            store.restore(previous as PersistedAcademyRecord | null);
            throw new ApiError('SAVE_FAILED', error instanceof Error ? error.message : String(error));
        }
        const result: SaveWriteResult = { domain: 'academy', saved: true };
        return { result, events: [{ evt: 'save.rev' }] };
    });

    adapter.register('rng.issueSeed', (args) => {
        rejectExtra(args, RNG_ARGS);
        if (typeof args.scope !== 'string' || args.scope.length === 0) throw new ApiError('INVALID_SCHEMA', 'scope 不可為空');
        if (args.scope !== RNG_SCOPE_ACADEMY_WORLD) throw new ApiError('INVALID_SCHEMA', `不支援的種子範圍 ${args.scope}`);
        const result: RngIssueSeedResult = { scope: args.scope, seed: `3klife-world|${hostOf().clanUuid()}` };
        return { result };
    });
}
