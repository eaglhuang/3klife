/**
 * zhTwSkillNames.ts — 測試用：把戰場招式名查詢掛成 zh-TW 語系表（測試環境沒有載入 i18n 字串表）。
 */
import { setBattleSkillNameTranslator } from '../assets/scripts/shared/BattleSkillPresentation';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

export function useZhTwSkillNames(): void {
    const table = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'assets/resources/i18n/zh-TW.json'), 'utf8')) as Record<string, string>;
    setBattleSkillNameTranslator((key) => table[key] ?? key);
}
