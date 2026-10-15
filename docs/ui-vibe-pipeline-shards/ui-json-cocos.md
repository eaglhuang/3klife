# UI Vibe Pipeline — JSON 契約與 Cocos 模組（§4–§6）

> 這是 `UI-vibe-pipeline.md` 的「JSON 契約與 Cocos 模組（§4–§6）」分片。完整索引見 `docs/ui/UI-vibe-pipeline.md`。

## 4. 建議資料夾藍圖

```text
assets/
  bundles/
    ui_common/
      sprites/
      prefabs/
    battle_ui/
      sprites/
      prefabs/
    lobby_ui/
      sprites/
      prefabs/
  resources/
    ui-spec/
      layouts/
      screens/
      skins/

artifacts/
  ui-source/
    battle-hud/
      source.png
      slice-manifest.json
    popup-common/
      frame-gold.png
      frame-dark.png
      slice-manifest.json

.github/
  skills/
    ui-vibe-pipeline/
      SKILL.md
      references/
        pipeline.md
        checklists.md
        json-contracts.md
      assets/
        layout.example.json
        skin.example.json
        screen.example.json
        ui-preview-review.example.md
```

---

## 5. JSON 契約藍圖

### 5.1 layout spec 範例

這份檔案定義節點樹、對齊、尺寸、safe area、元件種類。

```json
{
  "id": "battle-hud-main",
  "version": 1,
  "canvas": {
    "fitWidth": true,
    "fitHeight": true,
    "safeArea": true
  },
  "root": {
    "type": "container",
    "name": "BattleHUDRoot",
    "widget": {
      "top": 0,
      "left": 0,
      "right": 0
    },
    "children": [
      {
        "type": "panel",
        "name": "TopBar",
        "widget": {
          "top": 16,
          "left": 16,
          "right": 16
        },
        "height": 120,
        "skinSlot": "hud.topbar.bg",
        "layout": {
          "type": "horizontal",
          "spacing": 12,
          "paddingLeft": 16,
          "paddingRight": 16
        },
        "children": [
          {
            "type": "label",
            "name": "RoundLabel",
            "textKey": "battle.round",
            "styleSlot": "hud.label.title"
          },
          {
            "type": "resource-counter",
            "name": "GrainCounter",
            "iconSlot": "hud.icon.grain",
            "styleSlot": "hud.label.value"
          }
        ]
      },
      {
        "type": "button-group",
        "name": "ActionButtons",
        "widget": {
          "bottom": 24,
          "right": 24
        },
        "layout": {
          "type": "horizontal",
          "spacing": 10
        },
        "items": [
          { "id": "skill", "skinSlot": "hud.button.skill" },
          { "id": "deploy", "skinSlot": "hud.button.deploy" },
          { "id": "pause", "skinSlot": "hud.button.pause" }
        ]
      }
    ]
  }
}
```

### 5.2 skin manifest 範例

這份檔案定義圖塊來源、SpriteFrame 路徑、九宮格、顏色、字型、狀態圖。

```json
{
  "id": "battle-hud-default",
  "version": 1,
  "bundle": "battle_ui",
  "atlasPolicy": "battle_hud",
  "slots": {
    "hud.topbar.bg": {
      "kind": "sprite-frame",
      "path": "sprites/hud/topbar_bg/spriteFrame",
      "spriteType": "sliced",
      "border": [24, 24, 24, 24],
      "allowAutoAtlas": true,
      "bleed": 4
    },
    "hud.icon.grain": {
      "kind": "sprite-frame",
      "path": "sprites/hud/icon_grain/spriteFrame",
      "spriteType": "simple",
      "allowAutoAtlas": true
    },
    "hud.button.skill": {
      "kind": "button-skin",
      "normal": "sprites/hud/btn_skill_normal/spriteFrame",
      "pressed": "sprites/hud/btn_skill_pressed/spriteFrame",
      "disabled": "sprites/hud/btn_skill_disabled/spriteFrame",
      "spriteType": "sliced",
      "border": [20, 20, 20, 20],
      "allowAutoAtlas": true
    },
    "hud.label.title": {
      "kind": "label-style",
      "font": "fonts/notosans_tc_bold/font",
      "fontSize": 34,
      "lineHeight": 38,
      "color": "#F4E7C1",
      "outlineColor": "#3D2A16",
      "outlineWidth": 2
    },
    "hud.label.value": {
      "kind": "label-style",
      "font": "fonts/notosans_tc_bold/font",
      "fontSize": 28,
      "lineHeight": 32,
      "color": "#FFFFFF"
    }
  }
}
```

### 5.3 screen spec 範例

這份檔案決定單一畫面要用哪份 layout、哪份 skin、輸出到哪個 UI ID。

```json
{
  "id": "battle-hud-screen",
  "version": 1,
  "uiId": "BattleHUD",
  "layer": "Game",
  "bundle": "battle_ui",
  "layout": "battle-hud-main",
  "skin": "battle-hud-default",
  "previewScene": "db://assets/scenes/battle.preview",
  "prefabOutput": "db://assets/bundles/battle_ui/prefabs/BattleHUD.prefab",
  "validation": {
    "devices": ["phone-16-9", "phone-19_5-9", "tablet-4-3"],
    "allowMissingSkin": false
  }
}
```

