/**
 * BloodlineRouteChain — 血脈跳轉鏈、灌注、命鏡文案（doc_spec_0351；PROG-2-2037）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    DESTINY_MIRROR_QUOTE_KEYS, infuseBloodline, openBloodlineChain, pickDestinyMirrorQuoteKey, popBloodlineRoute, pushBloodlineRoute,
} from '../assets/scripts/core/systems/BloodlineRouteChain';

const cred = { templateId: 'Zhao_Yun', bloodlineId: 'BL_ZHAO', sigilPatternId: 'SIGIL_AZURE_DRAGON' };

export function createBloodlineRouteChainSuite(): TestSuite {
    const suite = new TestSuite('BloodlineRouteChain (血脈跳轉鏈 doc_spec_0351 PROG-2-2037)');

    suite.test('§4-1 四級跳轉皆還原 bloodlineId，返回逐層彈出', () => {
        let stack = openBloodlineChain(cred);
        for (const route of ['SpiritTallyDetail', 'TigerTallyDetail', 'EliteTroopCodex'] as const) {
            stack = pushBloodlineRoute(stack, route)!;
            assert.equals('BL_ZHAO', stack[stack.length - 1].credentials.bloodlineId);
        }
        assert.equals(4, stack.length);
        assert.equals(null, pushBloodlineRoute(stack, 'EliteTroopCodex'));
        assert.equals(null, pushBloodlineRoute(openBloodlineChain(cred), 'TigerTallyDetail'));
        const back = popBloodlineRoute(stack)!;
        assert.equals('TigerTallyDetail', back[back.length - 1].route);
        assert.equals(null, popBloodlineRoute(openBloodlineChain(cred)));
    });

    suite.test('§2 灌注與溢出轉結義點數', () => {
        const normal = infuseBloodline({ essence: 300, currentEssence: 0, essenceCap: 1000, currentResonance: 0.1, resonanceCap: 1 });
        assert.equals(300, normal.essence);
        assert.equals(0.15, normal.resonance);
        assert.equals(0, normal.oathPoints);
        const over = infuseBloodline({ essence: 900, currentEssence: 900, essenceCap: 1000, currentResonance: 1, resonanceCap: 1 });
        assert.equals(1000, over.essence);
        assert.equals(1, over.resonance);
        assert.equals(400, over.oathPoints);
        assert.equals(100, infuseBloodline({ essence: 1, currentEssence: 0, essenceCap: 1000, currentResonance: 0, resonanceCap: 1 }).essence);
    });

    suite.test('§4-2 8 句命鏡文案四語系齊全且非空', () => {
        assert.equals(8, DESTINY_MIRROR_QUOTE_KEYS.length);
        for (const locale of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'resources', 'i18n', `${locale}.json`), 'utf8'));
            for (const key of DESTINY_MIRROR_QUOTE_KEYS) {
                assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `${locale}:${key}`);
            }
        }
        assert.equals('LOADING_MIRROR_01', pickDestinyMirrorQuoteKey(() => 0));
        assert.equals('LOADING_MIRROR_08', pickDestinyMirrorQuoteKey(() => 0.9999));
    });

    return suite;
}
