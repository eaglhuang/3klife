// @spec-source → 見 docs/cross-reference-index.md (UCUF Wave 2)
/**
 * ResultPopupComposite — 戰鬥結果彈窗（Composite 版）
 * Wave 2 migration from ResultPopup - shows victory/defeat/stalemate results
 */
import { _decorator, BlockInputEvents, Button, Color, Graphics, Label, Layout, Mask, Node, ScrollView, Sprite, Tween, tween, UIOpacity, UITransform, Vec3, Widget } from 'cc';
import { CompositePanel } from '../core/CompositePanel';
import { UITemplateBinder } from '../core/UITemplateBinder';
import { loadGeneralAvatar } from '../core/GeneralAvatarLoader';
import { playTitleFreeze } from '../core/TitleFreezeOverlay';
import type { AwakeningFreezeTiming } from '../../shared/interfaces/IBattleUIComponents';
import { resultPopupTone } from '../../shared/ResultPopupTone';
import { bringNodeToFront } from '../core/NodeBringToFront';
import { stretchWidgetToParent } from '../core/WidgetStretch';
import { ResultDetailsBuffer } from '../../shared/ResultDetailsBuffer';
import { awaitWithTimeout } from '../../core/utils/AwaitGuard';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';
import { services } from '../../core/managers/ServiceLoader';
import { buildResultSections, RESULT_SECTION_TITLE, type ResultDetailRow } from '../../shared/ResultDetailSections';

/** 結算畫面規格掛載的等待上限（毫秒，PROG-2-9404）：畫面規格或皮膚下載 404／卡住時不能讓玩家永遠看不到結果 */
const RESULT_MOUNT_MAX_MS = 15000;

const { ccclass } = _decorator;

export interface BattleResult {
    resultType: 'victory' | 'defeat' | 'stalemate';
    title: string;
    description: string;
    rewards?: string;
}

/** 主動撤退的結算說明（#2107-2） */
export const RETREAT_DESCRIPTION = '主動撤退，本場判定戰敗。';

/**
 * 依結束原因改寫說明第一行（PROG-2-9414）：主將倒下、回合用盡、奪營都不是「敵方突破防線」。
 * 沒對應的原因就用勝敗預設文案。cause 對應 BattleVictoryResolver 的 BattleEndCause。
 */
export const RESULT_CAUSE_DESCRIPTION: Readonly<Record<string, Partial<Record<BattleResult['resultType'], string>>>> = {
    general: { defeat: '主將倒下，我軍潰敗，再接再厲！' },
    fortress: { victory: '我軍攻破敵方城寨，取得大勝！' },
    'time-up': { defeat: '時限已到仍未破敵，我軍鳴金撤兵。', victory: '時限已到，敵軍鳴金退兵，我方獲勝！' },
    camp: { victory: '我軍奪下敵營，敵軍不戰自潰！' },
};

/** 已有多語系的結束原因文案（PROG-2-9424）；找不到翻譯時用 RESULT_CAUSE_DESCRIPTION 的中文 */
const RESULT_CAUSE_I18N: Readonly<Record<string, Partial<Record<BattleResult['resultType'], string>>>> = {
    'time-up': { victory: 'ui.result.cause.time_up_victory', defeat: 'ui.result.cause.time_up_defeat' },
};

/** 取翻譯；多語系還沒載入或缺鍵（t 回傳鍵本身）時用預設中文 */
function tr(key: string, fallback: string): string {
    try {
        const text = services().i18n?.t(key);
        return text && text !== key ? text : fallback;
    } catch {
        return fallback;
    }
}

/** 結算明細排版（PROG-2-9424）：字級固定不縮，放不下就捲動 */
const DETAIL_STYLE = {
    headerFontSize: 28,
    headerLineHeight: 40,
    headerColor: new Color(122, 62, 16, 255),
    headerRuleColor: new Color(176, 122, 42, 200),
    rowFontSize: 26,
    rowLineHeight: 36,
    rowPadding: 6,
    keyWidth: 200,
    keyGap: 20,
    keyColor: new Color(138, 75, 18, 255),
    valueColor: new Color(59, 36, 16, 255),
    zebraColor: new Color(140, 90, 30, 30),
    /** 左右內縮；右側多留給捲軸 */
    insetLeft: 20,
    insetRight: 32,
} as const;