---

## 6. Cocos 端模組藍圖

### 6.1 建議新模組

```text
assets/scripts/ui/spec/
  UISpecTypes.ts
  UISpecLoader.ts
  UISkinResolver.ts
  UIPreviewBuilder.ts
  CompositePanel.ts
  ChildPanelBase.ts
  UIValidationRunner.ts
```

#### 模組職責

1. `UISpecTypes.ts` — 定義 layout / skin / screen 的 TypeScript 型別
2. `UISpecLoader.ts` — 透過現有 `assets/scripts/core/systems/ResourceManager.ts` 載入 JSON
3. `UISkinResolver.ts` — 將 skin slot 解析成 SpriteFrame / LabelStyle / Button 狀態圖
4. `UIPreviewBuilder.ts` — 底層根據 layout spec 生成節點樹並套皮
5. `CompositePanel.ts` — 頁級宿主，負責 slot routing、child panel mount 與 screen orchestration
6. `ChildPanelBase.ts` — 子內容區基類，負責單一 data source 更新與 fragment 綁定
7. `UIValidationRunner.ts` — 檢查缺圖、九宮格、比例、文字溢出與熱區

### 6.2 TypeScript 型別範例

```ts
// @spec-source → 見 docs/cross-reference-index.md (doc_index_0005)
export interface UIScreenSpec {
    id: string;
    version: number;
    uiId: string;
    layer: string;
    bundle: string;
    layout: string;
    skin: string;
    previewScene?: string;
    prefabOutput?: string;
    validation?: {
        devices?: string[];
        allowMissingSkin?: boolean;
    };
}

export interface UILayoutNodeSpec {
    type: string;
    name: string;
    width?: number;
    height?: number;
    textKey?: string;
    skinSlot?: string;
    styleSlot?: string;
    widget?: {
        top?: number;
        bottom?: number;
        left?: number;
        right?: number;
    };
    layout?: {
        type: 'horizontal' | 'vertical' | 'grid';
        spacing?: number;
        paddingLeft?: number;
        paddingRight?: number;
        paddingTop?: number;
        paddingBottom?: number;
    };
    children?: UILayoutNodeSpec[];
}

export interface UISkinSpriteSlot {
    kind: 'sprite-frame' | 'button-skin';
    path?: string;
    normal?: string;
    pressed?: string;
    disabled?: string;
    spriteType?: 'simple' | 'sliced';
    border?: [number, number, number, number];
    allowAutoAtlas?: boolean;
    bleed?: number;
}
```

### 6.3 頁級宿主範例

```ts
// @spec-source → 見 docs/cross-reference-index.md (doc_index_0005)
import { _decorator } from 'cc';
import { CompositePanel } from '../core/CompositePanel';

const { ccclass } = _decorator;

@ccclass('ExampleComposite')
export class ExampleComposite extends CompositePanel {
  protected override getSlotRouteKey(): string {
    return 'Overview';
  }

  protected override getContentState(): unknown {
    return this._contentState;
  }
}
```

補充：`CompositePanel` 是頁級 orchestration 層；它底層仍透過 `UIPreviewBuilder` 建立節點樹，所以正式文件應描述為「CompositePanel / ChildPanel 建立在 UIPreviewBuilder runtime 之上」，而不是把 `UIPreviewBuilder` 當成所有新 screen 的直接開發入口。

### 6.4 Skin 套用器範例

```ts
// @spec-source → 見 docs/cross-reference-index.md (doc_index_0005)
import { Label, Sprite, SpriteFrame } from 'cc';

interface SkinSlotResolver {
    getSpriteFrame(slotId: string): Promise<SpriteFrame | null>;
    getLabelStyle(slotId: string): Promise<{
        fontSize: number;
        lineHeight: number;
        color: string;
    } | null>;
}

export async function applySkinToNode(node: any, skinSlot: string | undefined, styleSlot: string | undefined, resolver: SkinSlotResolver): Promise<void> {
    if (skinSlot) {
        const sprite = node.getComponent(Sprite);
        if (sprite) {
            const frame = await resolver.getSpriteFrame(skinSlot);
            if (frame) {
                sprite.spriteFrame = frame;
            }
        }
    }

    if (styleSlot) {
        const label = node.getComponent(Label);
        if (label) {
            const style = await resolver.getLabelStyle(styleSlot);
            if (style) {
                label.fontSize = style.fontSize;
                label.lineHeight = style.lineHeight;
            }
        }
    }
}
```

### 6.5 Runtime 掛接範例

```ts
// @spec-source → 見 docs/cross-reference-index.md (doc_index_0005)
import { UIID, UIConfig } from '../../core/config/UIConfig';

export function buildRuntimeScreenMap() {
    return {
        [UIID.BattleHUD]: {
            screenSpecId: 'battle-hud-screen',
            layer: UIConfig[UIID.BattleHUD].layer,
            cache: UIConfig[UIID.BattleHUD].cache ?? false
        }
    };
}
```

---
