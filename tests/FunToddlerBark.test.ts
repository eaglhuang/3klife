/**
 * FunToddlerBark.test.ts — FUN-01 幼兒親子互動（doc_spec_1347 §2，PROG-2-10177）
 *
 * 鎖住：滿 5 歲不觸發、年齡分段過濾、同孩子同季句子固定／隔季不重複、嬰兒只有擬聲、
 * 資料檔樣板的 i18n 四語齊備、全部台詞以女童／男童代入不出現成人自稱、獎勵套件與 grantKey 去重。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { emptyFunState } from '../assets/scripts/core/fun/FunState';
import { funFill, funLineViolations } from '../assets/scripts/core/fun/FunCommon';
import {
    isToddlerAge, normalizeToddlerPool, pickToddlerBark, toddlerAgeBandOf, toddlerGrantKey, type ToddlerPool,
} from '../assets/scripts/core/fun/FunToddlerBark';
import { claimFunReward } from '../assets/scripts/core/fun/FunReward';

const root = path.resolve(__dirname, '..');
const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'];

function table(loc: string): Record<string, string> {
    return JSON.parse(fs.readFileSync(path.join(root, 'assets/resources/i18n', `${loc}.json`), 'utf8'));
}

function loadPool(): ToddlerPool {
    const pool = normalizeToddlerPool(JSON.parse(fs.readFileSync(path.join(root, 'assets/resources/data/fun-toddler-bark.json'), 'utf8')));
    if (!pool) throw new Error('fun-toddler-bark.json 壞掉');
    return pool;
}

export function createFunToddlerBarkSuite(): TestSuite {
    const suite = new TestSuite('FunToddlerBark (PROG-2-10177 FUN-01 幼兒親子互動)');
    const pool = loadPool();
    const zh = table('zh-TW');
    const t = (key: string): string => zh[key] ?? key;
    const base = { pool, seed: 'uid-1', translate: t, honor: '爸爸' };

    suite.test('資格：未滿 5 歲才觸發；滿 5 歲回 null 且狀態不動', () => {
        assert.isTrue(isToddlerAge(0));
        assert.isTrue(isToddlerAge(4.9));
        assert.isFalse(isToddlerAge(5));
        assert.isFalse(isToddlerAge(undefined));
        const state = emptyFunState();
        assert.equals(null, pickToddlerBark({ ...base, state, child: { id: 'c', age: 5 }, seasonNo: 1 }));
    });

    suite.test('年齡分段：0～1 baby、2～3 toddler、4 kid；樣板按分段過濾', () => {
        assert.equals('baby', toddlerAgeBandOf(0));
        assert.equals('baby', toddlerAgeBandOf(1.9));
        assert.equals('toddler', toddlerAgeBandOf(2));
        assert.equals('toddler', toddlerAgeBandOf(3.5));
        assert.equals('kid', toddlerAgeBandOf(4.2));
        for (const [age, band] of [[0, 'baby'], [3, 'toddler'], [4, 'kid']] as const) {
            const out = pickToddlerBark({ ...base, state: emptyFunState(), child: { id: 'c', age }, seasonNo: 1 });
            const tpl = pool.templates.find((x) => x.id === out?.result.templateId);
            assert.equals(band, tpl?.ageBand);
        }
    });

    suite.test('嬰兒只有擬聲，沒有完整句子（不含稱謂槽位）', () => {
        for (const tpl of pool.templates.filter((x) => x.ageBand === 'baby')) {
            const text = t(tpl.textKey);
            assert.isFalse(/\{honor\}|\{self\}/.test(text), `嬰兒句不該有稱謂：${text}`);
            assert.isTrue(text.length <= 8, `嬰兒句過長：${text}`);
        }
    });

    suite.test('每季換：同孩子同季重點句子固定；下一季換新句且不與上一季相同', () => {
        let state = emptyFunState();
        const child = { id: 'kid1', gender: '男', age: 3 };
        const first = pickToddlerBark({ ...base, state, child, seasonNo: 10 })!;
        assert.isTrue(first.result.firstThisSeason);
        state = first.state;
        for (let i = 0; i < 5; i += 1) {
            const again = pickToddlerBark({ ...base, state, child, seasonNo: 10 })!;
            assert.equals(first.result.templateId, again.result.templateId);
            assert.equals(first.result.text, again.result.text);
            assert.isFalse(again.result.firstThisSeason);
            state = again.state;
        }
        let lastId = first.result.templateId;
        for (let season = 11; season < 30; season += 1) {
            const next = pickToddlerBark({ ...base, state, child, seasonNo: season })!;
            assert.isTrue(next.result.firstThisSeason);
            assert.notEquals(lastId, next.result.templateId, `第 ${season} 季不可與上一季相同`);
            lastId = next.result.templateId;
            state = next.state;
        }
    });

    suite.test('同存檔種子同結果（重進場景句子不變）', () => {
        const a = pickToddlerBark({ ...base, state: emptyFunState(), child: { id: 'k', gender: '女', age: 3 }, seasonNo: 7 })!;
        const b = pickToddlerBark({ ...base, state: emptyFunState(), child: { id: 'k', gender: '女', age: 3 }, seasonNo: 7 })!;
        assert.equals(a.result.text, b.result.text);
    });

    suite.test('查不到台詞回 null，不用萬用句硬補', () => {
        const none = pickToddlerBark({ ...base, translate: (k) => k, state: emptyFunState(), child: { id: 'k', age: 3 }, seasonNo: 1 });
        assert.equals(null, none);
    });

    suite.test('資料檔：每個樣板四語系都有台詞；全部以男童、女童代入都不出現成人自稱或未填槽位', () => {
        for (const loc of LOCALES) {
            const tb = table(loc);
            for (const tpl of pool.templates) assert.isTrue(typeof tb[tpl.textKey] === 'string' && tb[tpl.textKey].length > 0, `${loc} 缺 ${tpl.textKey}`);
        }
        for (const tpl of pool.templates) {
            for (const gender of ['男', '女']) {
                for (let i = 0; i < 12; i += 1) {
                    const text = funFill(t(tpl.textKey), { voice: { gender, age: 3 }, honor: '娘親', toddlerSeed: `s${i}` });
                    assert.isFalse(/\{\w+\}/.test(text), `未填槽位：${text}`);
                    assert.equals(0, funLineViolations(text, gender, 3).length, `童角不得出現成人自稱：${text}`);
                }
            }
        }
    });

    suite.test('獎勵：套件 BUNDLE_TODDLER_BOND 存在、來源 fun01；grantKey 依孩子與季數', () => {
        const cfg = JSON.parse(fs.readFileSync(path.join(root, 'assets/resources/data/reward-config.json'), 'utf8')) as { bundles: Array<{ id: string; effects: Array<{ kind: string; amount: number }>; sources: string[] }> };
        const bundle = cfg.bundles.find((b) => b.id === pool.reward.bundleId);
        assert.isTrue(!!bundle);
        assert.equals('childBond', bundle?.effects[0].kind);
        assert.equals(1, bundle?.effects[0].amount);
        assert.isTrue(bundle?.sources.includes('fun01') === true);
        assert.equals('fun01.kid1.12', toddlerGrantKey(pool, 'kid1', 12));
    });

    suite.test('claimFunReward：入帳回新增量；重送（replayed）不重複；失敗回 ok=false 不丟例外', async () => {
        const calls: unknown[] = [];
        const okApi = {
            cmd: async (name: string, args: unknown) => {
                calls.push({ name, args });
                return { ok: true, result: { replayed: false, plan: [{ applied: { kind: 'childBond', amount: 1 } }] } };
            },
        };
        const out = await claimFunReward(okApi as never, { bundleId: 'B', grantKey: 'fun01.k.1', sourceKind: 'fun01', sourceRef: 'k' });
        assert.isTrue(out.ok);
        assert.equals(1, out.applied);
        assert.equals('reward.claim', (calls[0] as { name: string }).name);
        const replayApi = { cmd: async () => ({ ok: true, result: { replayed: true, plan: [] } }) };
        const rep = await claimFunReward(replayApi as never, { bundleId: 'B', grantKey: 'fun01.k.1', sourceKind: 'fun01', sourceRef: 'k' });
        assert.isTrue(rep.ok && rep.replayed);
        assert.equals(0, rep.applied);
        const boom = { cmd: async () => { throw new Error('x'); } };
        const bad = await claimFunReward(boom as never, { bundleId: 'B', grantKey: 'g', sourceKind: 'fun01', sourceRef: 'k' });
        assert.isFalse(bad.ok);
    });

    return suite;
}