@ccclass('ResultPopupComposite')
export class ResultPopupComposite extends CompositePanel {
    private _binder: UITemplateBinder | null = null;
    private _isMounted = false;
    private _mounting: Promise<void> | null = null;
    private _visible = false;
    private _description = '';
    /** 結算窗掛載完成前追加的細項先存這裡，顯示後補上（PROG-2-9132） */
    private readonly _details = new ResultDetailsBuffer();
    /** 明細列節點池：結算窗重複使用，列節點只建一次，下一場重設文字（手機省節點） */
    private readonly _detailRows: Node[] = [];

    protected onDestroy(): void {
        this.unmount();
        this._isMounted = false;
        this._mounting = null;
    }

    public async show(result: BattleResult): Promise<void> {
        // BattleScene.scene 的 Canvas/Popup 預設為 active=false 且尺寸為 100x100；
        // 必須在 mount 前先開啟節點、撐滿全螢幕尺寸並對齊，否則子層百分比佈局會以 100x100 建構（Issue #2159）。
        this.node.active = true;
        const parentSize = this.node.parent?.getComponent(UITransform)?.contentSize;
        const tf = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        tf.setContentSize(parentSize ? parentSize.width : 1920, parentSize ? parentSize.height : 1080);
        bringNodeToFront(this.node);
        stretchWidgetToParent(this.node.getComponent(Widget) ?? this.node.addComponent(Widget));

        if (!this._isMounted) {
            if (!this._mounting) {
                // 掛載失敗或逾時：不丟錯、不標記已掛載（下次顯示會重試），改走下方的保底結果卡
                this._mounting = awaitWithTimeout(this.mount('result-popup-screen').then(() => true), RESULT_MOUNT_MAX_MS, false,
                    { label: 'result-popup:mount', warn: (m, e) => UCUFLogger.warn(LogCategory.BATTLE, m, e) })
                    .then((ok) => { this._isMounted = ok; });
            }
            try { await this._mounting; } finally { this._mounting = null; }
        }

        this._description = result.description;
        if (!this._isMounted) { this._showEmergencyCard(result); return; }
        // 第一行是勝負說明，放頭像旁大字；其餘明細分區排進捲動區（PROG-2-9424）
        const [verdict, ...detailLines] = result.description.split('\n');
        this._binder?.setTexts({
            TitleLabel: result.title,
            DescLabel: verdict ?? '',
        });
        this._renderDetails(detailLines);
        this._applyResultTone(result.resultType);
        // 地格標籤層、戰鬥紀錄等面板在場景載入後才加進 Canvas，會排在結算窗之上（PROG-2-1878）
        bringNodeToFront(this.node);
        // 場景裡的 Popup host 只設置中、固定 100×100，全螢幕深色遮罩跟著縮小看不到（規格書 §4.2，PROG-2-1879）
        stretchWidgetToParent(this.node.getComponent(Widget) ?? this.node.addComponent(Widget));
        const childWidgets = (this.node as unknown as { getComponentsInChildren?: (ctor: typeof Widget) => Widget[] })
            .getComponentsInChildren?.(Widget) ?? [];
        for (const widget of childWidgets) {
            widget.updateAlignment?.();
        }

        this.node.active = true;
        this._visible = true;
        this._writeDetails(this._details.markShown());
        const opacity = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(opacity).to(0.3, { opacity: 255 }).start();
    }

