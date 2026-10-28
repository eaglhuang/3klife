/**
 * 名士未解鎖提示文案（UI_ORACLE_LOCKED，PROG-2-1293）。純邏輯，不依賴 cc。
 *
 * 語系鍵：ui.oracle.locked（resources/i18n/{locale}.json），參數 {N} = 解鎖所需的累計占卜次數。
 * Unity 對照：像 LocalizedString 帶一個整數參數，語系表還沒載入時退回 zh-TW 預設。
 */

/** 語系鍵；與 resources/i18n/*.json 的 ui.oracle.locked 同步 */
export const ORACLE_LOCKED_KEY = 'ui.oracle.locked';

/** zh-TW 預設文案；與 resources/i18n/zh-TW.json 的 ui.oracle.locked 同步（測試會比對） */
export const ORACLE_LOCKED_FALLBACK_ZH_TW = '此名士尚未解鎖（需累計占卜 {N} 次）';

/** 組出未解鎖提示；template 未傳入時使用 zh-TW 預設。 */
export function oracleLockedText(unlockDivinations: number, template: string = ORACLE_LOCKED_FALLBACK_ZH_TW): string {
    return template.replace('{N}', String(unlockDivinations));
}

/** 占卜／預言結果「名士尚未解鎖」訊息的語系鍵（PROG-2-1294）；參數 {Name} = 名士名稱 */
export const ORACLE_SAGE_LOCKED_KEY = 'ui.oracle.sage_locked';

/** zh-TW 預設；與 resources/i18n/zh-TW.json 的 ui.oracle.sage_locked 同步（測試會比對） */
export const ORACLE_SAGE_LOCKED_FALLBACK_ZH_TW = '{Name}尚未解鎖';

/** 組出結果訊息；template 未傳入時使用 zh-TW 預設。 */
export function sageLockedOutcomeText(sageName: string, template: string = ORACLE_SAGE_LOCKED_FALLBACK_ZH_TW): string {
    return template.replace('{Name}', sageName);
}
