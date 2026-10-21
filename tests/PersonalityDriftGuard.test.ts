/**
 * PersonalityDriftGuard.test.ts — 生成台詞的性格漂移檢查（NPC-06 / PROG-2-1018）
 *
 * Unity 對照：像生成內容的 Validator 單元測試：每條規則各一個反例，
 * 並確認任何一條不過時，輸出一定是角色的安全句。
 */
import { assert, TestSuite } from './TestRunner';
import {
    canAcceptGeneratedLine,
    guardGeneratedLine,
    GeneratedLine,
    DriftPersona,
} from '../assets/scripts/core/systems/PersonalityDriftGuard';

const PERSONA: DriftPersona = {
    Required_Tone_Tags: ['bold', 'loyal'],
    Safe_Fallback_Line: '此事俺記下了，待有眉目再與你分說。',
};

function line(overrides: Partial<GeneratedLine>): GeneratedLine {
    return { text: '俺張飛在此，誰敢再上前一步！', flags: [], toneTags: ['bold', 'loyal'], ...overrides };
}

export function createPersonalityDriftGuardSuite(): TestSuite {
    const suite = new TestSuite('PersonalityDriftGuard (NPC-06 性格漂移防護)');

    suite.test('字數未超過上限、無旗標、語氣標籤齊全：通過並採用生成台詞', () => {
        const result = guardGeneratedLine(line({}), PERSONA);
        assert.isTrue(canAcceptGeneratedLine(line({}), PERSONA));
        assert.equals('generated', result.source);
        assert.equals('俺張飛在此，誰敢再上前一步！', result.line);
    });

    suite.test('字數超過上限：不通過，回退安全句', () => {
        const tooLong = line({ text: '俺'.repeat(61) });
        assert.isFalse(canAcceptGeneratedLine(tooLong, PERSONA));
        assert.equals(PERSONA.Safe_Fallback_Line, guardGeneratedLine(tooLong, PERSONA).line);
        assert.isTrue(canAcceptGeneratedLine(line({ text: '俺'.repeat(60) }), PERSONA), '剛好上限可通過');
    });

    suite.test('含現代用語或未支持史實旗標：不通過，回退安全句', () => {
        for (const flag of ['MODERN_SLANG', 'UNSUPPORTED_HISTORY_CLAIM']) {
            const flagged = line({ flags: [flag] });
            assert.isFalse(canAcceptGeneratedLine(flagged, PERSONA), `${flag} 應不通過`);
            assert.equals('fallback', guardGeneratedLine(flagged, PERSONA).source);
        }
    });

    suite.test('缺少武將要求的語氣標籤：不通過', () => {
        assert.isFalse(canAcceptGeneratedLine(line({ toneTags: ['bold'] }), PERSONA));
        assert.isFalse(canAcceptGeneratedLine(line({ toneTags: [] }), PERSONA));
    });

    suite.test('未知旗標不影響判定；輸入不被改動', () => {
        const input = line({ flags: ['SOME_OTHER_NOTE'] });
        assert.isTrue(canAcceptGeneratedLine(input, PERSONA));
        assert.equals(1, input.flags.length);
    });

    return suite;
}
