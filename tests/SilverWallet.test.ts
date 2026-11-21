/**
 * SilverWallet.test.ts — 家族銀兩錢包（PROG-2-9591）
 *
 * 涵蓋：silver 幣別走 wallet.spend／wallet.balance、與轉蛋幣別分開、開局銀兩、存檔欄位來回、
 * 媒人禮金實扣（不足 E301、納入失敗退款）、乳母費逐季實扣與不足請辭改母乳。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import { SilverRoutedWallet } from '../assets/scripts/core/api/localserver/SilverWalletPort';
import type { WalletAuthority } from '../assets/scripts/core/api/localserver/WalletCommands';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { isApiFail } from '../assets/scripts/shared/api/ApiProtocol';
import { FamilyService } from '../assets/scripts/shared/family/FamilyService';
import { isEmptyFamilyState } from '../assets/scripts/shared/family/FamilyTypes';

const ROOT = join(__dirname, '..');
const generals = JSON.parse(readFileSync(join(ROOT, 'assets/resources/data/generals.json'), 'utf8')) as GeneralConfig[];
const readJson = (name: string): Record<string, unknown> => JSON.parse(readFileSync(join(ROOT, `assets/resources/data/${name}.json`), 'utf8')) as Record<string, unknown>;

/** 假的轉蛋錢包：只持有 gems，用來證明 silver 不碰它 */
function fakeGacha(): WalletAuthority & { gems: number } {
    const w = {
        gems: 100,
        balance: (c: string) => (c === 'gems' ? w.gems : 0),
        spend: (c: string, n: number) => { if (c !== 'gems' || w.gems < n) return false; w.gems -= n; return true; },
        snapshot: () => ({ gems: w.gems }),
    };
    return w;
}

async function newBundle(familyOverride: Record<string, unknown> = {}) {
    const session = new GameSession(5);
    session.setRosterStore(new InMemoryRosterStore());
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setAutoSave(false);
    session.setRandomSource(() => 0.5);
    session.setGeneralTemplates(generals);
    session.configureFamily({ ...readJson('family-config'), ...familyOverride });
    session.configureOccupancyMatrix(readJson('occupancy-matrix'));
    await session.startNewGameWithStarters(5, generals, {});
    const gacha = fakeGacha();
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    bundle.setWallet(new SilverRoutedWallet(gacha, session.silverLedger));
    bundle.setFamilyHost(session.spouseHost);
    let seq = 0;
    const key = (): { idemKey: string } => ({ idemKey: `s:${seq++}` });
    return { session, gacha, api: bundle.api, key };
}

