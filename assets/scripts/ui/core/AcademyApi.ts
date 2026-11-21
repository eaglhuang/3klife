// @spec-source → 學府修業畫面與接線設計 (doc_spec_1179) §9.4、§9.5；共用框架總綱 (doc_spec_1182) §12 第 6a 列；PROG-2-9215
/**
 * AcademyApi — 學府修業玩法層對共通 API 的唯一出口（純邏輯，不依賴 cc、不認識 GameSession）。
 *
 * 學府包裝層（AcademyFlowController）只透過它做三件事，換成網路 adapter 時一行都不用改：
 *   - save：修業紀錄 save.read／save.write（domain=academy），寫入失敗必拋；
 *   - task：36 回合修業＝一張 ACADEMY_36 任務，入學 task.accept、每回合 task.advance、暫離 task.pause／resume；
 *   - rng：世界種子由 rng.issueSeed 簽發，客戶端不自己組。
 *
 * 任務步數＝已完成的回合數（第 36 回合打完、等結業確認時為 36）。閘門 TERM_1／TERM_2（第 12、24 步）在
 * 「學期回合打完後」停住，下一回合動作前由這裡清掉（真正的學期評核彈窗屬 PROG-2-9190）；
 * 閘門 GRADUATE（第 36 步）留給結業串接（PROG-2-9191）清除與 task.settle。
 *
 * AcademyRecordCache 是防 SL 管理器用的同步快取：管理器同步讀寫它，落盤由控制器隨後 save.write；
 * 寫入失敗時控制器把快取還原，權威端本來就沒被改（save.write 失敗會自行還原）。
 */
import type { IApiClient } from '../../shared/api/IApiClient';
import { isApiFail, type ApiResult } from '../../shared/api/ApiProtocol';
import type {
    SaveReadResult, RngIssueSeedResult, TaskAcceptResult, TaskAdvanceResult, TaskChangeResult, TaskQueryResult,
} from '../../shared/api/ApiCommands';
import type { QuestInstanceView } from '../../shared/quest/QuestTypes';
import { ACADEMY_QUEST_DEF_ID, ACADEMY_TASK_KIND } from '../../shared/quest/AcademyQuest';
import type { AcademySaveRecord, IAcademySaveStore } from '../../core/systems/nurture/AcademyAntiSLManager';
import type { AcademyStateSnapshot } from '../../core/systems/nurture/AcademyTypes';

export const ACADEMY_RNG_SCOPE = 'academy.world';
const TERM_GATE_PREFIX = 'TERM_';

/** 學府任務的最小檢視 */
export interface AcademyTaskInfo {
    qid: string;
    /** 已完成回合數 */
    step: number;
    paused: boolean;
}

/** 快照對應的任務步數：已打完的回合數（第 36 回合打完後 currentTurn 不再增加，要補 1） */
export function completedTurnsOf(snapshot: Readonly<AcademyStateSnapshot>): number {
    const finished = snapshot.graduated || snapshot.pendingInterrupt === 'GRADUATION';
    return snapshot.currentTurn - 1 + (finished ? 1 : 0);
}

export interface AcademyApi {
    /** save.read：目前的修業紀錄；null＝沒有 */
    loadRecord(): Promise<AcademySaveRecord | null>;
    /** save.write：寫入並落盤；失敗必拋 */
    saveRecord(record: AcademySaveRecord | null): Promise<void>;
    /** rng.issueSeed：學府世界種子 */
    issueSeed(): Promise<string>;
    /** task.accept：入學開一張學府任務（占用由任務框架登記）；回傳 qid */
    acceptTask(childId: string, acceptKey: string): Promise<string>;
    /** task.abandon：入學落盤失敗時撤回剛開的任務 */
    abandonTask(qid: string): Promise<void>;
    /**
     * 對齊任務與紀錄：找不到進行中的學府任務（舊存檔）就補開並推到 completedTurns；落後就補推；暫離中就恢復。
     * 回傳任務資訊。
     */
    syncTask(childId: string, completedTurns: number): Promise<AcademyTaskInfo>;
    /** task.advance：打完一個回合；先清掉學期閘門。冪等（fromStep 已過回原狀） */
    advanceTurn(qid: string, fromStep: number): Promise<void>;
    /** task.pause：暫離 */
    pauseTask(qid: string): Promise<void>;
}

/** 防 SL 管理器用的同步存檔快取 */
export class AcademyRecordCache implements IAcademySaveStore {
    private _record: AcademySaveRecord | null = null;

