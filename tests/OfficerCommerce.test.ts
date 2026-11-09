/**
 * OfficerCommerce — 官職商業加速（OFC-12）的 headless 測試
 *
 * 鎖住：月卡倍率可由資料檔設定、試用到期後不改正式階位、試用不寫進沙盤解鎖歷史、存讀檔保留試用。
 */
import { assert, TestSuite } from './TestRunner';
import {
    activeOfficerTrial,
    boostedOfficerExp,
    effectiveOfficerState,
    grantOfficerTrial,
    normalizeOfficerTrial,
    OFFICER_COMMERCE_CONFIG,
} from '../assets/scripts/core/systems/OfficerCommerce';
import { parseOfficerTierTable, installOfficerTierTable } from '../assets/scripts/core/systems/OfficerTierTable';
import { initialOfficerState } from '../assets/scripts/core/systems/OfficerState';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import * as fs from 'fs';
import * as path from 'path';

const DATA_PATH = path.resolve(__dirname, '..', 'assets/resources/data/officer-tiers.json');
const readTable = (): Record<string, unknown> => JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const NORMAL_TASK = { difficulty: 'NORMAL', boardType: 'MILITARY', success: true } as const;

export function createOfficerCommerceSuite(): TestSuite {
    const suite = new TestSuite('OfficerCommerce');

    suite.test('月卡效期內才加成，倍率四捨五入', () => {
        assert.equals(100, boostedOfficerExp(100, false));
        assert.equals(120, boostedOfficerExp(100, true));
        assert.equals(22, boostedOfficerExp(18, true));
    });

    suite.test('倍率由資料檔設定，不合法的倍率整份拒絕', () => {
        const before = OFFICER_COMMERCE_CONFIG.monthlyCardExpMultiplier;
        try {
            const table = readTable();
            table.commerce = { monthlyCardExpMultiplier: 1.5 };
            assert.equals(true, installOfficerTierTable(table).ok);
            assert.equals(150, boostedOfficerExp(100, true));
            table.commerce = { monthlyCardExpMultiplier: 0.5 };
            assert.equals(false, parseOfficerTierTable(table).ok);
            assert.equals(false, installOfficerTierTable(table).ok);
            assert.equals(1.5, OFFICER_COMMERCE_CONFIG.monthlyCardExpMultiplier);
        } finally {
            OFFICER_COMMERCE_CONFIG.monthlyCardExpMultiplier = before;
        }
    });

    suite.test('資料檔的倍率與內建值一致', () => {
        const commerce = readTable().commerce as { monthlyCardExpMultiplier: number };
        assert.equals(OFFICER_COMMERCE_CONFIG.monthlyCardExpMultiplier, commerce.monthlyCardExpMultiplier);
    });

    suite.test('試用階位要高於正式階位，時數要合法', () => {
        assert.equals('not-higher', (grantOfficerTrial(null, 3, 3, 2, 0) as { reason: string }).reason);
        assert.equals('invalid', (grantOfficerTrial(null, 1, 6, 2, 0) as { reason: string }).reason);
        assert.equals('invalid', (grantOfficerTrial(null, 1, 3, 0, 0) as { reason: string }).reason);
        assert.equals(true, grantOfficerTrial(null, 1, 3, 2, 10).ok);
    });

    suite.test('較低階試用不蓋掉進行中的較高階試用，到期後才可以', () => {
        const high = { tier: 5, expiresSeason: 12 };
        assert.equals('weaker', (grantOfficerTrial(high, 1, 3, 2, 10) as { reason: string }).reason);
        assert.equals(true, grantOfficerTrial(high, 1, 3, 2, 12).ok);
    });

    suite.test('有效階位只換階位，到期失效，也不把正式階位往下拉', () => {
        const state = { ...initialOfficerState(), officerExp: 30 };
        const trial = { tier: 4, expiresSeason: 12 };
        assert.equals(4, effectiveOfficerState(state, trial, 11).currentTier);
        assert.equals(30, effectiveOfficerState(state, trial, 11).officerExp);
        assert.equals(1, effectiveOfficerState(state, trial, 12).currentTier);
        assert.equals(null, activeOfficerTrial(trial, 12));
        assert.equals(5, effectiveOfficerState({ ...state, currentTier: 5 }, trial, 11).currentTier);
    });

    suite.test('讀檔正規化：不合法視為沒有試用', () => {
        assert.equals(null, normalizeOfficerTrial(undefined));
        assert.equals(null, normalizeOfficerTrial({ tier: 9, expiresSeason: 3 }));
        assert.equals(null, normalizeOfficerTrial({ tier: 3, expiresSeason: -1 }));
        assert.equals(3, normalizeOfficerTrial({ tier: 3, expiresSeason: 3 })!.tier);
    });

    suite.test('GameSession：月卡效期內官職經驗有加成', () => {
        const session = new GameSession();
        const now = Date.UTC(2026, 10, 9);
        session.gainOfficerExp(NORMAL_TASK, now);
        const plain = session.officerState.officerExp;
        session.activateMonthlyCard(now);
        session.gainOfficerExp(NORMAL_TASK, now);
        assert.equals(plain + boostedOfficerExp(plain, true), session.officerState.officerExp);
    });

    suite.test('GameSession：試用中權限升階，正式階位與沙盤解鎖歷史不變，到期就回復', () => {
        const session = new GameSession();
        assert.equals(true, session.grantOfficerTrial(3, 1).ok);
        assert.equals(3, session.activeOfficerTrial!.tier);
        assert.equals('S1', session.officerUnlocks.sandtableStage ?? '');
        assert.equals(1, session.officerState.currentTier);

        session.gainOfficerExp({ ...NORMAL_TASK, success: false });
        assert.equals(0, session.sandtableUnlockHistory.length);

        (session as unknown as { _officerTrial: unknown })._officerTrial = { tier: 3, expiresSeason: 0 };
        assert.equals(null, session.activeOfficerTrial);
        assert.equals(null, session.officerUnlocks.sandtableStage);
        assert.equals(1, session.officerState.currentTier);
    });

    return suite;
}
