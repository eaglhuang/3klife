/**
 * AcademyApiRig — 學府測試共用的「本機伺服器 adapter」接線（PROG-2-9215）。
 *
 * 與 ServiceLoader 相同的接法：save.read／save.write／rng.issueSeed 與 task.*（正式 ACADEMY_36 定義）、
 * 占用登記都掛在真的 createLocalApi 上，學府控制器只拿到 AcademyApiClient。
 * 落盤失敗用 fail.on 注入（走 save.write 的 persist）。
 */
import * as fs from 'fs';
import * as path from 'path';
import { createLocalApi, type LocalApiBundle } from '../assets/scripts/core/api/localserver/createLocalApi';
import type { AcademyHost } from '../assets/scripts/core/api/localserver/AcademyHostCommands';
import type { QuestAuthority } from '../assets/scripts/core/api/localserver/QuestCommands';
import type { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { AcademyRecordPort } from '../assets/scripts/core/services/GameAcademySaveStore';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { OccupancyService } from '../assets/scripts/shared/occupancy/OccupancyService';
import { createAcademyQuestAdapter } from '../assets/scripts/shared/quest/AcademyQuest';
import { normalizeQuestConfig } from '../assets/scripts/shared/quest/QuestConfig';
import { emptyQuestState } from '../assets/scripts/shared/quest/QuestService';
import type { QuestConfigV1, QuestStateV1 } from '../assets/scripts/shared/quest/QuestTypes';
import { AcademyApiClient } from '../assets/scripts/ui/core/AcademyApi';

const ROOT = path.join(__dirname, '..');

/** 正式發行的任務定義（data/quest-config.json） */
export function shippedQuestConfig(): QuestConfigV1 {
    return normalizeQuestConfig(JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/quest-config.json'), 'utf8')) as unknown);
}

export interface AcademyApiRig {
    api: AcademyApiClient;
    bundle: LocalApiBundle;
    /** fail.on＝下一次起 save.write 的落盤一律失敗；saves＝落盤次數 */
    fail: { on: boolean };
    saves: { count: number };
    occupancy: OccupancyService;
}

class MemoryQuest implements QuestAuthority {
    public current: QuestStateV1 = emptyQuestState();
    public state(): QuestStateV1 { return this.current; }
    public setState(state: QuestStateV1): void { this.current = state; }
}

/** 掛好學府需要的 adapter 設定；hosts 由呼叫端提供（獨立假存放，或真的 GameSession） */
function wire(bundle: LocalApiBundle, host: AcademyHost, occupancy: OccupancyService, quest: QuestAuthority): void {
    bundle.setQuestConfig(shippedQuestConfig());
    bundle.setQuestAuthority(quest);
    bundle.registerQuestKind(createAcademyQuestAdapter());
    bundle.setOccupancyHost({ service: occupancy });
    bundle.setAcademyHost(host);
}

/** 獨立版：紀錄存放在傳入的 port（假的），不需要 GameSession */
export function standaloneAcademyRig(port: AcademyRecordPort, clanUuid = 'clan-test'): AcademyApiRig {
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    const fail = { on: false };
    const saves = { count: 0 };
    const occupancy = new OccupancyService();
    wire(bundle, {
        port,
        persist: async () => { saves.count += 1; if (fail.on) throw new Error('disk full'); },
        clanUuid: () => clanUuid,
    }, occupancy, new MemoryQuest());
    return { api: new AcademyApiClient(bundle.api), bundle, fail, saves, occupancy };
}

/** 整合版：紀錄、任務、占用都是真的 GameSession 的；落盤走 session.save() */
export function sessionAcademyRig(session: GameSession, bundle: LocalApiBundle): AcademyApiRig {
    const fail = { on: false };
    const saves = { count: 0 };
    const host = session.academyHost;
    wire(bundle, {
        ...host,
        persist: async () => { saves.count += 1; if (fail.on) throw new Error('disk'); await host.persist(); },
    }, session.occupancyHost.service, session.questAuthority());
    return { api: new AcademyApiClient(bundle.api), bundle, fail, saves, occupancy: session.occupancyHost.service };
}
