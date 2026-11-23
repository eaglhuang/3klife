// @spec-source → 戰場部署系統.md (doc_spec_0040) §出征前編制槽；PROG-2-9911 戰前編成視窗（一鍵推薦、卡組槽、i18n、版面節點）
import { TestSuite, assert } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { buildTallyCardCatalog } from '../assets/scripts/core/config/TallyCardCatalog';
import { parsePreBattleWeights, type PreBattleWeights } from '../assets/scripts/core/systems/PreBattleRecommend';
import { SortieSetupController, type SortieDeckCardInfo, type SortiePrebattleDeps } from '../assets/scripts/ui/core/SortieSetupController';
import { zhTwLookup } from './SortieZhTwLookup';

const ROOT = path.resolve(__dirname, '..');

function readJson<T>(rel: string): T {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
}

function collectIds(node: unknown, out: Set<string>): Set<string> {
    if (Array.isArray(node)) { node.forEach((c) => collectIds(c, out)); return out; }
    if (node && typeof node === 'object') {
        const id = (node as { id?: unknown }).id;
        if (typeof id === 'string') out.add(id);
        for (const v of Object.values(node as Record<string, unknown>)) collectIds(v, out);
    }
    return out;
}

function officer(id: string, name: string, extra: Partial<GeneralConfig> = {}): GeneralConfig {
    return { id, name, faction: 'player', age: 25, hp: 1000, str: 60, int: 60, lea: 60, pol: 60, cha: 60, luk: 50, ...extra } as GeneralConfig;
}

function cardInfos(): SortieDeckCardInfo[] {
    return Array.from(buildTallyCardCatalog().entries()).map(([cardId, card]) => ({
        cardId,
        name: card.unitName,
        unitType: card.unitType,
        rarity: card.rarity,
    }));
}

function weights(): PreBattleWeights {
    return parsePreBattleWeights(readJson<unknown>('assets/resources/data/prebattle-recommend-weights.json'));
}

async function sessionWith(roster: GeneralConfig[], leadId: string | null): Promise<GameSession> {
    const session = new GameSession(11);
    session.setRosterStore(new InMemoryRosterStore(roster));
    if (leadId) assert.isTrue(await session.setLeadGeneral(leadId));
    return session;
}

function roster(): GeneralConfig[] {
    return [
        officer('cao-cao', '曹操', { lea: 95, str: 90 }),
        officer('xun-yu', '荀彧', { int: 95, pol: 90 }),
        officer('cao-ren', '曹仁', { lea: 85, pol: 50 }),
        officer('guo-jia', '郭嘉', { int: 90, pol: 70 }),
    ];
}

