/**
 * SageOracle.test.ts — 名士占卜畫面、求籤令庫存與地形因子配給（PROG-2-0053，headless）
 *
 * 不開 Cocos、不建節點：驗證 SageOracleController 吐出的 view、求籤令扣除與存檔往返，
 * 季度免費發放，並比對 view 的 key 都對得到 sage-oracle-main.json 的節點 id。
 *
 * Unity 對照：EditMode Test 測 Presenter 與 GameManager，不實例化 Scene。
 */
import { TestSuite, assert } from './TestRunner';
import { SageOracleController, SageOracleView } from '../assets/scripts/ui/core/SageOracleController';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService, validatePlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import {
    addItem,
    consumeItem,
    grantSeasonalOracleTokens,
    ITEM_ORACLE_TOKEN,
    normalizeInventory,
    ORACLE_TOKEN_FREE_CAP,
} from '../assets/scripts/core/systems/PlayerInventory';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

function readJson<T>(rel: string): T {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
}

function collectLayoutIds(node: { id?: string; children?: unknown[] }, out: Set<string>): void {
    if (node.id) out.add(node.id);
    for (const c of node.children ?? []) collectLayoutIds(c as { id?: string; children?: unknown[] }, out);
}

/** 依序回傳給定值的亂數；用完後停在最後一個值 */
function seq(...values: number[]): { random: () => number; calls: () => number } {
    let n = 0;
    return { random: () => values[Math.min(n++, values.length - 1)], calls: () => n };
}

function person(id: string, genes: GeneralConfig['genes'], extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 70, int: 70, lea: 70, pol: 60, cha: 60, luk: 40,
        genes,
        ...extra,
    } as unknown as GeneralConfig;
}

const lockedBlue = () => [{ id: 'gene_command', type: 'blue', level: 2, isLocked: true, discoveryLevel: 1, displayName: '號令' }];

function makeSession(generals: GeneralConfig[], random: () => number): GameSession {
    const session = new GameSession(7);
    session.setRosterStore(new InMemoryRosterStore(generals));
    session.setRandomSource(random);
    return session;
}

