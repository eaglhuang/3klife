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
const NOW = Date.UTC(2026, 10, 9);
const DAY_MS = 24 * 60 * 60 * 1000;
const NORMAL_TASK = { difficulty: 'NORMAL', boardType: 'MILITARY', success: true } as const;

export function createOfficerCommerceSuite(): TestSuite {
    const suite = new TestSuite('OfficerCommerce');

    suite.test('月卡效期內才加成，倍率四捨五入', () => {
        assert.equals(100, boostedOfficerExp(100, false));
        assert.equals(115, boostedOfficerExp(100, true));
        assert.equals(21, boostedOfficerExp(18, true));
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

    suite.test('資料檔與內建值一致，且符合規格的 +15% 與 24 小時', () => {
        const commerce = readTable().commerce as { monthlyCardExpMultiplier: number; trialHours: number };
        assert.equals(1.15, commerce.monthlyCardExpMultiplier);
        assert.equals(24, commerce.trialHours);
        assert.equals(OFFICER_COMMERCE_CONFIG.monthlyCardExpMultiplier, commerce.monthlyCardExpMultiplier);
        assert.equals(OFFICER_COMMERCE_CONFIG.trialHours, commerce.trialHours);
    });

    suite.test('試用時數由資料檔設定，不合法整份拒絕', () => {
        const table = readTable();
        table.commerce = { trialHours: 0 };
        assert.equals(false, parseOfficerTierTable(table).ok);
        table.commerce = { trialHours: 48 };
        assert.equals(true, parseOfficerTierTable(table).ok);
    });

    suite.test('試用比正式階位高一階、為期 24 小時；最高階不發放', () => {
        const grant = grantOfficerTrial(null, 2, NOW);
        if (!grant.ok) throw new Error('應可發放');
        assert.equals(3, grant.trial.tier);
        assert.equals(NOW + DAY_MS, grant.trial.expiresAt);
        assert.equals('at-max-tier', (grantOfficerTrial(null, 5, NOW) as { reason: string }).reason);
    });

    suite.test('試用尚未結束不重複發放，到期後才可以', () => {
        const trial = { tier: 3, startedAt: NOW, expiresAt: NOW + DAY_MS };
        assert.equals('already-active', (grantOfficerTrial(trial, 2, NOW + 1) as { reason: string }).reason);
        assert.equals(true, grantOfficerTrial(trial, 2, NOW + DAY_MS).ok);
    });

    suite.test('有效階位只換階位，到期或時鐘回撥都失效，也不把正式階位往下拉', () => {
        const state = { ...initialOfficerState(), officerExp: 30 };
        const trial = { tier: 2, startedAt: NOW, expiresAt: NOW + DAY_MS };
        assert.equals(2, effectiveOfficerState(state, trial, NOW + DAY_MS - 1).currentTier);
        assert.equals(30, effectiveOfficerState(state, trial, NOW).officerExp);
        assert.equals(1, effectiveOfficerState(state, trial, NOW + DAY_MS).currentTier);
        assert.equals(null, activeOfficerTrial(trial, NOW + DAY_MS));
        assert.equals(null, activeOfficerTrial(trial, NOW - 1));
        assert.equals(5, effectiveOfficerState({ ...state, currentTier: 5 }, trial, NOW).currentTier);
    });

    suite.test('讀檔正規化：不合法視為沒有試用，舊的以季計格式也一樣', () => {
        assert.equals(null, normalizeOfficerTrial(undefined));
        assert.equals(null, normalizeOfficerTrial({ tier: 3, expiresSeason: 3 }));
        assert.equals(null, normalizeOfficerTrial({ tier: 9, startedAt: 1, expiresAt: 2 }));
        assert.equals(null, normalizeOfficerTrial({ tier: 3, startedAt: 2, expiresAt: 2 }));
        assert.equals(3, normalizeOfficerTrial({ tier: 3, startedAt: 1, expiresAt: 2 })!.tier);
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
        const internals = session as unknown as { _officerTrial: unknown; _officerState: { currentTier: number } };
        internals._officerState.currentTier = 2;
        assert.equals(true, session.grantOfficerTrial().ok);
        assert.equals(3, session.activeOfficerTrial!.tier);
        assert.equals('S1', session.officerUnlocks.sandtableStage ?? '');
        assert.equals(2, session.officerState.currentTier);

        session.gainOfficerExp({ ...NORMAL_TASK, success: false });
        assert.equals(0, session.sandtableUnlockHistory.length);

        const past = Date.now() - DAY_MS;
        internals._officerTrial = { tier: 3, startedAt: past - DAY_MS, expiresAt: past };
        assert.equals(null, session.activeOfficerTrial);
        assert.equals(null, session.officerUnlocks.sandtableStage);
        assert.equals(2, session.officerState.currentTier);
    });

    return suite;
}
