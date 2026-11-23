/**
 * SupportCardMentorBridge.test.ts — 教官池抽到的學府支援卡要進教官卡清單與培育選卡（PROG-2-9871 回歸）
 *
 * 事故：新玩家開局十連教官池，卡以 item.grant 進物品庫存，但大廳支援卡清單、培育選卡只讀舊 legacy 教官卡存檔 → 兩處都是空的。
 * 鎖住：庫存 supportCard 列 → 教官卡視圖（uid、名稱、傳承星等）、非支援卡物品不混入、與舊存檔合併不重複、
 * 轉出的卡能被培育換算（mentorFromCard）與編入教官槽。
 *
 * Unity 對照：像背包資料換成 UI 列表 ViewModel 的轉換測試。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import type { ItemAuthority, StockTable } from '../assets/scripts/core/api/localserver/ItemCommands';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { isApiFail } from '../assets/scripts/shared/api/ApiProtocol';
import type { ItemListResult } from '../assets/scripts/shared/api/ApiCommands';
import { DEFAULT_ITEM_CONFIG, type HolderRef, type ItemConfigV1 } from '../assets/scripts/shared/item/ItemConfig';
import { emptyItemMeta, type ItemMeta } from '../assets/scripts/shared/item/ItemRules';
import { normalizeSupportCards, type SupportCardsConfigV1 } from '../assets/scripts/shared/support/SupportCardConfig';
import { DEFAULT_SUPPORT_RULES, withSupportItems } from '../assets/scripts/shared/support/SupportRules';
import { mergeMentorCards, supportRowsAsMentorCards, SUPPORT_MENTOR_UID_PREFIX } from '../assets/scripts/core/systems/SupportCardMentorBridge';
import { mentorFromCard } from '../assets/scripts/core/systems/NurtureSystem';
import { defaultMentorDeck } from '../assets/scripts/core/systems/MentorDeck';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';

const ROOT = path.join(__dirname, '..');

function loadCards(): SupportCardsConfigV1 {
    return normalizeSupportCards(JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/academy-support-cards.json'), 'utf8')) as unknown);
}

class MemoryAuthority implements ItemAuthority {
    public stock: Record<string, number> = {};
    public itemMeta: ItemMeta = emptyItemMeta();
    public read(holder: HolderRef, container: string): StockTable | null {
        return holder.kind === 'household' && container === 'main' ? { ...this.stock } : null;
    }
    public write(_holder: HolderRef, _container: string, next: StockTable): void { this.stock = { ...next }; }
    public meta(): ItemMeta { return this.itemMeta; }
    public setMeta(meta: ItemMeta): void { this.itemMeta = meta; }
}

async function listRows() {
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    const config: ItemConfigV1 = withSupportItems(DEFAULT_ITEM_CONFIG, loadCards(), DEFAULT_SUPPORT_RULES);
    bundle.setItemAuthority(new MemoryAuthority());
    bundle.setItemConfig(config);
    const grant = (itemId: string) => bundle.api.cmd('item.grant', { itemId, qty: 1, source: 'REWARD' });
    return {
        grant,
        breakthrough: (itemId: string) => bundle.api.cmd('item.breakthrough', { itemId }),
        rows: async () => {
            const res = await bundle.api.query<ItemListResult>('item.list', {});
            if (isApiFail(res)) throw new Error(res.message);
            return res.result.rows;
        },
    };
}

export function createSupportCardMentorBridgeSuite(): TestSuite {
    const suite = new TestSuite('SupportCardMentorBridge (教官池支援卡進教官卡清單與培育 PROG-2-9871)');

    suite.test('抽到（入庫）的支援卡出現在教官卡清單：名稱、uid、傳承星等都對', async () => {
        const cards = loadCards();
        const h = await listRows();
        await h.grant('ITEM_SUPCARD_SIMA_HUI');
        await h.grant('ITEM_SUPCARD_MA_RONG');
        await h.breakthrough('ITEM_SUPCARD_MA_RONG');
        await h.grant('ITEM_ADMISSION_TOKEN');
        const mentors = supportRowsAsMentorCards(cards, await h.rows());
        assert.equals(2, mentors.length, '入學令等非支援卡不混入');
        const sima = mentors.find((m) => m.uid === `${SUPPORT_MENTOR_UID_PREFIX}SUP_SIMA_HUI`);
        assert.equals('司馬徽', sima?.name);
        assert.equals(0, sima?.stars);
        assert.equals('Gacha', sima?.source);
        const ma = mentors.find((m) => m.uid === `${SUPPORT_MENTOR_UID_PREFIX}SUP_MA_RONG`);
        assert.equals(1, ma?.stars, '傳承次數當教官突破星等');
    });

    suite.test('庫存沒有支援卡時清單為空；與舊存檔合併不重複、舊卡在前', () => {
        assert.equals(0, supportRowsAsMentorCards(loadCards(), []).length);
        const [first] = supportRowsAsMentorCards(loadCards(), [{ itemId: 'ITEM_SUPCARD_SIMA_HUI', quantity: 1, kind: 'card', stackMax: 1, category: 'supportCard' }]);
        const legacy = { ...first, uid: 'mentor-old', name: '舊卡' } as MentorCard;
        const merged = mergeMentorCards([legacy, first], [first]);
        assert.equals(2, merged.length);
        assert.equals('mentor-old', merged[0].uid);
    });

    suite.test('轉出的教官卡能進培育：mentorFromCard 換算、預設編入教官槽', async () => {
        const h = await listRows();
        await h.grant('ITEM_SUPCARD_SIMA_HUI');
        const mentors = supportRowsAsMentorCards(loadCards(), await h.rows());
        const training = mentorFromCard(mentors[0]);
        assert.equals(mentors[0].uid, training.id);
        assert.isTrue(training.specialty === 'int', '智系主屬性擅長智');
        assert.isTrue((training.statBonus?.int ?? 0) > 0);
        const deck = defaultMentorDeck(mentors);
        assert.isTrue(deck.some((uid) => uid === mentors[0].uid), '培育選卡預設就帶入這張卡');
    });

    return suite;
}
