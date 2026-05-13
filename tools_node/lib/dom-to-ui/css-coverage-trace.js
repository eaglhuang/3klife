'use strict';

async function startCoverage(page) {
  if (!page || !page.coverage || typeof page.coverage.startCSSCoverage !== 'function') {
    return { enabled: false, reason: 'css-coverage-api-unavailable' };
  }
  await page.coverage.startCSSCoverage({ resetOnNavigation: false });
  return { enabled: true };
}

async function stopCoverage(page) {
  let rawCoverage = [];
  if (page && page.coverage && typeof page.coverage.stopCSSCoverage === 'function') {
    try {
      rawCoverage = await page.coverage.stopCSSCoverage();
    } catch (_) {
      rawCoverage = [];
    }
  }

  let selectorRects = [];
  if (page && typeof page.evaluate === 'function') {
    selectorRects = await page.evaluate(() => {
      const out = [];
      const seen = new Set();
      const MAX_SELECTORS = 1500;

      const pushRect = (selector, rect, source) => {
        if (!selector || !rect) return;
        if (rect.width <= 0 || rect.height <= 0) return;
        const key = `${selector}|${Math.round(rect.x)}|${Math.round(rect.y)}|${Math.round(rect.width)}|${Math.round(rect.height)}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({
          selector,
          rect: {
            x: rect.x,
            y: rect.y,
            w: rect.width,
            h: rect.height,
          },
          source,
        });
      };

      const buildElementSelector = (el) => {
        if (!el || !el.tagName) return null;
        if (el.id && typeof el.id === 'string' && el.id.trim()) return `#${el.id.trim()}`;
        const tag = el.tagName.toLowerCase();
        const classes = Array.from(el.classList || []).filter(Boolean).slice(0, 2);
        if (classes.length > 0) return `${tag}.${classes.join('.')}`;
        return tag;
      };

      const elements = Array.from(document.querySelectorAll('*')).slice(0, 2000);
      for (const el of elements) {
        const selector = buildElementSelector(el);
        if (!selector) continue;
        const rect = el.getBoundingClientRect();
        pushRect(selector, rect, 'dom');
        if (out.length >= MAX_SELECTORS) break;
      }

      if (out.length < MAX_SELECTORS) {
        const sheets = Array.from(document.styleSheets || []);
        for (const sheet of sheets) {
          let rules = [];
          try {
            rules = Array.from(sheet.cssRules || []);
          } catch (_) {
            rules = [];
          }
          for (const rule of rules) {
            if (!rule || typeof rule.selectorText !== 'string') continue;
            const selectorParts = rule.selectorText.split(',').map((part) => part.trim()).filter(Boolean).slice(0, 4);
            for (const selector of selectorParts) {
              let matched = [];
              try {
                matched = Array.from(document.querySelectorAll(selector)).slice(0, 5);
              } catch (_) {
                matched = [];
              }
              for (const node of matched) {
                const rect = node.getBoundingClientRect();
                pushRect(selector, rect, 'css-rule');
                if (out.length >= MAX_SELECTORS) break;
              }
              if (out.length >= MAX_SELECTORS) break;
            }
            if (out.length >= MAX_SELECTORS) break;
          }
          if (out.length >= MAX_SELECTORS) break;
        }
      }

      return out;
    });
  }

  return {
    rawCoverage,
    selectorRects,
    collectedAt: new Date().toISOString(),
  };
}

function mapZoneToSelectors(zoneRect, coverageData, layoutBundle) {
  const rect = normalizeRect(zoneRect);
  if (!rect) return { sourceDomSelectors: [], ucufNodeIds: [] };

  const selectorRects = Array.isArray(coverageData && coverageData.selectorRects)
    ? coverageData.selectorRects
    : [];
  const scored = [];
  for (const entry of selectorRects) {
    if (!entry || !entry.rect || typeof entry.selector !== 'string') continue;
    const other = normalizeRect(entry.rect);
    if (!other) continue;
    const overlap = rectOverlapRatio(rect, other);
    const intersection = rectIntersectionArea(rect, other);
    if (overlap <= 0.15 && intersection < 120) continue;
    scored.push({ selector: entry.selector, score: overlap + Math.min(1, intersection / 1000) });
  }

  scored.sort((a, b) => b.score - a.score || a.selector.localeCompare(b.selector));
  const sourceDomSelectors = uniqueStrings(scored.map((item) => item.selector)).slice(0, 8);

  const ucufNodeIds = [];
  const traceEntries = Array.isArray(layoutBundle && layoutBundle.traceCatalog)
    ? layoutBundle.traceCatalog
    : [];
  const selectorSet = new Set(sourceDomSelectors);

  for (const entry of traceEntries) {
    if (!entry) continue;
    const selector = typeof entry.selector === 'string' ? entry.selector : null;
    const selectorMatched = selector && selectorSet.has(selector);
    const rectMatched = rect && entry.rect ? rectOverlapRatio(rect, entry.rect) > 0.2 : false;
    if (!selectorMatched && !rectMatched) continue;

    const slots = Array.isArray(entry.ucufNodeSlots) ? entry.ucufNodeSlots : [];
    for (const slot of slots) {
      if (!slot || typeof slot !== 'object') continue;
      const id = typeof slot.ucufId === 'string' && slot.ucufId
        ? slot.ucufId
        : (typeof slot.nodeId === 'string' ? slot.nodeId : null);
      if (id && !ucufNodeIds.includes(id)) ucufNodeIds.push(id);
    }
  }

  return { sourceDomSelectors, ucufNodeIds };
}

function normalizeRect(rect) {
  if (!rect || typeof rect !== 'object') return null;
  const x = Number(rect.x);
  const y = Number(rect.y);
  const w = Number(rect.w ?? rect.width);
  const h = Number(rect.h ?? rect.height);
  if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return null;
  return { x, y, w, h };
}

function rectIntersectionArea(left, right) {
  const x1 = Math.max(left.x, right.x);
  const y1 = Math.max(left.y, right.y);
  const x2 = Math.min(left.x + left.w, right.x + right.w);
  const y2 = Math.min(left.y + left.h, right.y + right.h);
  const w = Math.max(0, x2 - x1);
  const h = Math.max(0, y2 - y1);
  return w * h;
}

function rectOverlapRatio(left, right) {
  const intersection = rectIntersectionArea(left, right);
  if (intersection <= 0) return 0;
  const base = Math.max(1, Math.min(left.w * left.h, right.w * right.h));
  return intersection / base;
}

function uniqueStrings(values) {
  const out = [];
  const seen = new Set();
  for (const value of values || []) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

module.exports = {
  startCoverage,
  stopCoverage,
  mapZoneToSelectors,
};
