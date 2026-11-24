/**
 * MountedListWiring.test.ts — spine-trial 騎乘輸出接線（PROG-2-9993）
 * mounted-list 解析、騎術等級對照、fallback 路徑、sync-mount-spine 的 manifest／md5 驗證（小型 fixture）。
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generalSpineConfig, parseMountedList, setMountedList } from '../assets/scripts/battle/shared/UnitPresentationConfig';
import { assert, TestSuite } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sync = require('../tools_node/sync-mount-spine.js') as {
    run(args: { from: string; to?: string; dataTo?: string; scope: string; legacy?: boolean; backup?: string; dryRun?: boolean }): { code: number; lines: string[] };
};

const animations = (cast: string) => ({ idle: 'idle', gallop: 'gallop', retreat: 'retreat', attack_spear: 'attack_spear', hit: 'hit', dodge: 'dodge', fall: 'fall', cast });
const LIST = {
    schema_version: 1,
    generals: {
        zhao: {
            bay: { skeleton: 'spine/generals/zhao_mounted/zhao__mount_horse_bay.json', skin: 'default', mirror_skin: 'hand_mirror', animations: animations('cast') },
            sheet: { skeleton: 'spine/generals/zhao_mounted/zhao__mount_horse_sheet.json', animations: animations('cast') },
            war: { skeleton: 'spine/generals/zhao_mounted/zhao__mount_horse_war.json', animations: animations('cast') },
        },
        lu_bu: { bay: { skeleton: 'spine/generals/lu_bu_mounted/lu_bu__mount_horse_bay.json', animations: animations('attack_spear') } },
    },
};

const md5 = (b: Buffer) => crypto.createHash('md5').update(b).digest('hex');
const sha = (b: Buffer) => crypto.createHash('sha256').update(b).digest('hex');

/** 在暫存目錄造一份最小的 spine-trial export/game：一個武將包（含一個別名）。 */
function makeFixture(): { from: string; to: string; dataTo: string } {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mount-sync-'));
    const game = path.join(root, 'from', 'export', 'game');
    const dir = path.join(game, 'spine', 'generals', 'zhao_mounted');
    fs.mkdirSync(dir, { recursive: true });
    const files: Record<string, Buffer> = {
        'a.json': Buffer.from('{"skeleton":{}}'), 'a.atlas': Buffer.from('a_1.png\n'), 'a_1.png': Buffer.from([1, 2, 3]),
        'alias.json': Buffer.from('{"skeleton":{"x":1}}'), 'alias.atlas': Buffer.from('alias_1.png\n'), 'alias_1.png': Buffer.from([1, 2, 3]),
    };
    const md = (names: string[]) => Object.fromEntries(names.map(n => [n, md5(files[n])]));
    const sh = (names: string[]) => Object.fromEntries(names.map(n => [n, sha(files[n])]));
    for (const [n, b] of Object.entries(files)) fs.writeFileSync(path.join(dir, n), b);
    const main = ['a.json', 'a.atlas', 'a_1.png'];
    const alias = ['alias.json', 'alias.atlas', 'alias_1.png'];
    const manifest = {
        schema_version: 2, spine_version: '4.2.40',
        packages: {
            'spine/generals/zhao_mounted/a': {
                game_path: 'spine/generals/zhao_mounted/a', files: { skeleton: 'a.json', atlas: 'a.atlas', png_pages: ['a_1.png'] }, md5: md(main), file_hashes: sh(main),
                aliases: [{ game_path: 'spine/generals/zhao_mounted/alias', files: { skeleton: 'alias.json', atlas: 'alias.atlas', png_pages: ['alias_1.png'] }, md5: md(alias), file_hashes: sh(alias) }],
            },
        },
    };
    fs.writeFileSync(path.join(game, 'manifest.json'), JSON.stringify(manifest));
    fs.writeFileSync(path.join(game, 'mounted-list.json'), JSON.stringify({ schema_version: 1, generals: { zhao: { bay: { skeleton: 'spine/generals/zhao_mounted/alias.json', animations: {} } } } }));
    return { from: path.join(root, 'from'), to: path.join(root, 'spine'), dataTo: path.join(root, 'data') };
}

