/**
 * ItemInventory.test.ts — 物品庫存 base MVP：家庭倉庫與入學令（PROG-2-9203；doc_spec_1184、doc_spec_1182 §12 ITM-M）
 *
 * 鎖住：發放、消耗、退還、溢出折金、堆疊上限、綁定、冪等、季發高水位、舊存檔缺值補預設、
 * 以及真的 GameSession／AcademyFlowController 走 item.* 命令入學。
 *
 * Unity 對照：像背包系統的 EditMode 契約測試加一條 PlayMode 的「入學扣令」整合測試。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import type { ItemAuthority, StockTable } from '../assets/scripts/core/api/localserver/ItemCommands';
import type { WalletAuthority } from '../assets/scripts/core/api/localserver/WalletCommands';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { sessionAcademyRig } from './AcademyApiRig';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { ITEM_ADMISSION_TOKEN } from '../assets/scripts/core/systems/PlayerInventory';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { AcademyFlowController, type AcademyFlowDeps } from '../assets/scripts/ui/core/AcademyFlowController';
import { isApiFail } from '../assets/scripts/shared/api/ApiProtocol';
import type { ItemGrantResult, ItemSettlePeriodicResult } from '../assets/scripts/shared/api/ApiCommands';
import {
    ADMISSION_SEASON_RULE_ID, ADMISSION_TOKEN_ID, DEFAULT_ITEM_CONFIG, normalizeItemConfig, type HolderRef, type ItemConfigV1,
} from '../assets/scripts/shared/item/ItemConfig';
import { emptyItemMeta, ITEM_LEDGER_LIMIT, normalizeItemMeta, planConsume, planGrant, type ItemMeta } from '../assets/scripts/shared/item/ItemRules';

const ROOT = path.join(__dirname, '..');
const HOME: HolderRef = { kind: 'household', id: 'home' };

class FakeWallet implements WalletAuthority {
    public gold = 100;
    public balance(currency: string): number { return currency === 'gold' ? this.gold : 0; }
    public spend(): boolean { return false; }
    public snapshot(): Record<string, number> { return { gold: this.gold }; }
    public credit(currency: string, amount: number): void { if (currency === 'gold') this.gold += amount; }
}

/** 記憶體版權威：household/home 與 general:g1 兩個持有者，驗證「新增持有者只需設定」 */
class MemoryAuthority implements ItemAuthority {
    public stocks = new Map<string, Record<string, number>>([['household:home:main', {}], ['general:g1:bag', {}]]);
    public itemMeta: ItemMeta = emptyItemMeta();
    public read(holder: HolderRef, container: string): StockTable | null {
        const s = this.stocks.get(`${holder.kind}:${holder.id}:${container}`);
        return s ? { ...s } : null;
    }
    public write(holder: HolderRef, container: string, next: StockTable): void { this.stocks.set(`${holder.kind}:${holder.id}:${container}`, { ...next }); }
    public meta(): ItemMeta { return this.itemMeta; }
    public setMeta(meta: ItemMeta): void { this.itemMeta = meta; }
}

function multiConfig(): ItemConfigV1 {
    return normalizeItemConfig({
        ...DEFAULT_ITEM_CONFIG,
        items: [
            ...DEFAULT_ITEM_CONFIG.items,
            { id: 'GEAR_SWORD', kind: 'equipment', stack: { mode: 'stackable', max: 5 }, bind: 'general', overflow: null },
            { id: 'HEIRLOOM', kind: 'treasure', stack: { mode: 'stackable', max: null }, bind: 'household', overflow: null },
        ],
        holders: [
            ...DEFAULT_ITEM_CONFIG.holders,
            { kind: 'general', aliasKey: 'holder.general.name', containers: [{ id: 'bag', accepts: ['equipment', 'consumable'], capacity: 2 }] },
        ],
    });
}

function memoryRig(config: ItemConfigV1 = DEFAULT_ITEM_CONFIG, withWallet = true) {
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    const authority = new MemoryAuthority();
    const wallet = new FakeWallet();
    bundle.setItemAuthority(authority);
    bundle.setItemConfig(config);
    if (withWallet) bundle.setWallet(wallet);
    return { api: bundle.api, authority, wallet, bundle };
}

