import type { UITemplateBinder } from '../../core/UITemplateBinder';
import type { UISkinResolver } from '../../core/UISkinResolver';
import type { ChildPanelBase } from '../../core/ChildPanelBase';
import { UIID } from '../../../core/config/UIConfig';
import type { SpiritFamilyOverviewOpenPayload } from '../../core/SpiritFamilyOverviewRoute';
import { GeneralDetailOverviewChild } from '../general-detail/GeneralDetailOverviewChild';
import { OVERVIEW_UNIFIED_CONTENT_CONTRACT_REF } from '../general-detail/GeneralDetailOverviewBindPathPolicy';
import { GeneralDetailBasicsChild } from '../general-detail/GeneralDetailBasicsChild';
import { GeneralDetailStatsChild } from '../general-detail/GeneralDetailStatsChild';
import { GeneralDetailBloodlineChild } from '../general-detail/GeneralDetailBloodlineChild';
import { GeneralDetailSkillsChild } from '../general-detail/GeneralDetailSkillsChild';
import { GeneralDetailAptitudeChild } from '../general-detail/GeneralDetailAptitudeChild';
import { GeneralDetailRecordChild } from '../general-detail/GeneralDetailRecordChild';
import { CharacterDs3StatsChild } from './CharacterDs3StatsChild';
import { CharacterDs3BloodlineChild } from './CharacterDs3BloodlineChild';
import { CharacterDs3TacticsChild } from './CharacterDs3TacticsChild';
import { CharacterDs3EquipChild } from './CharacterDs3EquipChild';
import { CharacterDs3AptitudeChild } from './CharacterDs3AptitudeChild';
import { CharacterDs3OverviewChild } from './CharacterDs3OverviewChild';
import { Button, Color, Label, Node, Sprite, UIOpacity, UITransform } from 'cc';
import type { GeneralConfig, GeneralDetailDefaultTab, GeneralDetailRarityTier } from '../../../core/models/GeneralUnit';
import { services } from '../../../core/managers/ServiceLoader';
import { UCUFLogger, LogCategory } from '../../../core/utils/UCUFLogger';
import { applyPortraitSoftMask, fitPortraitSpriteToLogicalFrame, getOrCreatePortraitArtworkSprite } from '../portrait/PortraitSoftMask';

export type TabKey = 'Overview' | 'Stats' | 'Tactics' | 'Bloodline' | 'Equip' | 'Aptitude' | 'Record';
export const TAB_ORDER: TabKey[] = ['Overview', 'Stats', 'Tactics', 'Bloodline', 'Equip', 'Aptitude', 'Record'];
/** 後加的分頁（PROG-2-0081 戰績）：舊 layout 沒有按鈕時不 fail-fast */
export const OPTIONAL_TABS: ReadonlySet<TabKey> = new Set<TabKey>(['Record']);
/** DS3 版面沒有戰績按鈕，Record 不列入 */
export const DS3_TAB_BUTTON_NODE: Partial<Record<TabKey, string>> = {
    Overview: 'CharacterDs3Main_button_4',
    Stats: 'CharacterDs3Main_button_5',
    Tactics: 'CharacterDs3Main_button_6',
    Bloodline: 'CharacterDs3Main_button_7',
    Equip: 'CharacterDs3Main_button_8',
    Aptitude: 'CharacterDs3Main_button_9',
};
const SPIRIT_FAMILY_SHORTCUT_ROOT_PATH = 'RightContentArea/ContentSlot/TabBloodlineContent/SpiritFamilyState';

interface ResolvedSpiritFamilyState {
    hasFamilyBranch: boolean;
    activeBranchUid: string | null;
    entryLabel: string;
}

interface ChromeHost {
    requireNode(path: string): Node;
    findNode(path: string): Node | null;
    mainRoot(): Node | null;
    currentConfig(): GeneralConfig | null;
    portraitVisible(): boolean;
    activeTab(): TabKey;
    binder(): UITemplateBinder | null;
    skinResolver(): UISkinResolver;
    setButtonVisualState(node: Node, state: 'selected' | 'normal'): void;
    owner(): object;
}

