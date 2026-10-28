/**
 * GachaLimitedLoyaltyFlowE2E.test.ts — 限定池抽卡→入冊轉蛋旗標→沒收虎符→存讀檔（QA，PROG-2-1484）
 *
 * 存檔端接線與 LobbyScene 相同（pity／wallet 存 session、抽卡結果以 fromGacha 入冊、整批 batch）：
 * - 限定池時間窗外拒絕：不扣款、不動保底、不入冊。
 * - 窗內抽到的武將入冊帶轉蛋旗標（忠誠鎖 100）；沒收虎符後忠誠仍 100、虎符退回君主。
 * - 一般來源（非轉蛋）武將被沒收虎符：忠誠固定降 30。
 * - 存讀檔後錢包、保底、名冊、忠誠旗標與虎符持有一致。
 *
 * Unity 對照：像把「抽卡 → 背包 → 裝備回收 → 存檔」整段串起來，檢查每個環節的資料有沒有互相覆蓋。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { LocalGachaService, type GachaSaveStore } from '../assets/scripts/core/services/LocalGachaService';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { TigerTallyCard } from '../assets/scripts/core/models/TigerTallyCard';
import { TALLY_CONFISCATE_LOYALTY_DROP } from '../assets/scripts/core/systems/TigerTallyLoyalty';
import type { LimitedPoolWindow } from '../assets/scripts/core/systems/LimitedPoolSchedule';
import { sys } from 'cc';

const WINDOW: LimitedPoolWindow = { poolId: 'LIMITED_01', startMs: 1000, endMs: 2000, featuredGeneralIds: ['g0'] };

function build(adapter: MemoryStorageAdapter, roster: GeneralConfig[] = []): GameSession {
    const s = new GameSession(7);
    s.setRosterStore(new InMemoryRosterStore(roster));
    s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(new PlayerSaveService(adapter));
    s.setAutoSave(false);
    return s;
}

function makeGenerals(): GeneralConfig[] {
    const out: GeneralConfig[] = [];
    for (let i = 0; i < 20; i++) {
        out.push({ id: `g${i}`, name: `n${i}`, faction: 'player', gender: '男', age: 30, rarityTier: i < 2 ? 'legendary' : 'common' } as unknown as GeneralConfig);
    }
    return out;
}

/** 與 LobbyScene 相同的存檔端接線（不含教官卡與 UI 存檔節流） */
function storeOf(session: GameSession): GachaSaveStore {
    return {
        readPity: () => session.gachaPityBook,
        writePity: (book) => session.setGachaPityBook(book),
        readWallet: () => session.gachaWalletSave,
        writeWallet: (wallet) => session.setGachaWalletSave(wallet),
        revision: () => session.gachaRevision,
        enroll: (results) => { session.enrollGenerals(results.map((entry) => entry.general), { rebirthOnDuplicate: true, fromGacha: true }); },
        batch: (fn) => fn(),
    };
}

function card(uid: string): TigerTallyCard {
    return { uid, templateId: 'tiger-tally-bai-ma', sourceGeneralUid: 'src', quality: 'SR', score: 0, source: 'reward', producedSeason: 1 };
}

async function rejects(promise: Promise<unknown>): Promise<boolean> {
    try {
        await promise;
        return false;
    } catch {
        return true;
    }
}

export function createGachaLimitedLoyaltyFlowE2ESuite(): TestSuite {
    const suite = new TestSuite('GachaLimitedLoyaltyFlowE2E (限定池抽卡×轉蛋旗標×沒收虎符 PROG-2-1484)');

    suite.test('時間窗外拒絕不扣款→窗內抽卡入冊帶旗標→沒收虎符→存讀檔一致', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const session = build(adapter, [{ id: 'native', name: 'native', faction: 'player', gender: '男', age: 30 } as unknown as GeneralConfig]);
        session.startNewGame(5);
        const svc = new LocalGachaService(storeOf(session), () => 0.5);
        svc.setLimitedPoolWindows([WINDOW]);
        const tickets = svc.grantCurrency('tickets', 10);
        const rosterBefore = session.roster.length;
        const pityBefore = JSON.stringify(session.gachaPityBook);

        // 1. 窗外：拒絕，且不扣款、不動保底、不入冊
        assert.isTrue(await rejects(svc.performPoolTicketSummon('LIMITED_01', 1, makeGenerals(), { nowMs: 500 })), '窗前拒絕');
        assert.isTrue(await rejects(svc.performPoolTicketSummon('LIMITED_01', 1, makeGenerals(), { nowMs: 2000 })), '窗後拒絕');
        assert.equals(tickets, svc.getCurrencyAmount('tickets'), '被拒不扣款');
        assert.equals(pityBefore, JSON.stringify(session.gachaPityBook), '被拒不動保底');
        assert.equals(rosterBefore, session.roster.length, '被拒不入冊');

        // 2. 窗內：抽 1 次，入冊且帶轉蛋旗標
        const results = await svc.performPoolTicketSummon('LIMITED_01', 1, makeGenerals(), { nowMs: 1500 });
        assert.equals(1, results.length);
        const drawnId = results[0].general.id;
        assert.equals(tickets - 1, svc.getCurrencyAmount('tickets'), '抽一次扣一張');
        assert.equals(rosterBefore + 1, session.roster.length, '抽到的武將入冊');
        assert.isTrue(session.tallyLoyalty[drawnId]?.isGachaHero === true, '轉蛋旗標');
        assert.equals(100, session.tallyLoyalty[drawnId].loyalty);
        assert.isTrue('LIMITED_01' in session.gachaPityBook, '限定池有自己的保底計數');

        // 3. 沒收虎符：轉蛋武將忠誠仍 100，一般來源武將降 30
        await session.registerTallyCards([card('t-gacha'), card('t-native')]);
        assert.isTrue((await session.equipTally('t-gacha', drawnId))?.ok === true);
        assert.isTrue((await session.equipTally('t-native', 'native'))?.ok === true);
        const gachaResult = await session.confiscateTally(drawnId);
        assert.equals(100, gachaResult?.loyalty, '轉蛋武將沒收後忠誠仍鎖 100');
        const nativeBefore = session.tallyLoyalty['native']?.loyalty ?? 50;
        const nativeResult = await session.confiscateTally('native');
        assert.equals(nativeBefore - TALLY_CONFISCATE_LOYALTY_DROP, nativeResult?.loyalty, '一般來源固定降 30');
        assert.equals(null, session.tallyOf(drawnId));
        assert.equals(null, session.tallyOf('native'));

        // 4. 存讀檔：錢包、保底、名冊、旗標、虎符持有都一致
        await session.save();
        const restored = build(adapter);
        assert.isTrue(await restored.load(), '讀檔成功');
        assert.equals(rosterBefore + 1, restored.roster.length);
        assert.isTrue(restored.tallyLoyalty[drawnId]?.isGachaHero === true, '讀檔後轉蛋旗標仍在');
        assert.equals(100, restored.tallyLoyalty[drawnId].loyalty);
        assert.equals(nativeResult?.loyalty, restored.tallyLoyalty['native'].loyalty, '一般來源忠誠延續');
        assert.equals(JSON.stringify(session.gachaPityBook), JSON.stringify(restored.gachaPityBook), '保底延續');
        assert.equals(tickets - 1, restored.gachaWalletSave?.tickets ?? -1, '錢包延續');
        assert.equals(null, restored.tallyOf(drawnId));
        assert.equals(2, Object.keys(restored.tallyCards).length, '兩張虎符都退回君主');
    });

    return suite;
}
