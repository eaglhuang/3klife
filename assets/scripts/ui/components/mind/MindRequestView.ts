// @spec-source → 武將心智提案 §2.6 主動請求與信箱（PROG-2-9150 MIND-2）
/**
 * 武將信箱的畫面資料（純 TS，不依賴 cc，可單元測試）：把 MindRequest 轉成一列一列「誰、什麼事、可按什麼」。
 * Unity 對照：像 ViewModel，MindRequestPanel 只負責把它畫出來。
 */
import type { MindRequest, MindRequestKind } from '../../../core/mind/MindTypes';

export interface MindRequestButtonView {
    /** true＝答應／採納／寬慰／安撫；false＝駁回／不理 */
    accept: boolean;
    label: string;
}

export interface MindRequestRowView {
    id: string;
    generalId: string;
    kindLabel: string;
    text: string;
    pending: boolean;
    unread: boolean;
    major: boolean;
    buttons: MindRequestButtonView[];
    /** 已回應：顯示武將的反應句 */
    reply: string;
    statusLabel: string;
}

const KIND_LABEL: Readonly<Record<MindRequestKind, string>> = {
    ASK_PROMOTE: '求封', ASK_BATTLE: '請戰', REDEEM: '雪恥', APOLOGIZE: '請罪',
    COMPLAIN_IDLE: '訴苦', ADVISE: '進言', DEFY_LETTER: '抗命信',
};

const BUTTONS: Readonly<Record<MindRequestKind, readonly MindRequestButtonView[]>> = {
    ASK_PROMOTE: [{ accept: true, label: '准' }, { accept: false, label: '駁' }],
    ASK_BATTLE: [{ accept: true, label: '准' }, { accept: false, label: '駁' }],
    REDEEM: [{ accept: true, label: '准' }, { accept: false, label: '駁' }],
    APOLOGIZE: [{ accept: true, label: '寬慰' }, { accept: false, label: '責備' }],
    COMPLAIN_IDLE: [{ accept: true, label: '安撫' }, { accept: false, label: '不理' }],
    ADVISE: [{ accept: true, label: '採納' }, { accept: false, label: '知道了' }],
    DEFY_LETTER: [{ accept: false, label: '知道了' }],
};

const STATUS_LABEL: Readonly<Record<MindRequest['status'], string>> = {
    PENDING: '待回應', GRANTED: '已准', DENIED: '已駁', EXPIRED: '無回音', ACKED: '已閱',
};

export function mindKindLabel(kind: MindRequestKind): string {
    return KIND_LABEL[kind];
}

export function buildMindRequestRows(requests: readonly MindRequest[], nameOf: (generalId: string) => string): MindRequestRowView[] {
    return requests.map((r) => {
        const pending = r.status === 'PENDING';
        return {
            id: r.id,
            generalId: r.generalId,
            kindLabel: `${nameOf(r.generalId)}・${KIND_LABEL[r.kind]}`,
            text: r.text,
            pending,
            unread: pending && !r.read,
            major: r.major,
            buttons: pending ? BUTTONS[r.kind].map((b) => ({ ...b })) : [],
            reply: r.reply ?? '',
            statusLabel: STATUS_LABEL[r.status],
        };
    });
}

/** 入口徽章文字：沒有待回應時只顯示「信箱」 */
export function mindBadgeText(pendingCount: number): string {
    return pendingCount > 0 ? `信箱 ${pendingCount}` : '信箱';
}
