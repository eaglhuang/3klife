# Q4 武將：持弓驗收規則 與 下一輪做法（11/25）

資料來源：spine-trial `origin/feat/q4-generals`，逐一檢出 `1144fee`（目前分支頂端）、`742d701`（總PM 手上那份）、`76b1435`（昨晚對位版）重跑 `tools/spec_check.py`（獨立暫時工作樹，已清除，未改 spine-trial 任何檔）。

## 結論（10 行內）

1. **分支頂端已不是 742d701。** Grok 後來又推了 `10776ec`～`1144fee`，就是「以昨晚對位版為底、局部重繪＋小幅 pose_warp＋重新對位」。頂端 `spec_check` 實測 FAIL：龐德 0、馬超 1、馬岱 0、夏侯淵 1、張遼 0（WARN 各 1/0/2/0/1）。Grok 建議的路線已執行且有效，不必再重來。
2. 退步成因（742d701）：從原圖重畫後姿勢整個跑掉（頭偏 14～125 px），而 `measure_joints` 只做平移對位，不修姿勢；另外 `auto_cut` 重切把 `char.json` 的 `limb_merges` 弄成 null，造成 `merge_limbs.py` 的 `KeyError: 'joint'`（龐德、馬超、馬岱、夏侯淵四人各多一個 FAIL）。後者已由 `10776ec` 修掉。
3. 頂端剩的真 FAIL 只有兩項：馬超 `front_arm ×0.946`（差 0.9 px 到過線、補到 ×0.97 約需遠臂拉長 12 px），夏侯淵 `weapon.axis`（共用檢查把垂直弓當槍斜度）。
4. 持弓規則：弓型不豁免整套檢查，只換掉「槍斜度／槍桿可握長／前手滑握」三項，改用弓自己的量測檢查（弓身角度、握把落點與握位比例、弦側與弦直度、不遮臉、離地、長度比）。夏侯淵以頂端素材實測全部通過，預期 FAIL 1→0。
5. 重要但容易漏：**五人都沒有 `out/`，`spec_check` 的 parts／atlas／astc／rig 四組因無 rig 全數略過**，上面的 FAIL=0 只涵蓋 source／style／joints／standard。`build_all.sh` 在動作階段因缺 `view_back` skin 停住（`actions_extra` 含 `actions/directional` 的 `back_*`）。這是下一輪真正的大項，不是 STANDARD 數字。
6. 五人 `_measured_offsets` 有 7～10 個部件是「相關係數 <0.93 → 假設偏移 0」，關節 PASS 有一部分是假設值，驗收要加人工看圖。
7. 夏侯淵跑 Spine runtime 前還缺「武將持弓動作組」：現有 `spear_thrust`／`duel_attack` 是雙手握槍，套在弓上遠手 IK 會失敗。需戰鬥專家提供，或先只驗 idle／walk。

---

## 一、夏侯淵實測基準（`1144fee`）

| 量測 | 值 | 方法 |
|---|---|---|
| 弓在工作畫布範圍 | x 80–193、y 384–1109，全長 725 px | `parts/spear_full.png` 以 `spear_meta.json` 的仿射 A 貼回 577×1250 |
| 弓身（弓尖弦距）傾斜 k | 0.000 | 上下各 15 列的重心 x 之差 / 長度 |
| 握點 | (124.6, 733.2)；弓上由上往下 0.481 處 | 與標準 `weapon_grip`（−0.164, 0.4096）偏差 0 px |
| 握點像素 | alpha 255，距弦線 34 px（弦在 x≈91） | 握在木身上，不在弦上 |
| 弦側 | 弦在左（-x），弓腹往 +x；弦最左 x 在 10%–90% 列只動 0.41 px | 原圖 `weapon_bow.png` 每 20 列取最左不透明點 |
| 與臉 | 弓遮到臉 0 / 10258 px；弓右緣 193 與臉框左緣 250 相距 57 px | 臉＝`measure_joints` 同法的最大膚色塊 |
| 離地 | 弓底 1109，離地線 1245 共 136 px | |
| 與身體重疊 | 弓面積 31% 壓在乾淨底圖身體上（左側近手臂／肩甲處） | 僅記錄，不設門檻 |
| 小兵弓對照（`soldier_bow_red`） | 弓尖弦距 213 px，兩尖 x 相同（k=0）；握點 0.515 處；弓不畫弦、弦由 rig 產生；弦在 -x、弓腹 +x；弓尖距 ≈ 小兵身高 0.52 | `char.json` ends／pivots、`spec/standard.json` soldier 區、README |