    /**
     * 保底結果卡（PROG-2-9404）：畫面規格掛載失敗時，用一個 Label 按鈕顯示勝負並可返回大廳，
     * 玩家才不會卡在沒有結果、沒有出口的戰場。
     */
    private _showEmergencyCard(result: BattleResult): void {
        UCUFLogger.warn(LogCategory.BATTLE, '[ResultPopupComposite] 結算畫面掛載失敗，改顯示保底結果卡');
        let card = this.node.getChildByName('EmergencyResult');
        if (!card) {
            card = new Node('EmergencyResult');
            card.layer = this.node.layer;
            card.addComponent(UITransform).setContentSize(900, 300);
            card.addComponent(Label);
            card.addComponent(BlockInputEvents);
            this.node.addChild(card);
            card.addComponent(Button).node.on(Button.EventType.CLICK, this._onClickBack, this);
        }
        const label = card.getComponent(Label)!;
        label.fontSize = 44;
        label.lineHeight = 60;
        label.string = `${result.title}
${result.description}
（點此返回大廳）`;
        card.active = true;
        this.node.active = true;
        this._visible = true;
    }

    public hide(): void {
        this._details.reset();
        const emergency = this.node.getChildByName?.('EmergencyResult');
        if (emergency) emergency.active = false;
        if (!this._visible) return;
        this._visible = false;
        const opacity = this.node.getComponent(UIOpacity);
        if (opacity) {
            tween(opacity).to(0.2, { opacity: 0 }).call(() => {
                this.node.active = false;
            }).start();
        } else {
            this.node.active = false;
        }
    }

    /** BattleScene 使用的結果 key 相容入口。 */
    /** generalId：我方主將（kebab id），結算窗上方顯示其頭像（PROG-2-1128）；沒有則留剪影 */
    public async showResult(result: string, details?: string, generalId?: string, retreated = false, cause?: string): Promise<void> {
        const typeMap: Record<string, BattleResult['resultType']> = {
            'player-win': 'victory', 'victory': 'victory',
            'enemy-win': 'defeat',   'defeat': 'defeat',
            'draw': 'stalemate',     'stalemate': 'stalemate',
        };
        const titleMap: Record<BattleResult['resultType'], string> = {
            victory: '勝利',
            defeat: '失敗',
            stalemate: '平手',
        };
        const descMap: Record<BattleResult['resultType'], string> = {
            victory: '我方成功擊敗敵軍，取得大勝！',
            defeat: '敵方突破防線，再接再厲！',
            stalemate: '雙方勢均力敵，不分勝負。',
        };
        const resultType = typeMap[result] ?? 'stalemate';
        // 主動撤退也判戰敗，但標題與文案要說撤退（#2107-2）
        const retreat = retreated && resultType === 'defeat';
        // 回合用盡也帶 retreated（標題仍是「撤退」），但說明要講時限到，不是玩家主動撤退
        const causeZh = cause ? RESULT_CAUSE_DESCRIPTION[cause]?.[resultType] : undefined;
        const causeKey = cause ? RESULT_CAUSE_I18N[cause]?.[resultType] : undefined;
        const causeDesc = causeZh && causeKey ? tr(causeKey, causeZh) : causeZh;
        const desc = causeDesc ?? (retreat ? RETREAT_DESCRIPTION : descMap[resultType]);
        await this.show({
            resultType,
            title: retreat ? '撤退' : titleMap[resultType],
            description: details ? `${desc}\n${details}` : desc,
        });
        void this._applyGeneralAvatar(generalId);
    }

    /** 結算窗開著時在描述下方追加行（戰後覺醒等非同步結果，PROG-2-1133） */
    public appendDetails(lines: readonly string[]): void {
        this._writeDetails(this._details.push(lines));
    }

    private _writeDetails(lines: readonly string[]): void {
        if (lines.length === 0) return;
        this._description = [this._description, ...lines].join('\n');
        this._renderDetails(this._description.split('\n').slice(1));
    }

