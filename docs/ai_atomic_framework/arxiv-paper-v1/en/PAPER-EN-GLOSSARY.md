# Paper EN Glossary

Date: 2026-06-26  
Use: mandatory terminology guard before and during `paper-en.tex`

## Core Rule

The English paper should preserve technical meaning first and prose smoothness second. If a term is load-bearing in the current manuscript, do not replace it with a near-synonym just because the sentence sounds more natural.

## Canonical Terms

| Chinese / Local Phrase | Canonical English | Notes | Avoid |
|---|---|---|---|
| 原子 | atom | basic governance unit | unit, fragment, object |
| 原子圖 | atom map | mapping surface for governed units | atom graph, atomic map |
| 虛擬原子 | virtual atom | inferred or refined atom for admission | synthetic atom, shadow atom |
| CID | CID / candidate CID | keep `CID` as-is | content id only, hash id |
| 衝突鍵 | ConflictKey | keep capitalized | conflict label, conflict token |
| CID broker | CID broker | canonical subsystem name | broker only, coordinator |
| 中立寫入者 | neutral steward | keep exact phrase | manager, controller, arbiter |
| 受治理套用 | governed apply | action performed by steward | managed patch, controlled commit |
| 寫入前准入 | pre-write admission | one of the most load-bearing terms | pre-commit check, merge check |
| 單一治理域 | single governance domain | broader than just one repository | single repo, centralized repo |
| 同檔 bounded region 准入 | same-file bounded-region admission | keep hyphenation stable | same-file merge |
| 共用表面 | shared surface | governance-visible collision surface | shared area, overlap surface |
| 證據閉環 | evidence-backed closure | preferred paper phrasing | proof closure, evidence closure only |
| 任務契約 | task contract | broader than prompt text | task spec, prompt contract |
| 七層閘門 | seven-layer gate | architecture term | seven-step pipeline |
| 宣告式 readAtoms | declared `readAtoms` | keep code id in monospace | read dependencies only |
| 治理基底 | governance substrate | keep exact term | control layer, orchestration fabric |
| 有界可恢復性 | bounded recoverability | conclusion-safe phrase | guaranteed recovery |
| 論文結果層 | paper-facing result / paper profile | use according to context | final benchmark |
| row universe | row universe | denominator guard term | sample size |

## Phrases That Must Stay Stable

Use these phrases consistently across Abstract, Introduction, Related Work, Results, Discussion, and Conclusion.

- `single-domain pre-write admission`
- `repository mutation`
- `governance substrate`
- `neutral steward`
- `bounded recoverability`
- `paper-facing result`
- `row universe`
- `complementary rather than interchangeable`

## Claim-Safe English Templates

Preferred:

```text
supports the claim that
provides evidence for
within the stated boundary
under the adapter and declaration assumptions
should be read as
is complementary to
does not inherit
is not directly comparable to
```

Avoid upgrading into:

```text
proves
guarantees
fully solves
establishes correctness of
outperforms
generalizes to
scales to
```

## Section-Specific Notes

### Abstract

- keep only the most load-bearing terms;
- avoid stacking too many framework nouns in one sentence;
- prefer `CID broker`, `governance substrate`, and `pre-write admission` over adding new labels.

### Related Work

- `SafeMerge` and `Semistructured Merge` belong to structured / semantic merge discussion;
- `Atomix` and `Cordon` belong to transactional-agent runtime discussion;
- `SyncMind / SyncBench` belongs to future replay source / external replay framing, not direct benchmark comparison.

### Results

- do not let `row universe` become `sample size`;
- keep `20 scenarios`, `42 comparisons`, `252 policy rows`, `294 ablation rows`, `210 adversarial rows`, and `51-row enforcement-timing projection` explicitly distinct.

### Discussion / Conclusion

- preserve the narrow claim boundary;
- keep `feasibility`, `auditability`, and `bounded recoverability` as the main conclusion terms.

## Translation Red Flags

Pause and review if the draft introduces any of these substitutions:

- `neutral steward` -> `manager`
- `pre-write admission` -> `merge control`
- `same-file bounded-region admission` -> `same-file merge`
- `governance substrate` -> `workflow framework`
- `paper-facing result` -> `final benchmark`
- `row universe` -> `sample size`

## Go / No-Go

If a translator, prompt, or draft section cannot preserve these terms cleanly, stop and revise the translation contract before continuing.
