/**
 * ApiContract.test.ts — 共通 API 契約（PROG-2-9201；總綱 doc_spec_1182 §5.3、§5.4、§5.8）
 *
 * 同一份命令腳本分別跑在「本機 adapter 直接呼叫」與「模擬網路 adapter（請求與回應都經 JSON 往返）」上，
 * 結果必須等價——這是日後換成真網路 adapter 玩法程式零修改的依據。
 */
import { assert, TestSuite } from './TestRunner';
import { LocalApiAdapter } from '../assets/scripts/core/api/localserver/LocalApiAdapter';
import { registerWalletCommands, type WalletAuthority } from '../assets/scripts/core/api/localserver/WalletCommands';
import { API_PROTOCOL_VERSION, isApiFail, type ApiCmdOptions, type ApiEvent, type ApiRequest, type ApiResult } from '../assets/scripts/shared/api/ApiProtocol';
import { buildIdemKey, IdempotencyStore } from '../assets/scripts/shared/api/ApiIdempotency';
import type { IApiClient } from '../assets/scripts/shared/api/IApiClient';

class FakeWallet implements WalletAuthority {
    public constructor(public gems = 100) {}
    public balance(currency: string): number { return currency === 'gems' ? this.gems : 0; }
    public spend(currency: string, amount: number): boolean {
        if (currency !== 'gems' || this.gems < amount) return false;
        this.gems -= amount;
        return true;
    }
    public snapshot(): Record<string, number> { return { gems: this.gems }; }
}

function makeServer(wallet: FakeWallet, now = () => 1_000): LocalApiAdapter {
    const server = new LocalApiAdapter({ now });
    registerWalletCommands(server, () => wallet);
    return server;
}

/** 模擬網路 adapter：封包序列化成 JSON 字串送到「伺服器」再原樣解回，不共用任何物件參考 */
class LoopbackRemoteClient implements IApiClient {
    public readonly mode = 'remote' as const;
    private _seq = 0;
    private _rev = 0;
    public constructor(private readonly _server: LocalApiAdapter) {}
    public get view() { return { saveRev: this._rev, serverTime: 0 }; }
    public subscribe(): () => void { return () => undefined; }
    private async _send<T>(cmd: string, args: unknown, idemKey?: string): Promise<ApiResult<T>> {
        this._seq += 1;
        const req: ApiRequest = { v: API_PROTOCOL_VERSION, reqId: `net_${this._seq}`, cmd, clientTime: 0, saveRev: this._rev, args, ...(idemKey ? { idemKey } : {}) };
        const wire = JSON.stringify(req);
        const res = JSON.parse(JSON.stringify(await this._server.handle(JSON.parse(wire) as ApiRequest))) as ApiResult<T>;
        this._rev = res.saveRev ?? this._rev;
        return res;
    }
    public cmd<T>(name: string, args: unknown, opts: ApiCmdOptions = {}): Promise<ApiResult<T>> {
        return this._send<T>(name, args, opts.idemKey ?? buildIdemKey(name, 'self', this._rev, this._seq + 1));
    }
    public query<T>(name: string, args: unknown = {}): Promise<ApiResult<T>> {
        return this._send<T>(name, args);
    }
}

/** 抽出兩種 adapter 都應一致的欄位（reqId、時間不比） */
function essence(res: ApiResult): unknown {
    return isApiFail(res)
        ? { ok: false, code: res.errorCode, reason: res.reason, retryable: res.retryable }
        : { ok: true, result: res.result, replayed: res.replayed ?? false, code: res.errorCode ?? null };
}

async function script(client: IApiClient): Promise<unknown[]> {
    const out: unknown[] = [];
    out.push(essence(await client.query('wallet.balance')));
    out.push(essence(await client.cmd('wallet.spend', { currency: 'gems', amount: 30, reason: 'T' }, { idemKey: 'k1' })));
    out.push(essence(await client.cmd('wallet.spend', { currency: 'gems', amount: 30, reason: 'T' }, { idemKey: 'k1' })));
    out.push(essence(await client.cmd('wallet.spend', { currency: 'gems', amount: 500, reason: 'T' }, { idemKey: 'k2' })));
    out.push(essence(await client.cmd('wallet.spend', { currency: 'xx', amount: 1, reason: 'T' }, { idemKey: 'k3' })));
    out.push(essence(await client.cmd('wallet.spend', { currency: 'gems', amount: 1, reason: 'T', price: 1 }, { idemKey: 'k4' })));
    out.push(essence(await client.cmd('no.such', {}, { idemKey: 'k5' })));
    out.push(essence(await client.query('wallet.balance', { currency: 'gems' })));
    return out;
}

