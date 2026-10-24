# Cutout 中立資料格式 v0（rig.json／anim.json）
- 依據：Rig 規格 v0.3 §7（裁決 41，使用者原則：跨引擎）
- 狀態：草案。Codex 在反向匯出趙雲樣機時，如果發現缺少欄位，可以提出增補；欄位只增不改。

## 1. rig.json
```json
{
  "schemaVersion": "0.1",
  "character": "zhaoyun",
  "tier": "elite",
  "unitsPerPx": 1,
  "refHeightPx": 2048,
  "origin": "feet-center-ground",
  "bones": [
    { "name": "root",  "parent": null,   "x": 0,   "y": 0,   "rot": 0, "len": 0 },
    { "name": "torso", "parent": "root", "x": 0,   "y": 620, "rot": 0, "len": 380 }
  ],
  "parts": [
    { "name": "torso", "bone": "torso", "slot": "torso", "image": "parts/torso.png",
      "w": 512, "h": 640, "pivot": [0.5, 0.15], "x": 0, "y": 0, "rot": 0, "draw": 10 }
  ],
  "points": [
    { "name": "grip_A", "bone": "hand_f", "x": 0, "y": 0 },
    { "name": "grip_B", "bone": "hand_b", "x": 0, "y": 0 }
  ],
  "equipSlots": ["weapon", "torso", "pauldron_f", "pauldron_b", "skirt",
                 "arm_upper_f", "arm_lower_f", "arm_upper_b", "arm_lower_b",
                 "hand_f", "hand_b", "shin_f", "shin_b", "foot_f", "foot_b"],
  "lighting": { "tintDay": [1, 1, 1], "tintNight": [0.62, 0.7, 0.95], "rim": { "color": [0.7, 0.85, 1], "strength": 0.35, "dirDeg": 135 } }
}
```
欄位規則：
- 骨骼的 `x`、`y`、`rot` 是相對父骨的值，單位 px 和度（逆時針為正，y 軸朝上）。`len` 只做顯示和 IK 參考。
- 零件的 `x`、`y`、`rot` 是相對所屬骨骼的值。`pivot` 用 0～1，左下角是 (0,0)。`draw` 是整數，越大越在上層。
- `slot` 對應 Rig 規格 §6 的槽位名稱。換裝備只換 `image`，`w`、`h` 的差距要在 ±8% 以內，`pivot` 不變。
- `lighting` 只放參數，shader 由各引擎各自實作。
- **禁止的欄位**：引擎專屬的 uuid、prefab 路徑、元件名稱、節點層級 flag。

## 2. anim/<動作>.json
```json
{
  "schemaVersion": "0.1",
  "name": "attack_thrust",
  "fps": 30,
  "duration": 0.9,
  "loop": false,
  "tracks": [
    { "bone": "arm_upper_f", "rot": [ { "t": 0, "v": 0, "ease": "linear" }, { "t": 0.3, "v": -35, "ease": "easeOutCubic" } ] },
    { "bone": "root", "x": [ { "t": 0, "v": 0 }, { "t": 0.3, "v": 40 } ] }
  ],
  "drawOrder": [ { "t": 0.3, "part": "arm_lower_f", "draw": 18 } ],
  "events": [ { "t": 0.36, "name": "weapon_impact" } ]
}
```
欄位規則：
- 每條軌道可以有 `x`、`y`、`rot`、`sx`、`sy`，值是「相對 rig 靜止姿勢的差量」。
- `ease` 只能用固定名單：`linear`、`step`、`easeInQuad`、`easeOutQuad`、`easeInOutQuad`、`easeOutCubic`、`easeInOutCubic`，或 `bezier: [x1, y1, x2, y2]`（CSS cubic-bezier 慣例）。各引擎的讀取端都要照同一個公式算。
- `events` 的時間單位是秒。weapon_impact 是 L3 驗收要比對的 log 名稱。

## 3. 驗收
- 參考播放器（Python 或網頁 canvas）讀 rig.json 和 anim.json，依 `fps` 輸出每一格的 PNG。
- Cocos 端只用讀取器產生節點，不手調。同一個影格和參考播放器的像素位移要 ≤ 1%（以角色高度計），事件時間誤差 ≤ 1 格。
- Unity 讀取端在路線定案前不實作。schema 審查時用一條規則判斷：每個欄位都要能在 Unity 的 Transform、SpriteRenderer、AnimationCurve 找到對應，找不到就是不合格的欄位。
