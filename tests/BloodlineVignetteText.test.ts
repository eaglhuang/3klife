/**
 * BloodlineVignetteText.test.ts — 血統小傳開窗文字（PROG-2-1428，doc_ui_0012 / doc_spec_0011）headless 測試
 *
 * 鎖住：六格依 origin→future 排序；取得開 1 格、每多 1 轉多開 1 格、命紋覺醒全開；
 * 傳聞缺時顯示備援；沒有故事時顯示未記載；語系表查到時採用語系表；四語系都有開窗字串。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import {
    BLOODLINE_VIGNETTE_TEXT_FALLBACK_ZH_TW,
    bloodlineVignetteOpenLabel,
    bloodlineVignetteUnlockedCount,
    bloodlineVignetteViewOf,
} from '../assets/scripts/ui/core/BloodlineVignetteText';

const I18N_DIR = path.join(__dirname, '../assets/resources/i18n');

function general(extra: Partial<GeneralConfig> = {}): GeneralConfig {
    return {
        name: '曹操',
        bloodlineRumor: '祖祠地底埋著一枚黑羽虎符。',
        storyStripCells: [
            { slot: 'future', text: '墳前誰解孟德' },
            { slot: 'origin', text: '橋畔機鋒識人' },
            { slot: 'faction', text: '奉天子號諸侯' },
            { slot: 'role', text: '詭道裁局定勢' },
            { slot: 'awakening', text: '官渡借火翻盤' },
            { slot: 'bloodline', text: '銅雀夜夢聽潮' },
        ],
        ...extra,
    } as unknown as GeneralConfig;
}

export function createBloodlineVignetteTextSuite(): TestSuite {
    const suite = new TestSuite('BloodlineVignetteText (血統小傳開窗 PROG-2-1428)');

    suite.test('1 轉：只開第一格，其餘顯示解鎖條件，依出身到未來排序', () => {
        const view = bloodlineVignetteViewOf(general());
        assert.equals(6, view.cells.length);
        assert.equals('origin,faction,role,awakening,bloodline,future', view.cells.map((cell) => cell.slot).join(','));
        assert.equals('1．出身　橋畔機鋒識人', view.cells[0].line);
        assert.equals('2．陣營　（2 轉或命紋覺醒後解鎖）', view.cells[1].line);
        assert.equals('已解鎖 1/6', view.progress);
        assert.equals('血統小傳　曹操', view.title);
        assert.equals('祖祠地底埋著一枚黑羽虎符。', view.rumor);
        assert.equals('關閉', view.closeLabel);
    });

    suite.test('轉數多開格數；命紋覺醒六格全開', () => {
        assert.equals(3, bloodlineVignetteUnlockedCount({ rebirthCount: 3 }, 6));
        assert.equals(6, bloodlineVignetteUnlockedCount({ rebirthCount: 9 }, 6));
        assert.equals(1, bloodlineVignetteUnlockedCount({ rebirthCount: 0 }, 6));
        assert.equals(6, bloodlineVignetteUnlockedCount({ rebirthCount: 1, crestState: 'awakened' }, 6));
        const view = bloodlineVignetteViewOf(general({ crestState: 'awakened' }));
        assert.equals('6．未來　墳前誰解孟德', view.cells[5].line);
        assert.equals('已解鎖 6/6', view.progress);
    });

    suite.test('沒有傳聞與故事時顯示備援；故事可取自 profilePresentation', () => {
        const empty = bloodlineVignetteViewOf(general({ bloodlineRumor: '', storyStripCells: [] }));
        assert.equals('血脈傳聞尚未流傳。', empty.rumor);
        assert.equals('這位武將的逸事尚未記載。', empty.progress);
        assert.equals(0, empty.cells.length);
        const nested = bloodlineVignetteViewOf(general({
            storyStripCells: undefined,
            profilePresentation: { storyStripCells: [{ slot: 'origin', text: '涿郡屠戶' }] },
        }));
        assert.equals('1．出身　涿郡屠戶', nested.cells[0].line);
        assert.equals('已解鎖 1/1', nested.progress);
    });

    suite.test('語系表查到時採用語系表', () => {
        const lookup = (key: string, ...args: string[]): string => (key === 'ui.bloodline.vignette.open' ? 'Lineage Tale' : key === 'ui.bloodline.vignette.title' ? `Tale: ${args[0]}` : key);
        assert.equals('Lineage Tale', bloodlineVignetteOpenLabel(lookup));
        assert.equals('Tale: 曹操', bloodlineVignetteViewOf(general(), lookup).title);
    });

    suite.test('四語系都有血統小傳全部字串', () => {
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = JSON.parse(fs.readFileSync(path.join(I18N_DIR, `${lang}.json`), 'utf8')) as Record<string, string>;
            for (const key of Object.keys(BLOODLINE_VIGNETTE_TEXT_FALLBACK_ZH_TW)) {
                assert.isTrue(typeof table[key] === 'string' && table[key] !== '', `${lang} 缺 ${key}`);
            }
        }
        const zh = JSON.parse(fs.readFileSync(path.join(I18N_DIR, 'zh-TW.json'), 'utf8')) as Record<string, string>;
        for (const [key, value] of Object.entries(BLOODLINE_VIGNETTE_TEXT_FALLBACK_ZH_TW)) {
            assert.equals(value, zh[key], `zh-TW ${key} 與備援不一致`);
        }
    });

    return suite;
}
