/**
 * 武將資料管線端到端（GDP-10 / PROG-2-0806）
 *
 * ingest（wiki 映射、AI lore 模板）→ merge（既有優先）→ validate（CLI）→ 審核報告，
 * 全部用 fixture 與暫存目錄，不寫入真實 master 資料。
 */
import { assert, TestSuite } from './TestRunner';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const wiki = require('../tools_node/ingest-generals-wiki.js') as {
    SEED_GENERALS: Array<{ id: string; name: string; faction: string; role?: string }>;
    mapToGeneralBase: (seed: { id: string; name: string; faction: string; role?: string }, extract: string | null) => Record<string, unknown>;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ai = require('../tools_node/ingest-generals-ai.js') as {
    buildLore: (general: Record<string, unknown>, rng: () => number) => Record<string, unknown>;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const merge = require('../tools_node/merge-generals-master.js') as {
    mergeIntoList: (existing: Array<Record<string, unknown>>, incoming: Array<Record<string, unknown>>) => {
        merged: Array<Record<string, unknown>>;
        added: string[];
        updated: string[];
        untouched: string[];
    };
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const audit = require('../tools_node/audit-generals-report.js') as {
    buildAuditReport: (input: { base: Array<Record<string, unknown>>; lore?: Array<Record<string, unknown>>; stories?: Array<Record<string, unknown>> }) => Record<string, any>;
};

const VALIDATE_SCRIPT = path.join('tools_node', 'validate-generals-data.js');

function writeFixtureDir(base: unknown[], lore: unknown[]): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gdp10-'));
    fs.writeFileSync(path.join(dir, 'generals-base.json'), JSON.stringify({ version: '1.0.0', data: base }, null, 2));
    fs.writeFileSync(path.join(dir, 'generals-lore.json'), JSON.stringify({ version: '1.0.0', data: lore }, null, 2));
    return dir;
}

/** 以 validate CLI 驗證 fixture 目錄；回傳 exit code 與 stdout+stderr */
function runValidate(dir: string): { status: number | null; output: string } {
    const result = spawnSync(process.execPath, [VALIDATE_SCRIPT, '--dir', dir], { encoding: 'utf8' });
    return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

/** 依 seed 前幾筆建立 base 與 lore（不含 wiki 摘要，lore 走模板） */
function buildIncoming(count: number): { base: Array<Record<string, unknown>>; lore: Array<Record<string, unknown>> } {
    const base = wiki.SEED_GENERALS.slice(0, count).map(seed => wiki.mapToGeneralBase(seed, null));
    const lore = base.map(general => ai.buildLore(general, () => 0.5));
    return { base, lore };
}

export function createGeneralDataPipelineE2ESuite(): TestSuite {
    const suite = new TestSuite('GeneralDataPipelineE2E (武將資料管線端到端 GDP-10)');

    suite.test('正向：ingest → merge → validate 通過，id 不重複且 lore 與 base 對齊', () => {
        const { base: incomingBase, lore: incomingLore } = buildIncoming(3);
        const baseResult = merge.mergeIntoList([], incomingBase);
        const loreResult = merge.mergeIntoList([], incomingLore);
        const dir = writeFixtureDir(baseResult.merged, loreResult.merged);
        try {
            const validated = runValidate(dir);
            assert.equals(0, validated.status ?? -1, validated.output);

            const baseIds = baseResult.merged.map(g => g.id as string);
            assert.equals(baseIds.length, new Set(baseIds).size);
            assert.equals(JSON.stringify(baseIds), JSON.stringify(loreResult.merged.map(g => g.id as string)));
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    suite.test('重跑合併：不新增、不覆寫已合併資料，手改欄位保留', () => {
        const { base: incomingBase } = buildIncoming(3);
        const first = merge.mergeIntoList([], incomingBase).merged;
        first[0] = { ...first[0], name: '手改名' };
        const rerun = merge.mergeIntoList(first, incomingBase);
        assert.equals('手改名', rerun.merged[0].name as string);
        assert.equals(0, rerun.added.length);
        assert.equals(JSON.stringify(first.map(g => g.id)), JSON.stringify(rerun.merged.map(g => g.id)));
    });

    suite.test('負向：非法 rarityTier 的 fixture 使 validate exit 1', () => {
        const { base: incomingBase, lore: incomingLore } = buildIncoming(2);
        const broken = incomingBase.map((g, i) => (i === 0 ? { ...g, rarityTier: 'bogus' } : g));
        const dir = writeFixtureDir(broken, incomingLore);
        try {
            const validated = runValidate(dir);
            assert.equals(1, validated.status ?? -1);
            assert.isTrue(validated.output.includes('bogus'));
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    suite.test('審核報告：合併結果無重複 id、無亂碼，lore 齊全', () => {
        const { base: incomingBase, lore: incomingLore } = buildIncoming(3);
        const merged = merge.mergeIntoList([], incomingBase).merged;
        const lore = merge.mergeIntoList([], incomingLore).merged;
        const report = audit.buildAuditReport({ base: merged, lore });
        assert.equals(0, report.duplicateIds.base.length);
        assert.equals(0, report.garbled.length);
        assert.equals(0, report.keyGaps.length);
    });

    return suite;
}