const PORTRAIT_ARTWORK_OVERLAY_HOST_NAME = 'PortraitArtworkOverlayHost';
const PORTRAIT_RARITY_BADGE_PATHS: Record<GeneralDetailRarityTier, string> = {
    common: 'sprites/ui_families/general_detail/icons/v3_parts/badge_rarity_common_flat',
    rare: 'sprites/ui_families/general_detail/icons/v3_parts/badge_rarity_rare_flat',
    epic: 'sprites/ui_families/general_detail/icons/v3_parts/badge_rarity_epic_flat',
    legendary: 'sprites/ui_families/general_detail/icons/v3_parts/badge_rarity_legendary_flat',
    mythic: 'sprites/ui_families/general_detail/icons/v3_parts/badge_rarity_legendary_flat',
};

/** Legacy artwork loading and layout; the host keeps scene navigation and selection. */
export class GeneralDetailChromePresenter {
    private _currentBackgroundResource: string | null = null;
    private _currentPortraitRarityBadgeResource: string | null = null;

    constructor(private readonly host: ChromeHost) {}

    public resetBackground(): void { this._currentBackgroundResource = null; }

    public async loadBackground(resourcePath: string): Promise<void> {
        const normalizedPath = resourcePath.trim();
        if (!normalizedPath) {
            const message = '[GeneralDetailComposite] 背景資源路徑空白';
            UCUFLogger.error(LogCategory.DATA, message);
            throw new Error(message);
        }

        if (this._currentBackgroundResource === normalizedPath) {
            return;
        }

        const node = this.host.requireNode('BackgroundFull');
        const sprite = node.getComponent(Sprite) || node.addComponent(Sprite);
        const frame = await services().resource.loadSpriteFrame(normalizedPath, { preferTextureFallback: true }).catch(() => null);
        if (!frame) {
            const message = `[GeneralDetailComposite] 載入 BackgroundFull spriteFrame 失敗: ${normalizedPath}`;
            UCUFLogger.error(LogCategory.DATA, message);
            throw new Error(message);
        }

        sprite.spriteFrame = frame;
        sprite.type = Sprite.Type.SIMPLE;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.color = Color.WHITE;
        this._currentBackgroundResource = normalizedPath;
        UCUFLogger.info(LogCategory.DATA, '[GeneralDetailComposite] loadBackground complete', {
            resourcePath: normalizedPath,
        });
    }

