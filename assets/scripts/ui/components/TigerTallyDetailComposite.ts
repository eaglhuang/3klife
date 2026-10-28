// @spec-source → 見 docs/cross-reference-index.md
/**
 * TigerTallyDetailComposite — 戰鬥場景右側虎符詳情抽屜（第一版）
 *
 * 職責：
 *   1. 點擊左側 tiger tally 卡後，於右側顯示完整的虎符內容摘要
 *   2. 顯示卡面預覽、稀有度、星數、糧耗、基礎數值、來源與典故摘要
 *   3. 呈現 trait / ability 的 detail-ready 內容，作為後續完整 item-card 的前置版本
 *
 * Unity 對照：Screen Space Overlay Canvas 右側抽屜式 Detail Panel
 */
import { _decorator, Button, Color, Label, Layout, Node, Sprite, SpriteFrame, UITransform } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { CompositePanel } from '../core/CompositePanel';
import { UITemplateBinder } from '../core/UITemplateBinder';
import { TallyCardData } from './TigerTallyComposite';
import { SPIRIT_TALLY_DETAIL_SCREEN_ID, spiritTallyDetailOfTally } from '../core/SpiritTallyDetailView';

const { ccclass } = _decorator;

// 虎符詳情與英靈卡詳情共用 spirit-tally-detail-screen（TSK-12，PROG-2-1504）
const UNITINFO_TYPE_ICON_FALLBACK_PATH = 'sprites/battle/battle_unit_type_underlay';
const TROOP_TYPE_SUITE_GLYPH_PREFIX = 'sprites/battle/battle_unit_type_glyph_';
const TALLY_CARD_ART_FALLBACK_PATH = 'sprites/battle/tally_card_art_placeholder/spriteFrame';
const WHITE = new Color(255, 255, 255, 255);
const _DETAIL_TITLE_COLOR = new Color(245, 228, 180, 255);
const DETAIL_BODY_COLOR = new Color(224, 216, 198, 255);
const _DETAIL_MUTED_COLOR = new Color(196, 182, 156, 255);
const DETAIL_TRAIT_COLOR = new Color(149, 212, 198, 255);
const DETAIL_ABILITY_COLOR = new Color(244, 203, 129, 255);

@ccclass('TigerTallyDetailComposite')
export class TigerTallyDetailComposite extends CompositePanel {
    private _binder: UITemplateBinder | null = null;
    private _typeIcon: Sprite | null = null;
    private _artImage: Sprite | null = null;
    private _traitCards: Node | null = null;
    private _abilityCards: Node | null = null;
    private _isMounted = false;
    private _visible = false;

    protected onDestroy(): void {
        this.unmount();
        this._isMounted = false;
    }

    public async show(data: TallyCardData): Promise<void> {
        if (!this._isMounted) {
            await this.mount(SPIRIT_TALLY_DETAIL_SCREEN_ID);
            this._isMounted = true;
        }

        this._populate(data);
        this.node.active = true;
        this._visible = true;
        this.playEnterTransition(this.node, { enter: 'slideLeft', duration: 0.2 });
    }

    public hide(): void {
        if (!this._visible) return;
        this._visible = false;
        this.playExitTransition(this.node, { exit: 'slideRight', duration: 0.18 }, () => {
            this.node.active = false;
        });
    }

    public get isVisible(): boolean { return this._visible; }

    protected override _onAfterBuildReady(binder: UITemplateBinder): void {
        this._binder = binder;
        this._typeIcon = binder.getSprite('TypeIcon');
        this._artImage = binder.getSprite('SpiritCardArt');
        this._traitCards = binder.getNode('TraitCards');
        this._abilityCards = binder.getNode('AbilityCards');

        binder.getNode('BtnCloseSpiritCardDetail')?.on(Button.EventType.CLICK, this.hide, this);
        this.node.active = false;
    }

    private _populate(data: TallyCardData): void {
        this._binder?.setTexts(spiritTallyDetailOfTally(data).texts);

        void this._applyTypeIcon(data);
        void this._applyArt(data);
        this._fillTraitCards(data);
        this._fillAbilityCards(data);
    }

    private _fillTraitCards(data: TallyCardData): void {
        if (!this._traitCards) return;
        this._traitCards.removeAllChildren();
        const rows = data.traitDetails?.length
            ? data.traitDetails.map((detail) => ({ title: detail.label, body: detail.detail ?? '' }))
            : data.traits.map((trait) => ({ title: trait, body: '' }));

        for (const [index, row] of rows.entries()) {
            this._appendDetailRow(this._traitCards, `Trait_${index}`, row.title, row.body, DETAIL_TRAIT_COLOR);
        }
        this._traitCards.getComponent(Layout)?.updateLayout();
    }

