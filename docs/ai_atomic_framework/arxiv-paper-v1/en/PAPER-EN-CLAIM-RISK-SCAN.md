# PAPER-EN Claim Risk Scan

Last updated: 2026-06-26
Scope: `paper.v3.1.md` and the synced `paper-zh.tex`

## Purpose

This note marks the claims most likely to drift during English translation. The goal is not to rewrite the argument, but to prevent accidental strengthening, denominator drift, or semantic over-claiming in `paper-en.tex`.

## Global English Guard

- Prefer `conservative`, `bounded`, `pre-write`, `admission-time`, `surface-level`, and `repository-scoped`.
- Avoid silently upgrading into `guarantees`, `proves`, `semantic correctness`, `complete`, `general`, `optimal`, or `large-scale` unless the Chinese source already makes that exact claim and the paper supports it.
- When in doubt, translate stronger Chinese rhetoric one notch down into calibrated research English.

## High-Risk Hotspots

1. Scope of correctness
Source hotspots:
- `paper.v3.1.md:58`
- `paper.v3.1.md:101`
- `paper.v3.1.md:488`

English guard:
- Keep the distinction between `admission-time conflict control` and `end-to-end semantic correctness`.
- Safe wording: `does not guarantee semantic correctness`, `does not establish semantic soundness`, `is limited to pre-write admission`.
- Do not translate into `ATM ensures correct merges` or `ATM proves program correctness`.

2. Structured / semantic merge positioning
Source hotspots:
- `paper.v3.1.md:127`
- related synced prose in `paper-zh.tex`

English guard:
- Preserve the contrast: SafeMerge and semistructured systems validate or exploit structure after versions exist, while ATM intervenes earlier with conservative conflict abstractions.
- Keep `complementary`, not `superior`.
- Do not imply ATM inherits semantic conflict-freedom guarantees.

3. Transactional runtime positioning
Source hotspots:
- related-work transactional-agent subsection added on 2026-06-26

English guard:
- Keep the relationship as `complementary rather than interchangeable`.
- ATM is specialized for repository mutation admission, not a general transaction runtime.
- Do not translate into `ATM subsumes Atomix/Cordon`.

4. What ATM is not
Source hotspots:
- `paper.v3.1.md:173`

English guard:
- Preserve boundaries such as `not belief synchronization`, `not shared memory consensus`, and `not a generic multi-agent coordination substrate`.
- This section should remain explicit in English because boundary loss is a common translation failure.

5. Evaluation claims
Source hotspots:
- `paper.v3.1.md:626`
- `paper.v3.1.md:661`
- `paper.v3.1.md:824`
- `paper.v3.1.md:874`

English guard:
- Keep empirical claims tied to the reported setup, policies, and row universes.
- Prefer `under the reported benchmark configuration`, `within the evaluated policy set`, or `in this corpus`.
- Avoid broad phrasing like `ATM generally outperforms existing systems`.

6. Table 18 / 19 / 20 denominator wording
Source hotspots:
- `paper.v3.1.md:892`
- `paper.v3.1.md:909`
- `paper.v3.1.md:928`
- `paper.v3.1.md:930`
- `paper.v3.1.md:946`
- `paper.v3.1.md:948`
- `paper.v3.1.md:961`

English guard:
- Always name the denominator or row universe in prose when summarizing percentages or counts.
- Keep the separation among `20 scenarios`, `42 mode comparisons`, `252 policy rows`, `294 ablation rows`, `210 adversarial rows`, and the `51-row enforcement-timing projection`.
- Do not let English prose collapse these into one benchmark size.

7. SyncBench comparison boundary
Source hotspots:
- 2026-06-25/2026-06-26 revision around the SyncMind citation and denominator clarification

English guard:
- Keep the line that SyncBench's `24,332 out-of-sync instances` is a useful external replay source, but is not directly comparable to AdmissionBench row universes.
- Safe verbs: `is not directly comparable`, `should not be treated as the same denominator`, `serves as a future replay source`.
- Do not translate into `ATM is larger than SyncBench` or `ATM evaluates more cases than SyncBench` without a same-unit comparison.

## Strong Words to Recheck Before Final English Commit

- guarantee
- prove
- sound
- correct
- complete
- general
- universal
- scalable
- outperform
- superior
- conflict-free
- safe

## Translation Rule of Thumb

If a sentence sounds stronger in English than it would sound if read back into the current Chinese manuscript, rewrite it downward one notch.
