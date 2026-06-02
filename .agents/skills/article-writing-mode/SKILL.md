---
name: article-writing-mode
description: Write or revise AI-learning-notes article pages in "寫文章模式" when the user asks for articles, technical articles, blog posts, bilingual versions, article formatting consistency, shared article-base alignment, responsive layout, summary/TOC decisions, contrast, or publishing-flow compatibility.
---

# Article Writing Mode

Use this skill to produce site-ready articles for the AI-learning-notes site. Optimize for consistency, readability, and maintainability across the whole article family.

## Source of truth

- Read the shared article contract first:
  - `C:\Users\User\3KLife\temp_workspace\AI-learning-notes\assets\css\article-base.css`
  - `C:\Users\User\3KLife\temp_workspace\AI-learning-notes\assets\js\article-base.js`
  - `C:\Users\User\3KLife\temp_workspace\AI-learning-notes\docs\article-format-handoff-summary.md`
- Treat the homepage, article index, and representative article pages as the visual baseline.
- If homepage tokens or shell rules change, article pages must follow.

## Writing workflow

1. Confirm whether the request is a new article, a revision, a bilingual pair, or a prose-only draft.
2. Decide whether the page needs a summary block, a TOC, figure cards, comparison panels, or callouts.
3. Draft the article to fit the shared shell instead of inventing a unique page theme.
4. Keep only article-specific structure in page HTML; let `article-base.js` handle shared behavior.
5. Verify the result at phone, tablet, and desktop widths before calling it done.

## Shell contract

- Keep `body id="top"` and the shared article scaffold.
- Do not duplicate `回首頁 | Top`, footer, traffic counter, overlay, or figure-download behavior in each page.
- Do not create a unique footer, page shell, or top anchor per article.
- Keep inline CSS to the minimum needed for article-local layout details.

## Design tokens

Use the site-wide token language consistently:

- `--paper`
- `--paper-2`
- `--panel`
- `--ink`
- `--muted`
- `--jade`
- `--jade-2`
- `--cinnabar`
- `--gold`
- `--river`
- `--line`
- `--shadow`
- `--r`
- `--r-sm`
- `--w`
- `--serif`
- `--mono`

Rules:

- Use the homepage and article-base token family as one system.
- Keep body text and metadata high-contrast against the paper background.
- Prefer the existing token palette over one-off colors.
- Do not introduce a new article-specific palette unless the user explicitly asks for one.

## Responsive rules

- Design for handheld first, then tablet, then desktop.
- Make phone layouts single-column and readable with no horizontal scrolling.
- Ensure headings, tables, figures, TOC blocks, buttons, and callouts do not overlap at common widths such as 390px, 430px, 768px, and desktop.
- Keep touch targets usable and never rely on hover-only affordances.
- If a two-column layout is used, it must collapse cleanly into one column on narrow screens.

## Summary and TOC

- Include a short summary when the article is public-facing, technical, explanatory, or long enough that readers need orientation.
- Include a TOC when the section count or page length makes jumping useful, especially on mobile.
- Omit TOC on short pages if it would add noise.
- Keep heading levels clean and predictable so the TOC, summary, and link anchors remain stable.

## Bilingual handling

- Keep zh and en versions aligned in scope, section order, and visual rhythm.
- Translate content, not the layout system.
- Use the same article structure and shared shell rules in both languages.
- Keep article slugs, cross-links, and index entries paired when both languages exist.

## Site architecture

- Preserve the site-wide article, index, and footer architecture.
- Update cross-links, index entries, and sitemap notes when the article is meant for public publishing.
- Keep compatibility with the site's shared navigation, overlay, and traffic-counter behavior.
- Do not break the article base by adding page-local replacements for shared behavior.

## Validation

- Compare the draft or page against the homepage and a representative article before finalizing.
- Check readability, contrast, and spacing in both light and narrow viewports.
- Confirm that the article still reads well when images are absent, when images are present, and when the TOC is long.
- If you must deviate from the shared base, keep the exception narrow and explicit.

## Never do

- Do not give each article its own shell, footer, overlay, or top-action implementation.
- Do not let one article introduce a custom typography system or color system.
- Do not ship a page that only works on desktop or only on one language.
- Do not let article content drift away from the site's shared base without a good reason.