## 二、現有檢查對「武將持弓」的適用表

`spec_check.py` 分組：source／style／parts／joints／atlas／astc／rig／standard。`standard.py` 分 hard／proportions。

| 檢查 | 持弓武將 | 理由 |
|---|---|---|
| source.*、style.*、joints（merge_limbs）、standard.hard.*、standard.joint.*、standard.limb.*、motion_scale、joint_overlap_min、rig_override 白名單 | **照用** | 與武器無關。`standard.joint.weapon_grip`（握點＝標準近手拳位 ±12.5 px）與 `standard.limb.rear_arm`（肩→握點長度）仍適用，因為持弓手就是固定的近手；夏侯淵實測偏差 0 px、×1.008 |
| `standard.weapon.axis`（k=0.1513±0.05） | **換成弓身角度檢查** | 槍是前伸斜桿；弓依小兵 STANDARD 一律垂直（k=0）。且現行 axis 檢查讀的是 **char.json 宣告值**，持弓改為從圖量測，避免宣告造假 |
| `standard.weapon.shaft_front`（≥340）、`grip_slide`（≤120） | **豁免（持弓）** | 兩項只看 `rig_override` 預設值、不看圖，對弓沒有「裸桿前伸／前手滑握」的意義；弓是單手握把 |
| `rig.l_grip`、`rig.grip_side`（spec_check.check_rig，需有 rig 才跑） | **豁免** | 遠手不握弓（垂手空拳，mix=0）。`rig.spear_parent`（武器骨掛 root，維持世界垂直）**保留**，對弓正好有利 |
| `rig.draw_order` | **照用** | 弓放在 `spear1..3` 槽，沿用固定繪製順序；臉不被遮用下面新檢查保證 |
| action_gen 的 `grip_attached`、view_qa 的 `grip_hands_*`、hand_mirror | **此階段不適用，待弓動作組** | 這些把雙手上槍當前提，必須由新的弓動作組定義（見第五節風險 4） |

## 三、持弓新增檢查（`standard.bow.*`，皆為 FAIL 級，與 STANDARD 無 WARN 的原則一致）

量測一律從 `parts/spear_full.png`＋`spear_meta.json`（auto_cut 產物）貼回工作畫布後取 alpha，不看 char.json 宣告。

| 項目 | 門檻 | 夏侯淵 | 依據 |
|---|---|---|---|
| bow.axis：弓尖弦距傾斜 k | \|k\| ≤ 0.05（約 2.9°） | 0.000 | 小兵 `weapon_bow` 兩尖 x 完全相同且所有招式反旋轉保持垂直；0.05 沿用槍軸 `axis_k_tolerance` |
| bow.belly_side：弦在 -x、弓腹在 +x | 10%–90% 列中 (最右−最左) 平均 ≥ 0.05×弓長（36 px），且弓腹在弦右側 | 平均約 70 px | 小兵：弦 x≈6、木身最右到 53，弦在左弓腹在右；夏侯淵同向。沿用影像軸，因為 runtime 以 scaleX −1 鏡像、小兵 `weapon_bow` 備註即為 belly toward +x |
| bow.string_straight：弦直度 | 10%–90% 列「最左不透明點」最大差 ≤ 6 px | 0.41 px | 小兵弦中心對 nock 容差 `joint_tolerance_px`=6 |
| bow.grip_on_wood：握點在木身 | 握點像素 alpha≥128，且距弦線 ≥ 20 px | 34 px | 握到弦上＝握錯位置；20 px 約拳半寬 30 的 2/3 |
| bow.grip_frac：握位比例 | 握點在弓全長由上 0.40–0.60 | 0.481 | 小兵 0.515、夏侯淵 0.481，取中點 ±0.1 |
| bow.grip_sync：圖與宣告一致 | `spear_meta` 中 shaft_col 對映點與 `weapon.grip` 差 ≤ 2 px | 0 px | 防止只改 char.json 不改圖 |
| bow.length：弓長比例 | 弓全長／人物身高（頭頂到地線）在 0.45–0.80 | 725/994 = 0.73 | 小兵 0.52；小兵 README 記載「第一版弓約全身高」被退，故設上限 0.80 排除近全身高。夏侯淵偏上緣，可接受 |
| bow.face_clear：不遮臉 | 弓 alpha ∩ 臉膚色塊 = 0 px；弓外框與臉框水平距離 ≥ 20 px | 0 px；57 px | 20 px > 關節容差 12.5 px，且約為實測餘裕的 1/3 |
| bow.ground_clear：離地 | 弓底 ≤ 地線 −40 | 136 px | 避免弓尖進腳底，也避免畫布裁切 |