    public async loadPortrait(resourcePath: string): Promise<void> {
        const normalizedPath = resourcePath.trim();
        UCUFLogger.info(LogCategory.DATA, '[GeneralDetailComposite] loadPortrait start', {
            resourcePath: normalizedPath,
        });
        const node = this.host.requireNode('PortraitImage');
        const portraitOverlayHost = this._getOrCreatePortraitArtworkOverlayHost(node);
        const sprite = getOrCreatePortraitArtworkSprite(portraitOverlayHost);
        if (!sprite) {
            UCUFLogger.error(LogCategory.DATA, '[GeneralDetailComposite] 無法建立 PortraitArtwork sprite');
            return;
        }
        const frame = await services().resource.loadSpriteFrame(normalizedPath, { preferTextureFallback: true }).catch(() => null);
        if (!frame) {
            UCUFLogger.error(LogCategory.DATA,
                `[GeneralDetailComposite] 載入 PortraitImage spriteFrame 失敗: ${normalizedPath}`);
            return;
        }

        sprite.spriteFrame = frame;
        sprite.type = Sprite.Type.SIMPLE;
        sprite.color = Color.WHITE;
        const hostTransform = node.getComponent(UITransform);
        const overlayHostTransform = portraitOverlayHost.getComponent(UITransform);
        UCUFLogger.info(LogCategory.DATA, '[GeneralDetailComposite] portrait spriteFrame assigned', {
            resourcePath: normalizedPath,
            frameWidth: frame.width,
            frameHeight: frame.height,
            originalWidth: frame.originalSize.width,
            originalHeight: frame.originalSize.height,
            offsetX: frame.offset.x,
            offsetY: frame.offset.y,
            hostNode: node.name,
            hostWidth: hostTransform?.width,
            hostHeight: hostTransform?.height,
            overlayHostNode: portraitOverlayHost.name,
            overlayHostWidth: overlayHostTransform?.width,
            overlayHostHeight: overlayHostTransform?.height,
        });
        fitPortraitSpriteToLogicalFrame(sprite);
        const carrierNode = sprite.node.parent;
        const carrierTransform = carrierNode?.getComponent(UITransform);
        const requestedCarrierShiftX = this.host.currentConfig()?.profilePresentation?.portraitCarrierShiftX ?? 0;
        let appliedCarrierShiftX = 0;
        if (carrierNode && carrierTransform && overlayHostTransform) {
            const maxCarrierShiftX = Math.max(0, (overlayHostTransform.width - carrierTransform.width) * 0.5);
            appliedCarrierShiftX = Math.max(-maxCarrierShiftX, Math.min(maxCarrierShiftX, requestedCarrierShiftX));
            carrierNode.setPosition(appliedCarrierShiftX, carrierNode.position.y, carrierNode.position.z);
        }
        UCUFLogger.info(LogCategory.DATA, '[GeneralDetailComposite] portrait fit applied', {
            resourcePath: normalizedPath,
            overlayHostNode: portraitOverlayHost.name,
            carrierNode: carrierNode?.name ?? null,
            carrierWidth: carrierTransform?.width ?? null,
            carrierHeight: carrierTransform?.height ?? null,
            requestedCarrierShiftX,
            appliedCarrierShiftX,
            hostPositionX: node.position.x,
            hostWorldPositionX: node.worldPosition.x,
            carrierPositionX: carrierNode?.position.x ?? null,
            carrierWorldPositionX: carrierNode?.worldPosition.x ?? null,
            portraitNode: sprite.node.name,
            portraitScaleX: sprite.node.scale.x,
            portraitScaleY: sprite.node.scale.y,
            portraitPositionX: sprite.node.position.x,
            portraitPositionY: sprite.node.position.y,
            portraitWorldPositionX: sprite.node.worldPosition.x,
            portraitWorldPositionY: sprite.node.worldPosition.y,
            portraitSizeMode: sprite.sizeMode,
        });
        await applyPortraitSoftMask(sprite);
        this.syncPortraitVisibility();
        UCUFLogger.info(LogCategory.DATA, '[GeneralDetailComposite] loadPortrait complete', {
            resourcePath,
            nodeActive: node.active,
        });
    }

    public async loadPortraitRarityBadge(tier: GeneralDetailRarityTier): Promise<void> {
        const resourcePath = PORTRAIT_RARITY_BADGE_PATHS[tier] ?? PORTRAIT_RARITY_BADGE_PATHS.legendary;
        if (this._currentPortraitRarityBadgeResource === resourcePath) {
            return;
        }

        const node = this._findPortraitRarityBadgeNode();
        if (!node) {
            const message = '[GeneralDetailComposite] 缺少必要節點 PortraitRarityBadge';
            UCUFLogger.error(LogCategory.LIFECYCLE, message);
            throw new Error(message);
        }
        const sprite = node.getComponent(Sprite) || node.addComponent(Sprite);
        const frame = await services().resource.loadSpriteFrame(resourcePath, { preferTextureFallback: true }).catch(() => null);
        if (!frame) {
            UCUFLogger.error(LogCategory.DATA, '[GeneralDetailComposite] 載入 PortraitRarityBadge spriteFrame 失敗', {
                resourcePath,
                tier,
            });
            return;
        }

        sprite.spriteFrame = frame;
        sprite.type = Sprite.Type.SIMPLE;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.color = Color.WHITE;
        this._currentPortraitRarityBadgeResource = resourcePath;
        UCUFLogger.info(LogCategory.DATA, '[GeneralDetailComposite] portrait rarity badge assigned', {
            resourcePath,
            tier,
            frameWidth: frame.width,
            frameHeight: frame.height,
        });
    }

