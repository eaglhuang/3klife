/**
 * PrisonerGiftFlow.test.ts — 女俘虜送禮（PROG-2-1789）
 *
 * 鎖住：好感換成功率、黃金與上限、男俘虜不能送、勸降失敗不能送、入名冊帶好感、存檔。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { PrisonerPopupController } from '../assets/scripts/ui/core/PrisonerPopupController';
import { PRISONER_GIFT_GOLD, persuadeRateAfterGift, resolvePrisonerGift } from '../assets/scripts/core/systems/PrisonerGift';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function captive(id: string, gender: string): GeneralConfig {
    return { id, name: `${id}名`, gender, cha: 60, luk: 30, int: 70, pol: 50 } as unknown as GeneralConfig;
}

async function build(adapter = new MemoryStorageAdapter(), random: () => number = () => 0.99): Promise<GameSession> {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(random);
    session.startNewGame(20261105);
    session.setRandomSource(random);
    return session;
}

const rateOf = (session: GameSession, uid: string): number => session.prison.pending.find((p) => p.record.targetUid === uid)!.record.options.persuadeRate;

export function createPrisonerGiftFlowSuite(): TestSuite {
    const suite = new TestSuite('PrisonerGiftFlow (女俘虜送禮 PROG-2-1789)');

    suite.test('純邏輯：好感 +10 成功率 +3，封頂 100；金額不足與好感滿都拒絕', () => {
        assert.equals(33, persuadeRateAfterGift(30, 0, 10));
        assert.equals(100, persuadeRateAfterGift(99, 0, 10));
        assert.equals('GOLD_SHORT', (resolvePrisonerGift(30, 0, PRISONER_GIFT_GOLD - 1) as { reason: string }).reason);
        assert.equals('AFFECTION_FULL', (resolvePrisonerGift(30, 100, 9999) as { reason: string }).reason);
        assert.equals(5, (resolvePrisonerGift(30, 95, 9999) as { affectionGained: number }).affectionGained);
    });

    suite.test('送禮：好感與成功率都寫回，連送三次不重複算', async () => {
        const session = await build();
        await session.capturePrisoner(captive('f', '女'));
        const base = rateOf(session, 'f');
        await session.giftPrisoner('f', 9999);
        await session.giftPrisoner('f', 9999);
        await session.giftPrisoner('f', 9999);
        assert.equals(30, session.femaleSystemState.giftAffection.f);
        assert.equals(Math.min(100, base + 9), rateOf(session, 'f'));
    });

    suite.test('不能送：男俘虜、不存在、勸降已失敗', async () => {
        const session = await build();
        await session.capturePrisoner(captive('m', '男'));
        await session.capturePrisoner(captive('f', '女'));
        assert.equals(null, await session.giftPrisoner('m', 9999));
        assert.equals(null, await session.giftPrisoner('none', 9999));
        await session.resolvePrisoner('f', 'persuade');
        assert.equals(null, await session.giftPrisoner('f', 9999));
    });

    suite.test('入名冊：Gift_Affinity 帶著好感', async () => {
        const session = await build(new MemoryStorageAdapter(), () => 0);
        await session.capturePrisoner(captive('f', '女'));
        await session.giftPrisoner('f', 9999);
        const resolution = await session.resolvePrisoner('f', 'persuade');
        assert.isTrue(resolution!.joined);
        assert.equals(10, session.femaleSources.f.Gift_Affinity);
    });

    suite.test('存檔：讀檔後好感與成功率都還在', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await build(adapter);
        await session.capturePrisoner(captive('f', '女'));
        const base = rateOf(session, 'f');
        await session.giftPrisoner('f', 9999);
        await session.save();
        const loaded = new GameSession();
        loaded.setRosterStore(new InMemoryRosterStore([]));
        loaded.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await loaded.load());
        assert.equals(10, loaded.femaleSystemState.giftAffection.f);
        assert.equals(Math.min(100, base + 3), rateOf(loaded, 'f'));
    });

    suite.test('彈窗：女俘虜有按鈕，送禮扣金並更新標籤與文案；男俘虜沒有按鈕', async () => {
        const session = await build();
        await session.capturePrisoner(captive('f', '女'));
        await session.capturePrisoner(captive('m', '男'));
        let gold = PRISONER_GIFT_GOLD;
        const popup = new PrisonerPopupController({ session, wallet: { gold: () => gold, spendGold: (n) => { gold -= n; return true; } } });
        const first = popup.getView();
        assert.isTrue(first.actives.btnGift);
        assert.isTrue(first.enabled.btnGift);
        await popup.gift();
        assert.equals(0, gold);
        const after = popup.getView();
        assert.equals('f名 收下了你的珍寶，態度似乎軟化了幾分。f名 好感度 +10', after.texts.powNotice);
        assert.isTrue(after.texts.persuadeLabel.includes(`${rateOf(session, 'f')}%`));
        assert.isFalse(after.enabled.btnGift);
        await popup.gift();
        assert.equals('黃金不足', popup.getView().texts.powNotice);
        popup.cycle(1);
        assert.isFalse(popup.getView().actives.btnGift);
    });

    return suite;
}