export function createApiContractSuite(): TestSuite {
    const suite = new TestSuite('ApiContract (共通 API 契約 PROG-2-9201)');

    suite.test('成功回應帶 v／reqId／ok／saveRev／serverTime／result／delta／events', async () => {
        const server = makeServer(new FakeWallet(100), () => 5_000);
        const res = await server.cmd<{ balance: number }>('wallet.spend', { currency: 'gems', amount: 40, reason: 'T' });
        assert.isTrue(res.ok);
        if (isApiFail(res)) return;
        assert.equals(API_PROTOCOL_VERSION, res.v);
        assert.isTrue(res.reqId.length > 0);
        assert.equals(1, res.saveRev);
        assert.equals(5_000, res.serverTime);
        assert.equals(60, res.result.balance);
        assert.equals('/gachaWallet/gems', res.delta?.[0].path);
        assert.equals('inventory.changed', res.events?.[0].evt);
        assert.equals(1, res.events?.[0].rev);
    });

    suite.test('失敗回應帶 errorCode／reason／message／retryable，且不扣款不增 saveRev', async () => {
        const wallet = new FakeWallet(10);
        const server = makeServer(wallet);
        const res = await server.cmd('wallet.spend', { currency: 'gems', amount: 40, reason: 'T' });
        assert.isTrue(isApiFail(res));
        if (!isApiFail(res)) return;
        assert.equals('E301', res.errorCode);
        assert.equals('INSUFFICIENT_BALANCE', res.reason);
        assert.isFalse(res.retryable);
        assert.equals(10, wallet.gems);
        assert.equals(0, server.view.saveRev);
    });

    suite.test('冪等：同 idemKey 重送回原結果、不再扣款、帶 E101 標記但 ok:true', async () => {
        const wallet = new FakeWallet(100);
        const server = makeServer(wallet);
        const first = await server.cmd('wallet.spend', { currency: 'gems', amount: 30, reason: 'T' }, { idemKey: 'dup' });
        const again = await server.cmd('wallet.spend', { currency: 'gems', amount: 30, reason: 'T' }, { idemKey: 'dup' });
        assert.isTrue(first.ok && again.ok);
        assert.equals(70, wallet.gems);
        assert.isTrue((again as { replayed?: boolean }).replayed === true);
        assert.equals('E101', (again as { errorCode?: string }).errorCode);
        assert.equals(1, again.saveRev);
        assert.equals(1, server.view.saveRev);
    });

    suite.test('失敗結果不進冪等表：補足餘額後同 idemKey 可重試成功', async () => {
        const wallet = new FakeWallet(10);
        const server = makeServer(wallet);
        const bad = await server.cmd('wallet.spend', { currency: 'gems', amount: 40, reason: 'T' }, { idemKey: 'retry' });
        assert.isFalse(bad.ok);
        wallet.gems = 100;
        const good = await server.cmd('wallet.spend', { currency: 'gems', amount: 40, reason: 'T' }, { idemKey: 'retry' });
        assert.isTrue(good.ok);
        assert.equals(60, wallet.gems);
    });

    suite.test('會改狀態的命令缺 idemKey → E001；查詢不需要', async () => {
        const server = makeServer(new FakeWallet());
        const res = await server.handle({ v: 1, reqId: 'x', cmd: 'wallet.spend', clientTime: 0, args: { currency: 'gems', amount: 1, reason: 'T' } });
        assert.isTrue(isApiFail(res) && res.errorCode === 'E001');
        const q = await server.handle({ v: 1, reqId: 'y', cmd: 'wallet.balance', clientTime: 0, args: {} });
        assert.isTrue(q.ok);
    });

    suite.test('夾帶權威欄位（price／balance／reward…）→ E103，不執行', async () => {
        const wallet = new FakeWallet(100);
        const server = makeServer(wallet);
        for (const field of ['price', 'balance', 'reward', 'serverTime']) {
            const res = await server.cmd('wallet.spend', { currency: 'gems', amount: 1, reason: 'T', [field]: 1 });
            assert.isTrue(isApiFail(res) && res.errorCode === 'E103', field);
        }
        assert.equals(100, wallet.gems);
    });

    suite.test('未知命令 E105；過新協定 E005；舊協定 v=0 只允許 save.*；維護中 E104', async () => {
        const wallet = new FakeWallet();
        let maintenance = false;
        const server = new LocalApiAdapter({ maintenance: () => maintenance });
        registerWalletCommands(server, () => wallet);
        const unknown = await server.cmd('nope.cmd', {});
        assert.isTrue(isApiFail(unknown) && unknown.errorCode === 'E105');
        const tooNew = await server.handle({ v: 99, reqId: 'a', cmd: 'wallet.balance', clientTime: 0, args: {} });
        assert.isTrue(isApiFail(tooNew) && tooNew.errorCode === 'E005');
        const legacy = await server.handle({ v: 0, reqId: 'b', cmd: 'wallet.balance', clientTime: 0, args: {} });
        assert.isTrue(isApiFail(legacy) && legacy.errorCode === 'E005');
        maintenance = true;
        const down = await server.cmd('wallet.spend', { currency: 'gems', amount: 1, reason: 'T' });
        assert.isTrue(isApiFail(down) && down.errorCode === 'E104' && down.retryable);
    });

    suite.test('同一玩家的命令序列化：同時送 5 筆各扣 30，只成功 3 筆，餘額不為負', async () => {
        const wallet = new FakeWallet(100);
        const server = makeServer(wallet);
        const results = await Promise.all([1, 2, 3, 4, 5].map((i) => server.cmd('wallet.spend', { currency: 'gems', amount: 30, reason: 'T' }, { idemKey: `c${i}` })));
        assert.equals(3, results.filter((r) => r.ok).length);
        assert.equals(10, wallet.gems);
        assert.equals(3, server.view.saveRev);
    });

    suite.test('事件帶 rev 推送給訂閱者；取消訂閱後不再收到；訂閱者拋錯不影響命令', async () => {
        const server = makeServer(new FakeWallet(100));
        const seen: ApiEvent[] = [];
        const off = server.subscribe('inventory.changed', (e) => { seen.push(e); });
        server.subscribe('inventory.changed', () => { throw new Error('壞訂閱者'); });
        assert.isTrue((await server.cmd('wallet.spend', { currency: 'gems', amount: 1, reason: 'T' })).ok);
        assert.equals(1, seen.length);
        assert.equals(1, seen[0].rev);
        off();
        await server.cmd('wallet.spend', { currency: 'gems', amount: 1, reason: 'T' });
        assert.equals(1, seen.length);
    });

    suite.test('冪等表上限與逾時：超過筆數淘汰最舊、超過 TTL 失效', () => {
        const store = new IdempotencyStore(2, 1_000);
        const ok = (n: number): ApiResult => ({ v: 1, reqId: String(n), ok: true, saveRev: n, serverTime: 0, result: n });
        store.put('a', ok(1), 0);
        store.put('b', ok(2), 0);
        store.put('c', ok(3), 0);
        assert.isTrue(store.get('a', 0) === null);
        assert.isTrue(store.get('c', 0) !== null);
        assert.isTrue(store.get('c', 5_000) === null);
    });

    suite.test('契約等價：本機 adapter 與模擬網路 adapter 跑同一腳本，結果一致', async () => {
        const local = await script(makeServer(new FakeWallet(100)));
        const remote = await script(new LoopbackRemoteClient(makeServer(new FakeWallet(100))));
        assert.equals(JSON.stringify(local), JSON.stringify(remote));
        const flat = local as Array<{ ok: boolean; code: string | null }>;
        assert.equals('E101', flat[2].code);
        assert.equals('E301', flat[3].code);
        assert.equals('E302', flat[4].code);
        assert.equals('E103', flat[5].code);
        assert.equals('E105', flat[6].code);
    });

    return suite;
}
