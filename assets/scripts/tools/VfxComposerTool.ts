import { UCUFLogger, LogCategory } from '../core/utils/UCUFLogger';
// @spec-source → 見 docs/cross-reference-index.md
/**
 * VfxComposerTool — 特效積木組合器 (在遊戲畫面中運行的 VFX 可視化工具)
 */

import {
    _decorator, Component, Node, Label, Button, Color, UITransform, Widget,
    Graphics, Vec3, Vec4, assetManager, AssetManager, Material, MeshRenderer,
    Texture2D, ImageAsset, AudioClip, EffectAsset, gfx, utils, primitives, Layers,
    Canvas, director, Enum, Sprite, SpriteFrame, Prefab, instantiate,
    ParticleSystem, resources, EditBox, ScrollView, Mask, Layout, Animation,
    tween, Tween,
} from "cc";
import { VFX_BLOCK_REGISTRY, VFX_CATEGORIES, VfxBlockDef } from '../core/config/vfx-block-registry';
import { services } from "../core/managers/ServiceLoader";
import { setMaterialSafe } from "../core/utils/MaterialUtils";
import { applyParticleOverride } from "../core/utils/ParticleUtils";

const { ccclass, property } = _decorator;

enum VfxPreviewMode {
    Quad = 0,
    ParticlePrefab = 1,
}

@ccclass("VfxParticlePreviewBinding")
class VfxParticlePreviewBinding {
    @property({ tooltip: "對應的 blockId（例如 ring_addatk）" })
    public blockId = "";

    @property({ type: Prefab, tooltip: "Particle Prefab 預覽模式使用的 Prefab" })
    public prefab: Prefab | null = null;
}

// ─── Layout constants ──────────────────────────────────────────────────────
const PANEL_W   = 760;
const PANEL_H   = 1220;
const ROW_H     = 86;
const MAX_ROWS  = 5;
const PREVIEW_POS = new Vec3(0, 0.5, 0); 
const PREVIEW_DURATION = 5;              
const THUMB_SIZE = 64;
const DEFAULT_FLOOD_RIVER_DIR = new Vec4(-0.5, -0.866, 1.05, 0.78);
const DEFAULT_FLOOD_FOAM_DIR = new Vec4(-1.0, 0.0, 1.0, 1.0);
const LARGE_PREVIEW_SIZE = 220;
const PANEL_SCALE = 0.80;
const TAB_COLS = 5;
const TAB_H = 50;
const PARTICLE_PREVIEW_ROOT_SCALE = 0.22;

const DEFAULT_PARTICLE_PREFAB_PATHS: Record<string, string> = {
    ring_addatk: 'fx/buff/buff_gain_3d',
    icon_addatk: 'fx/buff/buff_gain_3d',
    ring_addlife: 'fx/buff/buff_gain_3d',
    icon_addlife: 'fx/buff/buff_gain_3d',
    ring_subatk: 'fx/buff/buff_debuff_3d',
    icon_subatk: 'fx/buff/buff_debuff_3d',
    ring_sublife: 'fx/buff/buff_debuff_3d',
    icon_sublife: 'fx/buff/buff_debuff_3d',
};

interface ProceduralShaderProfile {
    readonly effectPath: string;
    readonly noiseTexPath?: string;
    readonly flowMapTexPath?: string;
    readonly foamMapTexPath?: string;
    readonly mainColor?: Vec4;
    readonly uvTiling?: Vec4;
    readonly flowParams?: Vec4;
    readonly rippleParams?: Vec4;
    readonly worldFlowParams?: Vec4;
    readonly riverDir?: Vec4;
    readonly foamDir?: Vec4;
    readonly foamParams?: Vec4;
}

interface ProceduralShaderBlock extends VfxBlockDef {
    readonly proceduralShader: string;
}

const PROCEDURAL_VFX_CATEGORIES: Array<{ id: string; label: string }> = [
    { id: 'shaderfx', label: 'ShaderFX' },
];