「弦朝向身體內側」的判斷（需總PM 拍板）：小兵弓握在身體前方 +x 側，弦在 -x 側所以朝向身體；夏侯淵的弓握在身體**後方左側**（x 80–193，身體中心 x=330），弦同樣在 -x，反而朝向外側、弓腹朝向身體。**依影像軸兩者相同**（弦 -x、弓腹 +x），所以本規則以影像軸為準。待戰鬥專家寫持弓動作組時，若要在拉弓時讓弦面向射手，由動作旋轉處理，不要改素材。這是視覺／玩法決定，請總PM 或戰鬥專家確認。

另一點：小兵的弓不畫弦、弦由 rig 的 `bow_string` mesh 產生，夏侯淵的弓圖把弦畫在圖上（x≈91 一條直線）。靜態驗收可行，但之後要做拉弓放箭得把弦分離出來。建議夏侯淵下一輪順手出一張「無弦弓」，現圖保留為備份。

## 四、spec_check／standard 最小改動（diff 建議，我沒有動檔）

1. `spec/standard.json`：`tiers.general.weapon` 內新增 `types`。這是新增分類，不改 `hard`，但仍建議總PM／使用者核可。

```diff
   "weapon": {
     "shaft_front_min": 340,
     ...
     "axis_k_tolerance": 0.05,
+    "types": {
+      "bow": {
+        "axis_k": 0.0, "axis_k_tolerance": 0.05,
+        "belly_min_frac": 0.05, "string_straight_px": 6,
+        "grip_off_string_px": 20, "grip_frac": [0.40, 0.60],
+        "length_vs_figure": [0.45, 0.80],
+        "face_clear_px": 20, "ground_clear_px": 40
+      }
+    },
     "_doc": "..."
```

2. `tools/standard.py`：以 `char.json weapon.type`（預設 `spear`）分流。未知型別直接 FAIL，避免任意自行豁免。

```diff
-    k = C.cfg.get('weapon', {}).get('axis_k')
-    if k is None:
-        k = C.cfg.get('cut', {}).get('weapon', {}).get('axis_k')
-    if k is not None:
-        out.append(('PASS' if abs(k - W['axis_k']) <= W['axis_k_tolerance'] else 'FAIL', 'standard.weapon.axis', ...))
+    wt = C.cfg.get('weapon', {}).get('type', 'spear')
+    BT = W.get('types', {}).get(wt)
+    if wt != 'spear' and BT is None:
+        out.append(('FAIL', 'standard.weapon.type', f'unknown weapon.type {wt!r}'))
+    elif wt == 'spear':
+        k = ...（原樣不動）
+    else:
+        check_bow(C, BT, T, out)          # 新函式，量測自 parts/spear_full.png + spear_meta.json
```

並把前面 `shaft_front`、`grip_slide` 兩行包成 `if wt == 'spear':`（弓型整段不產生，而不是輸出 PASS）。

`check_bow` 骨架（約 40 行，量測式）：

```python
def check_bow(C, B, T, out):
    import cv2, numpy as np
    pf, mf = os.path.join(C.parts, 'spear_full.png'), os.path.join(C.parts, 'spear_meta.json')
    if not (os.path.exists(pf) and os.path.exists(mf)):
        out.append(('FAIL', 'standard.bow.parts', 'run tools/auto_cut.py first')); return
    m = json.load(open(mf)); A = np.array(m['A'])
    Wk = cv2.imread(C.work, cv2.IMREAD_UNCHANGED); H, Wd = Wk.shape[:2]
    a = cv2.warpAffine(cv2.imread(pf, cv2.IMREAD_UNCHANGED), A, (Wd, H))[..., 3] > 128
    ys, xs = np.nonzero(a); y0, y1 = ys.min(), ys.max(); L = y1 - y0
    top = np.nonzero(a[y0:y0+15].any(0))[0].mean(); bot = np.nonzero(a[y1-14:y1+1].any(0))[0].mean()
    k = (bot - top) / L                                           # axis
    rows = [(y, np.nonzero(a[y])[0]) for y in range(int(y0+.1*L), int(y0+.9*L), 8) if a[y].any()]
    left = np.array([r.min() for _, r in rows]); right = np.array([r.max() for _, r in rows])
    # axis / belly_side / string_straight 由 k、(right-left).mean()、np.ptp(left) 對 B 門檻
    g = C.cfg['weapon']['grip']; gx, gy = round(g[0]), round(g[1])
    on_wood = a[gy, gx] and (gx - left[np.argmin(abs(np.array([y for y,_ in rows]) - gy))]) >= B['grip_off_string_px']
    frac = (gy - y0) / L                                          # grip_frac
    sync = math.dist(A @ [m['shaft_col'] , 0, 1] ... )            # 以 meta 的 img_y 對映點對 grip，<=2 px
    # 長度比：L / (地線 baseline_y - 人物頭頂 y)；臉：重用 measure_joints.face() 的膚色塊，算 (a & face).sum() 與外框距離
    # ground_clear：baseline_y - y1 >= B['ground_clear_px']
    ...  out.append(('PASS' if cond else 'FAIL', 'standard.bow.xxx', msg))
```

