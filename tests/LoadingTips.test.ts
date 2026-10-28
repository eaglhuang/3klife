/**
 * LoadingTips.test.ts — 血脈命鏡載入提示挑選（PROG-2-1378，LT-02）
 *
 * 鎖住：正式資料四池各有文案；抽 1～2 條且不重複；未持有時角色誘惑池較常出現，
 * 已持有時較少；權重為 0 的池不抽；亂數異常時不越界。
 *
 * Unity 對照：像 WeightedRandom 抽獎：先抽稀有度池，再從池裡抽一張，抽過的不放回。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    LOADING_TIP_CATEGORIES,
    LoadingTipsContent,
    pickLoadingTips,
} from '../assets/scripts/core/systems/LoadingTips';

function realContent(): LoadingTipsContent {
    return JSON.parse(readFileSync(join(__dirname, '..', 'assets', 'resources', 'ui-spec', 'content', 'bloodline-mirror-loading-tips-v1.json'), 'utf8'));
}

/** 固定種子的線性同餘亂數，讓統計測試每次結果一致 */
function seeded(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 1103515245 + 12345) % 2147483648;
        return state / 2147483648;
    };
}

function tinyContent(weights: Partial<Record<string, number>>): LoadingTipsContent {
    const categories = { system: ['s1', 's2'], history: ['h1'], bloodline: ['b1'], tease: ['t1'] };
    const w = { system: 0, history: 0, bloodline: 0, tease: 0, ...weights };
    return { categories, weights: { owned: w as LoadingTipsContent['weights']['owned'], unowned: w as LoadingTipsContent['weights']['unowned'] } };
}

export function createLoadingTipsSuite(): TestSuite {
    const suite = new TestSuite('LoadingTips (PROG-2-1378 血脈命鏡載入提示)');

    suite.test('正式資料四池各有文案，權重兩組都有四個分類', () => {
        const content = realContent();
        for (const category of LOADING_TIP_CATEGORIES) {
            assert.isTrue(content.categories[category].length > 0);
            assert.isTrue(content.weights.owned[category] >= 0);
            assert.isTrue(content.weights.unowned[category] >= 0);
        }
    });

    suite.test('抽 1 條或 2 條；超出範圍會夾回 1～2，結果都來自資料且不重複', () => {
        const content = realContent();
        const all = new Set(LOADING_TIP_CATEGORIES.flatMap((category) => content.categories[category]));
        for (const count of [0, 1, 2, 5]) {
            const picked = pickLoadingTips(content, { owned: false, count, random: seeded(7) });
            assert.isTrue(picked.length >= 1 && picked.length <= 2);
            assert.equals(picked.length, new Set(picked).size);
            for (const text of picked) assert.isTrue(all.has(text));
        }
    });

    suite.test('未持有時角色誘惑池出現較多；已持有時較少', () => {
        const content = realContent();
        const countTease = (owned: boolean): number => {
            const random = seeded(42);
            let tease = 0;
            for (let i = 0; i < 2000; i++) {
                const [tip] = pickLoadingTips(content, { owned, count: 1, random });
                if (content.categories.tease.includes(tip)) tease++;
            }
            return tease;
        };
        assert.isTrue(countTease(false) > countTease(true));
    });

    suite.test('權重為 0 的池永遠不抽', () => {
        const content = tinyContent({ system: 1 });
        for (let i = 0; i < 50; i++) {
            const [tip] = pickLoadingTips(content, { owned: true, count: 1, random: seeded(i + 1) });
            assert.isTrue(tip === 's1' || tip === 's2');
        }
    });

    suite.test('同一池只剩一條時，兩條提示最多只回傳一條，不會重複', () => {
        const content = tinyContent({ tease: 1 });
        const picked = pickLoadingTips(content, { owned: false, count: 2, random: seeded(3) });
        assert.equals('t1', picked.join(','));
    });

    suite.test('亂數回傳 1、負數或 NaN 時仍不越界', () => {
        const content = realContent();
        for (const value of [1, -0.5, Number.NaN]) {
            const picked = pickLoadingTips(content, { owned: true, count: 2, random: () => value });
            assert.equals(2, picked.length);
            for (const text of picked) assert.isTrue(text.length > 0);
        }
    });

    return suite;
}