const PROCEDURAL_VFX_BLOCKS: ProceduralShaderBlock[] = [
    {
        id: 'shader_water_ripple',
        label: 'Water Ripple',
        category: 'shaderfx',
        texPath: 'shaders/tex_shader_line',
        blendMode: 'transparent',
        audio: 'wave',
        scale: 2.2,
        renderMode: 'auto',
        space: 'both',
        proceduralShader: 'water-ripple',
    },
];

const ALL_VFX_CATEGORIES: Array<{ id: string; label: string }> = [
    ...VFX_CATEGORIES,
    ...PROCEDURAL_VFX_CATEGORIES,
];

const ALL_VFX_BLOCKS: VfxBlockDef[] = [
    ...VFX_BLOCK_REGISTRY,
    ...PROCEDURAL_VFX_BLOCKS,
];

const PROCEDURAL_SHADER_PROFILES: Record<string, ProceduralShaderProfile> = {
    shader_water_ripple: {
        effectPath: 'shaders/water-ripple',
        noiseTexPath: 'shaders/tex_noise_perlin',
        flowMapTexPath: 'shaders/tex_noise_perlin',
        foamMapTexPath: 'shaders/tex_shader_line',
        mainColor: new Vec4(0.48, 0.82, 1.0, 0.82),
        uvTiling: new Vec4(1.25, 1.25, 0, 0),
        flowParams: new Vec4(0.18, 0.085, 4.2, 0.08),
        rippleParams: new Vec4(1.2, 1.0, 0.48, 0),
        worldFlowParams: new Vec4(0.12, 0.12, 0.75, 0.7),
        riverDir: DEFAULT_FLOOD_RIVER_DIR,
        foamDir: DEFAULT_FLOOD_FOAM_DIR,
        foamParams: new Vec4(0.56, 0.2, 2.1, 0.42),
    },
};

const STATUS_BUFF_POOL_CONFIGS: Record<string, any> = {
    ring_addatk: {
        variant: 'AtkGain',
        ringTexturePath:  'vfx_core:textures/rings/tex_ring_addatk',
        mainTexturePath:  'vfx_core:textures/icons/tex_icon_addatk',
        arrowTexturePath: 'vfx_core:textures/shapes/tex_shape_arrow_addatk',
        sparkTexturePath: 'vfx_core:textures/glow/ex_hit_flash',
        arrowUp: true,
        label: 'AtkGain',
    },
    icon_addatk: {
        variant: 'AtkGain',
        ringTexturePath:  'vfx_core:textures/rings/tex_ring_addatk',
        mainTexturePath:  'vfx_core:textures/icons/tex_icon_addatk',
        arrowTexturePath: 'vfx_core:textures/shapes/tex_shape_arrow_addatk',
        sparkTexturePath: 'vfx_core:textures/glow/ex_hit_flash',
        arrowUp: true,
        mainScaleMultiplier: 0.78,
        label: 'AtkGain',
    },
    ring_addlife: {
        variant: 'HpGain',
        ringTexturePath:  'vfx_core:textures/rings/tex_ring_addlife',
        mainTexturePath:  'vfx_core:textures/icons/tex_icon_addlife',
        arrowTexturePath: 'vfx_core:textures/shapes/tex_shape_arrow_addlife',
        sparkTexturePath: 'vfx_core:textures/glow/tex_glow_soft',
        arrowUp: true,
        useDualArrows: true,
        label: 'HpGain',
    },
    icon_addlife: {
        variant: 'HpGain',
        ringTexturePath:  'vfx_core:textures/rings/tex_ring_addlife',
        mainTexturePath:  'vfx_core:textures/icons/tex_icon_addlife',
        arrowTexturePath: 'vfx_core:textures/shapes/tex_shape_arrow_addlife',
        sparkTexturePath: 'vfx_core:textures/glow/tex_glow_soft',
        arrowUp: true,
        useDualArrows: true,
        mainScaleMultiplier: 0.78,
        label: 'HpGain',
    },
};

const PARTICLE_TINT_PRESETS: Array<{ label: string; color: Color | null }> = [
    { label: '原色', color: null },
    { label: '金', color: new Color(255, 218, 120, 255) },
    { label: '青', color: new Color(128, 255, 228, 255) },
    { label: '紅', color: new Color(255, 136, 136, 255) },
    { label: '紫', color: new Color(212, 160, 255, 255) },
];

