/**
 * MissionProjectionText — 把服務層投影的語系參照（MissionI18nRef）組成當前語系的字（純邏輯，不 import 'cc'；PROG-2-10166）
 *
 * 服務層仍回繁中 text（API 相容），並附 i18n 參照；這裡有翻譯函式且查得到鍵就用譯文，
 * 否則一律退回原 text，所以沒載語系的單元測試與舊用戶端畫面不變。
 */
import type { MissionI18nRef, Revealable } from '../../core/mission/MissionTypes';
import type { MissionTr } from '../core/HallDetailActionStates';

/** 多段串接符（各語系 mission.proj.sep）；查不到沿用頓號 */
function separator(tr: MissionTr): string {
    const sep = tr('mission.proj.sep');
    return sep === 'mission.proj.sep' ? '、' : sep;
}

/** 單一參照 → 譯文；查不到鍵回 null（由呼叫端決定保底） */
export function resolveRef(ref: MissionI18nRef, tr: MissionTr): string | null {
    const args = (ref.args ?? []).map((a): string | number => {
        if (typeof a === 'string' || typeof a === 'number') return a;
        if (Array.isArray(a)) return (a as readonly MissionI18nRef[]).map((x) => resolveRef(x, tr) ?? x.fb ?? '').join(separator(tr));
        const one = a as MissionI18nRef;
        return resolveRef(one, tr) ?? one.fb ?? '';
    });
    const text = tr(ref.key, ...args);
    return text === ref.key ? null : text;
}

/** 多段參照 → 譯文；任一段查不到就整句退回 fallback（避免中英混排） */
export function resolveRefs(refs: readonly MissionI18nRef[] | undefined, tr: MissionTr | undefined, fallback: string): string {
    if (!tr || !refs || refs.length === 0) return fallback;
    const parts: string[] = [];
    for (const r of refs) {
        const t = resolveRef(r, tr);
        if (t === null) return fallback;
        parts.push(t);
    }
    return parts.join(separator(tr));
}

/** 單一參照 → 譯文，查不到退回 fallback */
export function resolveOne(ref: MissionI18nRef | undefined, tr: MissionTr | undefined, fallback: string): string {
    return ref ? resolveRefs([ref], tr, fallback) : fallback;
}

/** 可揭露量的顯示文字 */
export function revealableText(r: Pick<Revealable, 'text' | 'i18n'>, tr: MissionTr | undefined): string {
    return resolveRefs(r.i18n, tr, r.text);
}
