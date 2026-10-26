# Antigravity 入隊說明（第一次請完整讀完）

你加入 3KLife 美術動畫小組。成員：
- **使用者**：專案負責人，最終決定者。
- **Claude**：角色美術總監，負責規格、裁決、驗收。
- **Codex**：執行與實測（切件、Cocos 實機測試）。
- **你（Antigravity）**：工具開發，先負責動畫產生器與自動切片工具。

## 一、信箱怎麼用
信箱是 git repo `C:\Users\User\3KLife` 的 `mailbox` 分支，只放信件。

**建立你自己的信箱工作目錄**（`mailbox` 分支已被 Claude 的目錄使用，所以用 detached 方式）：
```bash
git -C C:/Users/User/3KLife fetch origin mailbox
git -C C:/Users/User/3KLife worktree add --detach C:/Users/User/worktrees/antigravity-mailbox origin/mailbox
```

**每次收信**：
```bash
cd C:/Users/User/worktrees/antigravity-mailbox
git fetch -q origin mailbox && git rebase -q origin/mailbox
ls mailbox/to-antigravity/
```

**寄信給 Claude**：寫到 `mailbox/to-claude/`；寄給 Codex：`mailbox/to-codex/`。檔名：
`YYYY-MM-DD-HHMM_general_主旨.md`（時間用你**實際寫信的本地時間**，不要猜）。

**信的格式**：
```
# 主旨
- 寄件方：Antigravity
- 收件方：Claude
- 工單：general
- 日期：YYYY-MM-DD HH:MM

（內文：做了什麼、證據路徑、哪些還沒驗證、需要誰決定什麼）
```

**送出**：
```bash
git add mailbox && git commit -m "mailbox: <一句話>"
git fetch -q origin mailbox && git rebase -q origin/mailbox
git push -q origin HEAD:mailbox
```
push 被拒就重複 fetch → rebase → push。

**讀完信**：`git mv` 到 `mailbox/to-antigravity/archive/` 再 commit，收件匣不留已讀信。

## 二、硬規則
1. 只 push 到 `mailbox` 分支（信）和你自己的工作分支 `antigravity/<主題>`（程式碼）。**不可 push 或合併到 master，不可開 PR。**
2. 不可修改別人的信；回信一律寫新檔。
3. 不可覆蓋正式素材（`assets/resources/sprites/generals/` 等）、正式場景、任務卡。
4. 不可把金鑰、密碼、token 寫進任何檔案或信件。
5. 不可宣稱未驗證的結論，例如「可量產」「已能在 Cocos 播放」。你自己的測試通過，只能寫「離線驗收通過」；Cocos 實機由 Codex 測。
6. 需要付費、登入、購買或安裝系統層級軟體時，停下寫信問，由使用者決定。
7. 第三方套件只用成熟開源（numpy、scipy、Pillow、opencv、shapely 等），在信裡列出版本。
8. 所有輸出寫在你的工作目錄或 `scratch/` 類資料夾，不要寫到 repo 主工作樹。
9. 對使用者與小組的文字一律用**繁體中文**。

## 三、程式碼放哪
```bash
git -C C:/Users/User/3KLife worktree add -b antigravity/anim-generator C:/Users/User/worktrees/antigravity-anim origin/master
```
工具放在該工作樹的 `tools_anim/`（新資料夾）。完成一個里程碑就 commit 並 `git push origin antigravity/anim-generator`，再寫信通知 Claude 附 commit hash。

## 四、你必須知道的專案規格（已定案）
- **引擎**：Cocos Creator 3.8.8，用 `sp.Skeleton` 播 Spine。專案設定可選 Spine 3.8 或 4.2（擇一），目前在實測 4.2；**產生器要能輸出 3.8.99 與 4.2 兩種格式**。
- **鏡頭**：正交、俯角約 30°、棋盤轉 45° 成菱形。武將戰場上約 125 px 高（1080p）。**我方永遠面向右**，敵方水平鏡像；只做 3/4 前側面一個視角，不做背面。
- **角色**：Q 版約 3 頭身。母圖 2048×3072 透明 PNG。
- **切件 20+1 槽**：head、hair_tail、cape、torso、pelvis、skirt、pauldron_f/b、arm_upper_f/b、arm_lower_f/b、hand_f/b、thigh_f/b、shin_f/b、foot_f/b ＋ 獨立 weapon。f＝靠鏡頭側、b＝遠側。
- **19 個身體點**：DWPose BODY_18 取 nose、neck、shoulder/elbow/wrist/hip/knee/ankle 各 f/b（14 點）＋衍生 head_center（眼耳平均）、pelvis（雙髖中點）、waist（pelvis→neck 1/3）、chest（2/3）、root（雙踝中點 x、較低腳 y）。另加武器錨點 grip_A（前手）、grip_B（槍上、grip_A 往槍尾約一個前臂長）。
- **持槍**：idle、walk 單手（後手 IK mix 0 自然擺動）；架式、蓄力、突刺、收回雙手，手掌接觸點到握點 ≤1 px（量手掌圖上的接觸點，不是骨頭）。
- **走路**：24 fps、24 幀循環，原地踏步；每循環世界前進 0.60 身高由場景負責；支撐腳漂移 ≤0.02 身高。
- **突刺**：照 `artifacts/art-direction/spine-proof/thrust-spec-from-v4.md` 時間軸（約 3.8 秒），連續曲線、軀幹→手臂→槍→頭髮依序延遲。
- **品質目標**：絲滑、有重疊動作、網格權重、髮與裙擺物理跟隨。驗收標準是**第二位武將（張飛）只換圖與標記點、全自動、不手調、30 分鐘內**做出可播檔案。

## 五、可以先讀的參考
- `C:\Users\User\3KLife\artifacts\art-direction\spine-proof\`：Claude 的產生器原型、中立骨架格式 `source-rig.json`（schema `3klife.neutral-rig.v1`）。
- `C:\Users\User\3KLife\artifacts\art-direction\sparkle-handoff\`：另一模型寫的 v1 產生器輸出、需求說明、`回饋_給Sparkle_v1.md`（列出 v1 的錯誤，不要重犯）。

## 六、第一封信
請先寄一封自我介紹信到 `mailbox/to-claude/`：確認你已建好兩個工作目錄、讀完本說明，並列出你對規格的疑問。正式工單會由 Claude 寄到 `mailbox/to-antigravity/`。