    private _findPortraitRarityBadgeNode(): Node | null {
        const candidates = [
            'PortraitRarityBadge',
            'PortraitCarrier/PortraitRarityBadge',
        ];

        for (const path of candidates) {
            const node = this.host.findNode(path);
            if (node) {
                return node;
            }
        }

        return null;
    }

    /**
     * 依當前 tab 同步 PortraitImage 可見性。
     * Overview 模式下 portrait 顯示（OverviewSlot 的 fragment 處理右側資訊）。
     * Bloodline tab 隱藏 portrait（bloodline fragment 自帶完整佈局）。
     */
    public syncPortraitVisibility(): void {
        const portrait = this.host.findNode('PortraitImage');
        const visible = this.host.portraitVisible();
        if (portrait) {
            portrait.active = visible;
        }

        const overlayHost = this.host.mainRoot()?.getChildByName(PORTRAIT_ARTWORK_OVERLAY_HOST_NAME);
        if (portrait && overlayHost) {
            this._syncPortraitArtworkOverlayHost(portrait, overlayHost);
        }
        if (overlayHost) {
            overlayHost.active = visible;
        }
    }

    private _getOrCreatePortraitArtworkOverlayHost(hostNode: Node): Node {
        const parent = hostNode.parent;
        if (!parent) {
            return hostNode;
        }

        let overlayHost = parent.getChildByName(PORTRAIT_ARTWORK_OVERLAY_HOST_NAME);
        if (!overlayHost) {
            overlayHost = new Node(PORTRAIT_ARTWORK_OVERLAY_HOST_NAME);
            overlayHost.parent = parent;
        }

        this._syncPortraitArtworkOverlayHost(hostNode, overlayHost);
        return overlayHost;
    }

    private _syncPortraitArtworkOverlayHost(hostNode: Node, overlayHost: Node): void {
        const hostTransform = hostNode.getComponent(UITransform);
        const overlayTransform = overlayHost.getComponent(UITransform) || overlayHost.addComponent(UITransform);
        overlayTransform.setAnchorPoint(0.5, 0.5);
        if (hostTransform) {
            overlayTransform.setContentSize(hostTransform.contentSize.width, hostTransform.contentSize.height);
        }

        overlayHost.layer = hostNode.layer;
        overlayHost.setPosition(hostNode.position.x, hostNode.position.y, hostNode.position.z);
        overlayHost.active = hostNode.active;

        const parent = hostNode.parent;
        if (parent && overlayHost.parent !== parent) {
            overlayHost.parent = parent;
        }
        if (parent) {
            overlayHost.setSiblingIndex(Math.min(parent.children.length - 1, hostNode.getSiblingIndex() + 1));
        }
    }



    public createDs3Child(tab: TabKey, slotNode: Node, binder: UITemplateBinder, skinResolver: UISkinResolver): ChildPanelBase {
        switch (tab) {
        case 'Overview':
            return new CharacterDs3OverviewChild(slotNode, skinResolver, binder) as unknown as ChildPanelBase;
        case 'Stats':
            return new CharacterDs3StatsChild(slotNode, skinResolver, binder) as unknown as ChildPanelBase;
        case 'Tactics':
            return new CharacterDs3TacticsChild(slotNode, skinResolver, binder) as unknown as ChildPanelBase;
        case 'Bloodline':
            return new CharacterDs3BloodlineChild(slotNode, skinResolver, binder) as unknown as ChildPanelBase;
        case 'Equip':
            return new CharacterDs3EquipChild(slotNode, skinResolver, binder) as unknown as ChildPanelBase;
        case 'Aptitude':
            return new CharacterDs3AptitudeChild(slotNode, skinResolver, binder) as unknown as ChildPanelBase;
        case 'Record':
            return new GeneralDetailRecordChild(slotNode, skinResolver, binder) as unknown as ChildPanelBase;
        }
    }