`spear_meta.json` 現況只存 `A`、`shaft_col`、`src`、`scale`，沒有 `img_y`；grip_sync 需由 `char.json cut.weapon` 取 `shaft_x/img_y/crop/scale` 重算，或 auto_cut 順手寫入 `grip_work`。

3. `tools/spec_check.py` 只動 `check_rig`（讓 rig 組跑時不誤報弓）：

```diff
 def check_rig(a, rs, rig):
+    bow = C.cfg.get('weapon', {}).get('type') == 'bow'
 ...
-    lx = B.get('l_grip', {}).get('x', 0); fm = rs['spear_shaft_front'] - rs['fist_half_width']
-    rep('PASS' if lx <= fm else 'FAIL', 'rig.l_grip', ...)
-    sl, dr = order.index('l_arm'), min(...)
-    rep('PASS' if sl < dr else 'FAIL', 'rig.grip_side', ...)
+    if not bow:
+        lx = ...; rep(... 'rig.l_grip' ...)
+        sl, dr = ...; rep(... 'rig.grip_side' ...)
```

spec_check 的 `standard` 組直接呼叫 `standard.check`，不必另外改。`auto_cut.py` 內嵌的 standard 閘門同理自動帶上。

## 五、風險

1. 型別宣告可被濫用：已用「未知型別 FAIL＋弓型改量測不讀宣告」處理，仍建議 `types` 的新增需總PM 核可。
2. 弓與身體重疊 31%（近手臂、肩甲處）沒設門檻，因為持弓必然壓住近手；若覺得蓋住肩甲太多，下一輪加一項「弓遮蓋 pauldron_r 面積比例」。
3. 長度比 0.73 偏上緣；若美術想縮弓，需同步縮 `cut.weapon.scale` 並讓握位比例維持。
4. 動作組：general 的 `idle`／`walk_in_place` 靠 FK 可先驗；`spear_thrust`、`duel_attack` 是雙手握槍，遠手 IK 目標 `l_grip` 在弓上不成立。需戰鬥專家寫持弓版 `duel_attack`（拉弦、放箭），否則夏侯淵的 `build_all.sh` runtime 驗證不會過。這與靜態驗收分開。

---

## 六、路線比較：五人 FAIL 項數與成因

數字皆為 `tools/spec_check.py` 實跑的 FAIL／WARN（含 KeyError 那一項）；與 Grok 報告的 `standard.py` 數字差 1 是因為 KeyError 與 WARN 只出現在 spec_check。

| 武將 | A 昨晚對位版 `76b1435` | B 重畫版 `742d701` | C 頂端 `1144fee`（對位版＋局部重繪＋pose_warp） | 頂端剩餘項目 |
|---|---|---|---|---|
| 龐德 | 1F/1W | 11F/1W | **0F/1W** | WARN `light_lr` 1.166（差 0.161，門檻 0.15） |
| 馬超 | 2F/0W | 5F/2W | **1F/0W** | FAIL `front_arm ×0.946` |
| 馬岱 | 3F/1W | 7F/2W | **0F/2W** | WARN `face_turn +0.039`（要 ≥0.04）、`light_lr` 差 0.197 |
| 夏侯淵 | 4F/0W | 6F/0W | **1F/0W** | FAIL `weapon.axis`（持弓規則解掉） |
| 張遼 | （當時無此角色） | 6F/1W | **0F/1W** | WARN `gaze_x −0.037`（要 ≥0） |

成因對照：

