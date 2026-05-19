# TASK-ATS-0004 Evidence: Cross-Editor Black-Box Closeout

Date: 2026-05-19
Status: completed

## Summary

TASK-ATS-0004 is closed after cross-editor black-box routing passed on Copilot, Codex, Claude Code, and Google Antigravity.

The successful behavior pattern was consistent:

- the agent accepted a natural-language Python pipeline ranking request;
- the agent returned to ATM by running `node atm.mjs next --json`;
- the agent continued with ATM guidance or candidate ranking commands;
- the final answer cited ATM evidence artifacts instead of relying on ad hoc repo scanning alone.

## Acceptance Outcome

- Explicit ATM Prompt Smoke: pass
- Natural Prompt Auto Skill Trigger: pass
- Python Pipeline Ranking Quality: pass
- Candidate Ranking Artifact: pass
- Source Inventory + Police Evidence: pass
- Python-Only Blocker Neutrality: pass

## Notes

Claude Code needed repo-local `.claude/skills/atm-governance-router/SKILL.md` plus a `UserPromptSubmit` hook before natural black-box prompting became stable.

Google Antigravity passed the black-box routing chain, but ATM still lacks a dedicated first-class `antigravity` adapter. This gap is tracked separately in upstream task `ATM-GOV-0111`.