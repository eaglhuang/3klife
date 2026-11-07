/**
 * SpiritTallyChain — 英靈卡詳情串上同一名將的虎符與軍隊欄（SPV-04；PROG-2-2080）
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { SpiritCard } from '../assets/scripts/core/models/SpiritCard';
import type { TigerTallyCard } from '../assets/scripts/core/models/TigerTallyCard';
import type { TallyCardData } from '../assets/scripts/shared/TallyCardContract';
import { linkedTallyOf, spiritTallyChainView, tallyCardDataOf, SPIRIT_TALLY_CHAIN_TEXTS } from '../assets/scripts/ui/core/SpiritTallyChain';

const spirit = { uid: 'zhao-yun', name: '趙雲', isSpiritRelic: true, deathYear: 229, linkedTallyLevel: 2 } as unknown as SpiritCard;
const tally = (uid: string, over: Partial<TigerTallyCard> = {}): TigerTallyCard => ({
    uid, templateId: 't', sourceGeneralUid: 'zhao-yun', quality: 'SSR', score: 0, source: 'death', producedSeason: 1, troopType: 'cavalry', stars: 1, ...over,
});
const catalog = [
    { unitType: 'infantry', unitName: '步兵', unitSub: '', atk: 1, def: 1, hp: 1, spd: 1, cost: 1, rarity: 'normal', traits: [], abilities: [], desc: '' },
    { unitType: 'cavalry', unitName: '白馬義從', unitSub: '騎兵', atk: 30, def: 20, hp: 300, spd: 9, cost: 4, rarity: 'epic', traits: [], abilities: [], desc: '' },
] as unknown as TallyCardData[];

export function createSpiritTallyChainSuite(): TestSuite {
    const suite = new TestSuite('SpiritTallyChain (英靈→虎符→軍隊 SPV-04 PROG-2-2080)');

    suite.test('同一名將多張虎符取星級最高，他人虎符不算', () => {
        const picked = linkedTallyOf('zhao-yun', [tally('a', { stars: 2 }), tally('b', { stars: 4 }), tally('c', { stars: 5, sourceGeneralUid: 'ma-chao' })]);
        assert.equals('b', picked?.uid);
        assert.equals(null, linkedTallyOf('guan-yu', [tally('a')]));
    });

    suite.test('虎符實例依兵種取目錄卡，帶品質與星級', () => {
        const data = tallyCardDataOf(tally('a', { stars: 3 }), catalog);
        assert.equals('白馬義從', data?.unitName);
        assert.equals('SSR', data?.rarityLabel);
        assert.equals('★★★', data?.stars);
        assert.equals(null, tallyCardDataOf(tally('x', { troopType: 'navy' }), catalog));
    });

    suite.test('詳情三欄：英靈欄保留，虎符與軍隊欄填同一名將的虎符', () => {
        const view = spiritTallyChainView(spirit, [tally('a')], catalog);
        assert.equals('趙雲', view.texts.HeroName);
        assert.equals('白馬義從', view.texts.UnitName);
        assert.equals('30', view.texts.AtkValue);
        assert.isTrue(view.texts.linkedTallyLabel.endsWith('｜白馬義從'));
        assert.equals(true, view.infuseEnabled);
    });

    suite.test('沒有對應虎符：虎符欄顯示提示句並清空數值', () => {
        const view = spiritTallyChainView(spirit, [], catalog);
        assert.equals(SPIRIT_TALLY_CHAIN_TEXTS.noTally, view.texts.UnitName);
        assert.equals('', view.texts.AtkValue);
        assert.equals('趙雲', view.texts.HeroName);
    });

    suite.test('LobbyScene 接線：英靈卡詳情改用串連視圖', () => {
        const lobby = readFileSync(join(__dirname, '../assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(lobby.includes('spiritTallyChainView(card, Object.values(services().session.tallyCards), buildTallyCardCatalog().values(), lookup)'));
    });

    return suite;
}
