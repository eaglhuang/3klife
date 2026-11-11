// @spec-source → 主戰場UI規格書.md (doc_ui_0001) §戰報控制列 ⚙ 按鈕；面板內容由使用者 2026-11-06 授權自行設計（PROG-2-1890）
/**
 * BattleSettingsComposite — 戰場設定面板（音樂、音效、撤退、繼續戰鬥）
 *
 * 以 `battle-settings-screen` 三層 spec 建構；全畫面半透明遮罩擋住棋盤點擊。
 * 撤退需在同次開啟內按兩次，確認後發出 RetreatRequested，由戰場橋接層判定戰敗。
 *
 * Unity 對照：Overlay Canvas 上的 OptionsMenu Panel，按鈕 onClick 直接改 AudioMixer 參數。
 */
import { _decorator, BlockInputEvents, Button, Label, tween, UIOpacity } from 'cc';
import { CompositePanel } from '../core/CompositePanel';
import { UITemplateBinder } from '../core/UITemplateBinder';
import { EVENT_NAMES } from '../../core/config/Constants';
import { services } from '../../core/managers/ServiceLoader';
import { audioToggleText, retreatButtonText, retreatClick } from '../../core/systems/BattleSettingsView';

const { ccclass } = _decorator;

@ccclass('BattleSettingsComposite')
export class BattleSettingsComposite extends CompositePanel {
    private _isMounted = false;
    private _bgmLabel: Label | null = null;
    private _sfxLabel: Label | null = null;
    private _retreatLabel: Label | null = null;
    private _retreatArmedAt: number | null = null;

    protected onDestroy(): void {
        this.unmount();
        this._isMounted = false;
    }

    public async show(): Promise<void> {
        if (!this._isMounted) {
            await this.mount('battle-settings-screen');
            this._isMounted = true;
        }
        this._retreatArmedAt = null;
        this._render();
        if (this.node.parent) this.node.setSiblingIndex(this.node.parent.children.length - 1);

        this.node.active = true;
        const opacity = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(opacity).to(0.15, { opacity: 255 }).start();
    }

    public hide(): void {
        this._retreatArmedAt = null;
        const opacity = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);
        tween(opacity)
            .to(0.12, { opacity: 0 })
            .call(() => { this.node.active = false; })
            .start();
    }

    protected override _onAfterBuildReady(binder: UITemplateBinder): void {
        if (!this.node.getComponent(BlockInputEvents)) this.node.addComponent(BlockInputEvents);
        this._bgmLabel = binder.getNode('BtnBgm')?.getChildByName('Label')?.getComponent(Label) ?? null;
        this._sfxLabel = binder.getNode('BtnSfx')?.getChildByName('Label')?.getComponent(Label) ?? null;
        this._retreatLabel = binder.getNode('BtnRetreat')?.getChildByName('Label')?.getComponent(Label) ?? null;
        binder.getNode('BtnBgm')?.on(Button.EventType.CLICK, this._onBgmClick, this);
        binder.getNode('BtnSfx')?.on(Button.EventType.CLICK, this._onSfxClick, this);
        binder.getNode('BtnRetreat')?.on(Button.EventType.CLICK, this._onRetreatClick, this);
        binder.getNode('BtnResume')?.on(Button.EventType.CLICK, this.hide, this);
    }

    private _render(): void {
        const audio = services().audio;
        if (this._bgmLabel) this._bgmLabel.string = audioToggleText('bgm', audio.isBgmMuted());
        if (this._sfxLabel) this._sfxLabel.string = audioToggleText('sfx', audio.isSfxMuted());
        if (this._retreatLabel) this._retreatLabel.string = retreatButtonText(this._retreatArmedAt !== null);
    }

    private _onBgmClick(): void {
        const audio = services().audio;
        audio.setBgmMuted(!audio.isBgmMuted());
        this._render();
    }

    private _onSfxClick(): void {
        const audio = services().audio;
        audio.setSfxMuted(!audio.isSfxMuted());
        this._render();
    }

    private _onRetreatClick(): void {
        const next = retreatClick(this._retreatArmedAt, Date.now());
        this._retreatArmedAt = next.armedAt;
        this._render();
        if (!next.confirmed) return;
        this.hide();
        services().event.emit(EVENT_NAMES.RetreatRequested);
    }
}
