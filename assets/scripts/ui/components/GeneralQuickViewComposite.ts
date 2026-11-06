// @spec-source → 主戰場UI規格補充_v3.md (doc_ui_0003) §v3-5 主將屬性戰法快覽小窗；PROG-2-1864
/**
 * GeneralQuickViewComposite — 戰場的主將屬性戰法快覽小窗
 *
 * 畫面規格：ui-spec/screens/general-quickview-screen.json。
 * 點 HUD 頭像 → BattleUIBridge 組好資料廣播 ShowGeneralQuickView → 這裡填字並顯示；
 * 點 × 或小窗外的底板關閉。小窗關閉時根節點不顯示，不擋戰場點擊。
 *
 * Unity 對照：常駐在 Canvas 最上層的 Popup，收到事件才 SetActive(true)。
 */
import { _decorator, Button } from 'cc';
import { CompositePanel } from '../core/CompositePanel';
import type { UITemplateBinder } from '../core/UITemplateBinder';
import { services } from '../../core/managers/ServiceLoader';
import { EVENT_NAMES } from '../../core/config/Constants';
import type { GeneralQuickViewData } from './GeneralQuickViewPanel';
import { generalQuickViewTexts } from './GeneralQuickViewTexts';

const { ccclass } = _decorator;

const SCREEN_ID = 'general-quickview-screen';
const ROOT_ID = 'quickViewRoot';

@ccclass('GeneralQuickViewComposite')
export class GeneralQuickViewComposite extends CompositePanel {
    private _templateBinder: UITemplateBinder | null = null;
    private _data: GeneralQuickViewData | null = null;
    private _mounting = false;
    private readonly _unsubs: Array<() => void> = [];

    public async ensureMounted(): Promise<void> {
        if (this._mounting) return;
        this._mounting = true;
        this._unsubs.push(services().event.on(EVENT_NAMES.ShowGeneralQuickView, (data) => this.show(data as GeneralQuickViewData)));
        await this.mount(SCREEN_ID);
    }

    /** 填入資料並顯示；畫面還沒建好時先記著，建好後補上 */
    public show(data: GeneralQuickViewData): void {
        this._data = data;
        this._apply();
    }

    public hide(): void {
        this._data = null;
        this._apply();
    }

    public get isVisible(): boolean { return this._data !== null && this._templateBinder !== null; }

    protected onDestroy(): void {
        this._unsubs.forEach((off) => off());
        this._unsubs.length = 0;
        this.unmount();
    }

    protected override _onAfterBuildReady(binder: UITemplateBinder): void {
        this._templateBinder = binder;
        binder.getNode('gqCloseBtn')?.on(Button.EventType.CLICK, this.hide, this);
        binder.getNode('bgOverlay')?.on(Button.EventType.CLICK, this.hide, this);
        this._apply();
    }

    private _apply(): void {
        const binder = this._templateBinder;
        if (!binder) return;
        if (!this._data) {
            binder.setActives({ [ROOT_ID]: false });
            return;
        }
        binder.setTexts(generalQuickViewTexts(this._data));
        binder.setActives({ [ROOT_ID]: true });
        // 之後才建的面板會蓋在上面，顯示時把自己移到 Canvas 最上層
        const parent = this.node.parent;
        if (parent) this.node.setSiblingIndex(parent.children.length - 1);
    }
}
