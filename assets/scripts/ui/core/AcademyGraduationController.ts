// @spec-source → MVP核心循環貫通與遊玩動線功能規格書.md (doc_spec_0308) Phase 2 畢業審定、CP-07；PROG-2-1956
/**
 * AcademyGraduationController — 學府結業結算彈窗
 *
 * show() 呼叫宿主注入的 graduate（GameSession.graduateFromAcademy）寫回武將，成功就把評級、
 * 新戰法、新特質顯示在彈窗；查無武將或快照未結業時只提示、不開窗。掛載與提示都由宿主注入。
 */
import type { AcademyGraduationResult } from '../../core/systems/nurture/AcademyGraduation';
import type { AcademyStateSnapshot } from '../../core/systems/nurture/AcademyTypes';
import { academyGraduationFailedText, academyGraduationTexts, type AcademyGraduationViewDeps } from './AcademyGraduationView';
import type { MentorHoldingsButtonBinding, MentorHoldingsHostLike } from './MentorHoldingsController';

export interface AcademyGraduationDeps<H extends MentorHoldingsHostLike> {
    mountHost(bindings: MentorHoldingsButtonBinding[]): Promise<H>;
    /** 即 GameSession.graduateFromAcademy；查無武將回傳 null，快照未結業會拋錯 */
    graduate(generalId: string, snapshot: Readonly<AcademyStateSnapshot>): Promise<AcademyGraduationResult | null>;
    /** 檢視文字的名稱與語系查表 */
    view(): AcademyGraduationViewDeps;
    toast(message: string): void;
}

export class AcademyGraduationController<H extends MentorHoldingsHostLike> {
    private _host: H | null = null;

    constructor(private readonly _deps: AcademyGraduationDeps<H>) {}

    public async mount(): Promise<void> {
        this._host = await this._deps.mountHost([
            { buttonId: 'btnAcademyGradClose', handler: () => this.setOpen(false) },
        ]);
        this.setOpen(false);
    }

    public setOpen(open: boolean): void {
        if (this._host) this._host.node.active = open;
    }

    /** 結業並顯示結算；成功回傳結果，失敗回傳 null（名冊不變） */
    public async show(generalId: string, snapshot: Readonly<AcademyStateSnapshot>): Promise<AcademyGraduationResult | null> {
        let result: AcademyGraduationResult | null = null;
        try {
            result = await this._deps.graduate(generalId, snapshot);
        } catch {
            result = null;
        }
        if (!result) {
            this._deps.toast(academyGraduationFailedText(this._deps.view().lookup));
            return null;
        }
        const view = this._deps.view();
        const generalName = view.generalName ?? result.general.name;
        this._host?.binder?.setTexts({ ...academyGraduationTexts(result, { ...view, generalName }) });
        this.setOpen(true);
        return result;
    }
}
