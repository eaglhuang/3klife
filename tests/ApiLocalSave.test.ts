/**
 * ApiLocalSave.test.ts — 本機 adapter 的存檔命令與錢包 port（PROG-2-9201；總綱 doc_spec_1182 §5.7）
 */
import { assert, TestSuite } from './TestRunner';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import { ApiSaveGateway } from '../assets/scripts/core/api/localserver/ApiSaveGateway';
import { GachaWalletPort } from '../assets/scripts/core/api/localserver/GachaWalletPort';
import { hashSnapshot } from '../assets/scripts/core/api/localserver/SaveHash';
import { applyPatch, parsePointer, stableStringify } from '../assets/scripts/shared/api/ApiPatch';
import { isApiFail } from '../assets/scripts/shared/api/ApiProtocol';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LocalGachaService } from '../assets/scripts/core/services/LocalGachaService';
import { createPlayerSaveSnapshot, PlayerSaveService, type PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GameClock } from '../assets/scripts/core/systems/GameClock';

function baseSnapshot(): PlayerSaveSnapshot {
    return createPlayerSaveSnapshot(new GameClock().state, [], new Date('2026-11-21T00:00:00Z'));
}

function rig() {
    const adapter = new MemoryStorageAdapter();
    const store = new PlayerSaveService(adapter);
    const bundle = createLocalApi(store, { now: () => 1_000 });
    return { adapter, store, bundle, api: bundle.api };
}

