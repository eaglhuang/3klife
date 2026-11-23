/**
 * FeatureUnlockDialogView.ts
 *
 * 全域共用系統解鎖彈窗純函式 ViewState 組裝模組 (PROG-2-9614)
 *
 * 規格依據：
 * 1. 支援官職晉升（縣府佐官等）及後續所有系統解鎖共用。
 * 2. 嚴格對齊 ThemeService 主題語意 Token（default 主題）。
 * 3. 支援小頭像 (GeneralNameTag) 規格掛載，語氣親切活潑。
 */

export interface UnlockedFeatureItem {
    /** 系統或功能識別代碼 */
    featureId: string;
    /** 功能名稱 i18n 鍵值 */
    titleKey: string;
    /** 功能特色說明 i18n 鍵值 */
    descKey: string;
    /** 圖標資源別名或路徑 */
    iconAlias?: string;
    /** 快捷跳轉路由代碼 */
    targetRoute?: string;
    /** 關聯推薦或導流武將 ID（選填，供 GeneralNameTag 顯示） */
    highlightGeneralId?: string;
}

export interface FeatureUnlockDialogThemeTokens {
    panelBg: string;
    panelBorder: string;
    titleColor: string;
    bodyColor: string;
    buttonPrimaryBg: string;
    buttonPrimaryBorder: string;
    buttonPrimaryText: string;
}

export const DEFAULT_FEATURE_UNLOCK_THEME_TOKENS: FeatureUnlockDialogThemeTokens = {
    panelBg: '#2a241e',
    panelBorder: '#c2a67e',
    titleColor: '#f5e8c7',
    bodyColor: '#d6c9b0',
    buttonPrimaryBg: '#8c3826',
    buttonPrimaryBorder: '#e09857',
    buttonPrimaryText: '#ffffff',
};

export interface FeatureUnlockDialogQuery {
    /** 觸發解鎖之事件名稱鍵值（如官職晉升） */
    eventTitleKey: string;
    /** 解鎖之等級或稱號名稱鍵值（如縣府佐官） */
    tierNameKey?: string;
    /** 本次解鎖之所有系統項目 */
    features: readonly UnlockedFeatureItem[];
    /** 祝賀或說明角色武將 ID（選填） */
    announcerGeneralId?: string;
    /** 客製主題 token 覆蓋 */
    customTokens?: Partial<FeatureUnlockDialogThemeTokens>;
}

export interface FeatureUnlockDialogViewState {
    /** 彈窗是否可見 */
    visible: boolean;
    /** 彈窗大標題 i18n 鍵值 */
    dialogTitleKey: string;
    /** 副標題或觸發原因 i18n 鍵值 */
    subtitleKey?: string;
    /** 解鎖功能清單 */
    featureList: readonly UnlockedFeatureItem[];
    /** 播報員武將 ID（選填，掛載 GeneralNameTag） */
    announcerGeneralId?: string;
    /** 確認/前往按鈕文字鍵值 */
    confirmButtonTextKey: string;
    /** 主題語意 Token 映射表 */
    themeTokens: FeatureUnlockDialogThemeTokens;
}

/**
 * 建構系統解鎖彈窗 ViewState
 *
 * @param query 查詢條件
 * @returns ViewState
 */
export function buildFeatureUnlockDialogViewState(
    query: FeatureUnlockDialogQuery
): FeatureUnlockDialogViewState {
    if (!query.features || query.features.length === 0) {
        return {
            visible: false,
            dialogTitleKey: '',
            featureList: [],
            confirmButtonTextKey: 'ui.common.confirm',
            themeTokens: { ...DEFAULT_FEATURE_UNLOCK_THEME_TOKENS, ...query.customTokens },
        };
    }

    return {
        visible: true,
        dialogTitleKey: query.eventTitleKey,
        subtitleKey: query.tierNameKey,
        featureList: [...query.features],
        announcerGeneralId: query.announcerGeneralId,
        confirmButtonTextKey: 'ui.feature_unlock.btn_explore',
        themeTokens: {
            ...DEFAULT_FEATURE_UNLOCK_THEME_TOKENS,
            ...query.customTokens,
        },
    };
}