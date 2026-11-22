// @spec-source → 戰法系統.md (doc_spec_0038)、奧義系統.md (doc_spec_0030)；武將技頁詳情子視窗（PROG-2-技頁戰法詳情）
/**
 * SkillDetailView — 戰法／奧義詳情子視窗的說明文字組裝（純邏輯，不依賴 cc）。
 *
 * - 所有數值由呼叫端從技能資料傳入（tactic-library、ultimate-definitions、BattleSkillProfile），這裡不寫死任何數字。
 * - 缺欄位（null／undefined／空字串）就不產生該列，不補假資料。
 * - 英文代碼（effectKind、targetMode、timing、scalingStat）轉中文顯示；查無對照時原樣顯示代碼。
 *
 * Unity 對照：像 ViewModel 的純函式，把 Model 組成一組 label/value 列，View 只負責排版。
 */

export type SkillDetailKind = 'tactic' | 'ultimate';

/** 技頁四區塊的狀態：主戰法、已習得、可習得（未啟發）、無法習得（鎖定）。 */
export type SkillDetailState = 'main' | 'learned' | 'inspired' | 'locked';

export interface SkillDetailSource {
    kind: SkillDetailKind;
    name: string;
    /** 名稱下方的招式演出文字（已走 i18n 解析；缺就不顯示） */
    flavor?: string | null;
    /** 奧義的效果說明（資料有才填；戰法目前資料沒有此欄） */
    description?: string | null;
    /** 已格式化的類型文字（例如「衝鋒」），由呼叫端決定格式 */
    category?: string | null;
    /** 計謀點消耗（戰法） */
    tpCost?: number | null;
    /** 精力消耗百分比（奧義） */
    vitalityCostPct?: number | null;
    /** 解鎖所需轉數（奧義） */
    unlockReincarnation?: number | null;
    effectKind?: string | null;
    /** 效果係數，顯示為 ×係數 */
    coefficient?: number | null;
    scalingStat?: string | null;
    targetMode?: string | null;
    timing?: string | null;
    maxTargets?: number | null;
    pendingEffect?: boolean | null;
}

export interface SkillDetailStatus {
    state: SkillDetailState;
    /** 未啟發或無法習得的原因；資料沒有就不填 */
    reason?: string | null;
}

export interface SkillDetailRow {
    label: string;
    value: string;
}

export interface SkillDetailView {
    title: string;
    kindLabel: string;
    /** 招式演出文字；缺就是空字串 */
    flavor: string;
    rows: SkillDetailRow[];
}

const EFFECT_KIND_LABEL: Readonly<Record<string, string>> = {
    damage: '傷害',
    heal: '治療',
    control: '控制',
    link: '連結',
    counter: '反擊',
    reset: '重置',
    push: '擊退',
    'push-fire': '火攻擊退',
    root: '定身',
    slow: '減速',
    dot: '持續傷害',
    morale: '士氣',
    'tile-buff': '格子增益',
    'extra-attack': '追加攻擊',
    vitality: '精力',
    'control-override': '控制覆寫',
    revive: '復活',
    discord: '離間',
};

const TARGET_MODE_LABEL: Readonly<Record<string, string>> = {
    self: '自身',
    'ally-single': '友方單體',
    'enemy-single': '敵方單體',
    'ally-all': '友方全體',
    'enemy-all': '敵方全體',
    line: '直線',
    fan: '扇形',
    'around-self': '自身周圍',
    area: '範圍',
    tile: '指定格',
    'adjacent-tiles': '相鄰格',
    'global-stage': '全場',
    'reactive-source-target': '反應目標',
};

const TIMING_LABEL: Readonly<Record<string, string>> = {
    'active-cast': '主動施放',
    'start-of-battle': '戰鬥開始',
    'start-of-turn': '回合開始',
    'on-attack': '攻擊時',
    'on-hit': '命中時',
    'on-counter': '反擊時',
    'on-kill': '擊殺時',
    'on-death': '死亡時',
    'on-enter-tile': '進入格子時',
    'end-of-turn': '回合結束',
};

const SCALING_STAT_LABEL: Readonly<Record<string, string>> = {
    str: '武力',
    int: '智力',
    lea: '統率',
    pol: '政治',
    cha: '魅力',
    luk: '運勢',
};

const STATE_LABEL: Readonly<Record<SkillDetailState, string>> = {
    main: '已習得（主戰法）',
    learned: '已習得',
    inspired: '可習得（未啟發）',
    locked: '無法習得',
};

function labelOf(table: Readonly<Record<string, string>>, key: string): string {
    return table[key] ?? key;
}

function hasText(value: string | null | undefined): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function hasNumber(value: number | null | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function kindLabelOf(source: SkillDetailSource, state: SkillDetailState): string {
    if (state === 'main') return '主戰法';
    return source.kind === 'ultimate' ? '奧義' : '戰法';
}

function statusValueOf(state: SkillDetailState, reason: string | null | undefined): string {
    const base = STATE_LABEL[state];
    return hasText(reason) ? `${base}（${reason.trim()}）` : base;
}

/** 依資料與狀態組出詳情子視窗的標題與列；缺欄位的列直接略過。 */
export function buildSkillDetailView(source: SkillDetailSource, status: SkillDetailStatus): SkillDetailView {
    const rows: SkillDetailRow[] = [];
    const push = (label: string, value: string | null | undefined): void => {
        if (hasText(value)) rows.push({ label, value });
    };

    push('狀態', statusValueOf(status.state, status.reason));
    push('類型', source.category);
    push('效果說明', source.description);
    push('效果類型', hasText(source.effectKind) ? labelOf(EFFECT_KIND_LABEL, source.effectKind) : null);
    push('效果係數', hasNumber(source.coefficient) ? `×${source.coefficient}` : null);
    push('成長屬性', hasText(source.scalingStat) ? labelOf(SCALING_STAT_LABEL, source.scalingStat) : null);
    push('目標範圍', hasText(source.targetMode) ? labelOf(TARGET_MODE_LABEL, source.targetMode) : null);
    push('發動時機', hasText(source.timing) ? labelOf(TIMING_LABEL, source.timing) : null);
    push('目標數上限', hasNumber(source.maxTargets) ? `${source.maxTargets} 個` : null);
    push('TP 消耗', hasNumber(source.tpCost) ? `${source.tpCost}` : null);
    push('精力消耗', hasNumber(source.vitalityCostPct) ? `${source.vitalityCostPct}%` : null);
    push('解鎖轉數', hasNumber(source.unlockReincarnation) ? `${source.unlockReincarnation} 轉` : null);
    push('效果狀態', source.pendingEffect === true ? '尚未實作，目前不可施放' : null);

    return {
        title: source.name,
        kindLabel: kindLabelOf(source, status.state),
        flavor: hasText(source.flavor) ? source.flavor.trim() : '',
        rows,
    };
}

/** 把詳情列轉成子視窗內文，每列一行「名稱：值」。 */
export function formatSkillDetailText(view: SkillDetailView): string {
    const rows = view.rows.map((row) => `${row.label}：${row.value}`).join('\n');
    return view.flavor ? `${view.flavor}\n\n${rows}` : rows;
}
