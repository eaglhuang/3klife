// 出征編制測試用的文案查詢：讀 zh-TW.json 並替換 {0}{1} 佔位符（PROG-2-9911 起 SortieSetupController 文案走 i18n）。
import * as fs from 'fs';
import * as path from 'path';

export function zhTwLookup(): (key: string, ...args: string[]) => string {
    const dict = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/i18n/zh-TW.json'), 'utf8')) as Record<string, string>;
    return (key: string, ...args: string[]) => (dict[key] ?? key).replace(/\{(\d+)\}/g, (m, i: string) => args[Number(i)] ?? m);
}
