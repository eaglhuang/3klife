/**
 * FeatureUnlockDialogView.test.ts
 *
 * 全域共用系統解鎖彈窗 ViewState 單元測試 (PROG-2-9614)
 */

import { TestSuite, assert } from './TestRunner';
import {
    buildFeatureUnlockDialogViewState,
    DEFAULT_FEATURE_UNLOCK_THEME_TOKENS,
} from '../assets/scripts/ui/core/FeatureUnlockDialogView';

export function createFeatureUnlockDialogViewSuite(): TestSuite {
    const suite = new TestSuite('FeatureUnlockDialogView (PROG-2-9614)');

    suite.test('空解鎖清單時應靜默不顯示', () => {
        const viewState = buildFeatureUnlockDialogViewState({
            eventTitleKey: 'ui.promotion.title',
            features: [],
        });
        assert.isFalse(viewState.visible, '無解鎖項目不應彈窗');
    });

    suite.test('正常晉升解鎖時應正確組裝清單與主題 Token', () => {
        const features = [
            {
                featureId: 'recruitment',
                titleKey: 'system.recruitment.title',
                descKey: 'system.recruitment.desc',
                targetRoute: 'recruitment_panel',
            },
            {
                featureId: 'support_cards',
                titleKey: 'system.support_cards.title',
                descKey: 'system.support_cards.desc',
                targetRoute: 'support_card_panel',
            },
        ];

        const viewState = buildFeatureUnlockDialogViewState({
            eventTitleKey: 'ui.promotion.county_officer',
            tierNameKey: 'ui.officer.tier_1',
            features,
            announcerGeneralId: 'gen_zhang_he',
        });

        assert.isTrue(viewState.visible, '應正常顯示');
        assert.equals('ui.promotion.county_officer', viewState.dialogTitleKey, '大標題應相符');
        assert.equals(2, viewState.featureList.length, '應包含 2 個解鎖項目');
        assert.equals('gen_zhang_he', viewState.announcerGeneralId, '應包含播報員 ID');
        assert.equals(DEFAULT_FEATURE_UNLOCK_THEME_TOKENS.panelBg, viewState.themeTokens.panelBg, '主題 Token 應對齊');
    });

    return suite;
}