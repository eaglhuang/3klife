# HANDOFF-2026-06-27 New Captain

## 1. 交接目的

這份交接給新的對話群與新隊長，接續 ATM 英文論文與其相依 evidence 的最後整稿階段。主線不是重寫論文架構，而是維持目前已經收斂的正文、把 References / transparency / evidence 錨點整理乾淨，並且避免把 3KLife 與 AI-Atomic-Framework 兩邊已存在的 dirty worktree 一起誤收。

## 2. 當前總狀態

目前論文主稿的最新工作重點已經從「補概念」轉到「出版前清理」：

- 英文主稿 `paper.v3.1.en.md` 已補入 OperationalBench，包含實際 latency 數字與 reviewer-safe 解讀。
- 目前最重要的下一步不是再改正文大段 prose，而是：
  1. References cleanup and verification
  2. Appendix B transparency / AI-use 邊界一致性複檢
  3. 最後才做全稿 cross-reference 與格式掃描

## 3. 3KLife 本地 git 狀態

截至本次交接寫檔時，`C:\Users\User\3KLife`：

- `master` 相對 `origin/master`：`ahead 1`
- 尚未推送的本地 commit：
  - `2402b70f` `docs(paper): clarify OperationalBench latency interpretation`

最近 3KLife 論文相關 commit：

- `2402b70f` `docs(paper): clarify OperationalBench latency interpretation`
- `64450a71` `docs(paper): add OperationalBench latency table`
- `6b20223a` `docs(paper): sync English paper and OperationalBench evidence`
- `9a99a10e` `docs: sync ATM English paper PDF`

這表示新隊長若接手前要先確認是否需要先 push `2402b70f`，否則遠端只會看到 `64450a71` 以前的版本。

## 4. AI-Atomic-Framework 正式 evidence 狀態

OperationalBench 的正式 evidence 不在 3KLife，而在：

- `C:\Users\User\AI-Atomic-Framework`

目前已知重要 commit / anchor：

- official evidence anchor: `c0250009a53b28e887344e71ea675637c97290b0`
- supplementary evidence commit: `f117997c94d21689fa183d53f2fd5cb2be736291`
- AdmissionBench paper anchor: `ab8753b7daf0a3c4cd8b4483fe24d519ff2590bd`
- source snapshot anchor: `v0.9.0-alpha.1` / `0b31aa8683b44b3a78206132a0bf90a0fde73d1c`

OperationalBench 目前論文採用的核心結論是：

- 它只量 ATM-local operational overhead，不做外部系統比較。
- `fail-closed` 在 paper 與 benchmark 內都應理解為：
  - `fail-closed to unsafe direct or parallel apply`
  - 不是 discard intent，不是自動抹除 agent work
- 高 contention 下，latency tail 主要集中在 steward-mediated path / recovery routing，不是 broker admission decision 本身。

## 5. ATM 路由與跨 repo 關卡

本次重新執行 ATM CLI 的結果很重要，請新隊長先知道：

- 在 `C:\Users\User\3KLife` 跑 `node atm.mjs next --json`
- 會回報 `ATM_NEXT_FRAMEWORK_TARGET_REPO_REQUIRED`
- 原因是目前這批 metadata 被判定為 ATM framework work
- 正式 closure authority 在目標 repo：
  - `C:\Users\User\AI-Atomic-Framework`

因此：

- 若只是更新 3KLife 論文與 handoff，可留在 3KLife。
- 若要處理 framework task 關卡、evidence closeout、framework-mode gates，必須切到 `AI-Atomic-Framework`。

建議起手式：

```bash
cd C:\Users\User\AI-Atomic-Framework
node atm.mjs framework-mode status --json
```

本次 status 額外回報：

- `Framework development mode is required.`
- blocker 含：
  - `active-framework-claim-required`
  - `git-head-evidence-missing`
- 並提示：
  - `ATM_RUNNER_SYNC_REQUIRED`
  - 若 frozen runner 舊於 source，請先 `npm run build`
  - 或改用 `node atm.dev.mjs ...`

這一點請直接告知新隊長，避免他以為在 3KLife 就能把 framework 相關流程正式關完。

## 6. 英文論文目前已完成的關鍵更新

本輪已落到英文主稿的重點如下：

- `paper.v3.1.en.md` 已加入 OperationalBench 段落與數字表。
- §5 標題已調整為更能容納 benchmark + limitation 的版本。
- 新增 `OperationalBench: Recovery Routing and Runtime Overhead` 小節。
- 新增 `Table 19b`，直接給實際 latency 數字，不再只寫趨勢。
- `Table 20` 已補 `RQ8`。
- Appendix A / B / C 內與 benchmark artifact、release anchor、citation convention 相關段落已同步更新。

目前已寫入的 OperationalBench 代表數字：

- official run `20260627`
  - admission decision `0.004 / 0.024 / 0.050 ms`
  - steward apply `33.181 / 302.424 / 541.920 ms`
  - total scenario `0.012 / 310.159 / 1088.094 ms`
- extended `N=50`
  - admission decision `0.003 / 0.025 / 0.031 ms`
  - steward apply `33.072 / 304.193 / 349.348 ms`
  - total scenario `0.010 / 305.309 / 865.522 ms`

另外已補的 reviewer-safe 解釋：