const grant = (qty: number, source = 'SYSTEM', extra: Record<string, unknown> = {}) => ({ itemId: ADMISSION_TOKEN_ID, qty, source, ...extra });

const CHILD = { id: 'kid', name: '少主', age: 15, gender: 'M', fate: { choice: 'accept' }, str: 30, lea: 30, int: 30, pol: 30, cha: 30, vitality: 100, maxVitality: 100 } as unknown as GeneralConfig;

interface FakeHost { node: { active: boolean } }

/** 與 LobbyScene 相同的接法：入學令走 item.* 命令 */
async function sessionRig(persistFails = false) {
    const adapter = new MemoryStorageAdapter();
    const store = new PlayerSaveService(adapter);
    const bundle = createLocalApi(store, { now: () => 1_000 });
    const wallet = new FakeWallet();
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([{ ...CHILD }]));
    session.setSaveService(store);
    session.setRandomSource(() => 0.4);
    bundle.setWallet(wallet);
    bundle.setItemAuthority(session.itemAuthority());
    session.setItemApi(bundle.api);
    const academy = sessionAcademyRig(session, bundle);
    academy.fail.on = persistFails;
    const deps: AcademyFlowDeps<FakeHost> = {
        mountEnrollHost: async () => ({ node: { active: true } }),
        mountSessionHost: async () => ({ node: { active: true } }),
        apply: () => undefined,
        bringToFront: () => undefined,
        lookup: () => (key: string) => key,
        toast: () => undefined,
        roster: () => session.roster as never,
        nurtureBlockReasons: () => [],
        loadMentorCards: async () => [],
        lockedMentorIds: () => [],
        tokensLeft: () => session.itemCount(ADMISSION_TOKEN_ID),
        consumeToken: async () => !isApiFail(await bundle.api.cmd('item.consume', { itemId: ADMISSION_TOKEN_ID, qty: 1, sink: 'ENROLL' })),
        refundToken: async () => { await bundle.api.cmd('item.grant', { itemId: ADMISSION_TOKEN_ID, qty: 1, source: 'REFUND' }); },
        clanUuid: () => session.clanUuid,
        clanPrestigeTier: () => 0,
        admissionTurn: () => session.gameTime.totalSeasonsElapsed,
        api: academy.api,
        isActive: () => session.isAcademyActive,
    };
    const ctrl = new AcademyFlowController<FakeHost>(deps);
    await ctrl.mount();
    return { session, bundle, wallet, ctrl, store };
}