interface PreviewEntry {
    node: Node;
    texture?: Texture2D;
    blockPath?: string;
}

@ccclass("VfxComposerTool")
export class VfxComposerTool extends Component {
    @property({ type: Node, tooltip: '預覽落點；若未指定則優先取棋盤中心' })
    public previewAnchorNode: Node | null = null;

    @property({ type: Enum(VfxPreviewMode), tooltip: '工具開啟時的預設預覽模式' })
    public defaultPreviewMode: VfxPreviewMode = VfxPreviewMode.Quad;

    @property({ tooltip: '點選積木列時是否立即預覽' })
    public autoPreviewOnSelect = true;

    @property({ type: [VfxParticlePreviewBinding], tooltip: 'Particle Prefab 模式的 blockId 對照表' })
    public particlePrefabBindings: VfxParticlePreviewBinding[] = [];

    // ─── State ──────────────────────────────────────────────────────────────
    private vfxBundle: AssetManager.Bundle | null = null;
    private panelVisible    = false;
    private currentCat      = 'glow';
    private currentPreviewMode: VfxPreviewMode = VfxPreviewMode.Quad;
    private composition: VfxBlockDef[] = [];
    private selectedBlockId = '';
    private searchQuery = '';
    private filteredBlocks: VfxBlockDef[] = [];
    private particleTint: Color | null = null;
    private particleTintLabel = '原色';
    private particleSizeMultiplier = 1;
    private particleSpeedMultiplier = 1;

    private previewEntries: PreviewEntry[] = [];
    private thumbnailFrameCache = new Map<string, SpriteFrame>();
    private resourcePrefabCache = new Map<string, Prefab | null>();

    // ─── UI Node refs ────────────────────────────────────────────────────────
    private panel!: Node;
    private blockListContainer!: Node;
    private compLabel!: Label;
    private worldPreviewRoot!: Node;
    private titleLabel!: Label;
    private statusLabel!: Label;
    private selectedPreviewSprite!: Sprite;
    private selectedTitleLabel!: Label;
    private selectedMetaLabel!: Label;
    private tabNodes: { id: string; node: Node }[] = [];
    private quadModeBtn!: Node;
    private particleModeBtn!: Node;
    private buffPoolCache = new Map<string, { node: Node; pool: any }>();
    private particleTintValueLabel!: Label;
    private particleSizeValueLabel!: Label;
    private particleSpeedValueLabel!: Label;

    private previewAnchor = PREVIEW_POS.clone();

    // ─── Lifecycle ──────────────────────────────────────────────────────────
    onLoad() {
        this.currentPreviewMode = this.defaultPreviewMode;

        this.worldPreviewRoot = new Node('VfxPreview_WorldRoot');
        this.worldPreviewRoot.parent = director.getScene()!;
        this.refreshPreviewAnchor();
        this.worldPreviewRoot.setWorldPosition(this.previewAnchor);

        this.loadBundle().then(() => this.buildUI());
    }

    onDestroy() {
        this.clearPreview();
        this.thumbnailFrameCache.forEach(frame => frame.destroy());
        this.thumbnailFrameCache.clear();
        this.buffPoolCache.forEach(({ node }) => { if (node?.isValid) node.destroy(); });
        this.buffPoolCache.clear();
        if (this.worldPreviewRoot?.isValid) this.worldPreviewRoot.destroy();
    }

    private loadBundle(): Promise<void> {
        return new Promise<void>((resolve) => {
            const existing = assetManager.getBundle('vfx_core');
            if (existing) { this.vfxBundle = existing; resolve(); return; }
            assetManager.loadBundle('vfx_core', (err, bundle) => {
                if (!err) {
                    this.vfxBundle = bundle;
                    UCUFLogger.info(LogCategory.DATA, '[VfxComposerTool] vfx_core bundle 載入成功');
                } else {
                    UCUFLogger.warn(LogCategory.DATA, '[VfxComposerTool] vfx_core bundle 載入失敗（特效積木 Quad 預覽停用）:', err);
                }
                resolve();
            });
        });
    }

