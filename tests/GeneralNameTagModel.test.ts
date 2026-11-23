import { TestSuite, assert } from './TestRunner';
import {
    NAME_TAG_STYLE_FALLBACK,
    NAME_TAG_TOKEN_KEYS,
    nameTagAvatarCandidates,
    nameTagInitial,
    resolveNameTagStyle,
} from '../assets/scripts/ui/core/GeneralNameTagModel';
import { buildDomesticRows, DomesticGovernor } from '../assets/scripts/core/systems/DomesticPresenter';
import { EMPTY_DOMESTIC_LOG } from '../assets/scripts/core/systems/DomesticTasks';

export function createGeneralNameTagModelSuite(): TestSuite {
    const suite = new TestSuite('GeneralNameTagModel');

    suite.test('名字首字以 code point 取，空名回傳問號', () => {
        assert.equals('張', nameTagInitial('張飛'));
        assert.equals('𠀀', nameTagInitial('𠀀乙'));
        assert.equals('?', nameTagInitial('   '));
        assert.equals('?', nameTagInitial(null));
    });

    suite.test('頭像候選沿用正式頭像路徑；沒有武將 id 時為空', () => {
        assert.equals('sprites/generals/avatars/zhang_fei_avatar', nameTagAvatarCandidates('zhang-fei')[0]);
        assert.equals(0, nameTagAvatarCandidates('').length);
        assert.equals(0, nameTagAvatarCandidates(undefined).length);
    });

    suite.test('主題 token 有效時使用，格式錯誤或缺漏時退回墊底色', () => {
        const style = resolveNameTagStyle((key) => {
            if (key === NAME_TAG_TOKEN_KEYS.ring) return '#112233';
            if (key === NAME_TAG_TOKEN_KEYS.seal) return 'not-a-color';
            return undefined;
        });
        assert.equals('#112233', style.ringColor);
        assert.equals(NAME_TAG_STYLE_FALLBACK.sealColor, style.sealColor);
        assert.equals(NAME_TAG_STYLE_FALLBACK.sealTextColor, style.sealTextColor);
    });

    suite.test('主事列資料帶出武將 id；未指派時 id 為 null', () => {
        const governor: DomesticGovernor = { id: 'zhang-fei', name: '張飛', stats: { str: 80, int: 20, pol: 20, cha: 20 } };
        const rows = buildDomesticRows(EMPTY_DOMESTIC_LOG, 1, (taskId) => (taskId === 'farming' ? governor : null));
        assert.equals('zhang-fei', rows.find((r) => r.taskId === 'farming')!.governorId as string);
        assert.equals(null, rows.find((r) => r.taskId === 'commerce')!.governorId);
    });

    return suite;
}
