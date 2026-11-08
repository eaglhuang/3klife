/**
 * GeneralSalary — 每季薪資與欠薪結算（RET-10，PROG-2-2100）。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { createSalaryLedger, normalizeSalaryLedger, salaryOfRank, settleSalaries, type SalaryPayee } from '../assets/scripts/core/systems/GeneralSalary';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const payee = (id: string, rank: number, canDesert = true): SalaryPayee => ({ id, rank, canDesert });
const never = (): number => 1;
const always = (): number => 0;

function general(id: string, rank: number): GeneralConfig {
    return { id, name: id, generalRank: rank, age: 30, str: 50, int: 50, lea: 50, pol: 50, cha: 50, luk: 50 } as unknown as GeneralConfig;
}

function walletOf(start: number): { gold: () => number; spendGold: (amount: number) => boolean; left: () => number } {
    let gold = start;
    return {
        gold: () => gold,
        spendGold: (amount) => {
            if (amount > gold) return false;
            gold -= amount;
            return true;
        },
        left: () => gold,
    };
}

function sessionWith(generals: GeneralConfig[]): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(generals));
    return session;
}

export function createGeneralSalarySuite(): TestSuite {
    const suite = new TestSuite('GeneralSalary (每季薪資與欠薪 RET-10 PROG-2-2100)');

    suite.test('薪資＝階級 × 50，壞值視為 0', () => {
        assert.equals(0, salaryOfRank(0));
        assert.equals(250, salaryOfRank(5));
        assert.equals(0, salaryOfRank(Number.NaN));
        assert.equals(0, salaryOfRank(-1));
    });

    suite.test('金幣夠時全發，總額正確，帳本沒有欠薪', () => {
        const result = settleSalaries([payee('a', 2), payee('b', 1)], 150, createSalaryLedger(), 7, never);
        assert.equals(150, result.totalPaid);
        assert.equals(0, result.unpaid.length);
        assert.equals(7, result.ledger.lastSettledSeason!);
        assert.equals(0, Object.keys(result.ledger.arrears).length);
    });

    suite.test('金幣不足時高階先發，付不起的跳過，低階照發', () => {
        const result = settleSalaries([payee('low', 1), payee('high', 4), payee('mid', 3)], 200, createSalaryLedger(), 1, never);
        assert.equals(200, result.totalPaid);
        assert.equals('high', result.paid[0]);
        assert.equals(true, result.unpaid.includes('mid'));
        assert.equals(1, result.ledger.arrears.mid);
        assert.equals(true, result.unpaid.includes('low'));
    });

    suite.test('第 1 季欠薪不下野；第 2 季起依 30% 判定', () => {
        const first = settleSalaries([payee('a', 1)], 0, createSalaryLedger(), 1, always);
        assert.equals(0, first.departed.length);
        const stay = settleSalaries([payee('a', 1)], 0, first.ledger, 2, () => 0.3);
        assert.equals(0, stay.departed.length);
        assert.equals(2, stay.ledger.arrears.a);
        const leave = settleSalaries([payee('a', 1)], 0, first.ledger, 2, () => 0.29);
        assert.equals('a', leave.departed[0]);
        assert.equals(undefined, leave.ledger.arrears.a);
    });

    suite.test('補發後連續欠薪歸零；不可下野者只累積', () => {
        const owed = settleSalaries([payee('a', 1)], 0, createSalaryLedger(), 1, never);
        const paid = settleSalaries([payee('a', 1)], 50, owed.ledger, 2, never);
        assert.equals(undefined, paid.ledger.arrears.a);
        const locked = settleSalaries([payee('b', 1, false)], 0, { arrears: { b: 5 }, lastSettledSeason: 1 }, 2, always);
        assert.equals(0, locked.departed.length);
        assert.equals(6, locked.ledger.arrears.b);
    });

    suite.test('帳本正規化：缺值、壞值都補成合法', () => {
        assert.equals(null, normalizeSalaryLedger(undefined).lastSettledSeason);
        const ledger = normalizeSalaryLedger({ arrears: { a: 2, b: 'x', c: 0 }, lastSettledSeason: 'y' });
        assert.equals(2, ledger.arrears.a);
        assert.equals(undefined, ledger.arrears.b);
        assert.equals(undefined, ledger.arrears.c);
        assert.equals(null, ledger.lastSettledSeason);
    });

    suite.test('GameSession：扣國庫、欠薪扣忠誠與親密、同季不重複結算', async () => {
        const session = sessionWith([general('a', 2), general('b', 2)]);
        session.dynamicRelations.record('mercenary-oath', 'b', 'c', 0);
        const before = session.dynamicRelations.listFor('b')[0].intimacy;
        const wallet = walletOf(100);
        const report = await session.settleGeneralSalaries(wallet, never);
        assert.equals(0, wallet.left());
        assert.equals(100, report!.totalPaid);
        assert.equals('b', report!.unpaid[0]);
        assert.equals(35, session.tallyLoyalty.b.loyalty);
        assert.equals(undefined, session.tallyLoyalty.a);
        assert.equals(before - 15, session.dynamicRelations.listFor('b')[0].intimacy);
        assert.equals(null, await session.settleGeneralSalaries(walletOf(1000), never));
    });

    suite.test('GameSession：轉蛋名將不扣忠誠也不下野；主將不下野；下野者離開名冊', async () => {
        const session = sessionWith([general('lead', 1), general('hero', 1), general('free', 1)]);
        session.enrollGenerals([general('gacha', 1)], { fromGacha: true });
        await session.setLeadGeneral('lead');
        for (let season = 0; season < 2; season++) {
            await session.advanceSeason();
            await session.settleGeneralSalaries(walletOf(0), always);
        }
        const ids = session.roster.map((g) => g.id);
        assert.equals(true, ids.includes('lead'));
        assert.equals(true, ids.includes('gacha'));
        assert.equals(false, ids.includes('hero'));
        assert.equals(false, ids.includes('free'));
        assert.equals(100, session.tallyLoyalty.gacha.loyalty);
    });

    suite.test('存讀檔保留連續欠薪季數', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = sessionWith([general('a', 1)]);
        session.setSaveService(new PlayerSaveService(adapter));
        await session.settleGeneralSalaries(walletOf(0), never);
        await session.save();
        const restored = sessionWith([general('a', 1)]);
        restored.setSaveService(new PlayerSaveService(adapter));
        await restored.load();
        assert.equals(1, restored.salaryArrearsOf('a'));
    });

    return suite;
}
