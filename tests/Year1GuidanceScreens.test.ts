/**
 * Year1GuidanceScreens.test.ts
 *
 * PROG-2-9615 首年引導接進畫面與實機視角驗收端到端測試
 */

import { TestSuite, assert } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';
import { buildAcademyEmptyGuardViewState } from '../assets/scripts/ui/core/AcademyEmptyGuardView';
import { academyEnrollRules } from '../assets/scripts/core/systems/nurture/AcademyEnrollRules';
import { buildRankUnlockPopupView, installOfficerFeatureUnlocks } from '../assets/scripts/core/systems/OfficerFeatureUnlocks';

export function createYear1GuidanceScreensSuite(): TestSuite {
    const suite = new TestSuite('Year1GuidanceScreens (PROG-2-9615)');

    suite.test('學府空轉規則讀取：讀取 academy-enroll-rules.json 取得 minEnrollAge: 15', () => {
        const rules = academyEnrollRules();
        assert.equals(15, rules.minEnrollAge, '最低入學年齡必須為 15 歲');
    });

    suite.test('大廳學府按鈕攔截契約：無適齡子嗣時輸出詼諧導流 ViewState', () => {
        // 第一年開局無滿 15 歲及冠子嗣（僅有 0 歲或無子嗣）
        const noChildGuard = buildAcademyEmptyGuardViewState({
            candidateAges: [],
            minEnrollAge: academyEnrollRules().minEnrollAge,
        });
        assert.isFalse(noChildGuard.canOpenEnrollView, '無及冠子嗣不得直接開進入學畫面');
        assert.equals('matchmaker', noChildGuard.actionRedirectRoute, '無子嗣導流至媒人說親');
        assert.equals('ui.academy.empty_guard.no_child_title', noChildGuard.titleKey);
        assert.equals('ui.academy.empty_guard.no_child_desc', noChildGuard.messageKey);

        // 僅有幼童（如 6 歲）
        const childGuard = buildAcademyEmptyGuardViewState({
            candidateAges: [6],
            minEnrollAge: academyEnrollRules().minEnrollAge,
        });
        assert.isFalse(childGuard.canOpenEnrollView);
        assert.equals('lobby', childGuard.actionRedirectRoute, '有幼童導流回府培育');
        assert.equals(9, childGuard.messageParams?.yearsRemaining);

        // 有滿 15 歲子嗣
        const eligibleGuard = buildAcademyEmptyGuardViewState({
            candidateAges: [15],
            minEnrollAge: academyEnrollRules().minEnrollAge,
        });
        assert.isTrue(eligibleGuard.canOpenEnrollView, '滿 15 歲及冠子嗣可正常開學府');
    });

    suite.test('官職晉升解鎖彈窗樣式：深色玻璃面板 token 規範驗證', () => {
        const skinPath = path.resolve(__dirname, '../assets/resources/ui-spec/skins/rank-unlock-popup-screen.skin.json');
        assert.isTrue(fs.existsSync(skinPath), 'rank-unlock-popup-screen.skin.json 必須存在');

        const skin = JSON.parse(fs.readFileSync(skinPath, 'utf8'));
        const cardBg = skin.slots['rank-unlock.card.bg'];
        assert.isTrue(!!cardBg, '必須具備 rank-unlock.card.bg slot');
        assert.equals('#140F0C', cardBg.color, '面板底色必須為深色玻璃 #140F0C');
        assert.equals(230, cardBg.alpha, '透明度必須為深色半透明 230');
        assert.equals('#E8C88CA0', cardBg.borderColor, '外框必須為淡金邊框');

        const buttonOk = skin.slots['rank-unlock.button.ok'];
        assert.isTrue(!!buttonOk, '必須具備 rank-unlock.button.ok slot');
        assert.equals('#A8322A', buttonOk.color, '按鈕必須為 primary / accent #A8322A');
    });

    suite.test('官職晉升解鎖內容裝配：產生朝廷敕封聖旨文案與功能清單', () => {
        const dataFile = path.resolve(__dirname, '../assets/resources/data/officer-feature-unlocks.json');
        if (fs.existsSync(dataFile)) {
            installOfficerFeatureUnlocks(JSON.parse(fs.readFileSync(dataFile, 'utf8')));
        }
        const view = buildRankUnlockPopupView(1, 2, {
            imperialDecree: true,
            mentorPrompt: true,
            lookup: (k: string, ...args: (string | number)[]) => `${k}:${args.join(',')}`,
        });
        assert.isTrue(!!view, '晉升階位必須成功產出 view');
        assert.isTrue(view!.texts.rankUnlockTitle.includes('ui.officer.promotion.decree_title'));
        assert.isTrue(view!.actives.btnRankUnlockMentor, '晉升縣府佐官必須顯示去教官池按鈕');
    });

    return suite;
}
