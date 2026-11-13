import { Button, Node, Sprite, Vec3 } from 'cc';
import type { SpriteFrame } from 'cc';
import { battleCandidates, loadFirstAvailableArtCandidate, portraitPathOf } from '../../core/systems/GeneralArtPaths';
import { loadGeneralAvatar } from './GeneralAvatarLoader';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';
import { EVENT_NAMES } from '../../core/config/Constants';
import { services } from '../../core/managers/ServiceLoader';

export type BattleArtSide = 'player' | 'enemy';

export class BattleArtController {
    private readonly _nodes: Record<BattleArtSide, Node | null> = { player: null, enemy: null };
    private readonly _generalIds: Record<BattleArtSide, string | null> = { player: null, enemy: null };
    private readonly _loadSeq: Record<BattleArtSide, number> = { player: 0, enemy: 0 };

    public getGeneralId(side: BattleArtSide): string | null {
        return this._generalIds[side];
    }

    public setGeneralId(side: BattleArtSide, generalId: string): void {
        this._generalIds[side] = generalId;
    }

    public bindPortrait(side: BattleArtSide, node: Node | null): void {
        this._nodes[side] = node;
        if (!node) return;
        const defaultScale = node.scale.clone();
        const pressedScale = new Vec3(defaultScale.x * 1.05, defaultScale.y * 1.05, defaultScale.z);
        node.on(Button.EventType.CLICK, () => this._onPortraitClick(side), this);
        node.on(Node.EventType.TOUCH_START, () => { node.setScale(pressedScale); }, this);
        const resetScale = () => node.setScale(defaultScale);
        node.on(Node.EventType.TOUCH_END, resetScale, this);
        node.on(Node.EventType.TOUCH_CANCEL, resetScale, this);
    }

    public refresh(side: BattleArtSide): void {
        void this._applyPortrait(side);
    }

    public loadTacticFlash(generalId: string): Promise<SpriteFrame | null> {
        return loadFirstAvailableArtCandidate(
            [...battleCandidates(generalId), portraitPathOf(generalId)],
            (path) => services().resource.loadSpriteFrame(path).catch(() => null),
        );
    }

    private _onPortraitClick(side: BattleArtSide): void {
        services().event.emit(EVENT_NAMES.RequestGeneralQuickView, { side, isEnemy: side === 'enemy' });
        UCUFLogger.info(LogCategory.UI, `[BattleHUDComposite] 頭像點擊 → ${side}`);
    }

    private async _applyPortrait(side: BattleArtSide): Promise<void> {
        const portraitNode = this._nodes[side];
        if (!portraitNode) return;
        const generalId = this._generalIds[side];
        const loadSeq = ++this._loadSeq[side];
        const resource = services().resource;
        let spriteFrame: SpriteFrame | null = null;
        if (generalId) {
            spriteFrame = await loadGeneralAvatar(generalId, false);
            if (!spriteFrame) {
                spriteFrame = await resource.loadSpriteFrame(portraitPathOf(generalId)).catch(() => null);
                if (!spriteFrame) UCUFLogger.warn(LogCategory.UI, `[BattleHUDComposite] ${side} 立繪載入失敗：${generalId}`);
            }
        }
        if (!spriteFrame) {
            const placeholder = side === 'player'
                ? 'sprites/battle/portrait_player_placeholder'
                : 'sprites/battle/portrait_enemy_placeholder';
            spriteFrame = await resource.loadSpriteFrame(placeholder).catch(() => null);
        }
        if (loadSeq !== this._loadSeq[side] || !spriteFrame) return;
        const sprite = portraitNode.getComponent(Sprite) ?? portraitNode.addComponent(Sprite);
        sprite.spriteFrame = spriteFrame;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    }
}