    public syncDs3TabVisualState(): void {
        if (!this.host.binder()) {
            return;
        }

        for (const tab of TAB_ORDER) {
            const nodeName = DS3_TAB_BUTTON_NODE[tab];
            const button = nodeName ? this.host.binder().getButton(nodeName) : null;
            if (!button) {
                continue;
            }
            this.host.setButtonVisualState(button.node, tab === this.host.activeTab() ? 'selected' : 'normal');
        }
    }


    public createChild(tab: TabKey, slotNode: Node, binder: UITemplateBinder, skinResolver: UISkinResolver): ChildPanelBase {
        switch (tab) {
        case 'Overview': {
            const child = new GeneralDetailOverviewChild(slotNode, skinResolver, binder);
            child.setCustomProp('contentContractRef', OVERVIEW_UNIFIED_CONTENT_CONTRACT_REF);
            return child as unknown as ChildPanelBase;
        }
        case 'Stats':
            return new GeneralDetailStatsChild(slotNode, skinResolver, binder) as unknown as ChildPanelBase;
        case 'Bloodline':
            return new GeneralDetailBloodlineChild(slotNode, skinResolver, binder) as unknown as ChildPanelBase;
        case 'Tactics':
            return new GeneralDetailSkillsChild(slotNode, skinResolver, binder) as unknown as ChildPanelBase;
        case 'Equip':
            return new GeneralDetailBasicsChild(slotNode, skinResolver, binder) as unknown as ChildPanelBase;
        case 'Aptitude':
            return new GeneralDetailAptitudeChild(slotNode, skinResolver, binder) as unknown as ChildPanelBase;
        case 'Record':
            return new GeneralDetailRecordChild(slotNode, skinResolver, binder) as unknown as ChildPanelBase;
        }
    }


    public resolveEntryTab(config: GeneralConfig): TabKey {
        const preferredTab = config.profilePresentation?.defaultTab as GeneralDetailDefaultTab | undefined;
        switch (preferredTab) {
        case 'Overview':
        case 'Stats':
        case 'Bloodline':
        case 'Aptitude':
            return preferredTab;
        case 'Basics':
            return 'Equip';
        case 'Skills':
            return 'Tactics';
        case 'Extended':
            return 'Aptitude';
        default:
            return 'Overview';
        }
    }


    public syncTabVisualState(): void {
        const activeLabelColor = this.host.skinResolver().resolveColor('#FFE088');
        const inactiveLabelColor = this.host.skinResolver().resolveColor('#B0A880');
        const activeEnLabelColor = this.host.skinResolver().resolveColor('#D0C5AF');
        const inactiveEnLabelColor = this.host.skinResolver().resolveColor('#6B6456');
        const activeSpriteColor = this.host.skinResolver().resolveColor('#FFFFFF');
        const inactiveSpriteColor = this.host.skinResolver().resolveColor('#4D4635');

        for (const tab of TAB_ORDER) {
            const isActive = tab === this.host.activeTab();
            const button = OPTIONAL_TABS.has(tab)
                ? this.host.findNode(`RightTabBar/BtnTab${tab}`)
                : this.host.requireNode(`RightTabBar/BtnTab${tab}`);
            if (!button) continue;
            const opacity = button.getComponent(UIOpacity) || button.addComponent(UIOpacity);
            const label = button.getChildByName('Label')?.getComponent(Label);
            const enLabel = button.getChildByName('EnLabel')?.getComponent(Label);
            this.host.setButtonVisualState(button, isActive ? 'selected' : 'normal');
            button.setScale(isActive ? 1.06 : 1, isActive ? 1.06 : 1, 1);
            opacity.opacity = isActive ? 255 : 224;
            const sprite = button.getComponent(Sprite);
            if (sprite) {
                sprite.color = isActive ? activeSpriteColor : inactiveSpriteColor;
            }
            if (label) {
                label.color = isActive ? activeLabelColor : inactiveLabelColor;
            }
            if (enLabel) {
                enLabel.color = isActive ? activeEnLabelColor : inactiveEnLabelColor;
            }
        }
    }