    /**
     * 明細分區排版（PROG-2-9424）：區段標題＋底線，每列左側粗體欄名、右側內容自動換行，交錯淡底。
     * 列節點放在 DetailScroll 的 Content 裡（垂直 Layout 自動排），超過高度就捲動。
     */
    private _renderDetails(lines: readonly string[]): void {
        const scroll = this._binder?.getNode('DetailScroll')?.getComponent(ScrollView);
        const content = scroll?.content;
        if (!scroll || !content) return;
        const width = content.getComponent(UITransform)?.contentSize.width ?? 1000;
        let used = 0;
        for (const section of buildResultSections(lines)) {
            const title = RESULT_SECTION_TITLE[section.id];
            this._fillHeader(this._takeRow(content, used++), tr(title.key, title.fallback), width);
            section.rows.forEach((row, index) => this._fillRow(this._takeRow(content, used++), row, width, index % 2 === 0));
        }
        for (let i = used; i < this._detailRows.length; i++) this._detailRows[i].active = false;
        content.getComponent(Layout)?.updateLayout();
        scroll.scrollToTop(0);
    }

    private _takeRow(content: Node, index: number): Node {
        let row = this._detailRows[index];
        if (!row || !row.isValid) {
            row = new Node(`DetailRow${index}`);
            row.layer = content.layer;
            row.addComponent(UITransform).setAnchorPoint(0.5, 0.5);
            const bg = new Node('Bg');
            bg.layer = content.layer;
            bg.parent = row;
            bg.addComponent(UITransform);
            bg.addComponent(Graphics);
            for (const name of ['Key', 'Value']) {
                const child = new Node(name);
                child.layer = content.layer;
                child.parent = row;
                child.addComponent(UITransform).setAnchorPoint(0, 1);
                const label = child.addComponent(Label);
                label.enableWrapText = true;
                label.verticalAlign = Label.VerticalAlign.TOP;
            }
            this._detailRows[index] = row;
        }
        if (row.parent !== content) row.parent = content;
        row.setSiblingIndex(index);
        row.active = true;
        return row;
    }

    /** 設定一個明細標籤並回傳排版後高度；空字串時隱藏、高度 0 */
    private _styleLabel(node: Node | null, text: string, width: number, fontSize: number, lineHeight: number, color: Color, bold: boolean, align: number): number {
        const label = node?.getComponent(Label);
        const tf = node?.getComponent(UITransform);
        if (!node || !label || !tf) return 0;
        node.active = text.length > 0;
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = lineHeight;
        label.color = color;
        label.isBold = bold;
        label.horizontalAlign = align;
        label.overflow = Label.Overflow.RESIZE_HEIGHT;
        tf.setContentSize(Math.max(1, width), lineHeight);
        // 立即排字取得換行後高度（否則要等下一幀渲染，Layout 會用錯高度）
        (label as unknown as { updateRenderData?: (force: boolean) => void }).updateRenderData?.(true);
        return node.active ? Math.max(lineHeight, tf.contentSize.height) : 0;
    }

    private _fillHeader(row: Node, text: string, width: number): void {
        const s = DETAIL_STYLE;
        const key = row.getChildByName('Key');
        const height = this._styleLabel(key, text, width - s.insetLeft - s.insetRight, s.headerFontSize, s.headerLineHeight, s.headerColor, true, Label.HorizontalAlign.LEFT) + 14;
        this._styleLabel(row.getChildByName('Value'), '', 0, s.rowFontSize, s.rowLineHeight, s.valueColor, false, Label.HorizontalAlign.LEFT);
        row.getComponent(UITransform)?.setContentSize(width, height);
        key?.setPosition(-width / 2 + s.insetLeft, height / 2 - 6, 0);
        const g = this._prepareBg(row, width, height);
        if (g) {
            g.strokeColor = s.headerRuleColor;
            g.lineWidth = 2;
            g.moveTo(-width / 2 + s.insetLeft, -height / 2 + 3);
            g.lineTo(width / 2 - s.insetRight, -height / 2 + 3);
            g.stroke();
        }
    }