    private buildUI() {
        const canvas = this.findCanvas();
        if (!canvas) { UCUFLogger.error(LogCategory.DATA, '[VfxComposerTool] Canvas not found'); return; }

        const toggleBtn = this.mkNode('VfxToggleBtn', canvas, 96, 36);
        const tw = toggleBtn.addComponent(Widget);
        tw.isAlignRight = true;  tw.right = 4;
        tw.isAlignVerticalCenter = true;
        this.drawRect(toggleBtn, 96, 36, new Color(30, 50, 120, 220), 5);
        this.mkLabel(toggleBtn, '🎨 VFX', 15, Color.WHITE);
        this.mkButton(toggleBtn, () => this.togglePanel());

        this.panel = this.mkNode('VfxPanel', canvas, PANEL_W, PANEL_H);
        const pw = this.panel.addComponent(Widget);
        pw.isAlignRight = true;  pw.right = 78;
        pw.isAlignTop = true;    pw.top = 10;
        this.panel.setScale(PANEL_SCALE, PANEL_SCALE, 1);
        this.drawRect(this.panel, PANEL_W, PANEL_H, new Color(12, 14, 22, 235), 8);
        this.panel.active = false;

        this.buildPanelContent();
    }

    private buildPanelContent() {
        const p = this.panel;
        const title = this.mkLabel(p, '⚙ 特效積木組合器', 42, new Color(180, 210, 255, 255));
        title.setPosition(0, PANEL_H / 2 - 42);
        this.titleLabel = title.getComponent(Label)!;

        const hint = this.mkLabel(p, '點一下就即時預覽；可切換 Quad / Particle Prefab', 24, new Color(120, 140, 180, 200));
        hint.setPosition(0, PANEL_H / 2 - 96);

        const statusNode = this.mkLabel(p, '預覽模式：Quad / 錨點：棋盤中心', 22, new Color(150, 230, 200, 220));
        statusNode.setPosition(0, PANEL_H / 2 - 142);
        this.statusLabel = statusNode.getComponent(Label)!;

        const modeY = PANEL_H / 2 - 198;
        this.quadModeBtn = this.mkModeButton(p, 'Quad 預覽', new Color(54, 118, 220, 255), -156, modeY, () => this.setPreviewMode(VfxPreviewMode.Quad));
        this.particleModeBtn = this.mkModeButton(p, 'Particle Prefab', new Color(148, 88, 220, 255), 156, modeY, () => this.setPreviewMode(VfxPreviewMode.ParticlePrefab));

        const tabRowTopY = PANEL_H / 2 - 260;
        const tabRows = Math.ceil(ALL_VFX_CATEGORIES.length / TAB_COLS);
        const tabW = (PANEL_W - 10) / TAB_COLS;
        this.tabNodes = [];
        ALL_VFX_CATEGORIES.forEach((cat, i) => {
            const col = i % TAB_COLS;
            const row = Math.floor(i / TAB_COLS);
            const x = -PANEL_W / 2 + 5 + tabW * col + tabW / 2;
            const y = tabRowTopY - row * (TAB_H + 4);
            const tab = this.mkNode(`Tab_${cat.id}`, p, tabW - 4, TAB_H);
            tab.setPosition(x, y);
            this.drawRect(tab, tabW - 4, TAB_H, new Color(35, 45, 75, 230), 3);
            this.mkLabel(tab, cat.label, 22, new Color(190, 200, 230, 255));
            this.mkButton(tab, () => {
                this.selectCategory(cat.id);
            });
            this.tabNodes.push({ id: cat.id, node: tab });
        });

        const tabBottomY = tabRowTopY - (tabRows - 1) * (TAB_H + 4) - TAB_H / 2;
        const searchY = tabBottomY - 38;
        this.mkSearchBox(p, searchY);

        const listH = MAX_ROWS * ROW_H;
        const listY = searchY - 14 - listH / 2;
        const scrollNode = this.mkNode('BlockListScroll', p, PANEL_W - 16, listH);
        scrollNode.setPosition(0, listY);
        this.drawRect(scrollNode, PANEL_W - 16, listH, new Color(18, 22, 38, 220), 4);

        const viewport = this.mkNode('Viewport', scrollNode, PANEL_W - 16, listH);
        viewport.addComponent(Mask);

        this.blockListContainer = this.mkNode('Content', viewport, PANEL_W - 16, listH);
        const contentTransform = this.blockListContainer.getComponent(UITransform)!;
        contentTransform.setAnchorPoint(0.5, 1); 
        this.blockListContainer.setPosition(0, listH / 2);

        const sv = scrollNode.addComponent(ScrollView);
        sv.content = this.blockListContainer;
        sv.horizontal = false;
        sv.vertical = true;

        const compH = 330;
        const compY = listY - listH / 2 - compH / 2 - 6;
        const compArea = this.mkNode('CompArea', p, PANEL_W - 16, compH);
        compArea.setPosition(0, compY);
        this.drawRect(compArea, PANEL_W - 16, compH, new Color(15, 30, 22, 230), 4);

        const compHdr = this.mkLabel(compArea, '目前選中積木', 28, new Color(150, 220, 150, 255));
        compHdr.setPosition(0, compH / 2 - 32);

        const previewCard = this.mkNode('SelectedPreviewCard', compArea, LARGE_PREVIEW_SIZE + 18, LARGE_PREVIEW_SIZE + 18);
        previewCard.setPosition(-208, -6);
        this.drawRect(previewCard, LARGE_PREVIEW_SIZE + 18, LARGE_PREVIEW_SIZE + 18, new Color(12, 16, 28, 255), 8);

        const previewSpriteNode = new Node('SelectedPreviewSprite');
        previewSpriteNode.parent = previewCard;
        const previewSpriteTransform = previewSpriteNode.addComponent(UITransform);
        previewSpriteTransform.setContentSize(LARGE_PREVIEW_SIZE, LARGE_PREVIEW_SIZE);
        this.selectedPreviewSprite = previewSpriteNode.addComponent(Sprite);
        this.selectedPreviewSprite.sizeMode = Sprite.SizeMode.CUSTOM;

        const selectedTitleNode = this.mkTextLabel(compArea, '尚未選擇積木', 32, new Color(240, 248, 255, 255), Label.HorizontalAlign.LEFT, 300, 44);
        selectedTitleNode.setPosition(110, 92);
        this.selectedTitleLabel = selectedTitleNode.getComponent(Label)!;

        const selectedMetaNode = this.mkTextLabel(compArea, '請先點選左側積木。', 22, new Color(170, 196, 220, 255), Label.HorizontalAlign.LEFT, 320, 118);
        selectedMetaNode.setPosition(116, 12);
        this.selectedMetaLabel = selectedMetaNode.getComponent(Label)!;

        const compLblNode = this.mkNode('CompLbl', compArea, 320, 94);
        compLblNode.setPosition(116, -108);
        const cl = compLblNode.addComponent(Label);
        cl.string = '等待預覽';
        this.compLabel = cl;

        const overrideH = 178;
        const overrideY = compY - compH / 2 - overrideH / 2 - 6;
        const overrideArea = this.mkNode('OverrideArea', p, PANEL_W - 16, overrideH);
        overrideArea.setPosition(0, overrideY);
        this.drawRect(overrideArea, PANEL_W - 16, overrideH, new Color(22, 24, 42, 228), 4);
        
        const tintValue = this.mkTextLabel(overrideArea, this.particleTintLabel, 22, new Color(255, 230, 180, 255), Label.HorizontalAlign.LEFT, 78, 28);
        tintValue.setPosition(-238, 30);
        this.particleTintValueLabel = tintValue.getComponent(Label)!;

        PARTICLE_TINT_PRESETS.forEach((preset, index) => {
            const x = -82 + index * 92;
            this.mkMiniActionButton(overrideArea, preset.label, new Color(60, 78, 122, 255), x, 30, 82, () => this.setParticleTint(preset.label, preset.color));
        });

        const sizeValue = this.mkTextLabel(overrideArea, '1.00x', 22, new Color(255, 230, 180, 255), Label.HorizontalAlign.CENTER, 92, 28);
        sizeValue.setPosition(-158, -42);
        this.particleSizeValueLabel = sizeValue.getComponent(Label)!;
        this.mkMiniActionButton(overrideArea, '+', new Color(64, 76, 108, 255), -78, -42, 56, () => this.adjustParticleSize(0.1));

        const speedValue = this.mkTextLabel(overrideArea, '1.00x', 22, new Color(255, 230, 180, 255), Label.HorizontalAlign.CENTER, 92, 28);
        speedValue.setPosition(240, -42);
        this.particleSpeedValueLabel = speedValue.getComponent(Label)!;
        this.mkMiniActionButton(overrideArea, '+', new Color(64, 76, 108, 255), 320, -42, 56, () => this.adjustParticleSpeed(0.1));

        const btnY = overrideY - overrideH / 2 - 30;
        this.mkActionButton(p, '▶ 播放', new Color(40, 160, 70, 255), -PANEL_W / 2 + 132, btnY, () => this.fireComposition());
        this.mkActionButton(p, '✕ 清空', new Color(180, 50, 50, 255), PANEL_W / 2 - 132, btnY, () => this.clearComposition());

        this.selectCategory('glow');
    }

