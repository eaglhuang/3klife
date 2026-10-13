import { assert, TestSuite } from './TestRunner';
import { buildMercenaryPoolRows, BOND_MAX } from '../assets/scripts/core/systems/MercenaryPoolPresenter';
import { MercenarySaveBundle } from '../assets/scripts/core/systems/MercenarySaveModel';

const BUNDLE: MercenarySaveBundle = {
    mercenaries: [
        { uid: 'trial', daysLeft: 4, bond: 30, status: 'Trial' },
        { uid: 'done', daysLeft: 0, bond: 60, status: 'Trial' },
        { uid: 'frozen', daysLeft: 2, bond: 0, status: 'Trial' },
        { uid: 'bonded', daysLeft: 0, bond: 60, status: 'Bonded' },
        { uid: 'gone', daysLeft: 0, bond: 10, status: 'Expired' },
    ],
    upkeep: [{ uid: 'frozen', status: 'Frozen', unpaidDays: 1, frozenDaysLeft: 1 }],
    cooldowns: [],
};

export function createMercenaryPoolPresenterSuite(): TestSuite {
    const suite = new TestSuite('MercenaryPoolPresenter (MERC-07 傭兵列表資料)');

    suite.test('每個傭兵一列，順序與來源一致', () => {
        const rows = buildMercenaryPoolRows(BUNDLE);
        assert.equals(5, rows.length);
        assert.equals('trial', rows[0].uid);
        assert.equals('gone', rows[4].uid);
    });

    suite.test('試用中顯示剩餘天數與倒數進度', () => {
        const row = buildMercenaryPoolRows(BUNDLE)[0];
        assert.equals('試用中', row.statusText);
        assert.equals('剩餘 4 日', row.daysLeftText);
        assert.equals(2 / 6, row.trialProgress);
    });

    suite.test('結義進度依好感 / 60，超過時夾在 1', () => {
        const rows = buildMercenaryPoolRows(BUNDLE);
        assert.equals(30 / BOND_MAX, rows[0].bondProgress);
        assert.equals(1, rows[1].bondProgress);
    });

    suite.test('只有試用到期（倒數 0）才能結義', () => {
        const rows = buildMercenaryPoolRows(BUNDLE);
        assert.isFalse(rows[0].canBond);
        assert.isTrue(rows[1].canBond);
    });

    suite.test('凍結中不可出戰與教官，Active 才可以', () => {
        const rows = buildMercenaryPoolRows(BUNDLE);
        assert.isFalse(rows[2].canDeploy);
        assert.isFalse(rows[2].canTeach);
        assert.isFalse(rows[0].canDeploy);
    });

    suite.test('沒有薪水紀錄的傭兵不開出戰與教官按鈕', () => {
        const rows = buildMercenaryPoolRows(BUNDLE);
        assert.isFalse(rows[0].canDeploy);
        assert.isFalse(rows[3].canTeach);
    });

    suite.test('已結義與已離隊的狀態文字與倒數文字', () => {
        const rows = buildMercenaryPoolRows(BUNDLE);
        assert.equals('已結義', rows[3].statusText);
        assert.equals('', rows[3].daysLeftText);
        assert.equals('已離隊', rows[4].statusText);
    });

    suite.test('輸入包不被修改', () => {
        const before = JSON.stringify(BUNDLE);
        buildMercenaryPoolRows(BUNDLE);
        assert.equals(before, JSON.stringify(BUNDLE));
    });

    return suite;
}