export function createSortieLoadoutWindowSuite(): TestSuite {
    const suite = new TestSuite('SortieLoadoutWindow (戰前編成視窗 PROG-2-9911)');

    suite.test('一鍵推薦：寫入主將、參謀官、後勤官與卡組，理由文案走 i18n，通知列出已推薦', async () => {
        const session = await sessionWith(roster(), null);
        const prebattle: SortiePrebattleDeps = { weights: weights(), encounters: () => [], currentEncounterId: () => null, cards: cardInfos };
        const ctrl = new SortieSetupController({ session, lookup: zhTwLookup(), prebattle });
        assert.isTrue(await ctrl.recommend());
        assert.isTrue(session.leadGeneralId !== null, '推薦後有主將');
        assert.isTrue(session.sortieSupport.strategistUid !== null, '推薦後有參謀官');
        assert.isTrue(session.sortieSupport.strategistUid !== session.leadGeneralId, '參謀官不是主將');
        assert.equals(4, session.deck.length, '卡組補滿 4 張');
        const view = ctrl.getView();
        assert.isTrue(view.texts.recommendReasonLabel.includes('主將：'), view.texts.recommendReasonLabel);
        assert.isTrue(view.texts.recommendReasonLabel.includes('參謀官：'), view.texts.recommendReasonLabel);
        assert.isTrue(view.texts.recommendReasonLabel.includes('出戰卡組：'), view.texts.recommendReasonLabel);
        assert.isTrue(view.texts.sortieNotice.startsWith('已依推薦編制'), view.texts.sortieNotice);
        assert.isFalse(view.texts.deckSlotLabel0.endsWith('（預設）'), '卡組槽改顯示手動推薦的卡');
    });

    suite.test('一鍵推薦：關卡有指定主將時主將固定為該武將（沿用 recommendForEncounter）', async () => {
        const session = await sessionWith(roster(), null);
        const prebattle: SortiePrebattleDeps = {
            weights: weights(),
            encounters: () => [{ id: 'enc-x', playerGeneralId: 'cao-ren' }],
            currentEncounterId: () => 'enc-x',
            cards: cardInfos,
        };
        const ctrl = new SortieSetupController({ session, lookup: zhTwLookup(), prebattle });
        assert.isTrue(await ctrl.recommend());
        assert.equals('cao-ren', session.leadGeneralId);
    });

    suite.test('沒有可出戰主將時推薦不改動任何東西，通知說明原因', async () => {
        const session = await sessionWith([], null);
        const prebattle: SortiePrebattleDeps = { weights: weights(), encounters: () => [], currentEncounterId: () => null, cards: cardInfos };
        const ctrl = new SortieSetupController({ session, lookup: zhTwLookup(), prebattle });
        assert.isFalse(await ctrl.recommend());
        assert.equals(null, session.leadGeneralId);
        assert.equals(0, session.deck.length);
        assert.isTrue(ctrl.getView().texts.sortieNotice.includes('沒有可出戰的主將'), ctrl.getView().texts.sortieNotice);
    });

    suite.test('權重未載入：推薦鈕停用，推薦回報無資料', async () => {
        const session = await sessionWith(roster(), 'cao-cao');
        const ctrl = new SortieSetupController({
            session,
            lookup: zhTwLookup(),
            prebattle: { weights: null, encounters: () => [], currentEncounterId: () => null, cards: cardInfos },
        });
        assert.isFalse(ctrl.getView().enabled.btnRecommend);
        assert.isFalse(await ctrl.recommend());
        assert.equals('目前沒有推薦資料', ctrl.getView().texts.sortieNotice);
        const none = new SortieSetupController({ session, lookup: zhTwLookup() }).getView();
        assert.isFalse(none.enabled.btnRecommend);
    });

    suite.test('卡組槽：沒有手動卡組時顯示預設並標註；手動卡組依序顯示；不足 4 張的槽位顯示空位', async () => {
        const session = await sessionWith(roster(), 'cao-cao');
        const cards = cardInfos();
        const ctrl = new SortieSetupController({ session, lookup: zhTwLookup(), prebattle: { weights: weights(), encounters: () => [], currentEncounterId: () => null, cards: () => cards } });
        const defaults = ctrl.getView().texts;
        assert.isTrue(defaults.deckSlotLabel0.endsWith('（預設）'), defaults.deckSlotLabel0);
        assert.equals('出戰卡組（手動 0/4）', defaults.deckTitleLabel);

        await session.setDeck([cards[1].cardId], cards.map((c) => c.cardId));
        const manual = ctrl.getView().texts;
        assert.equals(cards[1].name, manual.deckSlotLabel0);
        assert.equals('空位', manual.deckSlotLabel1);
        assert.equals('出戰卡組（手動 1/4）', manual.deckTitleLabel);
    });

    suite.test('手動改動編制後清掉舊推薦理由與通知', async () => {
        const session = await sessionWith(roster(), null);
        const prebattle: SortiePrebattleDeps = { weights: weights(), encounters: () => [], currentEncounterId: () => null, cards: cardInfos };
        const ctrl = new SortieSetupController({ session, lookup: zhTwLookup(), prebattle });
        assert.isTrue(await ctrl.recommend());
        assert.isTrue(ctrl.getView().texts.recommendReasonLabel.includes('出戰卡組：'));
        ctrl.clearRecommendation();
        const view = ctrl.getView().texts;
        assert.isFalse(view.recommendReasonLabel.includes('出戰卡組：'), view.recommendReasonLabel);
        assert.equals('', view.sortieNotice);
    });

    suite.test('版面：編成視窗的新節點都在 sortie-setup-main，且 sortie-setup-screen 仍指向該版面', () => {
        const layout = readJson<{ root: unknown }>('assets/resources/ui-spec/layouts/sortie-setup-main.json');
        const ids = collectIds(layout.root, new Set<string>());
        for (const id of ['btnPickLead', 'btnPickDeck', 'deckSlotLabel0', 'deckSlotLabel3', 'btnRecommend', 'recommendReasonLabel', 'btnConfirmSortie', 'confirmSortieLabel']) {
            assert.isTrue(ids.has(id), `缺少節點 ${id}`);
        }
        const screen = readJson<{ layout: string }>('assets/resources/ui-spec/screens/sortie-setup-screen.json');
        assert.equals('sortie-setup-main', screen.layout);
    });

    suite.test('i18n：控制器用到的 sortie.* 與 prebattle.issue.* key 在四語系都有，且不留中文寫死文案', () => {
        const src = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/core/SortieSetupController.ts'), 'utf8');
        const keys = new Set<string>();
        for (const m of src.matchAll(/'(sortie\.[A-Za-z.]+)'/g)) keys.add(m[1]);
        keys.add('prebattle.issue.NO_COMMANDER');
        keys.add('prebattle.issue.NO_STRATEGIST');
        keys.add('prebattle.issue.NO_DEPUTY');
        keys.add('prebattle.issue.TALLY_SHORTAGE');
        keys.add('prebattle.issue.UNKNOWN_ENCOUNTER');
        keys.add('prebattle.issue.ENCOUNTER_LEAD_UNAVAILABLE');
        for (const k of ['MISSING_COMMANDER', 'ROLE_LOCK', 'SAME_BLOODLINE', 'UNKNOWN_GENERAL']) keys.add(`sortie.issue.${k}`);
        for (const lang of ['zh-TW', 'en', 'ja', 'zh-CN']) {
            const dict = readJson<Record<string, string>>(`assets/resources/i18n/${lang}.json`);
            for (const k of keys) assert.isTrue(typeof dict[k] === 'string' && dict[k].length > 0, `${lang} 缺 ${k}`);
        }
        assert.isFalse(/'(出征|主將|後勤官|參謀官|不派|上一位|下一位)/.test(src), '文案不應寫死在控制器');
    });

    return suite;
}
