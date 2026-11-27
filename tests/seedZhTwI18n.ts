// 測試用：把 zh-TW 語系字串塞進全域 i18n 快取，讓走 t(key) 的 UI 文字在 headless 測試也是譯文；回傳還原函數（PROG-2-10124）
import { services } from '../assets/scripts/core/managers/ServiceLoader';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

export function seedZhTwI18n(): () => void {
    const i18n = services().i18n as unknown as { cache: Map<string, unknown>; _locale: string };
    const strings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'resources', 'i18n', 'zh-TW.json'), 'utf8')) as Record<string, string>;
    const hadCache = i18n.cache.get('zh-TW');
    const hadLocale = i18n._locale;
    i18n.cache.set('zh-TW', { strings, fonts: {} });
    i18n._locale = 'zh-TW';
    return () => {
        if (hadCache) i18n.cache.set('zh-TW', hadCache); else i18n.cache.delete('zh-TW');
        i18n._locale = hadLocale;
    };
}

/** 包住測試本體：執行前塞 zh-TW 字串、結束（含非同步）後還原 */
export function withZhTwI18n<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
    return (...args: A): R => {
        const restore = seedZhTwI18n();
        let result: R;
        try {
            result = fn(...args);
        } catch (e) {
            restore();
            throw e;
        }
        if (result && typeof (result as unknown as Promise<unknown>).then === 'function') {
            return (result as unknown as Promise<unknown>).finally(restore) as unknown as R;
        }
        restore();
        return result;
    };
}