    private _fillAbilityCards(data: TallyCardData): void {
        if (!this._abilityCards) return;
        this._abilityCards.removeAllChildren();
        const rows = data.abilityDetails?.length
            ? data.abilityDetails.map((detail) => ({ title: detail.name, body: detail.detail ?? '' }))
            : data.abilities.map((ability) => ({ title: ability, body: '' }));

        for (const [index, row] of rows.entries()) {
            this._appendDetailRow(this._abilityCards, `Ability_${index}`, row.title, row.body, DETAIL_ABILITY_COLOR);
        }
        this._abilityCards.getComponent(Layout)?.updateLayout();
    }

    private _appendDetailRow(
        container: Node,
        nodeName: string,
        title: string,
        body: string,
        titleColor: Color,
    ): void {
        const parentTransform = container.getComponent(UITransform);
        const width = Math.max((parentTransform?.width ?? 320) - 8, 220);
        const rowHeight = body ? 42 : 22;

        const row = new Node(nodeName);
        row.parent = container;
        const rowTransform = row.addComponent(UITransform);
        rowTransform.setContentSize(width, rowHeight);

        const rowLayout = row.addComponent(Layout);
        rowLayout.type = Layout.Type.VERTICAL;
        rowLayout.spacingY = body ? 2 : 0;
        rowLayout.resizeMode = Layout.ResizeMode.CONTAINER;

        this._appendRowLabel(row, `${nodeName}_Title`, title, titleColor, 13, 18, true);
        if (body) {
            this._appendRowLabel(row, `${nodeName}_Body`, body, DETAIL_BODY_COLOR, 12, 17, false);
        }
        rowLayout.updateLayout();
    }

    private _appendRowLabel(
        parent: Node,
        nodeName: string,
        text: string,
        color: Color,
        fontSize: number,
        lineHeight: number,
        isBold: boolean,
    ): void {
        const labelNode = new Node(nodeName);
        labelNode.parent = parent;
        const transform = labelNode.addComponent(UITransform);
        transform.setContentSize(Math.max((parent.getComponent(UITransform)?.width ?? 320) - 6, 210), lineHeight + 2);
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = lineHeight;
        label.color = color;
        label.isBold = isBold;
        label.horizontalAlign = Label.HorizontalAlign.LEFT;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.overflow = Label.Overflow.CLAMP;
    }

    private async _applyTypeIcon(data: TallyCardData): Promise<void> {
        if (!this._typeIcon) return;
        const spriteFrame = await this._loadSpriteFrameWithFallback(
            this._buildTypeIconCandidates(data),
            UNITINFO_TYPE_ICON_FALLBACK_PATH,
        );
        if (!spriteFrame) {
            this._typeIcon.node.active = false;
            return;
        }

        this._typeIcon.spriteFrame = spriteFrame;
        this._typeIcon.color = WHITE;
        this._typeIcon.node.active = true;
    }

    private async _applyArt(data: TallyCardData): Promise<void> {
        if (!this._artImage) return;
        const spriteFrame = await this._loadSpriteFrameWithFallback(
            this._buildArtCandidates(data),
            TALLY_CARD_ART_FALLBACK_PATH,
            { preferTextureFallback: true },
        );
        if (!spriteFrame) {
            this._artImage.node.active = false;
            return;
        }

        this._artImage.spriteFrame = spriteFrame;
        this._artImage.color = WHITE;
        this._artImage.node.active = true;
    }

    private _buildTypeIconCandidates(data: TallyCardData): string[] {
        const normalizedType = this._normalizeKey(data.unitType);
        return this._uniquePaths([
            data.typeIconResource,
            normalizedType ? `sprites/battle/battle_unit_type_icon_${normalizedType}` : null,
            normalizedType ? `${TROOP_TYPE_SUITE_GLYPH_PREFIX}${normalizedType}` : null,
        ]);
    }

    private _buildArtCandidates(data: TallyCardData): string[] {
        const normalizedType = this._normalizeKey(data.unitType);
        return this._uniquePaths([
            data.artResource,
            normalizedType ? `sprites/battle/tally_card_art_${normalizedType}_${data.rarity}` : null,
            normalizedType ? `sprites/battle/tally_card_art_${normalizedType}` : null,
        ]);
    }

    private async _loadSpriteFrameWithFallback(
        preferredPaths: string[],
        fallbackPath: string,
        preferredLoadOptions?: { preferTextureFallback?: boolean },
    ): Promise<SpriteFrame | null> {
        for (const path of preferredPaths) {
            const spriteFrame = await services().resource.loadSpriteFrame(path, preferredLoadOptions).catch(() => null);
            if (spriteFrame) {
                return spriteFrame;
            }
        }

        return services().resource.loadSpriteFrame(fallbackPath).catch(() => null);
    }

    private _uniquePaths(paths: Array<string | null | undefined>): string[] {
        const seen = new Set<string>();
        const result: string[] = [];
        for (const path of paths) {
            const normalized = path?.trim();
            if (!normalized || seen.has(normalized)) continue;
            seen.add(normalized);
            result.push(normalized);
        }
        return result;
    }

    private _normalizeKey(value: string): string {
        return value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }
}