export function createApiLocalSaveSuite(): TestSuite {
    const suite = new TestSuite('ApiLocalSave (本機 adapter 存檔與錢包 PROG-2-9201)');

    suite.test('save.full 寫入後 save.load 讀回同一份快照；saveRev 遞增並持久化', async () => {
        const { api, store } = rig();
        const snap = baseSnapshot();
        const saved = await api.cmd('save.full', { snapshot: snap });
        assert.isTrue(saved.ok);
        assert.equals(1, saved.saveRev);
        assert.equals(1, await store.loadRev());
        const loaded = await api.query<{ snapshot: PlayerSaveSnapshot | null; hash: string | null }>('save.load');
        assert.isTrue(loaded.ok);
        if (isApiFail(loaded)) return;
        assert.equals(snap.savedAt, loaded.result.snapshot?.savedAt);
        assert.equals(hashSnapshot(loaded.result.snapshot), loaded.result.hash);
    });

    suite.test('舊存檔相容：沒有 .rev 旁路鍵的舊檔照常讀回、版本戳視為 0，第一次新存檔變 1', async () => {
        const adapter = new MemoryStorageAdapter();
        await new PlayerSaveService(adapter).save(baseSnapshot());
        const bundle = createLocalApi(new PlayerSaveService(adapter));
        const loaded = await bundle.api.query<{ snapshot: unknown }>('save.load');
        assert.isTrue(loaded.ok && (loaded as { result: { snapshot: unknown } }).result.snapshot !== null);
        assert.equals(0, loaded.saveRev);
        const saved = await bundle.api.cmd('save.full', { snapshot: baseSnapshot() });
        assert.equals(1, saved.saveRev);
    });

    suite.test('重開後版本戳不倒退：新 adapter 未 load 就直接 save.full 也接在持久化版本之後', async () => {
        const { adapter, api } = rig();
        await api.cmd('save.full', { snapshot: baseSnapshot() });
        await api.cmd('save.full', { snapshot: baseSnapshot() });
        const reopened = createLocalApi(new PlayerSaveService(adapter));
        const saved = await reopened.api.cmd('save.full', { snapshot: baseSnapshot() });
        assert.equals(3, saved.saveRev);
    });

    suite.test('save.commit：clientOwned 欄位補丁成功；critical 欄位 E002；baseHash 不符 E011；rev 落後 E102', async () => {
        const { api } = rig();
        const snap = { ...baseSnapshot(), favoriteGeneralIds: ['g1'] } as PlayerSaveSnapshot;
        await api.cmd('save.full', { snapshot: snap });
        const rev = await api.query<{ saveRev: number; hash: string }>('save.rev');
        if (isApiFail(rev)) throw new Error('save.rev 失敗');
        const ok = await api.cmd<{ applied: number }>('save.commit', { baseHash: rev.result.hash, patch: [{ op: 'add', path: '/favoriteGeneralIds/-', value: 'g2' }] });
        assert.isTrue(ok.ok);
        const after = await api.query<{ snapshot: PlayerSaveSnapshot }>('save.load');
        if (isApiFail(after)) throw new Error('save.load 失敗');
        assert.equals('g1,g2', (after.result.snapshot.favoriteGeneralIds ?? []).join(','));

        const hashNow = (await api.query<{ hash: string }>('save.rev') as { result: { hash: string } }).result.hash;
        const forbidden = await api.cmd('save.commit', { baseHash: hashNow, patch: [{ op: 'replace', path: '/gachaWallet/gems', value: 99999 }] });
        assert.isTrue(isApiFail(forbidden) && forbidden.errorCode === 'E002');
        const proto = await api.cmd('save.commit', { baseHash: hashNow, patch: [{ op: 'add', path: '/favoriteGeneralIds/__proto__/x', value: 1 }] });
        assert.isTrue(isApiFail(proto) && proto.errorCode === 'E002');
        const stale = await api.cmd('save.commit', { baseHash: 'deadbeef', patch: [{ op: 'add', path: '/favoriteGeneralIds/-', value: 'g3' }] });
        assert.isTrue(isApiFail(stale) && stale.errorCode === 'E011');
        const lagging = await api.handle({ v: 1, reqId: 'r', idemKey: 'lag', cmd: 'save.commit', saveRev: 0, clientTime: 0, args: { baseHash: hashNow, patch: [{ op: 'add', path: '/favoriteGeneralIds/-', value: 'g4' }] } });
        assert.isTrue(isApiFail(lagging) && lagging.errorCode === 'E102');
    });

    suite.test('GameSession 經 ApiSaveGateway 存讀檔：往返一致，寫檔走 save.full（saveRev 遞增）', async () => {
        const adapter = new MemoryStorageAdapter();
        const bundle = createLocalApi(new PlayerSaveService(adapter));
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([]));
        session.setSaveService(new ApiSaveGateway(bundle.api));
        const saved = await session.save();
        assert.equals(1, bundle.api.view.saveRev);
        const restored = new GameSession();
        restored.setRosterStore(new InMemoryRosterStore([]));
        restored.setSaveService(new ApiSaveGateway(createLocalApi(new PlayerSaveService(adapter)).api));
        assert.isTrue(await restored.load());
        assert.equals(saved.gameTime.totalSeasonsElapsed, restored.createSnapshot().gameTime.totalSeasonsElapsed);
    });

    suite.test('存檔失敗：gateway 丟出含錯誤碼的例外，不吞掉', async () => {
        const failing = { load: async () => null, loadRev: async () => 0, lastLoadRecoveredFromBackup: () => false, save: async () => { throw new Error('磁碟滿了'); } };
        const bundle = createLocalApi(failing as never);
        let message = '';
        try { await new ApiSaveGateway(bundle.api).save(baseSnapshot()); } catch (error) { message = (error as Error).message; }
        assert.contains(message, 'E190');
    });

    suite.test('錢包 port：wallet.spend 扣 LocalGachaService 的權威餘額，不足 E301 不扣，未綁定 E303', async () => {
        const { bundle, api } = rig();
        const unbound = await api.cmd('wallet.spend', { currency: 'gems', amount: 1, reason: 'T' });
        assert.isTrue(isApiFail(unbound) && unbound.errorCode === 'E303');
        const gacha = new LocalGachaService();
        bundle.setWallet(new GachaWalletPort(gacha));
        const before = gacha.getCurrencyAmount('gems');
        const ok = await api.cmd<{ balance: number }>('wallet.spend', { currency: 'gems', amount: 100, reason: 'JOB_CHANGE_ORDER' });
        assert.isTrue(ok.ok);
        assert.equals(before - 100, gacha.getCurrencyAmount('gems'));
        const tooMuch = await api.cmd('wallet.spend', { currency: 'gems', amount: before, reason: 'T' });
        assert.isTrue(isApiFail(tooMuch) && tooMuch.errorCode === 'E301');
        assert.equals(before - 100, gacha.getCurrencyAmount('gems'));
        const bal = await api.query<Record<string, number>>('wallet.balance', { currency: 'gems' });
        assert.equals(before - 100, (bal as { result: Record<string, number> }).result.gems);
    });

    suite.test('JSON 補丁與穩定序列化：add／replace／remove、陣列尾端、危險路徑拒絕、鍵序不影響雜湊', () => {
        const doc = { a: [1, 2], b: { c: 1 } };
        const next = applyPatch(doc, [{ op: 'add', path: '/a/-', value: 3 }, { op: 'replace', path: '/b/c', value: 9 }, { op: 'remove', path: '/a/0' }]) as typeof doc;
        assert.equals('2,3', next.a.join(','));
        assert.equals(9, next.b.c);
        assert.equals(1, doc.b.c);
        assert.isTrue(parsePointer('/a/__proto__') === null);
        assert.isTrue(parsePointer('a') === null);
        assert.equals(stableStringify({ x: 1, y: [2, { b: 1, a: 2 }] }), stableStringify({ y: [2, { a: 2, b: 1 }], x: 1 }));
        assert.throws(() => applyPatch(doc, [{ op: 'add', path: '/zz/q', value: 1 }]));
    });

    return suite;
}
