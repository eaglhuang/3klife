import type { TrainingMentor } from './NurtureSystem';

/**
 * MentorCardTabs — 教官卡詳情三頁籤與星等鎖頭（MENT-13，純邏輯，不依賴 cc）
 *
 * 規格（教官系統（支援卡）§F-1、§F-4、UI 字串表）：
 *   - 三頁籤：支援效果 / 培育事件 / 小插曲。
 *   - 事件組 n（1 起算）在 ★(n-1) 解鎖，★5 全部解鎖；未達星等顯示鎖頭與「需達 ★N 才可發動」。
 *   - 支援效果每一列可帶 requiredStar，未達者顯示鎖頭。
 *
 * Unity 對照：像一個 Presenter 的 ViewModel，輸入是 ScriptableObject 資料與當前星等，
 * 輸出是「哪個頁籤、每一列要不要鎖」，cc 端只負責把這份資料綁到節點上。
 */

export const MENTOR_CARD_MAX_STAR = 5;

export const MENTOR_CARD_TABS = ['effects', 'events', 'story'] as const;
export type MentorCardTab = typeof MENTOR_CARD_TABS[number];

/** UI_CARD_TAB_* 頁籤名稱（規格 UI 字串表） */
export const MENTOR_CARD_TAB_LABELS: Record<MentorCardTab, string> = {
    effects: '支援效果',
    events: '培育事件',
    story: '小插曲',
};

export interface MentorEffectEntry {
    id: string;
    label: string;
    /** 此效果出現所需星等；未指定視為 ★0 */
    requiredStar?: number;
}

export interface MentorEventEntry {
    id: string;
    /** 事件組序號（1 起算）；組 n 需 ★(n-1) */
    group: number;
    skillName: string;
}

export interface MentorStoryEntry {
    id: string;
    title: string;
}

export interface MentorCardData {
    star: number;
    effects: MentorEffectEntry[];
    events: MentorEventEntry[];
    stories: MentorStoryEntry[];
}

export interface MentorCardRow {
    id: string;
    label: string;
    locked: boolean;
    /** 鎖頭時的提示文字（UI_STAR_LOCKED）；未鎖時為 null */
    lockText: string | null;
}

export interface MentorCardTabView {
    activeTab: MentorCardTab;
    tabs: { id: MentorCardTab; label: string; rowCount: number }[];
    rows: MentorCardRow[];
}

/** 把星等夾到 0..5（存檔可能有髒值） */
export function clampMentorStar(star: number): number {
    if (!Number.isFinite(star)) return 0;
    return Math.max(0, Math.min(MENTOR_CARD_MAX_STAR, Math.floor(star)));
}

/** 事件組 n 所需星等（組 1 → ★0，組 6 → ★5）。 */
export function eventGroupRequiredStar(group: number): number {
    return Math.max(0, group - 1);
}

export function isStarLocked(star: number, requiredStar: number): boolean {
    return clampMentorStar(star) < requiredStar;
}

function lockText(requiredStar: number): string {
    return `需達 ★${requiredStar} 才可發動`;
}

/**
 * 組出目前頁籤的列資料。tab 不合法時退回支援效果頁。
 * 每一列的 locked 只看星等，不看存檔的其他狀態。
 */
export function buildMentorCardTabView(card: MentorCardData, tab: MentorCardTab = 'effects'): MentorCardTabView {
    const star = clampMentorStar(card.star);
    const activeTab: MentorCardTab = (MENTOR_CARD_TABS as readonly string[]).includes(tab) ? tab : 'effects';

    const effectRows: MentorCardRow[] = card.effects.map((e) => {
        const required = clampMentorStar(e.requiredStar ?? 0);
        const locked = isStarLocked(star, required);
        return { id: e.id, label: e.label, locked, lockText: locked ? lockText(required) : null };
    });
    const eventRows: MentorCardRow[] = card.events.map((e) => {
        const required = eventGroupRequiredStar(e.group);
        const locked = isStarLocked(star, required);
        return { id: e.id, label: e.skillName, locked, lockText: locked ? lockText(required) : null };
    });
    // 小插曲不受星等限制（規格只對支援效果與培育事件套用鎖頭）
    const storyRows: MentorCardRow[] = card.stories.map((s) => ({ id: s.id, label: s.title, locked: false, lockText: null }));

    const byTab: Record<MentorCardTab, MentorCardRow[]> = { effects: effectRows, events: eventRows, story: storyRows };
    return {
        activeTab,
        tabs: MENTOR_CARD_TABS.map((id) => ({ id, label: MENTOR_CARD_TAB_LABELS[id], rowCount: byTab[id].length })),
        rows: byTab[activeTab],
    };
}

/** 版面固定列數：與 mentor-card-detail-main.json 的 row_0 … row_5 對應 */
export const MENTOR_CARD_LAYOUT_ROWS = 6;

/**
 * 把 view 轉成 cc 端 applier 要的 texts / actives（節點 id 與 mentor-card-detail-main.json 對齊）。
 * 只做字串與顯示旗標對應，不做規則判斷。
 */
export function toMentorCardLayoutState(view: MentorCardTabView, title: string): { texts: Record<string, string>; actives: Record<string, boolean> } {
    const texts: Record<string, string> = { mentorCardTitle: title };
    const actives: Record<string, boolean> = {};
    for (const tab of view.tabs) {
        const key = tab.id === 'effects' ? 'Effects' : tab.id === 'events' ? 'Events' : 'Story';
        // 目前頁籤在名稱前加「▸」標示，版面不需要額外的 active 節點
        texts[`tab${key}Label`] = tab.id === view.activeTab ? `▸ ${tab.label}` : tab.label;
    }
    for (let i = 0; i < MENTOR_CARD_LAYOUT_ROWS; i++) {
        const row = view.rows[i];
        actives[`row_${i}`] = !!row;
        if (!row) continue;
        texts[`rowLabel_${i}`] = row.label;
        texts[`rowLock_${i}`] = row.lockText ?? '';
        actives[`rowLock_${i}`] = row.locked;
    }
    return { texts, actives };
}

/**
 * 培育中的教官 → 詳情頁資料（入口用）。
 * 目前培育 session 只帶教官的數值與專長，事件與小插曲資料尚未進 session，
 * 所以這裡只給支援效果一列；事件 / 小插曲待接入教官卡資料後補上。
 */
export function mentorToCardData(mentor: Pick<TrainingMentor, 'tpBonus' | 'specialty' | 'stars'>): MentorCardData {
    return {
        star: mentor.stars ?? 0,
        effects: [{ id: 'SUPPORT_BASE', label: `${mentor.specialty} 專長　TP 加成 +${Math.round(mentor.tpBonus)}%` }],
        events: [],
        stories: [],
    };
}
