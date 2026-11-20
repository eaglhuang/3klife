// @spec-source → PROG-2-9404（試玩 issue #2319：結束回合後永久卡住）
/**
 * AwaitGuard — 「等不到就放棄」的共用等待工具。
 *
 * 回合推進路徑上有很多 await（載入資源、演出動畫、cut-in、彈窗掛載）。只要有一個 Promise 永遠
 * 不 resolve（下載 404／503 後 callback 沒回、節點被銷毀、演出被打斷），整個回合就停住。
 * 這裡集中提供逾時保護：到時間就當失敗、記一行 warn、回傳 fallback，流程繼續往下走。
 *
 * 時間用真實時鐘（setTimeout），不吃 director 的 dt：戰場暫停（奧義 cut-in）或加速時，逾時照樣準時觸發。
 * 不 import 任何 cc 模組，可直接在 headless 測試使用。
 *
 * Unity 對照：像 Task.WhenAny(task, Task.Delay(ms))；超時就取消等待、用預設值往下走。
 */
import { UCUFLogger, LogCategory } from './UCUFLogger';

export interface AwaitGuardOptions {
  /** 記 log 用的名稱，例如 'combat-visual:unit-damage' */
  label?: string;
  /** 逾時或失敗時呼叫（只用來收尾，不可再丟例外） */
  onFail?: (reason: 'timeout' | 'error', error?: unknown) => void;
  /** 注入 log 函式（測試用）；預設走 UCUFLogger.warn */
  warn?: (message: string, error?: unknown) => void;
}

/**
 * 等 task 最多 ms 毫秒。
 * - 正常完成：回傳 task 的結果。
 * - 逾時或丟錯：記 warn、呼叫 onFail、回傳 fallback。永不 reject、永遠在 ms 內解決。
 * 逾時後 task 仍可能在背景完成，其結果會被忽略。
 */
export function awaitWithTimeout<T>(task: Promise<T> | T, ms: number, fallback: T, options: AwaitGuardOptions = {}): Promise<T> {
  const label = options.label ?? 'await';
  const warn = options.warn ?? ((message: string, error?: unknown) => UCUFLogger.warn(LogCategory.BATTLE, message, error));
  return new Promise<T>((resolve) => {
    let settled = false;
    const finish = (value: T, reason?: 'timeout' | 'error', error?: unknown): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (reason) {
        warn(reason === 'timeout' ? `[AwaitGuard] ${label} 逾時 ${ms}ms，略過等待` : `[AwaitGuard] ${label} 失敗，略過等待`, error);
        try { options.onFail?.(reason, error); } catch { /* 收尾不可再丟例外 */ }
      }
      resolve(value);
    };
    const timer = setTimeout(() => finish(fallback, 'timeout'), ms);
    Promise.resolve(task).then(
      (value) => finish(value),
      (error) => finish(fallback, 'error', error),
    );
  });
}
