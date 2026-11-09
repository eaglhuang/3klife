<!-- doc_id: doc_spec_0680 -->
# 3KLife 血脈命鏡五大狀態變體UI表現與稀有度Aura連動規格書

> **規格代碼**：SPEC-UI-BMV302  
> **關聯 WBS**：BMV3-02（M10 五種 state 變體）、BMV3-03（稀有度 aura 色映射接到 mirror-rarity-aura）  
> **文件版本**：v1.0.0 (單一真相來源，無補丁整併版)  
> **所屬系統**：UI 介面與視覺工程（UI Architecture & Art Pipeline）

---

## 1. 核心宗旨與設計哲學

血脈命鏡（Bloodline Mirror）為展現武將血統深淺之核心 UI 容器。現行資料檔僅定義四態且遺漏傳奇武將終極共鳴表現。本規格書正式重構並補足**五大狀態變體（Five State Variants）**，明確定義各狀態下 CTA 按鈕、操作提示（Tips）、英靈角色亮度、靈光 Aura 與專屬稱號 Badge 之聯動規格，並規範稀有度色彩映射接入 `mirror-rarity-aura` 節點。

---

## 2. 五大狀態變體視覺表現規範 (State Matrix)

| 狀態列舉 (State Enum) | 判定條件 (Condition) | 英靈立繪表現 (Portrait) | 主按鈕文字 (Primary CTA) | 靈光層 (mirror-rarity-aura) | 狀態標籤 (State Tag) |
|---|---|---|---|---|---|
| **UNOWNED** | 未獲得該名將 | 灰階黑白剪影，亮度 0.35 | `UI_MIRROR_CTA_RECRUIT`<br>「尋訪求籤」 | 關閉 (Opacity: 0.0) | `TAG_LOCKED`<br>「未逢明主」 |
| **UNAWAKENED** | 已獲得但未喚醒血脈 | 原畫彩色，亮度 0.85，無靈紋 | `UI_MIRROR_CTA_AWAKEN`<br>「注入神元」 | 素銀微芒 (Opacity: 0.2) | `TAG_DORMANT`<br>「真血沉眠」 |
| **AWAKENING** | 滿足覺醒條件進度中 | 裂隙金光穿透，立繪半透明呼吸 | `UI_MIRROR_CTA_BREAKTHROUGH`<br>「突破命境」 | 稀有度對應色，低頻脈衝 | `TAG_PROGRESS`<br>「神魂感應」 |
| **AWAKENED** | 已完成階段性覺醒 | 額前神紋浮現，亮度 1.05 | `UI_MIRROR_CTA_RESONATE`<br>「命鏡洗髓」 | 稀有度對應色，穩定水墨煙霧 | `TAG_AWAKENED`<br>「天命歸位」 |
| **OWNED_LEGENDARY** | UR/神將達成最高突破 | 雙靈獸虛影合流，神威金光浮動 | `UI_MIRROR_CTA_LEGACY`<br>「參悟天道」 | 紫金鎏金雙環光芒 (Opacity: 0.8) | `TAG_SUPREME`<br>「萬世宗師」 |

---

## 3. 稀有度 Aura 着色映射與節點綁定 (BMV3-03)

節點 `mirror-rarity-aura` 之 Sprite 透過 Color Tint 與 Shader 參數動態綁定：

```typescript
export interface MirrorRarityAuraBinding {
  rarity: 'N' | 'R' | 'SR' | 'SSR' | 'UR';
  tintHex: string;                    // 顏色十六進位值
  additiveAlpha: number;              // 混合半透明度
  pulseFrequencyHz: number;           // 呼吸頻率 (次/秒)
}

export const MIRROR_RARITY_AURA_MAP: Record<string, MirrorRarityAuraBinding> = {
  N:   { rarity: 'N',   tintHex: '#D0D5DD', additiveAlpha: 0.15, pulseFrequencyHz: 0.2 },
  R:   { rarity: 'R',   tintHex: '#3E6B5C', additiveAlpha: 0.25, pulseFrequencyHz: 0.3 },
  SR:  { rarity: 'SR',  tintHex: '#6941C6', additiveAlpha: 0.35, pulseFrequencyHz: 0.4 },
  SSR: { rarity: 'SSR', tintHex: '#D97706', additiveAlpha: 0.50, pulseFrequencyHz: 0.5 },
  UR:  { rarity: 'UR',  tintHex: '#7E22CE', additiveAlpha: 0.70, pulseFrequencyHz: 0.6 }
};
```

- **狀態連動規則**：若狀態為 `UNOWNED`，無論稀有度為何，`mirror-rarity-aura` 之 `additiveAlpha` 強制歸 0；若為 `OWNED_LEGENDARY`，一律套用 UR 專屬紫金雙環光芒。

---

## 4. 驗收測試案例 (Test Cases)

- **TC-BMV3-02-01【五大狀態切換渲染檢驗】**：依序切換 5 種狀態，CTA 按鈕、提示文案、立繪灰階/亮度與狀態標籤 100% 正確匹配，無狀態殘留。
- **TC-BMV3-02-02【未持有狀態防穿幫檢驗】**：在 `UNOWNED` 狀態下，`mirror-rarity-aura` 保持不可見，點擊 CTA 正確觸發尋訪導引彈窗。
- **TC-BMV3-03-01【稀有度顏色注入驗證】**：在已覺醒狀態下切換不同武將，`mirror-rarity-aura` 之 Color Tint 正確切換為對應色階，平滑過渡時間為 0.35 秒。