export function createSilverWalletSuite(): TestSuite {
    const suite = new TestSuite('SilverWallet (家族銀兩錢包 PROG-2-9591)');

    suite.test('開局銀兩來自設定；wallet.balance 含 silver，轉蛋幣別不受影響', async () => {
        const { api, gacha } = await newBundle();
        const all = await api.query<Record<string, number>>('wallet.balance', {});
        assert.isTrue(!isApiFail(all) && all.result.silver === 600 && all.result.gems === 100);
        const one = await api.query<Record<string, number>>('wallet.balance', { currency: 'silver' });
        assert.isTrue(!isApiFail(one) && one.result.silver === 600);
        assert.equals(100, gacha.gems);
    });

    suite.test('wallet.spend silver：扣得到、不足 E301 且不扣；轉蛋錢包不動', async () => {
        const { api, gacha, key } = await newBundle();
        const ok = await api.cmd<{ spent: number; balance: number }>('wallet.spend', { currency: 'silver', amount: 250, reason: 'TEST' }, key());
        assert.isTrue(!isApiFail(ok) && ok.result.balance === 350);
        const short = await api.cmd('wallet.spend', { currency: 'silver', amount: 351, reason: 'TEST' }, key());
        assert.isTrue(isApiFail(short) && short.errorCode === 'E301');
        const left = await api.query<Record<string, number>>('wallet.balance', { currency: 'silver' });
        assert.isTrue(!isApiFail(left) && left.result.silver === 350, '不足不扣');
        assert.equals(100, gacha.gems, '銀兩與轉蛋貨幣永遠分開');
    });

    suite.test('familyState.silver 存檔來回；壞值丟棄回尚未動用；空狀態判定含銀兩', async () => {
        const { session, api, key } = await newBundle();
        await api.cmd('wallet.spend', { currency: 'silver', amount: 100, reason: 'TEST' }, key());
        const snap = (session as unknown as { _family: FamilyService })._family.snapshot();
        assert.equals(500, snap.silver);
        assert.isFalse(isEmptyFamilyState(snap), '動用過銀兩的家族狀態不算空，才會被存檔');
        const restored = new FamilyService();
        restored.restore(snap);
        assert.equals(500, restored.silverBalance(600));
        restored.restore({ members: [], branches: [], silver: -5 });
        assert.equals(600, restored.silverBalance(600), '負值視為壞資料');
        const fresh = new FamilyService();
        assert.equals(undefined, fresh.snapshot().silver, '沒動用過不寫欄位，舊檔相容');
    });

    suite.test('媒人禮金實扣：每次 100；納入失敗退款；餘額不足 E301 且名冊不變', async () => {
        const { session, api, key } = await newBundle({ matchmakerPerYear: 5, startingSilver: 150, spouseCapByHallLevel: { '1': 1, '2': 1, '3': 1, '4': 1, '5': 1 } });
        const before = session.roster.length;
        const first = await api.cmd<{ created: boolean; silverSpent?: number }>('family.enrollSpouse', { source: 'matchmaker', pick: 0 }, key());
        assert.isTrue(!isApiFail(first) && first.result.created && first.result.silverSpent === 100);
        assert.equals(50, session.silverLedger.silverBalance());
        // 上限 1 位：第二位會因 cap-reached 失敗，禮金要退回（先補錢讓銀兩夠付）
        session.silverLedger.creditSilver(100);
        const capped = await api.cmd('family.enrollSpouse', { source: 'matchmaker', pick: 1 }, key());
        assert.isTrue(isApiFail(capped) && capped.errorCode === 'E362', '配偶上限先擋');
        assert.equals(150, session.silverLedger.silverBalance(), '納入失敗不留扣款');
        session.silverLedger.spendSilver(100);
        const broke = await api.cmd('family.enrollSpouse', { source: 'matchmaker', pick: 1 }, key());
        assert.isTrue(isApiFail(broke) && broke.errorCode === 'E301', '銀兩不足回 E301');
        assert.equals(before + 1, session.roster.length);
    });

    suite.test('乳母費：每季每位乳母母親扣 20；不足請辭改母乳', async () => {
        const { session } = await newBundle({ startingSilver: 30 });
        const mother = generals.find((g) => g.gender === '女') as GeneralConfig;
        session.enrollGenerals([
            { ...mother, nursingMethod: 'wetNurse' } as GeneralConfig,
            { id: 'baby_x', name: '小寶', gender: '男', age: 1, motherId: mother.id } as unknown as GeneralConfig,
        ]);
        const config = session.familyConfig as NonNullable<typeof session.familyConfig>;
        const charge = (season: number): string[] => (session as unknown as { _chargeWetNurses(c: unknown, s: number): string[] })._chargeWetNurses(config, season);
        assert.equals(0, charge(10).length);
        assert.equals(10, session.silverLedger.silverBalance(), '30 - 20');
        const lines = charge(11);
        assert.equals(1, lines.length, '第二季銀兩不足，乳母請辭');
        assert.equals(10, session.silverLedger.silverBalance(), '不足不扣');
        assert.equals('breast', session.roster.find((g) => g.id === mother.id)?.nursingMethod);
        assert.equals(0, charge(12).length, '已改母乳，不再收費');
    });

    return suite;
}
