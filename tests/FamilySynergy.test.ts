/**
 * FamilySynergy.test.ts — 世交相性 K（PROG-2-1812）
 *
 * 鎖住：規格驗算的各案例、一人只結算一次、年末接線、存讀檔、高門檢定與結緣畫面句子。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { clanTierOf } from '../assets/scripts/core/systems/ClanTier';
import {
    emptyFamilySynergyLedger, familyPairKey, finalizeAdultChildren, fullSynergyAlliesOf, normalizeFamilySynergy,
    PLAYER_FAMILY_UID, recordFinalizedChild, synergyKOf, synergyWindowLine, type FamilyPairRecord,
} from '../assets/scripts/core/systems/FamilySynergy';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const run = (results: boolean[]): FamilyPairRecord | undefined => results.reduce<FamilyPairRecord | undefined>((record, ok) => recordFinalizedChild(record, ok), undefined);
const times = (n: number, ok: boolean): boolean[] => Array.from({ length: n }, () => ok);
const near = (expected: number, actual: number): void => { assert.isTrue(Math.abs(expected - actual) < 1e-9, `${expected} vs ${actual}`); };

const person = (id: string, gender: string, age: number, ep: number, extra: Record<string, unknown> = {}): GeneralConfig => ({
    id, name: id, faction: 'player', gender, age, ep, role: 'Combat', vitality: 100, maxVitality: 100,
    str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, hp: 1000, ...extra,
} as unknown as GeneralConfig);
const WANG = '太原王';
const bride = person('bride', '女', 30, 60, { familyUid: WANG });
const lord = person('lord', '男', 40, 80);
const child = (id: string, age: number, ep: number): GeneralConfig => person(id, '男', age, ep, { fatherId: 'lord', motherId: 'bride' });

export function createFamilySynergySuite(): TestSuite {
    const suite = new TestSuite('FamilySynergy (世交相性 K PROG-2-1812)');

    suite.test('配對鍵與順序無關', () => {
        assert.equals(familyPairKey('A', 'B'), familyPairKey('B', 'A'));
        assert.equals('A__B', familyPairKey('B', 'A'));
    });

    suite.test('規格驗算：0 樣本為 0', () => {
        near(0, synergyKOf(undefined));
        near(0, synergyKOf(run([])));
    });

    suite.test('規格驗算：小家族 4 胎全好即滿額', () => {
        near(1, synergyKOf(run(times(4, true))));
    });

    suite.test('規格驗算：100 舊好 + 最近 8 胎全敗為 0', () => {
        near(0, synergyKOf(run([...times(100, true), ...times(8, false)])));
    });

    suite.test('規格驗算：6/8 達標滿額', () => {
        near(1, synergyKOf(run([...times(2, false), ...times(6, true)])));
    });

    suite.test('規格 JSON 範例：1,1,1,0,1,1 滿額', () => {
        near(1, synergyKOf(run([true, true, true, false, true, true])));
    });

    suite.test('規格驗算：舊敗後新好回升，再補 2 個好樣本滿額', () => {
        const recovering = [...times(100, false), ...times(4, true)];
        near(0, synergyKOf(run(recovering)));
        near(0.5, synergyKOf(run([...recovering, true])));
        near(1, synergyKOf(run([...recovering, true, true])));
    });

    suite.test('樣本不足 4 胎時信心打折', () => {
        near(0.5, synergyKOf(run(times(2, true))));
    });

    suite.test('窗外的舊資料不算，歷史累計照記', () => {
        const record = run([...times(100, true), ...times(8, false)]) as FamilyPairRecord;
        assert.equals(8, record.recentCount);
        assert.equals(0, record.recentBitmap);
        assert.equals(100, record.lifetimeQualified);
    });

    suite.test('結算：只算滿 18 歲、父母來自名門的子嗣，一人一次', () => {
        const roster = [lord, bride, child('c1', 18, 70), child('c2', 17, 70), child('c3', 20, 40), person('other', '男', 30, 90, { fatherId: 'lord' })];
        const once = finalizeAdultChildren(emptyFamilySynergyLedger(), roster);
        const record = once.pairs[familyPairKey(PLAYER_FAMILY_UID, WANG)];
        assert.equals(2, record.recentCount);
        assert.equals(1, record.lifetimeQualified);
        assert.equals('c1,c3', once.finalizedIds.join());
        const twice = finalizeAdultChildren(once, roster);
        assert.equals(2, twice.pairs[familyPairKey(PLAYER_FAMILY_UID, WANG)].recentCount);
    });

    suite.test('名冊順序不影響結算結果', () => {
        const a = finalizeAdultChildren(emptyFamilySynergyLedger(), [lord, bride, child('c1', 18, 70), child('c2', 18, 40)]);
        const b = finalizeAdultChildren(emptyFamilySynergyLedger(), [child('c2', 18, 40), child('c1', 18, 70), bride, lord]);
        assert.equals(JSON.stringify(a), JSON.stringify(b));
    });

    suite.test('高門檢定：分支不足時，2 家滿額相性也能達成', () => {
        const stats = { adultDescendants: 9, generations: 4, branches: 1, ep60: 9, ep75: 9, ep90: 2, sharedBlueHolders: 3 };
        assert.equals(2, clanTierOf(stats));
        assert.equals(2, clanTierOf({ ...stats, fullSynergyAllies: 1 }));
        assert.equals(3, clanTierOf({ ...stats, fullSynergyAllies: 2 }));
        assert.equals(3, clanTierOf({ ...stats, branches: 2 }));
        assert.equals(2, clanTierOf({ ...stats, fullSynergyAllies: 2, ep90: 1 }));
    });

    suite.test('滿額世家數只算 K 達 1', () => {
        const ledger = { finalizedIds: [], pairs: { a: run(times(4, true)) as FamilyPairRecord, b: run(times(2, true)) as FamilyPairRecord } };
        assert.equals(1, fullSynergyAlliesOf(ledger));
    });

    suite.test('年末才結算，存讀檔後還在', async () => {
        const store = new InMemoryRosterStore([lord, bride, child('c1', 18, 70)]);
        const save = new PlayerSaveService(new MemoryStorageAdapter());
        const session = new GameSession();
        session.setRosterStore(store);
        session.setSaveService(save);
        session.setRandomSource(() => 0);
        const counts: number[] = [];
        for (let i = 0; i < 4; i++) {
            await session.advanceSeason();
            counts.push(session.familySynergy.finalizedIds.length);
        }
        assert.equals('0,0,0,1', counts.join());
        await session.save();
        const next = new GameSession();
        next.setRosterStore(new InMemoryRosterStore([lord, bride]));
        next.setSaveService(save);
        assert.isTrue(await next.load());
        assert.equals('c1', next.familySynergy.finalizedIds.join());
        const reloaded = next.roster.find((g) => g.id === 'bride') as unknown as { familyUid?: string };
        assert.equals(WANG, reloaded.familyUid ?? '');
    });

    suite.test('存檔資料壞掉時略過', () => {
        assert.equals(0, Object.keys(normalizeFamilySynergy(undefined).pairs).length);
        const fixed = normalizeFamilySynergy({ pairs: { ok: { recentBitmap: 511, recentCount: 99, lifetimeQualified: 1 }, bad: { recentBitmap: 'x' } }, finalizedIds: ['a', 3] });
        assert.equals('ok', Object.keys(fixed.pairs).join());
        assert.equals(255, fixed.pairs.ok.recentBitmap);
        assert.equals(8, fixed.pairs.ok.recentCount);
        assert.equals('a', fixed.finalizedIds.join());
    });

    suite.test('句子：雙親都不是名門時沒有', () => {
        assert.equals(null, synergyWindowLine({}, {}, emptyFamilySynergyLedger()));
        assert.equals('世交門風契合度 K：近 0 名結算子嗣中有 0 名成材｜契合加成：0%', synergyWindowLine({}, { familyUid: WANG }, emptyFamilySynergyLedger()) ?? '');
    });

    suite.test('結緣畫面：配到名門對象時顯示相性，其他配對不顯示', () => {
        const generals = [lord, bride, person('plain', '女', 30, 60)];
        const roster = new InMemoryRosterStore(generals);
        const service = new BreedingService(roster, new BloodlineGraph(), { random: () => 0.01 });
        const ledger = finalizeAdultChildren(emptyFamilySynergyLedger(), [lord, bride, child('c1', 18, 70), child('c2', 18, 70), child('c3', 18, 70), child('c4', 18, 70)]);
        const flow = new BondingSetupController({
            roster, breeding: service, prepare: async () => service.syncGraphFromRoster(), persist: async () => undefined,
            familySynergy: () => ledger,
        });
        flow.selectFather('lord');
        flow.selectMother('bride');
        assert.isTrue(flow.getView().texts.conceptionLabel.indexOf('近 4 名結算子嗣中有 4 名成材｜契合加成：100%') >= 0);
        flow.selectMother('plain');
        assert.isTrue(flow.getView().texts.conceptionLabel.indexOf('世交') < 0);
    });

    return suite;
}