- `Admission decision`、`Steward apply`、`Total scenario` 的分母不同，不能直接拿 median 對 median 誤讀。
- `Queue wait` 與 `validatorMs` 在目前 harness 中接近 timing floor 或輕量 validator path，不可外推成 repo-scale validation 成本。
- `N=50` 的 tail latency 主要仍集中在 steward-mediated recovery path，沒有觀察到 route-distribution 或 recovery-structure 改變。

## 7. 下一位隊長的最高優先順序

### 7.1 第一優先：References cleanup and verification

這是下一輪最重要的正式工作。

原則：

- 不要重開正文大改。
- 正式 References 只保留 bibliographic metadata。
- Refs. 38-62 那些 `used as contrast`、`supports claim`、`neighboring design point` 類用途說明，不要留在正式 References。
- 這些用途說明要移到：
  - `PAPER-EN-CITATION-MAP.md`
  - 或 Appendix annotation table
  - 或相關 Related Work prose

校正 metadata 時：

- 一律用官方來源
- 優先順序：
  - publisher / DOI landing page
  - official conference page
  - official arXiv DOI page
  - authors' official project/publication page

### 7.2 第二優先：Appendix B transparency 一致性複檢

要確認：

- Acknowledgements 的 AI-use 描述
- Appendix B 的 vendor channels / human authority / audit boundary
- 與正文 claim boundary 是否一致

目前方向已正確，但還需要最後一次一體化檢查，避免 reviewer 抓到說法前後不一。

### 7.3 第三優先：最後的全稿一致性掃描

等上面兩件完成後再做：

- Figure / Table / Algorithm caption 大小寫一致性
- cross-reference 漂移掃描
- Appendix 編號與引用對齊
- 最終 encoding / touched-file guard

## 8. 這一輪不要重做的事

- 不要重寫 Abstract / Introduction / Contributions 主架構。
- 不要因為新文獻再把所有表格全面重排。
- 不要現在就做 PDF 版面精算，使用者已明確說之後文字量還會變。
- 不要把 OperationalBench 包裝成 external comparative benchmark。
- 不要把 `fail-closed` 改寫成 discard work；全文應維持：
  - `fail-closed means fail-closed to unsafe direct or parallel apply, not fail-closed to intent preservation`

## 9. 目前兩邊 dirty worktree 風險

### 9.1 3KLife

本次交接時 `git status --short` 顯示：

- modified
  - `docs/ai_atomic_framework/CID-Conflict-Run-Log.md`
  - `docs/ai_atomic_framework/broker-collision-evidence/broker-run-index.json`
  - `docs/ai_atomic_framework/broker-run-report.md`
- untracked
  - `docs/ai_atomic_framework/broker-collision-evidence/CID-Conflict-Run-Log.md`
  - `docs/ai_atomic_framework/external-public-repo-cases/`
  - `scripts/lib/`
  - `scripts/run-atm-operational-bench.ts`

這些不是這次 paper handoff 要一起收的東西。不要直接回退，也不要順手混進 paper commit。

### 9.2 AI-Atomic-Framework

`AI-Atomic-Framework` 目前工作樹很髒，而且不是單純 OperationalBench 一條線，還混有 framework development、release root drop、task ledger、docs/reviews 等大量變更。新隊長若切過去處理 framework gates，必須非常嚴格地先看 scope，不能假設工作樹是乾淨的。

## 10. 外部 public repo 案例線的狀態

目前這條線還在「策略與草案已形成，但尚未正式落到 paper 主線 evidence」的階段。

已知狀態：

- 3KLife 工作樹內已有：
  - `docs/ai_atomic_framework/external-public-repo-cases/`
- 先前已討論的方向是：
  - 先做 FastAPI 這類高星、可落地、容易展示 atomic governance 的 public-source snapshot case
  - 之後再考慮更複雜 repo

目前判斷：

- 這條線是「可加分但不是當下 paper 最急」。
- 只有在 References / transparency 收尾後，還有篇幅與時間時，再決定是否把它發展成正式案例。

## 11. 建議新隊長的起手檢查命令

先在 3KLife：

```bash
git status --short
git rev-list --left-right --count origin/master...master
```

用 Node.js 做編碼敏感讀取與 paper 檔案巡檢：

```bash
npm run check:encoding:touched -- --files docs/ai_atomic_framework/arxiv-paper-v1/HANDOFF-2026-06-26-md-to-pdf-sync.md docs/ai_atomic_framework/arxiv-paper-v1/HANDOFF-2026-06-27-new-captain.md docs/ai_atomic_framework/arxiv-paper-v1/paper.v3.1.en.md
```

若要碰 framework 正式關卡，再切到 AI-Atomic-Framework：

```bash
cd C:\Users\User\AI-Atomic-Framework
node atm.mjs framework-mode status --json
```

若 runner sync 警告還在：

```bash
npm run build
```

或改走 source-first：

```bash
node atm.dev.mjs <command>
```

## 12. 最核心交接句

新隊長現在最該做的不是再把英文正文大改一次，而是把已經成形的論文收成正式出版狀態：**先清乾淨 References，確認 transparency 與 AI-use 邊界前後一致，再做最後 cross-reference 與 artifact 錨點收尾。OperationalBench 已足夠成為加分 evidence，但它的定位必須一直維持在 ATM-local operational overhead，而不是外部比較 benchmark。**
