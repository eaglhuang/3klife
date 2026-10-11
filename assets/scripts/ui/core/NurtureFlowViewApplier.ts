// @spec-source → UI 規格補遺_2026-04-11_培育戰場轉蛋pending.md (doc_ui_0031) NurtureSession
/**
 * NurtureFlowViewApplier — 把 NurtureFlowController 吐出的 FlowView 套到 UCUF 組出來的節點上
 *
 * 只做「照單顯示」：文字、顯示 / 隱藏、按鈕可按與否（變暗）。沒有任何規則判斷。
 *
 * Unity 對照：像 View.Bind(viewModel)，把 ViewModel 的欄位一次寫進 Text / GameObject.SetActive /
 * Button.interactable。
 */
import { UIOpacity } from 'cc';
import type { UITemplateBinder } from './UITemplateBinder';
import type { FlowView } from './NurtureFlowController';

const DISABLED_OPACITY = 110;
const ENABLED_OPACITY = 255;

export function applyNurtureFlowView(binder: UITemplateBinder, view: FlowView): void {
    binder.setTexts(view.texts);
    binder.setActives(view.actives);
    for (const [id, enabled] of Object.entries(view.enabled)) {
        const button = binder.getButton(id);
        if (!button) continue;
        button.interactable = enabled;
        const opacity = button.node.getComponent(UIOpacity) ?? button.node.addComponent(UIOpacity);
        opacity.opacity = enabled ? ENABLED_OPACITY : DISABLED_OPACITY;
    }
}