    public write(record: AcademySaveRecord): void {
        this._record = JSON.parse(JSON.stringify(record)) as AcademySaveRecord;
    }

    public read(): AcademySaveRecord | null {
        return this._record ? JSON.parse(JSON.stringify(this._record)) as AcademySaveRecord : null;
    }

    /** 以權威端的紀錄整份取代（null＝沒有進行中的修業） */
    public replace(record: AcademySaveRecord | null): void {
        this._record = record ? JSON.parse(JSON.stringify(record)) as AcademySaveRecord : null;
    }
}

function unwrap<T>(res: ApiResult<T>): T {
    if (isApiFail(res)) throw new Error(`${res.errorCode} ${res.message}`);
    return res.result;
}

/** 以 IApiClient 實作 AcademyApi（本機 adapter 與網路 adapter 共用） */
export class AcademyApiClient implements AcademyApi {
    constructor(private readonly _api: IApiClient) {}

    public async loadRecord(): Promise<AcademySaveRecord | null> {
        const out = unwrap(await this._api.query<SaveReadResult>('save.read', { domain: 'academy' }));
        return (out.record as AcademySaveRecord | null) ?? null;
    }

    public async saveRecord(record: AcademySaveRecord | null): Promise<void> {
        unwrap(await this._api.cmd('save.write', { domain: 'academy', record }));
    }

    public async issueSeed(): Promise<string> {
        return unwrap(await this._api.query<RngIssueSeedResult>('rng.issueSeed', { scope: ACADEMY_RNG_SCOPE })).seed;
    }

    public async acceptTask(childId: string, acceptKey: string): Promise<string> {
        const out = unwrap(await this._api.cmd<TaskAcceptResult>('task.accept', { defId: ACADEMY_QUEST_DEF_ID, actors: [childId], acceptKey }));
        return out.task.qid;
    }

    public async abandonTask(qid: string): Promise<void> {
        unwrap(await this._api.cmd<TaskChangeResult>('task.abandon', { qid }));
    }

    private async _find(childId: string): Promise<TaskQueryResult['tasks'][number] | null> {
        const out = unwrap(await this._api.query<TaskQueryResult>('task.query', { taskKind: ACADEMY_TASK_KIND, actor: childId }));
        return out.tasks.find((t) => t.state === 'ACTIVE' || t.state === 'PAUSED') ?? null;
    }

    public async syncTask(childId: string, completedTurns: number): Promise<AcademyTaskInfo> {
        let task: QuestInstanceView;
        const found = await this._find(childId);
        if (found) {
            task = found;
        } else {
            // 舊存檔（9189 時期入學）沒有任務：釋放舊占用 refId 後補開，再推到已完成回合
            await this._api.cmd('occupancy.release', { personId: childId, kind: 'academy', refId: `academy:${childId}` });
            task = unwrap(await this._api.cmd<TaskAcceptResult>('task.accept', {
                defId: ACADEMY_QUEST_DEF_ID, actors: [childId], acceptKey: `academy:migrate:${childId}`,
            })).task;
        }
        if (task.state === 'PAUSED') task = unwrap(await this._api.cmd<TaskChangeResult>('task.resume', { qid: task.qid })).task;
        // 落後就補推；補推途中遇到學期閘門代表那一期已過，清掉繼續
        for (let guard = 0; task.step < completedTurns && guard < 40; guard++) {
            await this._clearTermGate(task);
            task = unwrap(await this._api.cmd<TaskAdvanceResult>('task.advance', {
                qid: task.qid, fromStep: task.step, steps: completedTurns - task.step,
            })).task;
        }
        return { qid: task.qid, step: task.step, paused: task.state === 'PAUSED' };
    }

    private async _clearTermGate(task: { qid: string; pendingGate: string | null }): Promise<void> {
        if (task.pendingGate && task.pendingGate.indexOf(TERM_GATE_PREFIX) === 0) {
            unwrap(await this._api.cmd('task.clearGate', { qid: task.qid, gateId: task.pendingGate }));
        }
    }

    public async advanceTurn(qid: string, fromStep: number): Promise<void> {
        const now = unwrap(await this._api.query<TaskQueryResult>('task.query', { qid })).tasks[0];
        if (!now) throw new Error(`找不到學府任務 ${qid}`);
        await this._clearTermGate(now);
        unwrap(await this._api.cmd<TaskAdvanceResult>('task.advance', { qid, fromStep }));
    }

    public async pauseTask(qid: string): Promise<void> {
        unwrap(await this._api.cmd<TaskChangeResult>('task.pause', { qid }));
    }
}