| 路線 | 做法 | 主要失分原因 |
|---|---|---|
| A | 保留候選圖、切件後用 `fit_parts.py` 把各段剛體對到標準關節 | 殘留都是「姿勢真的不同」：後臂長度（龐德 ×1.224、馬超 ×0.656、夏侯淵 ×1.813）、握點偏 18～52 px、遠臂兩節各偏 36 px。剛體對位無法改肢長 |
| B | 從原圖整張重繪手臂，再重量測 | ①重繪後頭／遠臂位置整個跑掉（頭 14～125 px、握點 18～161 px、肢長 ×0.685～×1.952）；②`auto_cut` 重切把 `limb_merges` 清空，四人 `KeyError: 'joint'`；③乾淨底圖 SIFT 註冊誤差 1.38 px 或水平不可靠 |
| C | 回到 A 的底，只對手臂局部重繪、對來源與乾淨底圖同步做小幅 TPS（最大 12～24 px）、重新註冊、再 `fit_parts` | 兩項殘留（馬超臂長、夏侯淵弓軸）加三個 WARN。**這就是張飛做法，已走完一輪** |

merge_limbs 報錯的角色與原因（程式判斷＋實跑確認）：`742d701` 的**龐德、馬超、馬岱、夏侯淵**四人，`char.json` 的 `limb_merges` 為 null（auto_cut 重切後未重寫），而 `spec/cut_spec.json` 的 `limb_merges` 只有 `name/under/over`，沒有 `joint/axis`，舊 `merge_limbs.py` 直接 `m['joint']` → `KeyError: 'joint'`。張遼當時 `limb_merges` 有值所以沒報。`10776ec` 改為「明示值優先，缺值則用兩段量測骨相接端點，仍無法解析就以具名錯誤停止」，頂端五人皆 `joints PASS`。

**判斷：Grok 的建議可行，且已證實。** 不要再從原圖重畫整隻手臂。

---

## 七、每位武將的下一輪建議與預期殘留

| 武將 | 建議作法 | 預期殘留 | 需人工 |
|---|---|---|---|
| 龐德 | 現況可收。若要消 WARN：對 `work.png` 軀幹做局部色調（右側提亮／左側壓暗約 1.1%），只改 work.png 後重切；`base_clean_reg.png` 不必動 | 0 FAIL；WARN 可 1→0 | 看圖確認色調自然；側面 skin 見共通項 |
| 馬超 | 對 work.png 與 base_clean_reg.png 同步做一次 pose_warp：來源遠臂肘 (478,813)→(470,822)、拳 (531,911)→(523,920)（各移約 12 px，肩點固定）。遠臂長由 225.3 增至約 231.7（×0.973，過線 ×0.95）；關節對標準偏差 ≈8 px，在 12.5 px 內 | 0 FAIL | 目視遠拳中空是否保留、手臂不扭曲 |
| 馬岱 | 不動。兩個 WARN 屬暫准造型（深綠袍使 `light_lr` 偏低、臉部轉向差 0.001）。若總PM 要消 WARN，只能 Codex 重繪袍子明暗，風險高於收益，建議保留 WARN | 0 FAIL、2 WARN | PM 確認接受暫准造型 |
| 夏侯淵 | 套用第四節規則後重跑；順手出「無弦弓」版本 | 0 FAIL（待規則實作並用頂端素材驗證，我已用同一方法手算全數通過） | 弦側、握位美術確認；需戰鬥專家的持弓動作組 |
| 張遼 | 不動。`gaze_x` 差 0.037，只能請 Codex 小範圍重繪雙眼瞳孔朝右，若重繪一次後仍未過就留 WARN | 0 FAIL、1 WARN | 與 3KLife 最新立繪 `standing_0004` 比對（Grok 說在 origin/master 只找到 0003，需確認我方工作樹的 0004 是否尚未入庫並提供給他） |

**五人共通、不是 STANDARD FAIL 但擋住完成：**

- 共通項 1：沒有任何一人建成 rig（無 `out/`）。`build_all.sh` 在動作階段缺 `view_back` skin 停住。兩個走法請總PM 選：(a) 先在 `char.json` 把 `actions_extra` 暫時拿掉 `actions/directional`，驗 front 動作（idle／walk／spear_thrust／duel_attack）的 atlas、astc、rig、IK、腿，之後補背面；(b) 直接做 `view_back`（需 Codex 出 full／arm_free 兩張背面來源，工作量大，張飛有 `codex_back*` 目錄可參考）。我建議先 (a)。
- 共通項 2：`measure_joints` 對 7～10 個部件是「假設偏移 0」。頂端宣稱的「關節 PASS」在這些部件上是假設。每人加一張目視確認圖（`*_parts_joint_fit.png` 已有），並看 setup 渲染。我已看過龐德／馬超／馬岱／張遼的 joint-fit 預覽，分件與關節外觀正常，沒有明顯錯位。