    private selectCategory(catId: string) {
        this.currentCat = catId;
        this.blockListContainer.removeAllChildren();
        const query = this.searchQuery.trim().toLowerCase();
        const blocks = ALL_VFX_BLOCKS.filter(b => b.category === catId)
            .filter(block => query.length === 0
                || block.id.toLowerCase().includes(query)
                || block.label.toLowerCase().includes(query));
        
        const totalH = blocks.length * ROW_H;
        this.blockListContainer.getComponent(UITransform)!.setContentSize(PANEL_W - 16, totalH);

        blocks.forEach((block, i) => {
            const row = this.mkNode(`Block_${block.id}`, this.blockListContainer, PANEL_W - 22, ROW_H - 2);
            row.setPosition(0, -(i * ROW_H + ROW_H / 2));
            this.drawRect(row, PANEL_W - 22, ROW_H - 2, new Color(28, 36, 58, 210), 2);
            this.mkLabel(row, block.label, 28, Color.WHITE).node.setPosition(96, 18);
            this.mkButton(row, () => this.selectBlock(block));
        });
    }

    private selectBlock(block: VfxBlockDef) {
        this.selectedBlockId = block.id;
        this.composition = [block];
        this.refreshCompLabel();
        if (this.autoPreviewOnSelect) void this.fireComposition();
    }

