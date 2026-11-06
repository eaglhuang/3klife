// @spec-source → 見 docs/cross-reference-index.md (UCUF Wave 2)
/**
 * ResultPopupComposite — 戰鬥結果彈窗（Composite 版）
 * Wave 2 migration from ResultPopup - shows victory/defeat/stalemate results
 */
import { _decorator, Button, Color, Mask, Node, Sprite, Tween, tween, UIOpacity, Vec3, Widget } from 'cc';
import { CompositePanel } from '../core/CompositePanel';
import { UITemplateBinder } from '../core/UITemplateBinder';
import { loadGeneralAvatar } from '../core/GeneralAvatarLoader';
import { playTitleFreeze } from '../core/TitleFreezeOverlay';
import type { AwakeningFreezeTiming } from '../../shared/interfaces/IBattleUIComponents';
import { resultPopupTone } from '../../shared/ResultPopupTone';
import { bringNodeToFront } from '../core/NodeBringToFront';
import { stretchWidgetToParent } from '../core/WidgetStretch';

const { ccclass } = _decorator;

export interface BattleResult {
    resultType: 'victory' | 'defeat' | 'stalemate';
    title: string;
    description: string;
    rewards?: string;
}

@ccclass('ResultPopupComposite')
export class ResultPopupComposite extends CompositePanel {
    private _binder: UITemplateBinder | null = null;
    private _isMounted = false;
    private _visible = false;
    private _description = '';

    protected onDestroy(): void {
        this.unmount();
        this._isMounted = false;
    }

    public async show(result: BattleResult): Promise<void> {
        if (!this._isMounted) {
            await this.mount('result-popup-screen');
            this._isMounted = true;
        }

        this._description = result.description;
        this._binder?.setTexts({
            TitleLabel: result.title,
            DescLabel: result.description,
        });
        this._applyResultTone(result.resultType);
        // 地格標籤層、戰鬥紀錄等面板在場景載入後才加進 Canvas，會排在結算窗之上（PROG-2-1878）
        bringNodeToFront(this.node);
        // 場景裡的 Popup host 只設置中、固定 100×100，全螢幕深色遮罩跟著縮小看不到（規格書 §4.2，PROG-2-1879）
        stretchWidgetToParent(this.node.getComponent(Widget) ?? this.node.addComponent(Widget));

        this.node.active = true;
        this._visible = true;
        const opacity = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(opacity).to(0.3, { opacity: 255 }).start();
    }

    public hide(): void {
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
    public async showResult(result: string, details?: string, generalId?: string): Promise<void> {
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
        await this.show({
            resultType,
            title: titleMap[resultType],
            description: details ? `${descMap[resultType]}\n${details}` : descMap[resultType],
        });
        void this._applyGeneralAvatar(generalId);
    }

    /** 結算窗開著時在描述下方追加行（戰後覺醒等非同步結果，PROG-2-1133） */
    public appendDetails(lines: readonly string[]): void {
        if (!this._visible || lines.length === 0) return;
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
        binder.getNode('Overlay')?.on(Node.EventType.TOUCH_END, this.hide, this);
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