export function createSageOracleSuite(): TestSuite {
    const suite = new TestSuite('SageOracle (名士占卜畫面 / 求籤令)');

    suite.test('新邏輯檔案不 import cc', () => {
        for (const rel of ['assets/scripts/ui/core/SageOracleController.ts', 'assets/scripts/core/systems/PlayerInventory.ts', 'assets/scripts/core/systems/SageDivination.ts']) {
            const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
            assert.isFalse(/from ['"]cc['"]/.test(source), rel);
        }
    });

    suite.test('庫存：正規化、增減、不足時不扣', () => {
        assert.equals(3, normalizeInventory(undefined)[ITEM_ORACLE_TOKEN], '沒有欄位 → 起始 3 張');
        assert.equals(0, Object.keys(normalizeInventory({})).length, '空物件代表真的用完了');
        assert.equals('{"ITEM_ORACLE":2}', JSON.stringify(normalizeInventory({ ITEM_ORACLE: 2.7, bad: -1, str: 'x' })));

        const one = addItem({}, ITEM_ORACLE_TOKEN, 1);
        assert.equals(1, one[ITEM_ORACLE_TOKEN]);
        assert.equals(0, Object.keys(consumeItem(one, ITEM_ORACLE_TOKEN)!).length);
        assert.equals(null, consumeItem({}, ITEM_ORACLE_TOKEN));
    });

    suite.test('季度免費發放：每季 +1，持有達上限就不再發', () => {
        assert.equals(1, grantSeasonalOracleTokens({}).granted);
        const nearCap = grantSeasonalOracleTokens({ [ITEM_ORACLE_TOKEN]: ORACLE_TOKEN_FREE_CAP - 1 });
        assert.equals(ORACLE_TOKEN_FREE_CAP, nearCap.inventory[ITEM_ORACLE_TOKEN]);
        const atCap = grantSeasonalOracleTokens({ [ITEM_ORACLE_TOKEN]: 8 });
        assert.equals(0, atCap.granted, '商城買到 8 張不會被扣回，也不再免費發');
        assert.equals(8, atCap.inventory[ITEM_ORACLE_TOKEN]);
    });

    suite.test('GameSession：占卜扣 1 張求籤令；沒有求籤令或沒有候選都不擲骰也不扣', async () => {
        const rng = seq(0, 0);
        const session = makeSession([person('a', lockedBlue()), person('b', [])], rng.random);
        const inventoryEvents: number[] = [];
        session.setEventEmitter({ emit: (name, payload) => {
            if (name === GAME_SESSION_EVENTS.InventoryChanged) inventoryEvents.push((payload as Record<string, number>)[ITEM_ORACLE_TOKEN] ?? 0);
        } });
        assert.equals(3, session.itemCount(ITEM_ORACLE_TOKEN));

        const none = await session.divineFactor('b', 'zhuge-liang');
        assert.equals('no-candidate', none.outcome);
        assert.equals(3, session.itemCount(ITEM_ORACLE_TOKEN));

        const hit = await session.divineFactor('a', 'zhuge-liang');
        assert.equals('awakened', hit.outcome);
        assert.equals(2, session.itemCount(ITEM_ORACLE_TOKEN));
        assert.equals('2', inventoryEvents.join(','));

        const broke = makeSession([person('a', lockedBlue())], seq(0.99).random);
        for (let i = 0; i < 3; i++) await broke.divineFactor('a', 'sima-hui');
        assert.equals(0, broke.itemCount(ITEM_ORACLE_TOKEN), '扭曲 3 次用光');
        const noToken = await broke.divineFactor('a', 'sima-hui');
        assert.equals('no-token', noToken.outcome);
        assert.isFalse(noToken.consumed);
    });

    suite.test('存檔往返保存求籤令；舊存檔沒有欄位補起始 3 張；推進季度免費 +1', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = makeSession([person('a', lockedBlue())], seq(0.99).random);
        session.setSaveService(new PlayerSaveService(adapter));
        await session.divineFactor('a', 'sima-hui');
        assert.equals(2, session.itemCount(ITEM_ORACLE_TOKEN), '扭曲也扣');

        const reloaded = new GameSession();
        reloaded.setRosterStore(new InMemoryRosterStore());
        reloaded.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await reloaded.load());
        assert.equals(2, reloaded.itemCount(ITEM_ORACLE_TOKEN));

        const payload = await reloaded.advanceSeason();
        assert.equals(1, payload.oracleTokensGranted);
        assert.equals(3, reloaded.itemCount(ITEM_ORACLE_TOKEN));

        const legacy = validatePlayerSaveSnapshot({ ...reloaded.createSnapshot(), inventory: undefined });
        assert.equals(3, legacy.inventory?.[ITEM_ORACLE_TOKEN]);
    });

    suite.test('畫面：只列有鎖定因子的在世武將；預選父方；沒有求籤令時不能占卜', async () => {
        const generals = [
            person('dead', lockedBlue(), { status: 'dead' }),
            person('open', [{ id: 'gene_command', type: 'blue', isLocked: false }]),
            person('liu', lockedBlue()),
            person('guan', [{ id: 'gene_strategy', type: 'green', isLocked: true, discoveryLevel: 20 }]),
        ];
        const session = makeSession(generals, seq(0, 0).random);
        const flow = new SageOracleController({ roster: { getAll: () => session.roster }, session });
        assert.equals('liu,guan', flow.targets().map((g) => g.id).join(','));

        flow.open('guan');
        let view = flow.getView();
        assert.equals('guan', view.targetId);
        assert.isFalse(view.enabled.btnDivine, '1 級看不到綠色因子');
        assert.equals('覺醒等級不足，暫無可占卜的因子', view.texts.costLabel);

        flow.cycleTarget(1);
        view = flow.getView();
        assert.equals('liu', view.targetId);
        assert.isTrue(view.enabled.btnDivine);
        assert.equals('求籤令 ×3', view.texts.tokenLabel);
        assert.equals('諸葛亮', view.texts.sageName);
        assert.equals('偏好：智力/政治 · 準確率 85%', view.texts.sageInfo);

        await flow.divine();
        view = flow.getView();
        assert.isTrue(view.texts.oracleNotice.startsWith('諸葛亮：『'));
        assert.isTrue(view.texts.oracleNotice.includes('【覺醒】liu 的 號令！'));
        assert.equals('guan', view.targetId, 'liu 沒有鎖定因子了，自動換人');
        assert.equals('求籤令 ×2', view.texts.tokenLabel);

        flow.cycleSage(-1);
        assert.equals('左慈（未解鎖）', flow.getView().texts.sageName, '名士循環；左慈需累計占卜 100 次');
    });

    suite.test('畫面：扭曲批語、空名冊提示', async () => {
        const session = makeSession([person('liu', lockedBlue())], seq(0.99).random);
        const flow = new SageOracleController({ roster: { getAll: () => session.roster }, session });
        flow.cycleSage(4); // 司馬徽
        await flow.divine();
        const notice = flow.getView().texts.oracleNotice;
        assert.isTrue(notice.startsWith('司馬徽：『此人前程，尚難斷言。』'), notice);
        assert.isTrue(notice.includes('因子未覺醒'));

        const emptyFlow = new SageOracleController({ roster: { getAll: () => [] }, session });
        const view = emptyFlow.getView();
        assert.isTrue(view.actives.oracleEmptyHint);
        assert.isFalse(view.actives.oraclePanel);
        assert.isFalse(view.enabled.btnDivine);
    });

    suite.test('view 的 key 全部對得到 sage-oracle-main.json 節點；screen / skin 與 LobbyScene 接線齊全', async () => {
        const layout = readJson<{ root: { id?: string; children?: unknown[] } }>('assets/resources/ui-spec/layouts/sage-oracle-main.json');
        const ids = new Set<string>();
        collectLayoutIds(layout.root, ids);

        const views: SageOracleView[] = [];
        const session = makeSession([person('liu', lockedBlue())], seq(0, 0).random);
        const flow = new SageOracleController({ roster: { getAll: () => session.roster }, session });
        views.push(flow.getView());
        await flow.divine();
        views.push(flow.getView());
        views.push(new SageOracleController({ roster: { getAll: () => [] }, session }).getView());
        const missing = new Set<string>();
        for (const view of views) {
            for (const key of [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled)]) {
                if (!ids.has(key)) missing.add(key);
            }
        }
        assert.equals('', [...missing].join(','));

        const screen = readJson<{ layout: string; skin: string }>('assets/resources/ui-spec/screens/sage-oracle-screen.json');
        assert.equals('sage-oracle-main', screen.layout);
        assert.isTrue(fs.existsSync(path.join(ROOT, `assets/resources/ui-spec/skins/${screen.skin}.json`)));

        const bonding = readJson<{ root: { id?: string; children?: unknown[] } }>('assets/resources/ui-spec/layouts/bonding-setup-main.json');
        const bondIds = new Set<string>();
        collectLayoutIds(bonding.root, bondIds);
        assert.isTrue(bondIds.has('btnOpenOracle'), '結緣畫面有名士占卜入口');

        const lobby = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(lobby.includes("'sage-oracle-screen'"));
        assert.isTrue(lobby.includes("buttonId: 'btnOpenOracle'"));
        for (const id of ['btnCloseOracle', 'btnPrevTarget', 'btnNextTarget', 'btnPrevSage', 'btnNextSage', 'btnDivine', 'btnPredict']) {
            assert.isTrue(ids.has(id), `layout 有 ${id}`);
            assert.isTrue(lobby.includes(`buttonId: '${id}'`), `LobbyScene 綁 ${id}`);
        }
    });

    suite.test('地形因子配給：血統登記表的名將帶水戰 / 山地 / 林地適性，且都在因子字典裡', () => {
        const registry = readJson<{ persons: Array<{ uid: string; gene_refs: string[]; is_virtual: boolean }> }>('assets/resources/data/person-registry.json');
        const dict = new Set(readJson<{ data: Array<{ id: string }> }>('assets/resources/data/master/gene-dictionary.json').data.map((g) => g.id));
        const has = (uid: string, gene: string) => registry.persons.find((p) => p.uid === uid && !p.is_virtual)?.gene_refs.includes(gene) === true;
        assert.isTrue(has('zhou-yu', 'gene_naval'));
        assert.isTrue(has('gan-ning', 'gene_naval'));
        assert.isTrue(has('deng-ai', 'gene_mountain'));
        assert.isTrue(has('meng-huo', 'gene_forest'));
        for (const gene of ['gene_naval', 'gene_mountain', 'gene_forest']) {
            assert.isTrue(dict.has(gene), gene);
            assert.isTrue(registry.persons.filter((p) => p.gene_refs.includes(gene)).length >= 4, `${gene} 至少 4 人`);
        }
    });

    return suite;
}
