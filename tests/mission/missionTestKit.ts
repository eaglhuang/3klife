// 任務核心測試共用工具（非 .test.ts，不會被自動掃描）
import { parseMissionDefinition } from '../../assets/scripts/core/mission/MissionDefinitionParser';
import { lockDispatch } from '../../assets/scripts/core/mission/MissionResolver';
import type { MissionDefinition, MissionGeneralFacts, MissionInstance } from '../../assets/scripts/core/mission/MissionTypes';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

export function loadFixtureRaw(name: string): unknown {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', `${name}.json`), 'utf8'));
}

export function loadFixture(name: string): MissionDefinition {
    const r = parseMissionDefinition(loadFixtureRaw(name));
    if (!r.ok) throw new Error(`fixture ${name} 解析失敗：${JSON.stringify(r.issues)}`);
    return r.def;
}

export function mkGeneral(over: Partial<MissionGeneralFacts> = {}): MissionGeneralFacts {
    return {
        id: 'G1', name: '測試將', stats: { str: 70, int: 70, lea: 70, pol: 70, cha: 70 },
        power: 180, vitality: 100, tags: [], block: [], ...over,
    };
}

export function mkInstance(def: MissionDefinition, variant: string, intel: number, id = 'M1'): MissionInstance {
    return {
        id, defId: def.id, defVersion: def.version, theme: def.theme, variant, spawnSeason: 1,
        expireSeason: 1 + def.timing.expireSeasons, intel, reconCount: 0, waited: false, status: 'OPEN',
    };
}

/** 依派遣流程鎖定後回傳進行中的實例 */
export function dispatched(def: MissionDefinition, inst: MissionInstance, general: MissionGeneralFacts,
    flags: Record<string, number | boolean> = {}, season = 1, affinity = 0): MissionInstance {
    const { lock } = lockDispatch({ def, instance: inst, general, flags, season, executorAffinity: affinity });
    return { ...inst, status: 'ACTIVE', dispatch: lock };
}

// ───────────────────────── 任務服務測試工具（PROG-2-9148） ─────────────────────────
import { buildMissionDataBundle, type MissionDataBundle, type MissionRawData } from '../../assets/scripts/core/mission/MissionLoader';
import type { MissionHostPort, MissionSettlementInfo, MissionStock } from '../../assets/scripts/core/mission/service/MissionPorts';
import type { MissionDifficulty } from '../../assets/scripts/core/mission/MissionBalance';
import type { MissionDefinition as MissionDef, MissionLedgerEntry } from '../../assets/scripts/core/mission/MissionTypes';

const dataDir = path.join(__dirname, '..', '..', 'assets', 'resources', 'data');
const readData = (rel: string): unknown => JSON.parse(fs.readFileSync(path.join(dataDir, rel), 'utf8'));

let cachedBundle: MissionDataBundle | null = null;
/** 讀真實資料檔（mission-*.json 與 missions/*.json）組成資料包；全部通過驗證才回傳 */
export function realBundle(): MissionDataBundle {
    if (cachedBundle) return cachedBundle;
    const index = readData('mission-index.json') as { defs: { path: string }[] };
    const defsByPath: Record<string, unknown> = {};
    for (const e of index.defs) defsByPath[e.path] = readData(e.path);
    const raw: MissionRawData = {
        balance: readData('mission-balance.json'), themes: readData('mission-themes.json'), boards: readData('mission-boards.json'), index, defsByPath,
    };
    const r = buildMissionDataBundle(raw);
    if (!r.ok) throw new Error(`任務資料包載入失敗：${JSON.stringify(r.issues)}`);
    cachedBundle = r.bundle;
    return r.bundle;
}

/** 可操控的宿主：名冊、庫存、季、記憶偏移都由測試設定，並記錄帳本與結算 */
export class FakeMissionHost implements MissionHostPort {
    public seasonNow = 1;
    public tier = 5;
    public fameNow = 100;
    public roster: MissionGeneralFacts[] = [];
    public stockNow: MissionStock = { grain: 5000, silver: 5000, troops: 3000 };
    public affinity: Record<string, number> = {};
    public volunteers = new Set<string>();
    public ledgers: MissionLedgerEntry[][] = [];
    public settled: MissionSettlementInfo[] = [];
    public energySpent: Record<string, number> = {};
    public persisted = 0;

    public season(): number { return this.seasonNow; }
    public rankTier(): number { return this.tier; }
    public visibleDifficulties(): MissionDifficulty[] { return ['EASY', 'NORMAL', 'ELITE', 'ADVANCED', 'HELL'].slice(0, Math.max(1, this.tier)) as MissionDifficulty[]; }
    public fame(): number { return this.fameNow; }
    public generals(): MissionGeneralFacts[] { return this.roster.map(g => ({ ...g, block: g.block.slice() })); }
    public volunteerIdsFor(_def: MissionDef): ReadonlySet<string> { return this.volunteers; }
    public stock(): MissionStock { return { ...this.stockNow }; }
    public spend(c: MissionStock): boolean {
        if (this.stockNow.grain < c.grain || this.stockNow.silver < c.silver || this.stockNow.troops < c.troops) return false;
        this.stockNow = { grain: this.stockNow.grain - c.grain, silver: this.stockNow.silver - c.silver, troops: this.stockNow.troops - c.troops };
        return true;
    }
    public drainEnergy(id: string, n: number): void {
        this.energySpent[id] = (this.energySpent[id] ?? 0) + n;
        const g = this.roster.find(x => x.id === id);
        if (g) g.vitality = Math.max(0, g.vitality - n);
    }
    public affinityOf(id: string): number { return this.affinity[id] ?? 0; }
    public memoryHintOf(id: string): string { return (this.affinity[id] ?? 0) > 0 ? '曾勝任' : ''; }
    public applyLedger(entries: readonly MissionLedgerEntry[]): void { this.ledgers.push(entries.slice()); }
    public onSettled(info: MissionSettlementInfo): void { this.settled.push(info); }
    public persist(): void { this.persisted += 1; }
}
