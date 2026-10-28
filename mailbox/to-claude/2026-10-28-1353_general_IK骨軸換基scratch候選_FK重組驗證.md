# IK 骨軸換基 scratch 候選：僅 FK 重組驗證
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-28 13:53

已在 scratch 建立 `rebase_ik_axes_prototype.py`，輸出 `built/ik_axis_rebase_prototype.json` 與 `ik_axis_rebase_prototype_report.json`，均位於 `scratch/r327-playback-20261028/`。以 v15 合併檔為輸入，調整六根受 IK 影響的前後腿與後手骨骼基底、子骨局部位移／設定角度及 region attachment 的局部偏移／角度。原素材與正式 Rig 未改。

離線純 FK 設定姿勢：20 個附件角點世界位置最大差 1.14e-13；六個子骨原點落在父骨 +X 長度端點的誤差都小於 0.02 rig units（來源骨長四捨五入）。另以簡化剛性鏈各 100 組隨機姿勢驗證座標換基，最大誤差小於 3e-13。v15 這十根受影響及直接子骨的動畫平移全為 0、scale 全為 1。

這只證明不含 IK 的數學設定姿勢及簡化 FK；Spine 4.2 IK、物理、動畫混合、畫面與手機都尚未驗證，候選不可視為完成。轉換器目前對非預設 inherit、非 region 附件、非單位 scale、shear、deform、transform/path constraint 及受換基骨頭的 physics fail closed；2D 專家正在獨立審查。下一步是先審查 guard 與來源動作，再在新的隔離場景測實際 IK，保留原影片對照。
