/**
 * RetirementFlowScript.test.ts — 退役流程的職能分流對話與退役語錄（武將系統 §G，PROG-2-1738）
 *
 * Unity 對照：EditMode 測試，假 roster 與假 retireGeneral，只驗控制器的提示文字。
 */
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import {
    RETIRE_FAREWELL_QUOTE,
    RETIRE_ROLE_SPLIT_LINE,
    RetirementFlowController,
} from '../assets/scripts/ui/core/RetirementFlowController';

function gen(id: string, name: string, age: number): GeneralConfig {
    return { id, name, age } as unknown as GeneralConfig;
}

export function createRetirementFlowScriptSuite(): TestSuite {
    const suite = new TestSuite('RetirementFlowScript (退役職能分流與語錄 PROG-2-1738)');

    suite.test('第一次按退役：先問職能分流，再說明轉教官', async () => {
        const flow = new RetirementFlowController({ roster: () => [gen('elder', '黃忠', 70)], retireGeneral: async () => undefined });
        assert.equals('confirmation-required', await flow.retire());
        assert.equals(`${RETIRE_ROLE_SPLIT_LINE}黃忠 將轉為教官，不能再出戰或結緣。再按一次確認退役。`, flow.notice);
    });

    suite.test('確認退役後：提示加上退休語錄', async () => {
        const flow = new RetirementFlowController({ roster: () => [gen('elder', '黃忠', 70)], retireGeneral: async () => undefined });
        await flow.retire();
        assert.equals('retired', await flow.retire());
        assert.equals(`黃忠 已退役，教官卡已保存。${RETIRE_FAREWELL_QUOTE}`, flow.notice);
        assert.equals('「老驥伏櫪，志在千里」', RETIRE_FAREWELL_QUOTE);
    });

    return suite;
}