    public syncSpiritFamilyShortcut(): void {
        const shortcutRoot = this.host.findNode(SPIRIT_FAMILY_SHORTCUT_ROOT_PATH);
        if (!shortcutRoot) {
            return;
        }

        const spiritFamilyState = this._resolveSpiritFamilyState(this.host.currentConfig());
        const shouldShow = this.host.activeTab() === 'Bloodline' && spiritFamilyState.hasFamilyBranch;
        shortcutRoot.active = shouldShow;
        if (!shouldShow) {
            return;
        }

        const hint = spiritFamilyState.activeBranchUid
            ? `已形成世家分支，可前往英靈陳列室管理（${spiritFamilyState.activeBranchUid}）。`
            : '已形成世家分支，可前往英靈陳列室管理。';
        this.setOptionalLabel(`${SPIRIT_FAMILY_SHORTCUT_ROOT_PATH}/SpiritFamilyHint`, hint);
        this.setOptionalLabel(
            `${SPIRIT_FAMILY_SHORTCUT_ROOT_PATH}/SpiritFamilyEntryButton/SpiritFamilyEntryLabel`,
            spiritFamilyState.entryLabel,
        );

        const buttonNode = this.host.findNode(`${SPIRIT_FAMILY_SHORTCUT_ROOT_PATH}/SpiritFamilyEntryButton`);
        if (!buttonNode) {
            return;
        }

        const button = buttonNode.getComponent(Button) || buttonNode.addComponent(Button);
        button.node.off(Button.EventType.CLICK, this._onSpiritFamilyShortcutClick, this);
        button.node.on(Button.EventType.CLICK, this._onSpiritFamilyShortcutClick, this);
    }


    private _onSpiritFamilyShortcutClick(): void {
        const spiritFamilyState = this._resolveSpiritFamilyState(this.host.currentConfig());
        if (!spiritFamilyState.hasFamilyBranch) {
            return;
        }

        const payload: SpiritFamilyOverviewOpenPayload = {
            origin: 'general-detail',
            generalName: this.host.currentConfig()?.name,
            branchUid: spiritFamilyState.activeBranchUid ?? undefined,
            entryLabel: spiritFamilyState.entryLabel,
        };
        void services().ui.open(UIID.SpiritFamilyOverview, payload);
    }


    private _resolveSpiritFamilyState(config: GeneralConfig | null): ResolvedSpiritFamilyState {
        const rawState = config?.spiritFamilyState;
        const activeBranchUid = rawState?.activeBranchUid?.trim() || '';
        return {
            hasFamilyBranch: rawState?.hasFamilyBranch ?? activeBranchUid.length > 0,
            activeBranchUid: activeBranchUid.length > 0 ? activeBranchUid : null,
            entryLabel: rawState?.entryLabel?.trim() || '查看世家',
        };
    }


    public bindClick(path: string, handler: () => void): void {
        const node = this.host.requireNode(path);
        const button = node.getComponent(Button) || node.addComponent(Button);
        button.node.off(Button.EventType.CLICK);
        button.node.on(Button.EventType.CLICK, handler, this.host.owner());
    }


    public bindOptionalClick(path: string, handler: () => void): void {
        const node = this.host.findNode(path);
        if (!node) {
            return;
        }

        const button = node.getComponent(Button) || node.addComponent(Button);
        button.node.off(Button.EventType.CLICK);
        button.node.on(Button.EventType.CLICK, handler, this.host.owner());
    }


    public bindOptionalClickByNodeName(nodeName: string, handler: () => void): void {
        const button = this.host.binder()?.getButton(nodeName);
        if (!button) {
            return;
        }

        button.node.off(Button.EventType.CLICK, handler, this.host.owner());
        button.node.on(Button.EventType.CLICK, handler, this.host.owner());
    }


    public setOptionalLabel(path: string, text: string): void {
        const label = this.host.findNode(path)?.getComponent(Label);
        if (label) {
            label.string = text;
        }
    }
}
