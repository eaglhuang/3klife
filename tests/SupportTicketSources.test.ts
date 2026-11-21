/**
 * SupportTicketSources.test.ts — SUP-11（PROG-2-9245）連線券免費來源（doc_spec_1264 §16）
 *
 * 鎖住：結業 +10（S 評級 +15）、過學期評核（第 12、24 回合）各 +5、連續登入每滿 7 天 +1；
 * 張數全在 reward-config.json 的套件；入帳走 reward.claim（冪等，重送不重領）；其他評級／非整週不發。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import type { WalletAuthority } from '../assets/scripts/core/api/localserver/WalletCommands';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import {
    graduationTicketClaim, loginTicketClaim, SUPPORT_TICKET_BUNDLES, termTicketClaims,
} from '../assets/scripts/core/systems/SupportTicketSources';
import type { AcademyStateSnapshot } from '../assets/scripts/core/systems/nurture/AcademyTypes';
import { normalizeRewardConfig } from '../assets/scripts/shared/reward/RewardConfig';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_ONE = Date.UTC(2026, 10, 1, 4, 0, 0);
const rewardConfig = normalizeRewardConfig(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'resources', 'data', 'reward-config.json'), 'utf8')));

class FakeWallet implements WalletAuthority {
    public bag: Record<string, number> = {};
    public balance(c: string): number { return this.bag[c] ?? 0; }
    public spend(c: string, a: number): boolean { if (this.balance(c) < a) return false; this.bag[c] = this.balance(c) - a; return true; }
    public snapshot(): Record<string, number> { return { ...this.bag }; }
    public credit(c: string, a: number): void { this.bag[c] = this.balance(c) + a; }
}

const child = (): GeneralConfig => ({ id: 'child-a', name: '少主', str: 30, lea: 30, int: 30, pol: 30, cha: 30 }) as unknown as GeneralConfig;

function snapshot(total: number): AcademyStateSnapshot {
    const each = Math.floor(total / 5);
    return { graduated: true, childId: 'child-a', stats: { str: each, lea: each, int: each, pol: each, cha: each }, learnedTactics: [], learnedTraits: [] } as unknown as AcademyStateSnapshot;
}

async function rig(): Promise<{ session: GameSession; wallet: FakeWallet }> {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([child()]));
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setRandomSource(() => 0.4);
    await session.load();
    const wallet = new FakeWallet();
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()));
    bundle.setWallet(wallet);
    bundle.setItemAuthority(session.itemAuthority());
    bundle.setRewardAuthority(session.rewardAuthority());
    bundle.setRewardConfig(rewardConfig);
    session.setRewardApi(bundle.api);
    return { session, wallet };
}

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

export function createSupportTicketSourcesSuite(): TestSuite {
    const suite = new TestSuite('SupportTicketSources (連線券免費來源 SUP-11)');

    suite.test('套件張數照規格放在 JSON：結業 10、S 評級 15、學期 5、簽到 1，都入 mentorTickets', () => {
        const amounts: Record<string, number> = {};
        for (const b of rewardConfig.bundles) {
            const e = b.effects[0] as { kind: string; id: string; amount: number };
            if (b.id.startsWith('BUNDLE_SUPPORT_TICKET_')) { assert.equals('mentorTickets', e.id); amounts[b.id] = e.amount; }
        }
        assert.equals(10, amounts[SUPPORT_TICKET_BUNDLES.graduation]);
        assert.equals(15, amounts[SUPPORT_TICKET_BUNDLES.graduationS]);
        assert.equals(5, amounts[SUPPORT_TICKET_BUNDLES.academyTerm]);
        assert.equals(1, amounts[SUPPORT_TICKET_BUNDLES.loginWeek]);
    });

    suite.test('純函式：結業依評級挑套件；學期只算已過的評核回合；簽到只在整週', () => {
        assert.equals(SUPPORT_TICKET_BUNDLES.graduationS, graduationTicketClaim('c', 'S').bundleId);
        assert.equals(SUPPORT_TICKET_BUNDLES.graduation, graduationTicketClaim('c', 'A').bundleId);
        assert.equals(0, termTicketClaims('c', 12).length, '第 12 回合還沒過評核');
        assert.equals(1, termTicketClaims('c', 13).length);
        assert.equals(2, termTicketClaims('c', 30).length);
        assert.equals(null, loginTicketClaim(6, '2026-11-07'));
        assert.equals(null, loginTicketClaim(0, '2026-11-07'));
        assert.equals(SUPPORT_TICKET_BUNDLES.loginWeek, loginTicketClaim(14, '2026-11-14')!.bundleId);
    });

    suite.test('結業：S 評級 +15、其他評級 +10；同一學員重送不重領', async () => {
        const s = await rig();
        await s.session.graduateFromAcademy('child-a', snapshot(1000));
        assert.equals(15, s.wallet.balance('mentorTickets'));
        await s.session.graduateFromAcademy('child-a', snapshot(1000));
        assert.equals(15, s.wallet.balance('mentorTickets'), '冪等鍵含學員，不重領');
        const a = await rig();
        await a.session.graduateFromAcademy('child-a', snapshot(750));
        assert.equals(10, a.wallet.balance('mentorTickets'));
    });

    suite.test('學期任務：過第 12、24 回合各 +5，重複寫紀錄不重領', async () => {
        const { session, wallet } = await rig();
        const record = (turn: number): never => ({ committed: { childId: 'child-a', currentTurn: turn, graduated: false }, frozenGameTime: session.getAcademyRecord()?.frozenGameTime ?? ({} as never) }) as never;
        session.setAcademyRecord(record(5)); await settle();
        assert.equals(0, wallet.balance('mentorTickets'));
        session.setAcademyRecord(record(13)); await settle();
        assert.equals(5, wallet.balance('mentorTickets'));
        session.setAcademyRecord(record(14)); await settle();
        assert.equals(5, wallet.balance('mentorTickets'), '同一學期不重領');
        session.setAcademyRecord(record(25)); await settle();
        assert.equals(10, wallet.balance('mentorTickets'));
    });

    suite.test('簽到：連續登入第 7 天 +1、第 6 天沒有；斷一天重算', async () => {
        const { session, wallet } = await rig();
        for (let i = 0; i < 6; i++) { session.recordLoginAt(DAY_ONE + i * DAY_MS); await settle(); }
        assert.equals(0, wallet.balance('mentorTickets'));
        session.recordLoginAt(DAY_ONE + 6 * DAY_MS); await settle();
        assert.equals(1, wallet.balance('mentorTickets'));
        session.recordLoginAt(DAY_ONE + 6 * DAY_MS + 1000); await settle();
        assert.equals(1, wallet.balance('mentorTickets'), '同日重複登入不重領');
        session.recordLoginAt(DAY_ONE + 8 * DAY_MS); await settle();
        for (let i = 9; i < 14; i++) { session.recordLoginAt(DAY_ONE + i * DAY_MS); await settle(); }
        assert.equals(1, wallet.balance('mentorTickets'), '斷一天後連續天數歸 1，第 14 天不是整週');
    });

    return suite;
}
