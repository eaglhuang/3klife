/**
 * 武將資料接線測試（MVP-01 / GEN-02 / FBR-02）
 *
 * 覆蓋：generals.json 載入時的格式檢查（只警告）、GeneObject 存讀經 FBR-02 序列化、名冊讀寫往返。
 */
import { assert, TestSuite } from './TestRunner';
import { warnGeneralSchemaOnLoad, type GeneralSchemaRecord } from '../assets/scripts/core/models/GeneralSchema';
import { genesForSave, genesFromSave, type GeneSaveEntry } from '../assets/scripts/core/models/GeneObject';
import { sys } from 'cc';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');

const ROSTER_MODULE = '../assets/scripts/core/services/PlayerRosterService';
const ROSTER_KEY = 'ucuf.player-roster';

/** 重新載入名冊模組，清掉模組內快取，讓讀取端真的從 localStorage 讀 */
function freshRosterService(): typeof import('../assets/scripts/core/services/PlayerRosterService') {
    const path = require.resolve(ROSTER_MODULE);
    delete require.cache[path];
    return require(ROSTER_MODULE) as typeof import('../assets/scripts/core/services/PlayerRosterService');
}

export function createGeneralDataWiringSuite(): TestSuite {
    const suite = new TestSuite('GeneralDataWiring (MVP-01 / GEN-02 / FBR-02 接線)');

    suite.test('載入檢查：真實 generals.json 通過，不產生任何警告', () => {
        const generals = JSON.parse(fs.readFileSync('assets/resources/data/generals.json', 'utf8')) as GeneralSchemaRecord[];
        const messages: string[] = [];
        const count = warnGeneralSchemaOnLoad(generals, 'test', (m) => messages.push(m));
        assert.equals(0, count, messages.join('\n'));
        assert.equals(0, messages.length);
    });

    suite.test('載入檢查：缺欄位或型別錯只回報警告並計數，不丟例外', () => {
        const records: GeneralSchemaRecord[] = [
            { id: 'ok-one', templateId: 't1', bloodlineId: 'b1', vitality: 10, maxVitality: 10, role: 'Combat', status: 'Active' },
            { id: 'bad-status', templateId: 't2', bloodlineId: 'b1', vitality: 10, maxVitality: 10, role: 'Combat', status: 'Flying' },
        ];
        const messages: string[] = [];
        const count = warnGeneralSchemaOnLoad(records, 'unit', (m) => messages.push(m));
        assert.equals(1, count);
        assert.equals(1, messages.length);
        assert.isTrue(messages[0].includes('bad-status'));
    });

    suite.test('存檔：FBR-02 正規化統一欄位，顯示用欄位（displayName）保留', () => {
        const genes: GeneSaveEntry[] = [
            { type: 'blue', id: 'gene-a', level: 2, isLocked: false, discoveryLevel: 1, displayName: '沉穩' },
            { type: 'red', id: 'gene-b', level: 1, isLocked: true, discoveryLevel: 3 },
            { type: 'green', id: 'gene-c', level: 4, isLocked: false, discoveryLevel: 2 },
        ];
        const saved = genesForSave(genes);
        assert.equals(3, saved.length);
        assert.equals('沉穩', saved[0].displayName ?? '');
        assert.equals(4, saved[2].level);
    });

    suite.test('讀檔：格式正確時 valid=true 並還原；格式錯時 valid=false 且保留原始資料', () => {
        const good = genesFromSave([{ type: 'blue', id: 'gene-a', level: 1, isLocked: false, discoveryLevel: 1 }]);
        assert.isTrue(good.valid);
        assert.equals('gene-a', good.genes[0].id);

        const bad = genesFromSave([{ type: 'blue', id: 'gene-a', level: 'two' }]);
        assert.isFalse(bad.valid);
        assert.equals(1, bad.genes.length);
    });

    suite.test('讀檔：沒有 genes 欄位視為空且有效（舊存檔相容）', () => {
        const result = genesFromSave(undefined);
        assert.isTrue(result.valid);
        assert.equals(0, result.genes.length);
    });

    suite.test('名冊往返：寫入 localStorage 的因子經 FBR-02 格式，重新載入後內容一致', () => {
        sys.localStorage.removeItem(ROSTER_KEY);
        const roster = freshRosterService();
        roster.PlayerRosterService.clear();
        roster.PlayerRosterService.addGenerals([{
            id: 'roster-hero',
            name: '測試',
            genes: [
                { type: 'blue', id: 'gene-a', level: 2, isLocked: false, discoveryLevel: 1, displayName: '沉穩' },
                { type: 'red', id: 'gene-b', level: 1, isLocked: true, discoveryLevel: 2 },
                { type: 'green', id: 'gene-c', level: 3, isLocked: false, discoveryLevel: 1 },
            ],
        } as unknown as GeneralConfig]);

        const raw = JSON.parse(sys.localStorage.getItem(ROSTER_KEY) ?? '[]') as Array<{ genes: GeneSaveEntry[] }>;
        assert.equals(3, raw[0].genes.length);
        assert.equals('沉穩', raw[0].genes[0].displayName ?? '');

        const reloaded = freshRosterService().PlayerRosterService.getAll() as Array<{ genes: GeneSaveEntry[] }>;
        assert.equals(3, reloaded[0].genes.length);
        assert.equals('gene-b', reloaded[0].genes[1].id);
        assert.isTrue(reloaded[0].genes[1].isLocked);
        assert.equals('沉穩', reloaded[0].genes[0].displayName ?? '');
    });

    suite.test('名冊讀取：因子格式壞掉時保留原始資料，不丟整筆武將', () => {
        sys.localStorage.setItem(ROSTER_KEY, JSON.stringify([
            { id: 'broken-hero', genes: [{ type: 'blue', id: 'gene-a', level: 'x' }] },
        ]));
        const all = freshRosterService().PlayerRosterService.getAll() as Array<{ id: string; genes: unknown[] }>;
        assert.equals(1, all.length);
        assert.equals('broken-hero', all[0].id);
        assert.equals(1, all[0].genes.length);
    });

    return suite;
}
