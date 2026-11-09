<!-- doc_id: doc_spec_0701 -->
# 3KLife 全域音訊架構AudioManager多軌混音與BGM平滑交叉淡入淡出規格書

> **規格代碼**：SPEC-AUDIO-MGR01  
> **關聯 WBS**：AUDIO-MGR-01（全域音訊管理架構、四軌混音與 BGM 交叉淡入淡出）  
> **文件版本**：v1.0.0 (單一真相來源，無補丁整併版)  
> **所屬系統**：全域架構總控（Global Architecture & Audio Pipeline）

---

## 1. 核心宗旨與設計哲學

音訊為建立三國沉浸感與戰鬥打擊回饋之核心載體。為杜絕各 UI 元件分散調用音效所引發之爆音、音樂硬切（Hard Cut）與音量無法統控問題，本規格書制定全域單例**AudioManager 四軌混音器架構（Four-Bus Mixer）**與**雙通道 BGM 平滑交叉淡入淡出（Cross-Fade）協議**。

---

## 2. 四軌混音器架構 (Four-Bus Audio Mixer)

全域音量透過分層乘法公式進行即時混音運算：

$$\text{FinalVolume} = \text{MasterVolume} \times \text{BusVolume} \times \text{ClipVolume}$$

```
+-------------------------------------------------------------+
| Master Bus (主音量: 0.0 ~ 1.0)                              |
+------------------------------+------------------------------+
                               |
       +-----------------------+-----------------------+
       |                       |                       |
       v                       v                       v
[BGM Bus (背景音樂)]    [SFX Bus (打擊音效)]    [Voice Bus (武將台詞)]
(雙通道交叉淡入淡出)    (多通道並發限流)        (優先級獨佔通道)
```

### 2.1 混音通道定義表

| 通道名稱 (Bus) | 適用音訊內容 | 預設音量 | 獨立靜音開關 (Mute) | 播放特性 |
|---|---|---|---|---|
| **Master** | 全局總控 | 1.0 (100%) | `isMasterMuted` | 影響所有音軌輸出。 |
| **BGM** | 場景背景音樂、大廳環境音 | 0.8 (80%) | `isBgmMuted` | 循環播放，切換時觸發 0.8s 交叉淡入淡出。 |
| **SFX** | UI 點擊、戰鬥兵刃交擊、爆炸 | 1.0 (100%) | `isSfxMuted` | 單次播放（OneShot），受限流隊列約束。 |
| **Voice** | 武將登場台詞、戰法奧義吟唱 | 1.0 (100%) | `isVoiceMuted` | 高優先級，播放時自動微幅壓低 BGM 20%（Ducking）。 |

---

## 3. BGM 雙通道平滑交叉淡入淡出協議 (Cross-Fade)

為實現音樂無縫切換，`AudioManager` 內建雙音訊實體（`Source_A` 與 `Source_B`）：

```typescript
export interface BgmCrossFadeOptions {
  targetClipUrl: string;              // 新音樂資產路徑
  fadeDurationSec: 0.8;               // 交叉過渡耗時 (標準 0.8 秒)
  loop: boolean;                      // 是否循環播放
}

export interface AudioSettingsState {
  masterVolume: number;
  bgmVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  isMuted: boolean;
}
```

- **時序流轉**：
  1. 當前播放音樂所在之通道（如 `Source_A`）在 $0.8\text{s}$ 內 Volume 由 $1.0 \rightarrow 0.0$，完成後自動 `stop()`。
  2. 新音樂在空閒通道（如 `Source_B`）載入並立即 `play()`，Volume 在 $0.8\text{s}$ 內由 $0.0 \rightarrow 1.0$ 平滑升起。
  3. 全程由 Cocos Tween 驅動，無任何音訊破音或瞬間靜音死區。

---

## 4. 驗收測試案例 (Test Cases)

- **TC-AUDIO-01【四軌音量獨立調節驗證】**：調整 BGM 音量為 0，SFX 音量保持 1.0，驗證背景音樂完全靜音而戰鬥點擊音效音量正常，無串軌。
- **TC-AUDIO-02【0.8s 交叉淡入淡出無縫切換】**：自大廳切換至戰鬥場景，舊 BGM 平滑淡出與新戰鬥 BGM 平滑淡入同時進行，0.8 秒完成交接，無爆音。
- **TC-AUDIO-03【音量設定本機持久化繼承】**：在設定面板關閉聲音並重啟遊戲，`AudioManager` 初始化時讀取 LocalStorage，各音軌狀態精準繼承。
