// @spec-source → 見 docs/cross-reference-index.md (UCUF Wave 2)
/**
 * ResultPopupComposite — 戰鬥結果彈窗（Composite 版）
 * Wave 2 migration from ResultPopup - shows victory/defeat/stalemate results
 */
import { _decorator, BlockInputEvents, Button, Color, Label, Mask, Node, Sprite, Tween, tween, UIOpacity, UITransform, Vec3, Widget } from 'cc';
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

@ccclass('ResultPopupComposite')
export class ResultPopupComposite extends CompositePanel {
    private _binder: UITemplateBinder | null = null;
    private _isMounted = false;
    private _mounting: Promise<void> | null = null;
    private _visible = false;
    private _description = '';
    /** 結算窗掛載完成前追加的細項先存這裡，顯示後補上（PROG-2-9132） */
    private readonly _details = new ResultDetailsBuffer();

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
        this._binder?.setTexts({
            TitleLabel: result.title,
            DescLabel: result.description,
        });
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
        const causeDesc = cause ? RESULT_CAUSE_DESCRIPTION[cause]?.[resultType] : undefined;
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
        this._binder?.setTexts({ DescLabel: this._description });
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