export function createItemInventorySuite(): TestSuite {
    const suite = new TestSuite('ItemInventory (物品庫存 base MVP：家庭倉庫與入學令 PROG-2-9203)');

    suite.test('設定檔 item-config.json 與內建預設完全一致（入學令封頂 3、溢出 100 金、每季發 1）', () => {
        const json = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/item-config.json'), 'utf8')) as unknown;
        assert.equals(JSON.stringify(DEFAULT_ITEM_CONFIG), JSON.stringify(normalizeItemConfig(json)));
        assert.equals(3, DEFAULT_ITEM_CONFIG.items[0].stack.max);
        assert.equals(100, DEFAULT_ITEM_CONFIG.items[0].overflow?.amount);
    });

    suite.test('壞設定不丟例外：非物件回預設，壞條目被丟掉', () => {
        assert.equals(DEFAULT_ITEM_CONFIG, normalizeItemConfig(null));
        const cfg = normalizeItemConfig({ items: [{ id: '', kind: 'token' }, { id: 'X', kind: 'nope' }], holders: DEFAULT_ITEM_CONFIG.holders });
        assert.equals(0, cfg.items.length);
        assert.equals(1, cfg.holders.length);
    });

    suite.test('planGrant：未滿正常入庫；超過上限收滿並把多的折金；沒有溢出設定整筆拒收；退還不受上限限制', () => {
        const cfg = DEFAULT_ITEM_CONFIG;
        const a = planGrant(cfg, HOME, 'main', ADMISSION_TOKEN_ID, 2, 1, 1);
        assert.isTrue(a.ok && a.added === 2 && a.overflow === null);
        const b = planGrant(cfg, HOME, 'main', ADMISSION_TOKEN_ID, 3, 2, 1);
        assert.isTrue(b.ok && b.added === 1 && b.overflow?.units === 2 && b.overflow.amount === 200);
        const noOverflow = normalizeItemConfig({ ...cfg, items: [{ ...cfg.items[0], overflow: null }] });
        const c = planGrant(noOverflow, HOME, 'main', ADMISSION_TOKEN_ID, 1, 3, 1);
        assert.isTrue(!c.ok && c.reason === 'ITEM_FULL');
        const d = planGrant(cfg, HOME, 'main', ADMISSION_TOKEN_ID, 1, 3, 1, true);
        assert.isTrue(d.ok && d.added === 1 && d.overflow === null);
        assert.isTrue(planConsume(1, 2).ok === false && planConsume(2, 2).ok === true);
    });

    suite.test('item.grant 發放到封頂；再發溢出折 100 金入錢包；回應帶 delta 與 inventory.overflow 事件', async () => {
        const { api, authority, wallet } = memoryRig();
        const events: string[] = [];
        api.subscribe('inventory.overflow', () => events.push('overflow'));
        const r1 = await api.cmd<ItemGrantResult>('item.grant', grant(2));
        assert.isTrue(r1.ok);
        assert.equals(2, authority.read(HOME, 'main')?.[ADMISSION_TOKEN_ID]);
        const r2 = await api.cmd<ItemGrantResult>('item.grant', grant(2));
        if (isApiFail(r2)) throw new Error(r2.message);
        assert.equals(1, r2.result.granted);
        assert.equals(3, r2.result.count);
        assert.equals(100, r2.result.overflow?.amount ?? 0);
        assert.equals(200, wallet.gold);
        assert.equals(1, events.length);
        assert.isTrue((r2.delta ?? []).some((d) => d.path === `/inventory/${ADMISSION_TOKEN_ID}`));
        assert.isTrue((r2.delta ?? []).some((d) => d.path === '/gachaWallet/gold'));
    });

    suite.test('溢出但錢包不能入帳：整筆失敗、庫存與帳本都不動（原子）', async () => {
        const { api, authority } = memoryRig(DEFAULT_ITEM_CONFIG, false);
        await api.cmd('item.grant', grant(3));
        const bad = await api.cmd('item.grant', grant(1));
        assert.isTrue(isApiFail(bad) && bad.errorCode === 'E303');
        assert.equals(3, authority.read(HOME, 'main')?.[ADMISSION_TOKEN_ID]);
        assert.equals(1, authority.meta().ledger.length);
    });

    suite.test('item.consume 扣除；不足回 E314 且不扣；數量歸零移除該列', async () => {
        const { api, authority } = memoryRig();
        await api.cmd('item.grant', grant(2));
        const ok = await api.cmd('item.consume', { itemId: ADMISSION_TOKEN_ID, qty: 2, sink: 'ENROLL' });
        assert.isTrue(ok.ok);
        assert.isFalse(Object.prototype.hasOwnProperty.call(authority.read(HOME, 'main') ?? {}, ADMISSION_TOKEN_ID));
        const bad = await api.cmd('item.consume', { itemId: ADMISSION_TOKEN_ID, qty: 1, sink: 'ENROLL' });
        assert.isTrue(isApiFail(bad) && bad.errorCode === 'E314');
    });

    suite.test('退還（source=REFUND）不受堆疊上限限制、不折金', async () => {
        const { api, wallet } = memoryRig();
        await api.cmd('item.grant', grant(3));
        await api.cmd('item.consume', { itemId: ADMISSION_TOKEN_ID, qty: 1, sink: 'ENROLL' });
        await api.cmd('item.grant', grant(1));
        const refund = await api.cmd<ItemGrantResult>('item.grant', grant(1, 'REFUND'));
        if (isApiFail(refund)) throw new Error(refund.message);
        assert.equals(4, refund.result.count);
        assert.equals(null, refund.result.overflow);
        assert.equals(100, wallet.gold);
    });

    suite.test('冪等：同一個 idemKey 重送不重複發放（E101 重播）', async () => {
        const { api, authority } = memoryRig();
        const first = await api.cmd('item.grant', grant(1), { idemKey: 'k-1' });
        const again = await api.cmd('item.grant', grant(1), { idemKey: 'k-1' });
        assert.isTrue(first.ok && again.ok && (again as { replayed?: boolean }).replayed === true);
        assert.equals(1, authority.read(HOME, 'main')?.[ADMISSION_TOKEN_ID]);
    });

    suite.test('來源與欄位檢查：未知來源 E315、qty 非正整數 E001、客戶端夾帶 reward 欄位 E103', async () => {
        const { api } = memoryRig();
        const a = await api.cmd('item.grant', grant(1, 'HACK'));
        assert.isTrue(isApiFail(a) && a.errorCode === 'E315');
        const b = await api.cmd('item.grant', grant(0));
        assert.isTrue(isApiFail(b) && b.errorCode === 'E001');
        const c = await api.cmd('item.grant', grant(1, 'SYSTEM', { reward: 99 }));
        assert.isTrue(isApiFail(c) && c.errorCode === 'E103');
    });

    suite.test('綁定與多持有者：bind=general 的裝備只能放武將、bind=household 的寶物只能放家；容器不接受的類型拒收；種類數上限', async () => {
        const { api, authority } = memoryRig(multiConfig());
        const general = { kind: 'general', id: 'g1' };
        const ok = await api.cmd('item.grant', { holder: general, container: 'bag', itemId: 'GEAR_SWORD', qty: 1, source: 'DROP' });
        assert.isTrue(ok.ok);
        assert.equals(1, authority.read(general as HolderRef, 'bag')?.GEAR_SWORD);
        const wrongHolder = await api.cmd('item.grant', { itemId: 'GEAR_SWORD', qty: 1, source: 'DROP' });
        assert.isTrue(isApiFail(wrongHolder) && (wrongHolder.errorCode === 'E311' || wrongHolder.errorCode === 'E312'));
        const heirloomToGeneral = await api.cmd('item.grant', { holder: general, container: 'bag', itemId: 'HEIRLOOM', qty: 1, source: 'EVENT' });
        assert.isTrue(isApiFail(heirloomToGeneral) && heirloomToGeneral.errorCode === 'E311');
        const heirloomHome = await api.cmd('item.grant', { itemId: 'HEIRLOOM', qty: 1, source: 'EVENT' });
        assert.isTrue(heirloomHome.ok);
        await api.cmd('item.grant', { holder: general, container: 'bag', itemId: 'POTION', qty: 1, source: 'EVENT' });
        const full = await api.cmd('item.grant', { holder: general, container: 'bag', itemId: 'POTION2', qty: 1, source: 'EVENT' });
        assert.isTrue(isApiFail(full) && full.errorCode === 'E313');
        const noContainer = await api.cmd('item.count', { holder: general, container: 'nope', itemId: 'X' });
        assert.isTrue(isApiFail(noContainer) && noContainer.errorCode === 'E310');
    });

    suite.test('item.list／item.count／item.ledger：列出家庭倉庫、帶別名 key；帳本記取得與消耗', async () => {
        const { api } = memoryRig();
        await api.cmd('item.grant', grant(2, 'TASK', { sourceRef: 'DOM_01' }));
        await api.cmd('item.grant', { itemId: 'OTHER', qty: 5, source: 'SHOP' });
        await api.cmd('item.consume', { itemId: ADMISSION_TOKEN_ID, qty: 1, sink: 'ENROLL' });
        const list = await api.query<{ aliasKey: string; rows: Array<{ itemId: string; quantity: number; stackMax: number | null }> }>('item.list', {});
        if (isApiFail(list)) throw new Error(list.message);
        assert.equals('holder.household.name', list.result.aliasKey);
        assert.equals(2, list.result.rows.length);
        assert.equals(3, list.result.rows.find((r) => r.itemId === ADMISSION_TOKEN_ID)?.stackMax);
        const count = await api.query<{ count: number }>('item.count', { itemId: ADMISSION_TOKEN_ID });
        assert.equals(1, count.ok ? count.result.count : -1);
        const ledger = await api.query<{ records: Array<{ delta: number; reason: string }> }>('item.ledger', {});
        if (isApiFail(ledger)) throw new Error(ledger.message);
        assert.equals(3, ledger.result.records.length);
        assert.equals(-1, ledger.result.records[2].delta);
        assert.equals('ENROLL', ledger.result.records[2].reason);
    });

    suite.test('item.settlePeriodic：第一期發 1；同季重送不重發；跳 5 季補發到封頂並把溢出折金；未知規則 E316', async () => {
        const { api, authority, wallet } = memoryRig();
        const r1 = await api.cmd<ItemSettlePeriodicResult>('item.settlePeriodic', { ruleId: ADMISSION_SEASON_RULE_ID, nowIndex: 10 });
        if (isApiFail(r1)) throw new Error(r1.message);
        assert.equals(1, r1.result.granted);
        assert.equals(10, authority.meta().periodic[ADMISSION_SEASON_RULE_ID]);
        const same = await api.cmd<ItemSettlePeriodicResult>('item.settlePeriodic', { ruleId: ADMISSION_SEASON_RULE_ID, nowIndex: 10 });
        if (isApiFail(same)) throw new Error(same.message);
        assert.equals(0, same.result.periods);
        assert.equals(1, authority.read(HOME, 'main')?.[ADMISSION_TOKEN_ID]);
        const jump = await api.cmd<ItemSettlePeriodicResult>('item.settlePeriodic', { ruleId: ADMISSION_SEASON_RULE_ID, nowIndex: 15 });
        if (isApiFail(jump)) throw new Error(jump.message);
        assert.equals(5, jump.result.periods);
        assert.equals(3, jump.result.count);
        assert.equals(2, jump.result.granted);
        assert.equals(3 * 100, jump.result.overflow?.amount ?? 0);
        assert.equals(100 + 300, wallet.gold);
        assert.equals(15, authority.meta().periodic[ADMISSION_SEASON_RULE_ID]);
        const unknown = await api.cmd('item.settlePeriodic', { ruleId: 'nope', nowIndex: 1 });
        assert.isTrue(isApiFail(unknown) && unknown.errorCode === 'E316');
    });

    suite.test('舊存檔缺值補預設：沒有 itemMeta 讀回空中繼；壞資料被濾掉；帳本不超過上限', () => {
        assert.equals(0, normalizeItemMeta(undefined).seq);
        const bad = normalizeItemMeta({ v: 1, periodic: { a: -1, b: 4, c: 'x' }, ledger: [{ itemId: 'A' }, { itemId: 'B', holder: HOME, delta: 1, reason: 'SHOP' }], seq: 'x' });
        assert.equals(4, bad.periodic.b);
        assert.isFalse('a' in bad.periodic);
        assert.equals(1, bad.ledger.length);
        const big = normalizeItemMeta({ ledger: Array.from({ length: ITEM_LEDGER_LIMIT + 20 }, (_, i) => ({ itemId: 'A', holder: HOME, delta: 1, reason: 'SHOP', seq: i })) });
        assert.equals(ITEM_LEDGER_LIMIT, big.ledger.length);
    });

    suite.test('GameSession 家庭倉庫：庫存存檔形狀不變（id→數量），季結經 API 發入學令，存讀後高水位保留不重發', async () => {
        const adapter = new MemoryStorageAdapter();
        const store = new PlayerSaveService(adapter);
        const make = (): { session: GameSession; wallet: FakeWallet } => {
            const bundle = createLocalApi(store, { now: () => 1_000 });
            const wallet = new FakeWallet();
            const session = new GameSession();
            session.setRosterStore(new InMemoryRosterStore([]));
            session.setSaveService(store);
            session.setRandomSource(() => 0.4);
            bundle.setWallet(wallet);
            bundle.setItemAuthority(session.itemAuthority());
            session.setItemApi(bundle.api);
            return { session, wallet };
        };
        const { session } = make();
        const before = session.itemCount(ADMISSION_TOKEN_ID);
        await session.advanceSeason();
        assert.equals(before + 1, session.itemCount(ADMISSION_TOKEN_ID), '季結發 1 張');
        await session.save();
        const snap = await store.load();
        assert.isTrue(snap !== null && typeof (snap as { inventory?: Record<string, number> }).inventory?.[ADMISSION_TOKEN_ID] === 'number');
        const { session: restored } = make();
        await restored.load();
        assert.equals(before + 1, restored.itemCount(ADMISSION_TOKEN_ID));
        // 讀檔後同一季高水位已記：直接對同季再結算不會多發
        const bundle2 = createLocalApi(store);
        bundle2.setItemAuthority(restored.itemAuthority());
        const again = await bundle2.api.cmd<ItemSettlePeriodicResult>('item.settlePeriodic', { ruleId: ADMISSION_SEASON_RULE_ID, nowIndex: restored.gameTime.totalSeasonsElapsed });
        if (isApiFail(again)) throw new Error(again.message);
        assert.equals(0, again.result.periods);
    });

    suite.test('舊存檔（沒有 itemMeta、庫存已有入學令 5 張）讀回數量不變；第一次季結才補發並進溢出折金', async () => {
        const adapter = new MemoryStorageAdapter();
        const store = new PlayerSaveService(adapter);
        const seed = new GameSession();
        seed.setRosterStore(new InMemoryRosterStore([]));
        seed.setSaveService(store);
        await seed.addItem(ITEM_ADMISSION_TOKEN, 5, 'EVENT');
        await seed.save();
        const loaded = await store.load();
        assert.isFalse(loaded !== null && 'itemMeta' in loaded, '沒做過 ITM 操作就不寫 itemMeta，舊檔形狀不變');

        const bundle = createLocalApi(store, { now: () => 1_000 });
        const wallet = new FakeWallet();
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([]));
        session.setSaveService(store);
        bundle.setWallet(wallet);
        bundle.setItemAuthority(session.itemAuthority());
        session.setItemApi(bundle.api);
        await session.load();
        assert.equals(5, session.itemCount(ITEM_ADMISSION_TOKEN));
        await session.advanceSeason();
        assert.equals(5, session.itemCount(ITEM_ADMISSION_TOKEN), '已超過封頂：不再入庫');
        assert.equals(100 + 100, wallet.gold, '溢出 1 張折 100 金');
    });

    suite.test('入學走 item.consume：扣 1 張令、落盤失敗退還，令不夠時入學被擋', async () => {
        const ok = await sessionRig();
        await ok.session.addItem(ITEM_ADMISSION_TOKEN, 1, 'EVENT');
        await ok.ctrl.openEnroll();
        assert.isTrue(await ok.ctrl.enroll());
        assert.equals(0, ok.session.itemCount(ITEM_ADMISSION_TOKEN), '入學扣 1 張');
        const ledger = await ok.bundle.api.query<{ records: Array<{ reason: string }> }>('item.ledger', {});
        assert.isTrue(ledger.ok && ledger.result.records.some((r) => r.reason === 'ENROLL'));

        const fail = await sessionRig(true);
        await fail.session.addItem(ITEM_ADMISSION_TOKEN, 1, 'EVENT');
        await fail.ctrl.openEnroll();
        assert.isFalse(await fail.ctrl.enroll(), '落盤失敗入學失敗');
        assert.equals(1, fail.session.itemCount(ITEM_ADMISSION_TOKEN), '令已退還');

        const none = await sessionRig();
        await none.ctrl.openEnroll();
        assert.isFalse(await none.ctrl.enroll(), '沒有令不能入學');
        assert.isFalse(none.session.isAcademyActive);
    });

    return suite;
}
