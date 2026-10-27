// @spec-source → 正式版劇本文案 §2.1（開場信件）；大廳系統 開場信件先做簡易面板（PROG-2-1302，COPY-02 面板）
/**
 * UIOpeningLetterPanel — 開場信件的簡易面板（cc 元件，已讀狀態與段落切分在 OpeningLetter）
 *
 * 版面只有三樣：標題、本文、關閉鈕。Win95 視覺風格另卡處理。
 * 標題與本文由呼叫端傳入（i18n 查表後的字串），本元件不自己查字串。
 * 按下關閉後呼叫 onClose，由上層把已讀狀態寫進存檔。
 *
 * Unity 對照：像一個簡單的 Dialog Prefab，Title 與 Body 由外部 Set，關閉按鈕綁一個 callback。
 */
import { _decorator, Button, Component, Label } from 'cc';
import { splitLetterParagraphs } from '../../core/systems/OpeningLetter';

const { ccclass, property } = _decorator;

@ccclass('UIOpeningLetterPanel')
export class UIOpeningLetterPanel extends Component {

    @property(Label)
    titleLabel: Label | null = null;

    @property(Label)
    bodyLabel: Label | null = null;

    @property(Button)
    closeButton: Button | null = null;

    private _onClose: (() => void) | null = null;

    /** 開啟面板；body 為整段本文，段落以空行分隔。 */
    show(title: string, body: string, onClose: () => void): void {
        this._onClose = onClose;
        if (this.titleLabel) this.titleLabel.string = title;
        if (this.bodyLabel) this.bodyLabel.string = splitLetterParagraphs(body).join('\n\n');
        this.node.active = true;
        // 先 off 再 on，同一面板重複開啟時不會疊加多個監聽
        this.closeButton?.node.off(Button.EventType.CLICK, this.handleClose, this);
        this.closeButton?.node.on(Button.EventType.CLICK, this.handleClose, this);
    }

    private handleClose(): void {
        this.closeButton?.node.off(Button.EventType.CLICK, this.handleClose, this);
        this.node.active = false;
        const callback = this._onClose;
        this._onClose = null;
        callback?.();
    }
}
