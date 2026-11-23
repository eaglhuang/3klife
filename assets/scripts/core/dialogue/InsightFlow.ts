// @spec-source → NPC人性化規格書（台詞成就「有感而發」）；PROG-2-9864、PROG-2-9885
/**
 * InsightFlow — AI 台詞「有感而發」成就的共用入口：判定新台詞、入帳、跳提示。
 * 大廳對話測試與頭像點擊說話共用同一條，不各寫一份。失敗只記 log，不影響台詞顯示。
 */
import { services } from '../managers/ServiceLoader';
import { UCUFLogger, LogCategory } from '../utils/UCUFLogger';

/** 本機日期 YYYY-MM-DD（每日次數上限的日界線） */
export function localDayKey(now: Date = new Date()): string {
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export async function applyInsightFromDialogue(generalId: string, text: string, generalName: string): Promise<void> {
    try {
        const result = await services().recordInsightDialogue(generalId, text, localDayKey());
        const i18n = services().i18n;
        if (result.decision === 'first') {
            services().event.emit('SHOW_TOAST', {
                message: `${i18n.t('ui.insight.unlock', generalName)}\n${i18n.t('ui.insight.achievement', generalName)}`,
                duration: 4,
            });
        } else if (result.decision === 'step') {
            services().event.emit('SHOW_TOAST', { message: i18n.t('ui.insight.step', generalName), duration: 2.5 });
        }
    } catch (error) {
        UCUFLogger.warn(LogCategory.DATA, '[InsightFlow] insight dialogue failed', { error });
    }
}
