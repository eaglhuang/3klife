// @spec-source → 武將人物介面規格書 §寶頁 2x3 格位；武將裝備道具系統 §「寶 / GEAR」一般裝備六槽；PROG-2-1392（BAG-07 UI）
/**
 * GearPickPanelView — 寶頁選取面板的執行期節點（cc 端，PROG-2-1392）。
 *
 * 依 GearSlotPickController.getFlowView() 的 key 在 hostNode 下建立 Label 與 Button，
 * key 與 gear-slot-picker-main.json 的節點 id 一一對應。版面位置先用簡單直排，視覺交 Codex 實機微調。
 *
 * Unity 對照：像 Presenter 在執行期 Instantiate 一組 Prefab，只負責把 FlowView 的文字與可用狀態寫到節點上，點擊回呼交給 Presenter。
 */
import { Button, Color, Label, Node, UITransform } from 'cc';
import type { GearSlotPickFlowView } from '../../core/GearSlotPickController';

const PANEL_NAME = 'gearPickPanel';
const ROW_COUNT = 8;
const PANEL_WIDTH = 520;
const LINE_HEIGHT = 52;
const LINE_GAP = 8;

export type GearPickClick = 'pick' | 'unequip' | 'manage' | 'lock' | 'decompose' | 'close';

/** 底部按鈕：按鈕 id、文字節點名（與 FlowView 的 text key 對應）、預設文字、點擊種類。 */
const FOOTER_BUTTONS: ReadonlyArray<{ id: string; labelName: string; text: string; click: GearPickClick }> = [
    { id: 'btnGearUnequip', labelName: 'gearUnequipLabel', text: '卸下', click: 'unequip' },
    { id: 'btnGearManage', labelName: 'gearManageLabel', text: '管理', click: 'manage' },
    { id: 'btnGearLock', labelName: 'gearLockLabel', text: '鎖定', click: 'lock' },
    { id: 'btnGearDecompose', labelName: 'gearDecomposeLabel', text: '分解', click: 'decompose' },
    { id: 'btnGearPickClose', labelName: 'gearPickCloseLabel', text: '關閉', click: 'close' },
];

export class GearPickPanelView {
    private readonly _panel: Node;
    private readonly _labels = new Map<string, Label>();
    private readonly _buttons = new Map<string, Node>();

    constructor(
        hostNode: Node,
        private readonly _onClick: (kind: GearPickClick, index: number) => void,
    ) {
        this._panel = new Node(PANEL_NAME);
        this._panel.layer = hostNode.layer;
        hostNode.addChild(this._panel);
        this._panel.addComponent(UITransform).setContentSize(PANEL_WIDTH, 640);
        this._panel.active = false;

        this._addLabel('gearPickTitle', 280, 28);
        this._addLabel('gearPickMessage', 240, 20);
        for (let i = 0; i < ROW_COUNT; i++) {
            const y = 180 - i * (LINE_HEIGHT + LINE_GAP);
            this._addButton(`btnGearPick${i}`, `gearPickLabel${i}`, '', y, () => this._onClick('pick', i));
        }
        FOOTER_BUTTONS.forEach((button, index) => {
            const y = -200 - index * (LINE_HEIGHT + LINE_GAP);
            this._addButton(button.id, button.labelName, button.text, y, () => this._onClick(button.click, -1));
        });
    }

    /** 依 FlowView 寫入文字與可見、可按狀態；面板本身的 active 跟著 gearPickPanel。 */
    public render(view: GearSlotPickFlowView): void {
        for (const [key, text] of Object.entries(view.texts)) {
            const label = this._labels.get(key);
            if (label) label.string = text;
        }
        for (const [key, enabled] of Object.entries(view.actives)) {
            if (key === PANEL_NAME) {
                this._panel.active = enabled;
                continue;
            }
            const node = this._buttons.get(key);
            if (node) node.active = enabled;
        }
    }

    private _addLabel(name: string, y: number, fontSize: number): void {
        const node = new Node(name);
        node.layer = this._panel.layer;
        this._panel.addChild(node);
        node.addComponent(UITransform).setContentSize(PANEL_WIDTH - 40, 40);
        node.setPosition(0, y, 0);
        const label = node.addComponent(Label);
        label.fontSize = fontSize;
        label.color = Color.WHITE;
        this._labels.set(name, label);
    }

    private _addButton(id: string, labelName: string, text: string, y: number, onClick: () => void): void {
        const node = new Node(id);
        node.layer = this._panel.layer;
        this._panel.addChild(node);
        node.addComponent(UITransform).setContentSize(PANEL_WIDTH - 40, LINE_HEIGHT);
        node.setPosition(0, y, 0);
        node.addComponent(Button).node.on(Button.EventType.CLICK, onClick, this);
        const labelNode = new Node(labelName);
        labelNode.layer = node.layer;
        node.addChild(labelNode);
        labelNode.addComponent(UITransform).setContentSize(PANEL_WIDTH - 40, LINE_HEIGHT);
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 20;
        label.color = Color.WHITE;
        this._labels.set(labelName, label);
        this._buttons.set(id, node);
    }
}
