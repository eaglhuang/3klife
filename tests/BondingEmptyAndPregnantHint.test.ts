/**
 * BondingEmptyAndPregnantHint.test.ts — PROG-2-9177 結緣空母親清單引導＋待產輕鬆提示測試
 */
import { assert, TestSuite } from './TestRunner';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { BREED_TEXT_FALLBACK_ZH_TW } from '../assets/scripts/ui/core/BreedingTexts';
import { Faction } from '../assets/scripts/core/config/Constants';
import type { BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import * as fs from 'fs';
import * as path from 'path';

function makeGeneral(id: string, gender: '男' | '女', extra: Partial<BreedingGeneral> = {}): BreedingGeneral {
    return {
        id,
        name: id,
        faction: Faction.Player,
        gender,
        hp: 100,
        age: 22,
        ep: 70,
        vitality: 100,
        maxVitality: 100,
        stats: { str: 70, int: 65, lea: 65, pol: 60, cha: 60, luk: 50 },
        genes: [],
        ...extra,
    };
}

export function createBondingEmptyAndPregnantHintSuite(): TestSuite {
    const suite = new TestSuite('BondingEmptyAndPregnantHint (PROG-2-9177)');

    suite.test('i18n 四語系皆與 BreedingTexts 新增鍵同步（no_mother_hint / no_father_hint / preg_wait_hint / go_beauty_gacha）', () => {
        const requiredKeys = [
            'ui.breed.no_mother_hint',
            'ui.breed.no_father_hint',
            'ui.breed.preg_wait_hint',
            'ui.breed.go_beauty_gacha',
        ];
        const zhTw = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/i18n/zh-TW.json'), 'utf8'));
        for (const key of requiredKeys) {
            assert.equals(BREED_TEXT_FALLBACK_ZH_TW[key], zhTw[key], `zh-TW.json 應同步 ${key}`);
        }
        for (const locale of ['zh-CN', 'en', 'ja']) {
            const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../assets/resources/i18n/${locale}.json`), 'utf8'));
            for (const key of requiredKeys) {
                assert.isTrue(typeof data[key] === 'string' && data[key].length > 0, `${locale}.json 應含 ${key}`);
            }
        }
    });

    suite.test('母親清單為空時顯示輕鬆引導文案並啟用 btnGoBeautyGacha 按鈕', () => {
        const maleOnly = new InMemoryRosterStore([makeGeneral('zhang-fei', '男', { name: '張飛' })]);
        const graph = BloodlineGraph.getInstance();
        graph.clear();
        const breeding = new BreedingService(maleOnly, graph, { random: () => 0.5 });
        const controller = new BondingSetupController({ breeding, roster: maleOnly });

        const view = controller.getView();
        assert.equals(true, view.actives.bondEmptyHint);
        assert.equals(true, view.actives.btnGoBeautyGacha);
        assert.equals(true, view.enabled.btnGoBeautyGacha);
        assert.isTrue(view.texts.bondEmptyHint.includes('紅顏天香'), `空母親引導應提及紅顏天香，實際：${view.texts.bondEmptyHint}`);
        assert.isTrue(view.texts.btnGoBeautyGachaLabel.includes('紅顏天香'));
    });

    suite.test('待產中的女將在結緣頁顯示剩餘季數與輕鬆引導（不與 preg_status 重複）', () => {
        const father = makeGeneral('zhang-fei', '男', { name: '張飛' });
        const pregnantMother = makeGeneral('diao-chan', '女', { name: '貂蟬', pregnancySeasonsLeft: 2 });
        const roster = new InMemoryRosterStore([father, pregnantMother]);
        const graph = BloodlineGraph.getInstance();
        graph.clear();
        const breeding = new BreedingService(roster, graph, { random: () => 0.5 });
        const controller = new BondingSetupController({ breeding, roster });

        controller.selectFather('zhang-fei');
        controller.selectMother('diao-chan');

        const view = controller.getView();
        assert.equals(false, view.enabled.btnConfirmBond);
        assert.equals(false, view.actives.btnGoBeautyGacha, '非空清單時不應顯示空清單按鈕');
        assert.isTrue(view.texts.eligibilityLabel.includes('母方待產中'), 'eligibilityLabel 應保留母方待產中字樣');
        assert.isTrue(view.texts.eligibilityLabel.includes('貂蟬') && view.texts.eligibilityLabel.includes('2 季'), `應顯示待產剩餘 2 季，實際：${view.texts.eligibilityLabel}`);
        assert.isTrue(view.texts.eligibilityLabel.includes('紅顏天香'), '應提示可先到紅顏天香再延攬新紅顏');
        assert.equals(false, view.texts.eligibilityLabel.includes('襁褓幼子'), '不應與結緣成功之 preg_status 文案重複');

        const toastHint = controller.pregnantMotherHint() ?? '';
        assert.isTrue(toastHint.includes('待產中'));
    });

    return suite;
}
