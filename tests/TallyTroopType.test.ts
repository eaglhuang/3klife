/**
 * TallyTroopType — 虎符卡兵種補齊（PROG-2-0582）測試
 *
 * 缺口：死亡產出的虎符卡 troopType 是選填，沒有兵種的持有卡綁不上手牌。
 * 主兵種規則為 PM 暫定：適性等級最高（S>A>B>C>D），同等級取 TroopType 定義順序較前者。
 */
import { TestSuite, assert } from './TestRunner';
import { mainTroopTypeOf, backfillTallyTroopTypes, produceDeathTally } from '../assets/scripts/core/systems/TigerTally';
import { bindHeldTallyInstances, buildTallyCardCatalog, tallyDeployRefOf } from '../assets/scripts/core/config/TallyCardCatalog';
import type { TigerTallyCard } from '../assets/scripts/core/models/TigerTallyCard';

function card(over: Partial<TigerTallyCard>): TigerTallyCard {
    return { uid: 't1', templateId: 'tpl', sourceGeneralUid: 'g1', quality: 'SSR', score: 0, source: 'death', producedSeason: 0, ...over };
}

export function createTallyTroopTypeSuite(): TestSuite {
    const suite = new TestSuite('TallyTroopType (虎符卡兵種補齊 PROG-2-0582)');

    suite.test('主兵種取適性等級最高者，回傳 TroopType 小寫值', () => {
        assert.equals('infantry', mainTroopTypeOf({ INFANTRY: 'A', CAVALRY: 'C' }) ?? '');
        assert.equals('infantry', mainTroopTypeOf({ CAVALRY: 'A', INFANTRY: 'S' }) ?? '');
    });

    suite.test('同等級時取 TroopType 定義順序較前者', () => {
        // 騎兵排在步兵前面（TroopType 定義順序），同為 B 時選騎兵
        assert.equals('cavalry', mainTroopTypeOf({ INFANTRY: 'B', CAVALRY: 'B' }) ?? '');
    });

    suite.test('沒有可用適性（缺資料或只有攻城）時回 undefined', () => {
        assert.isTrue(mainTroopTypeOf(undefined) === undefined);
        assert.isTrue(mainTroopTypeOf({}) === undefined);
        assert.isTrue(mainTroopTypeOf({ SIEGE: 'S' }) === undefined);
    });

    suite.test('死亡產卡：武將有兵種時產出的卡帶 troopType', () => {
        const produced = produceDeathTally({ id: 'g1', templateId: 'tpl-g1', characterCategory: 'general', gender: 'female', troopType: 'cavalry' }, 90, 90, 3);
        assert.equals('cavalry', produced?.troopType ?? '');
    });

    suite.test('讀檔回填：缺 troopType 的卡依來源武將補上，已有的不動，找不到武將的維持原樣', () => {
        const cards = {
            t1: card({ uid: 't1', sourceGeneralUid: 'g1' }),
            t2: card({ uid: 't2', sourceGeneralUid: 'g2', troopType: 'archer' }),
            t3: card({ uid: 't3', sourceGeneralUid: 'missing' }),
        };
        const generals = [
            { id: 'g1', troopAptitude: { CAVALRY: 'A' } },
            { id: 'g2', troopAptitude: { CAVALRY: 'S' } },
        ];
        const out = backfillTallyTroopTypes(cards, generals);
        assert.equals('cavalry', out.t1.troopType ?? '');
        assert.equals('archer', out.t2.troopType ?? '');
        assert.isTrue(out.t3.troopType === undefined);
        assert.isTrue(cards.t1.troopType === undefined, '不改動傳入的物件');
    });

    suite.test('回歸：回填後的舊卡可以綁上同兵種的手牌', () => {
        const backfilled = backfillTallyTroopTypes(
            { t1: card({ uid: 't1', sourceGeneralUid: 'g1' }) },
            [{ id: 'g1', troopAptitude: { CAVALRY: 'A' } }],
        );
        const hand = bindHeldTallyInstances([{ ...buildTallyCardCatalog().get('tiger-tally-cavalry-shock')! }], backfilled);
        assert.equals('t1', tallyDeployRefOf(hand[0])?.cardUid ?? '');
    });

    return suite;
}