    private _fillRow(row: Node, data: ResultDetailRow, width: number, zebra: boolean): void {
        const s = DETAIL_STYLE;
        const valueX = data.key.length > 0 ? s.keyWidth + s.keyGap : 0;
        const inner = width - s.insetLeft - s.insetRight;
        const keyH = this._styleLabel(row.getChildByName('Key'), data.key, s.keyWidth, s.rowFontSize, s.rowLineHeight, s.keyColor, true, Label.HorizontalAlign.RIGHT);
        const valueH = this._styleLabel(row.getChildByName('Value'), data.value, inner - valueX, s.rowFontSize, s.rowLineHeight, s.valueColor, false, Label.HorizontalAlign.LEFT);
        const height = Math.max(keyH, valueH) + s.rowPadding * 2;
        row.getComponent(UITransform)?.setContentSize(width, height);
        const left = -width / 2 + s.insetLeft;
        row.getChildByName('Key')?.setPosition(left, height / 2 - s.rowPadding, 0);
        row.getChildByName('Value')?.setPosition(left + valueX, height / 2 - s.rowPadding, 0);
        const g = this._prepareBg(row, width, height);
        if (g && zebra) {
            g.fillColor = s.zebraColor;
            g.roundRect(-width / 2 + 8, -height / 2, width - 8 - s.insetRight + 12, height, 8);
            g.fill();
        }
    }

    private _prepareBg(row: Node, width: number, height: number): Graphics | null {
        const bg = row.getChildByName('Bg');
        bg?.getComponent(UITransform)?.setContentSize(width, height);
        const g = bg?.getComponent(Graphics) ?? null;
        g?.clear();
        return g;
    }

    /** 戰場覺醒定格演出（PROG-2-1702）：暗幕＋大字逐一彈出、停留後淡出；結算窗未開時略過 */
    public async playAwakeningFreeze(titles: readonly string[], timing: AwakeningFreezeTiming): Promise<void> {
        for (const title of titles) {
            if (!this._visible || !this.node.isValid) return;
            await playTitleFreeze(this.node, title, timing, 'AwakeningFreeze');
        }
    }

    /**
     * 依勝敗切外觀（主戰場UI規格書 §4.2，PROG-2-1877）：勝利朱紅標題彈入、失敗整張卡轉灰。
     * 結算窗會重複使用，每次都要重設上一場的狀態。
     */
    private _applyResultTone(resultType: BattleResult['resultType']): void {
        const tone = resultPopupTone(resultType);
        const card = this._binder?.getNode('Card');
        if (card) {
            for (const sprite of card.getComponentsInChildren(Sprite)) sprite.grayscale = tone.grayscale;
        }
        const title = this._binder?.getLabel('TitleLabel');
        if (!title) return;
        const [r, g, b] = tone.titleColor;
        title.color = new Color(r, g, b, 255);
        Tween.stopAllByTarget(title.node);
        title.node.setScale(1, 1, 1);
        if (tone.celebrate) {
            title.node.setScale(1.35, 1.35, 1);
            tween(title.node).to(0.35, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
        }
    }

    private async _applyGeneralAvatar(generalId: string | undefined): Promise<void> {
        const holder = this._binder?.getNode('AvatarMask');
        const sprite = this._binder?.getNode('Avatar')?.getComponent(Sprite);
        if (!holder || !sprite) return;
        if (!holder.getComponent(Mask)) holder.addComponent(Mask).type = Mask.Type.GRAPHICS_ELLIPSE;
        const frame = generalId ? await loadGeneralAvatar(generalId) : null;
        if (frame && sprite.isValid) {
            sprite.spriteFrame = frame;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        }
    }

    protected override _onAfterBuildReady(binder: UITemplateBinder): void {
        this._binder = binder;
        binder.getButton('BtnBack')?.node.on(Button.EventType.CLICK, this._onClickBack, this);
        binder.getButton('BtnReplay')?.node.on(Button.EventType.CLICK, this._onClickReplay, this);
        // 點暗幕不關閉結算窗：戰鬥已結束、棋盤不能再操作，關掉後玩家沒有任何出口會卡在戰場（PROG-2-9307）。
        // 只能從「返回大廳」或「再戰一次」離開；暗幕只負責擋住底下的點擊。
        const overlay = binder.getNode('Overlay');
        if (overlay && !overlay.getComponent(BlockInputEvents)) overlay.addComponent(BlockInputEvents);
    }

    private _onClickBack(): void {
        this.hide();
        this.node.emit('back');
    }

    private _onClickReplay(): void {
        this.hide();
        this.node.emit('replay');
    }
}
