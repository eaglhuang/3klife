// @spec-source → PROG-2-10070 親子談話；PROG-2-10058 親子好感
/**
 * ChildTalkView — 祠堂畫面「親子談話」區塊的檢視模型（純邏輯，不依賴 cc）
 *
 * 顯示目前選到的孩子（名字、歲數、親子好感）、談話內容或提示，以及「親子談話」「換一位」按鈕狀態。
 * 規則（每年一次、好感增量、話題輪替）都在權威端；這裡只照 family.childLedger 的結果顯示。
 */
import type { FamilyChildLedgerResult } from '../../shared/api/ApiCommands';

export type ChildTalkTranslate = (key: string, ...args: string[]) => string;

export const CHILD_TALK_BUTTON_ID = 'btnChildTalk';
export const CHILD_NEXT_BUTTON_ID = 'btnChildNext';

export interface ChildTalkViewInput {
    snapshot: FamilyChildLedgerResult | null;
    /** 目前選到第幾位孩子（超出範圍會夾回） */
    index: number;
    /** 剛談完的內容（只對同一位孩子顯示，換人就換回提示） */
    lastTalk: { childId: string; line: string } | null;
    t: ChildTalkTranslate;
}

export interface ChildTalkView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export function clampChildIndex(index: number, count: number): number {
    if (count <= 0) return 0;
    return Math.min(count - 1, Math.max(0, Math.floor(index)));
}

export function childTalkView(input: Readonly<ChildTalkViewInput>): ChildTalkView {
    const { snapshot, t } = input;
    const children = snapshot?.children ?? [];
    const talkLabel = t('ui.child.talk_btn');
    if (!snapshot || children.length === 0) {
        return {
            texts: { shrineChildInfo: t('ui.child.talk.none'), shrineChildLine: '', btnChildTalkLabel: talkLabel, btnChildNextLabel: t('ui.child.talk.next') },
            actives: { [CHILD_NEXT_BUTTON_ID]: false },
            enabled: { [CHILD_TALK_BUTTON_ID]: false },
        };
    }
    const child = children[clampChildIndex(input.index, children.length)];
    const favor = Object.prototype.hasOwnProperty.call(snapshot.favor, child.id) ? snapshot.favor[child.id] : snapshot.favorDefault;
    const talked = snapshot.talkedThisYear.includes(child.id);
    const shown = input.lastTalk && input.lastTalk.childId === child.id ? input.lastTalk.line : '';
    return {
        texts: {
            shrineChildInfo: t('ui.child.talk.info', child.name, String(child.age), String(favor)),
            shrineChildLine: shown !== '' ? shown : talked ? t('ui.child.talk.already') : t('ui.child.talk.hint'),
            btnChildTalkLabel: talked ? t('ui.child.talk.done_btn') : talkLabel,
            btnChildNextLabel: t('ui.child.talk.next'),
        },
        actives: { [CHILD_NEXT_BUTTON_ID]: children.length > 1 },
        enabled: { [CHILD_TALK_BUTTON_ID]: !talked },
    };
}