    private clearComposition() {
        this.composition = [];
        this.refreshCompLabel();
        this.clearPreview();
    }

    private refreshCompLabel() {
        if (this.compLabel) this.compLabel.string = this.composition.length > 0 ? this.composition[0].label : '等待預覽';
    }

    private async fireComposition() {
        if (this.composition.length === 0) return;
        this.clearPreview();
        this.refreshPreviewAnchor();
        this.worldPreviewRoot.setWorldPosition(this.previewAnchor);
        for (const block of this.composition) {
            const entry = await this.createWorldQuad(block, 0);
            if (entry) this.previewEntries.push(entry);
        }
        this.scheduleOnce(() => this.clearPreview(), PREVIEW_DURATION);
    }

    private clearPreview() {
        for (const entry of this.previewEntries) {
            if (entry.node?.isValid) entry.node.destroy();
        }
        this.previewEntries = [];
    }

    private async createWorldQuad(block: VfxBlockDef, stackIndex: number): Promise<PreviewEntry | null> {
        if (!block.texPath || !this.vfxBundle) return null;
        const texture = await this.loadVfxTexture(block.texPath);
        if (!texture) return null;
        const node = new Node(`VfxQuad_${block.id}`);
        node.parent = this.worldPreviewRoot;
        node.setScale(block.scale, block.scale, block.scale);
        const mr = node.addComponent(MeshRenderer);
        mr.mesh = utils.MeshUtils.createMesh(primitives.quad());
        return { node, texture };
    }

