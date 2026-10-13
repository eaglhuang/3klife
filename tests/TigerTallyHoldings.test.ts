/**
 * TigerTallyHoldings — 虎符持有關係的 headless 測試（PROG-2-0233，WBS TRP-08）
 */
import { TestSuite, assert } from './TestRunner';
import {
    confiscateFrom, createTallyHoldings, equipTally, holderOf, onGeneralDeath, tallyOfGeneral, transferTally, unequipTally,
} from '../assets/scripts/core/systems/TigerTallyHoldings';

export function createTigerTallyHoldingsSuite(): TestSuite {
    const suite = new TestSuite('TigerTallyHoldings (虎符持有 TRP-08)');

    suite.test('起始全部由君主持有；裝上後持有者為該武將', () => {
        const s0 = createTallyHoldings(['t1', 't2']);
        assert.equals(null, holderOf(s0, 't1') ?? null);
        const r = equipTally(s0, 't1', 'liu');
        assert.isTrue(r.ok);
        assert.equals('liu', holderOf(r.state, 't1') ?? '');
        assert.equals(null, holderOf(s0, 't1') ?? null, '原狀態不被改寫');
    });

    suite.test('一符一將：已被持有的虎符不能再裝；未知虎符拒絕', () => {
        const s = equipTally(createTallyHoldings(['t1']), 't1', 'liu');
        assert.isTrue(s.ok);
        const again = equipTally(s.ok ? s.state : createTallyHoldings([]), 't1', 'guan');
        assert.isFalse(again.ok);
        assert.equals('ALREADY_HELD', again.ok ? '' : again.reason);
        const unknown = equipTally(createTallyHoldings([]), 'nope', 'liu');
        assert.equals('UNKNOWN_TALLY', unknown.ok ? '' : unknown.reason);
    });

    suite.test('一將一符：武將手上已有一張，不能再裝第二張', () => {
        const s = equipTally(createTallyHoldings(['t1', 't2']), 't1', 'liu');
        const second = equipTally(s.ok ? s.state : createTallyHoldings([]), 't2', 'liu');
        assert.isFalse(second.ok);
        assert.equals('GENERAL_HAS_TALLY', second.ok ? '' : second.reason);
    });

    suite.test('卸下退回君主；未持有的卸下拒絕', () => {
        const s = equipTally(createTallyHoldings(['t1']), 't1', 'liu');
        const off = unequipTally(s.ok ? s.state : createTallyHoldings([]), 't1');
        assert.isTrue(off.ok);
        assert.equals(null, holderOf(off.ok ? off.state : createTallyHoldings([]), 't1') ?? null);
        const again = unequipTally(off.ok ? off.state : createTallyHoldings([]), 't1');
        assert.equals('NOT_HELD', again.ok ? '' : again.reason);
    });

    suite.test('轉交：虎符換手，對方已有一張則拒絕', () => {
        const s = equipTally(createTallyHoldings(['t1', 't2']), 't1', 'liu');
        const base = s.ok ? s.state : createTallyHoldings([]);
        const moved = transferTally(base, 't1', 'guan');
        assert.isTrue(moved.ok);
        assert.equals('t1', tallyOfGeneral(moved.ok ? moved.state : base, 'guan') ?? '', '轉交後 guan 手上是 t1');
        assert.equals(null, tallyOfGeneral(moved.ok ? moved.state : base, 'liu'));

        const other = equipTally(base, 't2', 'guan');
        const blocked = transferTally(other.ok ? other.state : base, 't1', 'guan');
        assert.isFalse(blocked.ok);
    });

    suite.test('陣亡與沒收都讓虎符退回君主，只影響該武將的虎符', () => {
        let s = createTallyHoldings(['t1', 't2']);
        const a = equipTally(s, 't1', 'liu');
        s = a.ok ? a.state : s;
        const b = equipTally(s, 't2', 'guan');
        s = b.ok ? b.state : s;

        const dead = onGeneralDeath(s, 'liu');
        assert.equals('t1', dead.returned[0]);
        assert.equals(null, holderOf(dead.state, 't1') ?? null);
        assert.equals('guan', holderOf(dead.state, 't2') ?? '');

        const seized = confiscateFrom(s, 'guan');
        assert.equals('t2', seized.confiscated[0]);
        assert.equals(null, holderOf(seized.state, 't2') ?? null);
        assert.equals('liu', holderOf(seized.state, 't1') ?? '');
    });

    return suite;
}
