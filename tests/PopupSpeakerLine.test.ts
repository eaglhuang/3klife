/**
 * PopupSpeakerLine.test.ts — 少年投靠／名士占卜／家族血統樹三彈窗的頭像台詞（PROG-2-10129）
 *
 * 鎖住：每個彈窗×四種性格×四語系都有台詞；zh 台詞自稱走 SpeakerVoice（女將不出現「某」、少年用「我」）；
 * 找不到句子時回空字串（不用萬用句硬補）；彈窗接線確實掛了共用元件。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    POPUP_SPEAKER_KINDS,
    POPUP_SPEAKER_TYPES,
    SAGE_VOICE,
    popupSpeakerLine,
    popupSpeakerLineKey,
    popupTypeOfId,
    popupVoiceOf,
} from '../assets/scripts/core/systems/PopupSpeakerLine';

const root = path.resolve(__dirname, '..');
const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'];

function locale(name: string): Record<string, string> {
    return JSON.parse(fs.readFileSync(path.join(root, 'assets/resources/i18n', `${name}.json`), 'utf8'));
}

export function createPopupSpeakerLineSuite(): TestSuite {
    const suite = new TestSuite('PopupSpeakerLine (PROG-2-10129 彈窗武將頭像台詞)');
    const zh = locale('zh-TW');
    const t = (key: string): string => zh[key] ?? key;

    suite.test('三彈窗×四性格×四語系都有台詞', () => {
        for (const name of LOCALES) {
            const table = locale(name);
            for (const kind of POPUP_SPEAKER_KINDS) {
                for (const type of POPUP_SPEAKER_TYPES) {
                    const key = popupSpeakerLineKey(kind, type);
                    assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `${name} 缺 ${key}`);
                }
            }
        }
    });

    suite.test('女將自稱不含「某」，且依性格用妾身／本姑娘／人家', () => {
        for (const type of POPUP_SPEAKER_TYPES) {
            const profile = popupVoiceOf({ gender: '女', age: 30, personality: { type } });
            for (const kind of POPUP_SPEAKER_KINDS) {
                const line = popupSpeakerLine(kind, profile, t);
                assert.isTrue(line.length > 0 && !line.includes('{'), `${kind}/${type} 台詞未填完：${line}`);
                assert.isFalse(line.includes('某'), `女將不該自稱某：${line}`);
            }
        }
        const brave = popupSpeakerLine('bloodline-tree', popupVoiceOf({ gender: '女', age: 30, personality: { type: 'Wise' } }), t);
        assert.isTrue(brave.includes('妾身'), `智女應自稱妾身：${brave}`);
        const playful = popupSpeakerLine('sage-oracle', popupVoiceOf({ gender: '女', age: 30, personality: { type: 'Playful' } }), t);
        assert.isTrue(playful.includes('人家'), `玩女應自稱人家：${playful}`);
    });

    suite.test('14 歲少年一律自稱「我」；男將成年用某、年長用老夫', () => {
        const youth = popupSpeakerLine('youth-pick', popupVoiceOf({ gender: '男', personality: { type: 'Brave' } }, { age: 14 }), t);
        assert.isTrue(youth.includes('我') && !youth.includes('某'), `少年台詞：${youth}`);
        const adult = popupSpeakerLine('sage-oracle', popupVoiceOf({ gender: '男', age: 40, personality: { type: 'Wise' } }), t);
        assert.isTrue(adult.includes('某'), `成年男：${adult}`);
        const elder = popupSpeakerLine('sage-oracle', SAGE_VOICE['hua-tuo'], t);
        assert.isTrue(elder.includes('老夫'), `華佗年長應自稱老夫：${elder}`);
    });

    suite.test('六位名士都有聲線設定；同輸入同輸出；查不到句子回空字串', () => {
        for (const id of ['zhuge-liang', 'hua-tuo', 'sima-hui', 'xu-shao', 'pang-tong', 'zuo-ci']) {
            assert.isTrue(SAGE_VOICE[id] !== undefined, `${id} 缺聲線`);
        }
        const profile = popupVoiceOf(undefined);
        assert.equals(popupSpeakerLine('youth-pick', profile, t), popupSpeakerLine('youth-pick', profile, t));
        assert.equals('', popupSpeakerLine('youth-pick', profile, () => ''));
        assert.equals('', popupSpeakerLine('youth-pick', profile, (key) => key));
    });

    suite.test('名冊沒填性格時依 id 穩定雜湊挑型：同人同型、三位少年不全同型', () => {
        assert.equals(popupTypeOfId('zhao-yun'), popupTypeOfId('zhao-yun'));
        const types = new Set(['zhao-yun', 'guan-yu', 'zhuge-liang', 'sun-shang-xiang'].map(popupTypeOfId));
        assert.isTrue(types.size >= 2, '不同武將應有不同口吻');
        assert.equals(popupTypeOfId('guan-yu'), popupVoiceOf({ id: 'guan-yu' }).type);
        assert.equals('Wise', popupVoiceOf({ id: 'guan-yu', personality: { type: 'Wise' } }).type, '有填性格以名冊為準');
    });

    suite.test('三彈窗接線：共用元件、頭像退階、錨點比例', () => {
        const lobby = fs.readFileSync(path.join(root, 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        for (const kind of POPUP_SPEAKER_KINDS) {
            assert.isTrue(lobby.includes(`popupSpeakerLine('${kind}'`), `LobbyScene 應掛上 ${kind} 台詞`);
        }
        assert.isTrue((lobby.match(/showPopupSpeaker\(/g) ?? []).length >= 3, '三個彈窗都應呼叫 showPopupSpeaker');
        const view = fs.readFileSync(path.join(root, 'assets/scripts/ui/core/PopupGeneralSpeaker.ts'), 'utf8');
        assert.isTrue(view.indexOf('loadGeneralAvatar(generalId, false)') < view.indexOf('loadGeneralPortrait(generalId)'), '頭像先於立繪');
        assert.isTrue(view.includes('loadGeneralAvatar(generalId, true)'), '最後退預設剪影');
        assert.isTrue(view.includes('SIZE_CHANGED'), '父節點尺寸變動要重排（比例座標）');
    });

    return suite;
}
