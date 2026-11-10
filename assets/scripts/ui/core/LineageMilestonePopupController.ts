// @spec-source → 子嗣五歲抓周揭曉與及冠入學直通學府代際傳承規格書.md (doc_spec_1172)；PROG-2-2204（LOOP-04）
/**
 * LineageMilestonePopupController — 抓周揭曉（三選一）與及冠入學（送入學府／稍後）彈窗。
 *
 * 宿主在換季後、讀檔後呼叫 tryOpen()：隊首有里程碑就開窗。處理完一位自動換下一位，隊列空了就關窗（規格 §三-1）。
 * 「送入學府」交給宿主打開培育介面並選好該子嗣。
 */
import { GRASP_ITEMS, milestoneDesc, milestoneTitle, type GraspItemId, type LineageMilestone } from '../../core/systems/LineageMilestones';
import type { MentorHoldingsButtonBinding, MentorHoldingsHostLike } from './MentorHoldingsController';

export interface LineageMilestoneView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export const GRASP_BUTTONS: Readonly<Record<GraspItemId, { buttonId: string; labelId: string }>> = Object.freeze({
    WOODEN_SWORD: { buttonId: 'btnGraspSword', labelId: 'graspSwordLabel' },
    BAMBOO_SLIP: { buttonId: 'btnGraspBamboo', labelId: 'graspBambooLabel' },
    JADE_PENDANT: { buttonId: 'btnGraspJade', labelId: 'graspJadeLabel' },
});

export type PendingLineageMilestone = LineageMilestone & { generalName: string };

export function lineageMilestoneView(milestone: PendingLineageMilestone): LineageMilestoneView {
    const grasp = milestone.kind === 'grasp';
    const texts: Record<string, string> = {
        milestoneTitle: milestoneTitle(milestone, milestone.generalName),
        milestoneDesc: milestoneDesc(milestone),
        milestoneNote: grasp ? GRASP_ITEMS.map((item) => `${item.label}：${item.note}`).join('\n') : '送入學府後會直接打開培育，並把先祖教官排進編成。',
        sendAcademyLabel: '送入學府',
        milestoneLaterLabel: '稍後再說',
    };
    const actives: Record<string, boolean> = { btnSendAcademy: !grasp, btnMilestoneLater: !grasp };
    const enabled: Record<string, boolean> = { btnSendAcademy: !grasp, btnMilestoneLater: !grasp };
    for (const item of GRASP_ITEMS) {
        const ids = GRASP_BUTTONS[item.id];
        texts[ids.labelId] = item.label;
        actives[ids.buttonId] = grasp;
        enabled[ids.buttonId] = grasp;
    }
    return { texts, actives, enabled };
}

export interface LineageMilestonePopupDeps<H extends MentorHoldingsHostLike> {
    mountHost(bindings: MentorHoldingsButtonBinding[]): Promise<H>;
    apply(host: H, view: LineageMilestoneView): void;
    next(): PendingLineageMilestone | null;
    chooseGrasp(itemId: GraspItemId): Promise<{ ok: true; line: string } | { ok: false; reason: 'none' }>;
    /** 關掉及冠通知；回傳子嗣 id */
    dismissComingOfAge(): Promise<string | null>;
    /** 送入學府：打開培育並選好該子嗣 */
    openAcademy(childId: string): void;
    toast(message: string): void;
}

export class LineageMilestonePopupController<H extends MentorHoldingsHostLike> {
    private _host: H | null = null;
    private _busy = false;

    constructor(private readonly _deps: LineageMilestonePopupDeps<H>) {}

    public async mount(): Promise<void> {
        this._host = await this._deps.mountHost([
            ...GRASP_ITEMS.map((item) => ({ buttonId: GRASP_BUTTONS[item.id].buttonId, handler: () => { void this.grasp(item.id); } })),
            { buttonId: 'btnSendAcademy', handler: () => { void this.comingOfAge(true); } },
            { buttonId: 'btnMilestoneLater', handler: () => { void this.comingOfAge(false); } },
        ]);
        if (this._host) this._host.node.active = false;
    }

    public get host(): H | null {
        return this._host;
    }

    /** 與隊首同步：有就開窗並回傳 true，沒有就關窗 */
    public tryOpen(): boolean {
        if (!this._host || this._busy) return false;
        if (this._show()) return true;
        this._host.node.active = false;
        return false;
    }

    public async grasp(itemId: GraspItemId): Promise<void> {
        await this._run(async () => {
            const result = await this._deps.chooseGrasp(itemId);
            if (result.ok) this._deps.toast(result.line);
        });
    }

    /** 及冠通知：送入學府（true）或稍後（false） */
    public async comingOfAge(sendToAcademy: boolean): Promise<void> {
        let childId: string | null = null;
        await this._run(async () => {
            childId = await this._deps.dismissComingOfAge();
        });
        if (sendToAcademy && childId) this._deps.openAcademy(childId);
    }

    private async _run(task: () => Promise<void>): Promise<void> {
        if (this._busy || !this._host?.node.active) return;
        this._busy = true;
        try {
            await task();
            if (!this._show() && this._host) this._host.node.active = false;
        } finally {
            this._busy = false;
        }
    }

    private _show(): boolean {
        const milestone = this._deps.next();
        if (!milestone || !this._host) return false;
        this._deps.apply(this._host, lineageMilestoneView(milestone));
        this._host.node.active = true;
        return true;
    }
}
