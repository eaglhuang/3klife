/**
 * UIBloodlineMirrorLoading — 把命鏡 state 內容套到已顯示的命鏡畫面，並依輪播名單切換（BML-05；PROG-2-2069）
 *
 * 命鏡 screen 只負責版面；state 內容（文案、英靈亮度、aura、鎖定層）由這裡依契約綁定，
 * 標題改成目前輪到的武將名。
 */
import { UIContentBinder, type ContentContractSchema } from './UIContentBinder';
import type { UITemplateBinder } from './UITemplateBinder';
import type { ContentContractRef } from './UISpecTypes';
import type { MirrorLoadingEntry } from '../../core/systems/MirrorLoadingRotation';

export const BLOODLINE_MIRROR_LOADING_SCREEN_ID = 'bloodline-mirror-loading-screen';
export const BLOODLINE_MIRROR_STATES_PATH = 'ui-spec/content/bloodline-mirror-states-v1';
export const BLOODLINE_MIRROR_CONTRACT_REF: ContentContractRef = {
    schemaId: 'bloodline-mirror-state-content',
    familyId: 'fullscreen-result',
    requiredFields: [],
};

export interface BloodlineMirrorStatesContent {
    states: Record<string, Record<string, unknown>>;
}

/** 套用一位武將的命鏡 state；content 沒有這個 state 時回傳 false 且不動畫面 */
export function applyMirrorLoadingEntry(
    binder: UITemplateBinder,
    content: BloodlineMirrorStatesContent,
    schema: ContentContractSchema | null,
    entry: MirrorLoadingEntry,
    contentBinder: UIContentBinder = new UIContentBinder(),
): boolean {
    const state = content.states?.[entry.stateId];
    if (!state) return false;
    contentBinder.bindWithSchema(binder, BLOODLINE_MIRROR_CONTRACT_REF, schema, state, { suppressUnresolvedWarnings: true });
    binder.setTexts({ HeaderTitle: entry.name });
    return true;
}

export class MirrorLoadingCarousel {
    private _index = -1;

    private constructor(
        private readonly _binder: UITemplateBinder,
        private readonly _content: BloodlineMirrorStatesContent,
        private readonly _schema: ContentContractSchema | null,
        private readonly _entries: readonly MirrorLoadingEntry[],
        private readonly _contentBinder: UIContentBinder,
    ) {}

    static async create(
        binder: UITemplateBinder,
        content: BloodlineMirrorStatesContent,
        entries: readonly MirrorLoadingEntry[],
        contentBinder: UIContentBinder = new UIContentBinder(),
    ): Promise<MirrorLoadingCarousel> {
        const schema = await contentBinder.preloadSchema(BLOODLINE_MIRROR_CONTRACT_REF);
        return new MirrorLoadingCarousel(binder, content, schema, entries, contentBinder);
    }

    /** 換到下一位（尾端接回開頭）；名單為空或 state 缺漏時回傳 null */
    next(): MirrorLoadingEntry | null {
        if (this._entries.length === 0) return null;
        this._index = (this._index + 1) % this._entries.length;
        const entry = this._entries[this._index];
        return applyMirrorLoadingEntry(this._binder, this._content, this._schema, entry, this._contentBinder) ? entry : null;
    }
}