    private async loadVfxTexture(path: string): Promise<Texture2D | null> {
        return new Promise((resolve) => {
            this.vfxBundle?.load(path, Texture2D, (err, asset) => resolve(err ? null : asset));
        });
    }

    private togglePanel() {
        this.panelVisible = !this.panelVisible;
        this.panel.active = this.panelVisible;
    }

    private setPreviewMode(mode: VfxPreviewMode) { this.currentPreviewMode = mode; }
    private setParticleTint(label: string, color: Color | null) { this.particleTintLabel = label; this.particleTint = color; }
    private adjustParticleSize(delta: number) { this.particleSizeMultiplier += delta; }
    private adjustParticleSpeed(delta: number) { this.particleSpeedMultiplier += delta; }

    private refreshPreviewAnchor() {
        if (this.previewAnchorNode) this.previewAnchor.set(this.previewAnchorNode.worldPosition);
    }

    private findCanvas(): Node | null { return director.getScene()?.getComponentInChildren(Canvas)?.node ?? null; }
    
    private mkNode(name: string, parent: Node, w: number, h: number): Node {
        const n = new Node(name);
        n.parent = parent;
        n.addComponent(UITransform).setContentSize(w, h);
        return n;
    }

    private mkLabel(parent: Node, str: string, size: number, color: Color): Label {
        const l = new Node('Label').addComponent(Label);
        l.node.parent = parent;
        l.string = str;
        l.fontSize = size;
        l.color = color;
        return l;
    }

    private mkTextLabel(parent: Node, str: string, size: number, color: Color, align: any, w: number, h: number): Node {
        const n = new Node('TextLabel');
        n.parent = parent;
        const l = n.addComponent(Label);
        l.string = str;
        l.fontSize = size;
        l.color = color;
        l.horizontalAlign = align;
        n.addComponent(UITransform).setContentSize(w, h);
        return n;
    }

    private mkButton(node: Node, cb: () => void) {
        node.addComponent(Button).node.on(Button.EventType.CLICK, cb);
    }

    private mkActionButton(parent: Node, str: string, color: Color, x: number, y: number, cb: () => void) {
        const n = this.mkNode(str, parent, 200, 60);
        n.setPosition(x, y);
        this.drawRect(n, 200, 60, color, 8);
        this.mkLabel(n, str, 28, Color.WHITE);
        this.mkButton(n, cb);
    }

    private mkMiniActionButton(parent: Node, str: string, color: Color, x: number, y: number, w: number, cb: () => void) {
        const n = this.mkNode(str, parent, w, 40);
        n.setPosition(x, y);
        this.drawRect(n, w, 40, color, 4);
        this.mkLabel(n, str, 20, Color.WHITE);
        this.mkButton(n, cb);
    }

    private mkModeButton(parent: Node, str: string, color: Color, x: number, y: number, cb: () => void): Node {
        const n = this.mkNode(str, parent, 280, 50);
        n.setPosition(x, y);
        this.drawRect(n, 280, 50, color, 4);
        this.mkLabel(n, str, 24, Color.WHITE);
        this.mkButton(n, cb);
        return n;
    }

    private mkSearchBox(parent: Node, y: number) {
        const n = this.mkNode('SearchBox', parent, PANEL_W - 40, 50);
        n.setPosition(0, y);
        this.drawRect(n, PANEL_W - 40, 50, new Color(40, 40, 60, 255), 4);
        const eb = n.addComponent(EditBox);
        eb.placeholder = '搜尋積木...';
        n.on(EditBox.EventType.TEXT_CHANGED, (eb: EditBox) => {
            this.searchQuery = eb.string;
            this.selectCategory(this.currentCat);
        });
    }

    private drawRect(node: Node, w: number, h: number, color: Color, r: number) {
        const g = node.getComponent(Graphics) ?? node.addComponent(Graphics);
        g.fillColor = color;
        g.roundRect(-w / 2, -h / 2, w, h, r);
        g.fill();
    }
}