export function createMountedListWiringSuite(): TestSuite {
    const suite = new TestSuite('MountedListWiring (spine-trial 騎乘輸出接線 PROG-2-9993)');

    suite.test('parseMountedList：保留合法葉節點，丟掉缺 .json 的與非物件', () => {
        const parsed = parseMountedList({ generals: { zhao: { bay: { skeleton: 'spine/x.json' }, war: { skeleton: 'spine/x' } }, bad: 3 } });
        assert.equals(1, Object.keys(parsed!.generals).length);
        assert.equals(1, Object.keys(parsed!.generals.zhao).length);
        assert.equals(null, parseMountedList({}));
        assert.equals(null, parseMountedList(null));
    });

    suite.test('趙雲 tier 1/2/3 走對照表的 bay/sheet/war（zhao_yun → zhao），路徑去掉 .json', () => {
        setMountedList(LIST);
        assert.equals('spine/generals/zhao_mounted/zhao__mount_horse_bay', generalSpineConfig('zhao-yun', null, 1)!.path);
        assert.equals('spine/generals/zhao_mounted/zhao__mount_horse_sheet', generalSpineConfig('zhao-yun', null, 2)!.path);
        assert.equals('spine/generals/zhao_mounted/zhao__mount_horse_war', generalSpineConfig('zhao-yun', null, 3)!.path);
        setMountedList(null);
    });

    suite.test('呂布只有 bay：tier 2、3 沿用 bay；有專屬 cast 才設 castClip（cast 解析成 attack_spear 則不設）', () => {
        setMountedList(LIST);
        assert.equals('spine/generals/lu_bu_mounted/lu_bu__mount_horse_bay', generalSpineConfig('lu-bu', null, 3)!.path);
        assert.equals(undefined, generalSpineConfig('lu-bu', null, 1)!.castClip);
        const zhao = generalSpineConfig('zhao-yun', null, 2)!;
        assert.equals('cast', zhao.castClip!.name);
        assert.equals('attack_spear', zhao.clips.attack.name);
        assert.equals('gallop', zhao.clips.move.name);
        setMountedList(null);
    });

    suite.test('fallback：表未載入用舊包；表的包缺圖退舊包；舊包也缺圖退步行；tier 0 步行', () => {
        setMountedList(null);
        assert.equals('spine/generals/zhao_yun_mounted/v2_horse_sheet/zhao_v2__mount_horse_sheet', generalSpineConfig('zhao-yun', null, 2)!.path);
        assert.equals('spine/generals/guan_yu_mounted/guan_yu__mount_horse_bay', generalSpineConfig('guan-yu', null, 1)!.path);
        setMountedList(LIST);
        const failNew = (p: string) => p.includes('zhao_mounted');
        assert.equals('spine/generals/zhao_yun_mounted/v2_horse_bay/zhao_v2__mount_horse_bay', generalSpineConfig('zhao-yun', null, 1, failNew)!.path);
        assert.equals('spine/generals/zhao_yun/zhao_v2', generalSpineConfig('zhao-yun', null, 1, () => true)!.path);
        assert.equals('spine/generals/zhao_yun/zhao_v2', generalSpineConfig('zhao-yun', null, 0)!.path);
        setMountedList(null);
    });

    suite.test('sync：驗證通過後複製主包與別名、mounted-list 到 data，md5 一致；重跑不再寫入', () => {
        const fx = makeFixture();
        const r = sync.run({ from: fx.from, to: fx.to, dataTo: fx.dataTo, scope: 'generals' });
        assert.equals(0, r.code, r.lines.join('\n'));
        for (const n of ['a.json', 'a.atlas', 'a_1.png', 'alias.json', 'alias.atlas', 'alias_1.png']) assert.isTrue(fs.existsSync(path.join(fx.to, 'generals', 'zhao_mounted', n)), n);
        assert.isTrue(fs.existsSync(path.join(fx.dataTo, 'mounted-list.json')));
        assert.isTrue(sync.run({ from: fx.from, to: fx.to, dataTo: fx.dataTo, scope: 'generals' }).lines.some(l => l.includes('新寫入 0 檔')));
    });

    suite.test('sync：來源 md5 被改過 → 非零 exit、列出差異、不寫任何檔', () => {
        const fx = makeFixture();
        fs.writeFileSync(path.join(fx.from, 'export', 'game', 'spine', 'generals', 'zhao_mounted', 'a_1.png'), Buffer.from([9, 9, 9]));
        const r = sync.run({ from: fx.from, to: fx.to, dataTo: fx.dataTo, scope: 'generals' });
        assert.equals(1, r.code);
        assert.isTrue(r.lines.some(l => l.includes('[md5 不符]') && l.includes('a_1.png')));
        assert.isFalse(fs.existsSync(fx.to));
    });

    suite.test('sync：缺檔、mounted-list 指向 manifest 沒有的骨架、dry-run 都正確處理', () => {
        const fx = makeFixture();
        fs.unlinkSync(path.join(fx.from, 'export', 'game', 'spine', 'generals', 'zhao_mounted', 'a.atlas'));
        assert.isTrue(sync.run({ from: fx.from, to: fx.to, dataTo: fx.dataTo, scope: 'generals' }).lines.some(l => l.includes('[缺檔]')));
        const fx2 = makeFixture();
        fs.writeFileSync(path.join(fx2.from, 'export', 'game', 'mounted-list.json'), JSON.stringify({ generals: { zhao: { bay: { skeleton: 'spine/generals/zhao_mounted/none.json' } } } }));
        const r2 = sync.run({ from: fx2.from, to: fx2.to, dataTo: fx2.dataTo, scope: 'generals' });
        assert.equals(1, r2.code);
        assert.isTrue(r2.lines.some(l => l.includes('[mounted-list]')));
        const fx3 = makeFixture();
        assert.equals(0, sync.run({ from: fx3.from, to: fx3.to, dataTo: fx3.dataTo, scope: 'generals', dryRun: true }).code);
        assert.isFalse(fs.existsSync(fx3.to));
        assert.equals(2, sync.run({ from: '', scope: 'generals' }).code);
    });

    return suite;
}
