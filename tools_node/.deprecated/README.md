# Deprecated Phase B Tools

These scripts were moved here by H2U-REFACTOR-0004.

Files archived in this folder:

- cutover-screen-variant.js
- generate-tab-childpanels.js
- runtime-screen-diff.js

Reason for deprecation:

- The HTML-to-UCUF / Plan5 flow now uses the newer guarded workflow paths.
- Keeping these tools at the top level makes them easy to pick up by mistake.
- `run-vfx-browser-qa.js` now points at the canonical core vfx registry instead of the deleted legacy tools registry.

Revival path:

1. Restore the file with `git mv` only if an active task explicitly reintroduces the Phase B workflow.
2. Update the owning task card and validation commands first.
3. Re-run the relevant compute / browser QA gates before moving it back into the active tool path.