---

## 八、給 Grok 的步驟（可直接照做）

**起點與禁止事項**

- 分支 `feat/q4-generals` 從 `1144fee` 繼續，不要回 `742d701`，不要再整張重畫手臂。
- 不可再動：`spec/standard.json` 的 `hard`；`characters/char2/`；`char.json` 的 `cut_override／actions／draw_order／ik_bend_positive`、`motion_scale`、`attach_adjust.head`（LESSONS C1）；不可手改 `joints` 數字；不可刪 `limb_merges`；不可放寬任何門檻讓角色過。
- 機器是 Windows 時先 `set PYTHONUTF8=1`（cp950 讀 char.json 會炸）。以下 `$PY` 為 `venv/bin/python`。

**步驟 0　基線（每人）**

```
CHAR=<id> $PY tools/spec_check.py        # 應為：龐德0F1W 馬超1F 馬岱0F2W 夏侯淵1F 張遼0F1W
```

**步驟 1　馬超遠臂（唯一需要改圖的人）**

1. 寫 `fix_machao.json`：`{"moves": [[478,813,470,822],[531,911,523,920]], "fixed": [[442,705],[447,690]], "note": "far arm +12px"}`（來源座標取自 `char.json _post_cut_source.joints`，肩點固定）。
2. 同步 warp 兩張圖（避免對位脫鉤）：
   `$PY tools/pose_warp.py fix_machao.json characters/machao/work.png /tmp/work.png characters/machao/src_assets/base_clean_reg.png /tmp/base.png --check /tmp/chk.png`，目視 `chk.png` 後再覆蓋回原路徑。
3. 重切：`CHAR=machao $PY tools/auto_cut.py`（會還原切前幾何），再 `CHAR=machao $PY tools/fit_parts.py --preview characters/machao/preview/machao_parts_joint_fit.png`。
4. 驗收：`standard.limb.front_arm` 落在 ×0.95–1.05，其餘 PASS。若 fist 移動讓 `l_fore` 掉出臂部像素，把位移降到 8 px 再試一次，仍不行就回報，不要硬撐。

**步驟 2　夏侯淵（等規則實作後）**

1. 先請總PM 核可第四節 standard.json／standard.py／spec_check.py 三處修改，由有權限的人（我或戰鬥專家）實作；Grok 不要自己改 spec。
2. `char.json` 加 `"weapon": {"type": "bow", ...}`（保留現有 `grip`／`axis_k`），重跑 `CHAR=xiahou_yuan $PY tools/spec_check.py`，預期 0 FAIL。
3. 產「無弦弓」`src_assets/weapon_bow_nostring.png`（弓身同位置同大小，只去掉 x≈25 那條弦線），現圖保留。尚不切換，等持弓動作組。

**步驟 3　龐德、馬岱、張遼**　不改圖。若總PM 要求消 WARN 再做龐德的軀幹局部色調（見第七節）。

**步驟 4　共通：建 rig 驗 front 動作（走法 a）**

1. 每人 `char.json` 的 `actions_extra` 暫時拿掉 `actions/directional`（commit 訊息註明 WIP、需補 view_back）。
2. `CHAR=<id> bash tools/build_all.sh`，依序看 merge_limbs → atlas → ASTC → rig → actions → spec_check 的完整輸出。夏侯淵先跳過（缺弓動作組）。
3. 通過後補驗：`tools/cont_pose_qa.py`（idle／walk 逐幀頭不掉）、`tools/leg_check.py`、`tools/pipeline.py regress`。
4. 把 `spec_check` 的 parts／atlas／astc／rig 四組結果寫進 `docs/reports`，與 source／style／joints／standard 分開列。

**步驟 5　報告格式**　每人列：spec_check 的 FAIL／WARN 原文、`measure_joints` 假設偏移的部件清單、setup 渲染圖路徑。不要把 source 預覽或 joint-fit 預覽當成 runtime 驗收。

**哪些要人工**：馬超 warp 後目視、全員 setup 渲染看圖、夏侯淵弦側與握位美術確認、龐德／馬岱色調取捨、張遼 `standing_0004` 對照、`view_back` 做不做（總PM 決定）。

**哪些不可再動**：見「起點與禁止事項」，另加：已 PASS 的龐德、馬岱、張遼的 `work.png`／`base_clean_reg.png`／部件（除非總PM 要求消 WARN）。
