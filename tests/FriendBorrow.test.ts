/**
 * FriendBorrow.test.ts — 好友借用教官（MENT-14，PROG-2-0560）headless 測試
 *
 * Unity 對照：像 EditMode 測試，逐條驗 Validator 的檢查順序與邊界（每日上限、同卡上限、鎖定）。
 */
import { TestSuite, assert } from './TestRunner';
import {
    BORROW_OWNER_BOND_REWARD,
    canBorrow,
    createBorrow,
    effectiveBorrowedStar,
    releaseBorrowsForSession,
    type BorrowLedger,
    type BorrowRequest,
} from '../assets/scripts/core/systems/FriendBorrow';

const EMPTY: BorrowLedger = { records: [] };
const SSR = { supportTemplateId: 'SUP_ZHAO_SSR_01', isSSR: true, star: 3 };

function request(overrides: Partial<BorrowRequest> = {}): BorrowRequest {
    return {
        day: '2026-10-15',
        borrowerId: 'P_001',
        ownerId: 'P_002',
        candidate: SSR,
        sessionId: 'TRN_A',
        recordId: 'BRW_1',
        ...overrides,
    };
}

export function createFriendBorrowSuite(): TestSuite {
    const suite = new TestSuite('FriendBorrow (好友借用教官 MENT-14 PROG-2-0560)');

    suite.test('可借：好友的 SSR 教官、今天還沒借過', () => {
        assert.isTrue(canBorrow(EMPTY, request()).ok);
    });

    suite.test('每日上限：今天借過 1 張後，再借任何好友卡都被 DAILY_LIMIT 擋下', () => {
        const first = createBorrow(EMPTY, request())!;
        const second = canBorrow(first.ledger, request({ ownerId: 'P_003', candidate: { ...SSR, supportTemplateId: 'SUP_GUAN_SSR_01' }, recordId: 'BRW_2' }));
        assert.equals('DAILY_LIMIT', (second as { blocked: string }).blocked);
    });

    suite.test('隔天可以再借（每日上限只算同一天）', () => {
        const first = createBorrow(EMPTY, request())!;
        const ended = releaseBorrowsForSession(first.ledger, 'TRN_A');
        assert.isTrue(canBorrow(ended, request({ day: '2026-10-16', recordId: 'BRW_2' })).ok);
    });

    suite.test('同好友同卡同一天：每日上限 1 時由 DAILY_LIMIT 先擋（同卡檢查為第二道防線）', () => {
        // 同一借用人同一天只要有一筆紀錄就已達每日上限，所以同卡當日那一筆一定先被 DAILY_LIMIT 擋下。
        const ledger: BorrowLedger = { records: [{ id: 'x', day: '2026-10-15', borrowerId: 'P_001', ownerId: 'P_002', supportTemplateId: 'SUP_ZHAO_SSR_01', snapshotStar: 3, sessionId: 'old', active: false }] };
        assert.equals('DAILY_LIMIT', (canBorrow(ledger, request()) as { blocked: string }).blocked);
    });

    suite.test('非 SSR 不可借', () => {
        assert.equals('NOT_SSR', (canBorrow(EMPTY, request({ candidate: { ...SSR, isSSR: false } })) as { blocked: string }).blocked);
    });

    suite.test('不可借自己的卡', () => {
        assert.equals('SELF_BORROW', (canBorrow(EMPTY, request({ ownerId: 'P_001' })) as { blocked: string }).blocked);
    });

    suite.test('被借出的卡在借用中鎖定：另一位玩家借同一張 → CARD_LOCKED', () => {
        const first = createBorrow(EMPTY, request())!;
        const other = canBorrow(first.ledger, request({ borrowerId: 'P_009', recordId: 'BRW_3' }));
        assert.equals('CARD_LOCKED', (other as { blocked: string }).blocked);
    });

    suite.test('培育會話結束後解除鎖定，借用紀錄保留（當日上限仍計入）', () => {
        const first = createBorrow(EMPTY, request())!;
        const released = releaseBorrowsForSession(first.ledger, 'TRN_A');
        assert.isFalse(released.records[0].active);
        assert.equals(1, released.records.length);
        assert.equals('DAILY_LIMIT', (canBorrow(released, request({ borrowerId: 'P_001', ownerId: 'P_009', recordId: 'BRW_4' })) as { blocked: string }).blocked);
    });

    suite.test('借用成功回傳原主結義點數 ×1，且不改動傳入的 ledger', () => {
        const outcome = createBorrow(EMPTY, request())!;
        assert.equals(BORROW_OWNER_BOND_REWARD, outcome.ownerBondReward);
        assert.equals(1, BORROW_OWNER_BOND_REWARD);
        assert.equals(0, EMPTY.records.length);
    });

    suite.test('當下星等快照：借入後生效星等固定，不隨原主卡變動', () => {
        const outcome = createBorrow(EMPTY, request({ candidate: { ...SSR, star: 2 } }))!;
        assert.equals(2, effectiveBorrowedStar(outcome.record));
    });

    suite.test('借用失敗時 createBorrow 回傳 null', () => {
        assert.equals(null, createBorrow(EMPTY, request({ ownerId: 'P_001' })));
    });

    return suite;
}
