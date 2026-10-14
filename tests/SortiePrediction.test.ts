// @spec-source → 數值系統.md §F-4（PROG-2-0212，粗估暫定）
/**
 * SortiePrediction — 出征編制畫面的戰前粗估勝率 headless 測試（PROG-2-0212）
 */
import { TestSuite, assert } from './TestRunner';
import { Faction } from '../assets/scripts/core/config/Constants';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import {
    estimateSortiePower,
    predictSortieOutcome,
    sortiePredictText,
} from '../assets/scripts/core/systems/SortiePrediction';

/** 測試用武將：預設武力 80、智力 60、統御 50，其餘為 0 */
function gen(over: Record<string, unknown> = {}): GeneralConfig {
    return {
        id: 'g', name: 'g', faction: Faction.Player, hp: 1000, maxSp: 100, initialSp: 100,
        str: 80, int: 60, lea: 50,
        ...over,
    } as unknown as GeneralConfig;
}

export function createSortiePredictionSuite(): TestSuite {
    const suite = new TestSuite('SortiePrediction');

    suite.test('能力相同：勝率 50%，勢均力敵', () => {
        const p = predictSortieOutcome(gen(), gen());
        assert.equals(50, p.winRate);
        assert.equals('勢均力敵', p.result);
    });

    suite.test('主將明顯較強（武力 200 對 40）：攻方優勢', () => {
        const p = predictSortieOutcome(gen({ str: 200 }), gen({ str: 40 }));
        assert.equals('攻方優勢', p.result);
        assert.isTrue(p.winRate > 65, `勝率 ${p.winRate}`);
    });

    suite.test('主將明顯較弱（武力 40 對 200）：攻方劣勢', () => {
        const p = predictSortieOutcome(gen({ str: 40 }), gen({ str: 200 }));
        assert.equals('攻方劣勢', p.result);
        assert.isTrue(p.winRate < 45, `勝率 ${p.winRate}`);
    });

    suite.test('能力可以放在 stats 巢狀欄位：與頂層欄位算出相同戰力', () => {
        const flat = estimateSortiePower(gen({ str: 200 }));
        const nested = estimateSortiePower(gen({ str: undefined, stats: { str: 200, int: 60, lea: 50 } }));
        assert.equals(flat, nested);
    });

    suite.test('畫面文字：有敵將給勝率與標籤，沒有敵將提示資料未載入', () => {
        assert.equals('攻方勝率 50%（勢均力敵）· 粗估', sortiePredictText(gen(), gen()));
        assert.equals('敵將資料未載入，暫無預判', sortiePredictText(gen(), null));
    });

    suite.test('年齡接入戰力：老年武將粗估戰力低於壯年，未填年齡維持舊值', () => {
        const prime = estimateSortiePower(gen({ age: 30 }));
        const elder = estimateSortiePower(gen({ age: 60 }));
        const unknown = estimateSortiePower(gen());
        assert.isTrue(elder < prime);
        assert.equals(estimateSortiePower(gen({ age: 30 })), unknown);
    });

    return suite;
}
