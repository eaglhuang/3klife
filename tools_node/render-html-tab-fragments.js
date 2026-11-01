#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  findBrowser,
  prepareSource,
  toFileUrl,
  waitForPageSettle,
} = require('./render-html-snapshot');
const { TAB_TEXT_HINTS } = require('./lib/dom-to-ui/draft-builder-core');

function parseArgs(argv) {
  const opts = {
    input: null,
    outputDir: null,
    screenId: null,
    viewport: '1920x1080',
    settleMs: 1500,
    browser: null,
    tabs: null,
    tabSelector: null,
    contentSelector: null,
    rootNamePrefix: null,
    allowLegacyContentFallback: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    const next = () => argv[++i];
    switch (token) {
      case '--input': opts.input = next(); break;
      case '--output-dir': opts.outputDir = next(); break;
      case '--screen-id': opts.screenId = next(); break;
      case '--viewport': opts.viewport = next(); break;
      case '--settle-ms': opts.settleMs = parseInt(next(), 10) || 1500; break;
      case '--browser': opts.browser = next(); break;
      case '--tabs':
        opts.tabs = String(next() || '')
          .split(',')
          .map(value => value.trim())
          .filter(Boolean)
          .map(value => ({ id: toRuntimeTabId(value), key: value.toLowerCase() }));
        break;
      case '--tab-selector': opts.tabSelector = next(); break;
      case '--content-selector': opts.contentSelector = next(); break;
      case '--root-name-prefix': opts.rootNamePrefix = next(); break;
      case '--allow-legacy-content-fallback': opts.allowLegacyContentFallback = true; break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`[render-html-tab-fragments] unknown arg: ${token}`);
        process.exit(2);
    }
  }
  if (!opts.input || !opts.outputDir || !opts.screenId) {
    printHelp();
    process.exit(2);
  }
  return opts;
}

function printHelp() {
  console.log('Usage: node tools_node/render-html-tab-fragments.js --input <html> --output-dir <dir> --screen-id <id> [--viewport WxH] [--tabs overview,stats,...]');
  console.log('  Formal mode requires data-ucuf-tab-content / aria-controls / explicit --content-selector.');
  console.log('  --allow-legacy-content-fallback permits .right-content as debug-only legacy fallback.');
}

function toRuntimeTabId(value) {
  const key = String(value || '').trim().toLowerCase();
  return key.replace(/(^|[-_])([a-z])/g, (_, __, c) => c.toUpperCase());
}

function toPascal(value) {
  return String(value || '')
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

function deriveFallbackTabs(opts, html) {
  if (Array.isArray(opts.tabs) && opts.tabs.length > 0) return opts.tabs;
  const discovered = [];
  const seen = new Set();
  const pushRaw = (raw) => {
    const tab = toTabDescriptor(raw);
    if (!tab || !tab.key || seen.has(tab.key)) return;
    seen.add(tab.key);
    discovered.push(tab);
  };
  const dataTabRegex = /data-tab\s*=\s*["']([^"']+)["']/gi;
  const ariaRegex = /aria-controls\s*=\s*["']([^"']+)["']/gi;
  let match = null;
  while ((match = dataTabRegex.exec(html)) !== null) pushRaw(match[1]);
  while ((match = ariaRegex.exec(html)) !== null) pushRaw(match[1]);
  if (discovered.length === 0) {
    const lower = String(html || '').toLowerCase();
    const defaults = [];
    if (/\bgeneral\b/.test(lower)) defaults.push('general');
    if (/\bsupport\b/.test(lower)) defaults.push('support');
    if (/\blegendary\b/.test(lower)) defaults.push('legendary');
    if (defaults.length === 0) {
      defaults.push('general', 'support', 'legendary');
    }
    for (const key of defaults) {
      const tab = toTabDescriptor(key);
      if (!tab || seen.has(tab.key)) continue;
      seen.add(tab.key);
      discovered.push(tab);
    }
  }
  return discovered;
}

function extractStaticTabFragmentHtml(html, tab) {
  const key = String(tab && tab.key || '').trim().toLowerCase();
  if (!key) return html;
  const patterns = [
    new RegExp(`<[^>]+data-ucuf-tab-content=["']${key}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i'),
    new RegExp(`<[^>]+data-tab-content=["']${key}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i'),
    new RegExp(`<[^>]+data-panel=["']${key}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i'),
    /<[^>]+class=["'][^"']*right-content[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
  ];
  for (const pattern of patterns) {
    const found = html.match(pattern);
    if (found && found[0]) return found[0];
  }
  return html;
}

function runStaticFallback(opts, preparedPath, outputDir) {
  const html = fs.readFileSync(preparedPath, 'utf8');
  const tabs = deriveFallbackTabs(opts, html);
  const manifest = {
    screenId: opts.screenId,
    generatedAt: new Date().toISOString(),
    rootNamePrefix: opts.rootNamePrefix || toPascal(opts.screenId),
    legacyContentFallbackAllowed: true,
    staticFallback: true,
    fallbackReason: 'browser-spawn-eperm',
    tabs: [],
  };
  if (!tabs || tabs.length === 0) {
    manifest.error = 'no-tabs-discovered';
    return manifest;
  }
  for (const tab of tabs) {
    const fragmentPath = path.join(outputDir, `${opts.screenId}.tab-${tab.key}.html`);
    const extracted = extractStaticTabFragmentHtml(html, tab);
    const wrapped = [
      '<!doctype html>',
      '<html><head><meta charset="utf-8"></head><body>',
      `<div data-name="${manifest.rootNamePrefix}${tab.id}Root" data-tab-content-fallback="${tab.key}">`,
      extracted,
      '</div>',
      '</body></html>',
    ].join('\n');
    fs.writeFileSync(fragmentPath, wrapped, 'utf8');
    manifest.tabs.push({
      id: tab.id,
      key: tab.key,
      ok: true,
      html: fragmentPath,
      hostName: 'RightPanel',
      hostSource: 'static-html-fallback',
      childCount: 0,
      textLength: wrapped.length,
      staticFallback: true,
    });
  }
  return manifest;
}

async function main() {
  const opts = parseArgs(process.argv);
  const [vw, vh] = opts.viewport.split('x').map(n => parseInt(n, 10));
  let puppeteer;
  try {
    puppeteer = require('puppeteer-core');
  } catch {
    console.error('[render-html-tab-fragments] puppeteer-core not found. Run: npm install');
    process.exit(1);
  }

  const browserPath = opts.browser || findBrowser();
  const preparedPath = prepareSource(opts.input);
  const outputDir = path.resolve(opts.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });

  const manifest = {
    screenId: opts.screenId,
    generatedAt: new Date().toISOString(),
    rootNamePrefix: opts.rootNamePrefix || toPascal(opts.screenId),
    legacyContentFallbackAllowed: !!opts.allowLegacyContentFallback,
    tabs: [],
  };

  let browser = null;
  try {
    browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: true,
      args: ['--no-sandbox', '--disable-gpu', '--disable-extensions', '--allow-file-access-from-files'],
    });
  } catch (error) {
    const message = String(error && (error.message || error) || '');
    if (!/EPERM/i.test(message)) throw error;
    const fallbackManifest = runStaticFallback(opts, preparedPath, outputDir);
    const fallbackPath = path.join(outputDir, `${opts.screenId}.tab-fragments.json`);
    fs.writeFileSync(fallbackPath, `${JSON.stringify(fallbackManifest, null, 2)}\n`, 'utf8');
    try { fs.unlinkSync(preparedPath); } catch {}
    if (fallbackManifest.error || !Array.isArray(fallbackManifest.tabs) || fallbackManifest.tabs.length === 0) {
      console.error('[render-html-tab-fragments] static fallback failed: no tabs discovered');
      process.exit(1);
    }
    console.warn('[render-html-tab-fragments] browser spawn EPERM; static fallback manifest emitted');
    console.log(`[render-html-tab-fragments] manifest=${fallbackPath}`);
    return;
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: vw || 1920, height: vh || 1080 });
    await page.goto(toFileUrl(preparedPath), { waitUntil: 'networkidle0', timeout: 30000 });
    await waitForPageSettle(page, opts.settleMs);

    const tabs = opts.tabs || await discoverTabs(page, opts);
    if (!tabs || tabs.length === 0) {
      manifest.error = 'no-tabs-discovered';
      fs.writeFileSync(path.join(outputDir, `${opts.screenId}.tab-fragments.json`), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      console.error('[render-html-tab-fragments] no tabs discovered');
      process.exit(1);
    }

    const baselineVisibleIds = await page.evaluate(collectVisibleIds);

    for (let index = 0; index < tabs.length; index += 1) {
      const tab = tabs[index];
      const result = await page.evaluate(async ({ tabKey, tabId, index, tabSelector, contentSelector, rootNamePrefix, allowLegacyContentFallback, tabTextHints }) => {
        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        const normalize = value => String(value || '').trim().toLowerCase();
        const queryAll = selector => {
          if (!selector) return [];
          try { return Array.from(document.querySelectorAll(selector)); } catch { return []; }
        };
        const uniqueElements = elements => {
          const seen = new Set();
          const out = [];
          for (const element of elements) {
            if (!element || seen.has(element)) continue;
            seen.add(element);
            out.push(element);
          }
          return out;
        };
        const firstVisible = candidates => {
          const visible = candidates.find(element => {
            const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : null;
            const style = window.getComputedStyle ? window.getComputedStyle(element) : null;
            return (!style || (style.display !== 'none' && style.visibility !== 'hidden'))
              && (!rect || (rect.width > 0 && rect.height > 0));
          });
          return visible || candidates[0] || null;
        };
        // 依分頁鍵文字推回分頁 key（原稿沒有 data-tab / aria-controls 時使用）
        const textTabKey = button => {
          const raw = String(button && button.textContent || '').replace(/\s+/g, '').toUpperCase();
          if (!raw) return null;
          const hit = tabTextHints.find(([hint]) => raw.includes(hint));
          return hit ? hit[1] : null;
        };
        // 原稿沒有標記內容區時：切到另一個分頁，比對前後文字有變的元素，取其最近共同祖先當內容區
        const inferHostByTabDiff = async (button, allButtons) => {
          const other = allButtons.find(candidate => candidate !== button && textTabKey(candidate) && textTabKey(candidate) !== textTabKey(button));
          if (!button || !other) return null;
          const snapshot = () => {
            const map = new Map();
            for (const element of document.body.querySelectorAll('*')) {
              if (element.children.length === 0) map.set(element, element.textContent || '');
            }
            return map;
          };
          const before = snapshot();
          other.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          await wait(350);
          const after = snapshot();
          // React 等框架切分頁會整批換節點：在另一分頁的狀態下取變動葉節點的共同祖先鏈
          const changed = [];
          for (const [element, text] of after) {
            if (!before.has(element) || before.get(element) !== text) changed.push(element);
          }
          const inButtons = element => allButtons.some(candidate => candidate.contains(element));
          const leaves = changed.filter(element => element.isConnected && !inButtons(element));
          let lca = leaves.length > 0 ? leaves[0].parentElement : null;
          while (lca && !leaves.every(element => lca.contains(element))) lca = lca.parentElement;
          const chain = [];
          for (let node = lca; node && node !== document.body; node = node.parentElement) chain.push(node);
          button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          await wait(350);
          // 切回目標分頁後，沿祖先鏈取第一個仍存在的容器
          const host = chain.find(node => node.isConnected) || null;
          if (!host || host === document.documentElement) return null;
          return host;
        };
        const resolveContentHost = (button, preferredSelector, key, id, allowLegacy) => {
          const preferred = queryAll(preferredSelector).find(Boolean);
          if (preferred) return { element: preferred, source: 'cli-content-selector', legacy: false };
          const normalized = normalize(key || id);
          const explicitCandidates = uniqueElements([
            ...queryAll(`[data-ucuf-tab-content="${normalized}"]`),
            ...queryAll(`[data-tab-content="${normalized}"]`),
            ...queryAll(`[data-panel="${normalized}"]`),
            ...queryAll('[data-ucuf-tab-content]'),
            ...queryAll('[role="tabpanel"]'),
          ]);
          const explicit = firstVisible(explicitCandidates);
          if (explicit) return { element: explicit, source: 'tab-content-contract', legacy: false };

          const controls = button && (button.getAttribute('aria-controls') || button.getAttribute('data-target'));
          if (controls) {
            const byId = document.getElementById(controls);
            if (byId) return { element: byId, source: 'aria-controls-or-data-target', legacy: false };
          }

          const legacyCandidates = uniqueElements([
            ...queryAll('.right-content'),
            ...queryAll('#right-content'),
          ]);
          const legacy = firstVisible(legacyCandidates);
          if (legacy && allowLegacy) return { element: legacy, source: 'legacy-right-content', legacy: true };
          if (legacy) return { element: null, source: 'legacy-right-content-blocked', legacy: true };
          return { element: null, source: 'not-found', legacy: false };
        };
        const buttons = uniqueElements([
          ...queryAll(tabSelector),
          ...queryAll('[role="tab"]'),
          ...queryAll('[data-tab]'),
          ...queryAll('[aria-controls]'),
          ...queryAll('button[data-target]'),
          ...queryAll('button'),
        ]);
        const target = buttons.find(button => {
          const dataValues = [
            button.getAttribute('data-tab'),
            button.getAttribute('data-target'),
            button.getAttribute('aria-controls'),
            button.id,
          ].map(normalize);
          return dataValues.includes(tabKey) || dataValues.includes(tabId.toLowerCase());
        }) || buttons.find(button => textTabKey(button) === tabKey) || buttons[index] || null;

        if (target) {
          target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          await wait(350);
        }
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        await wait(150);

        let resolvedHost = resolveContentHost(target, contentSelector, tabKey, tabId, allowLegacyContentFallback);
        if (!resolvedHost.element) {
          const inferred = await inferHostByTabDiff(target, buttons);
          if (inferred) resolvedHost = { element: inferred, source: 'inferred-tab-diff', legacy: false };
        }
        const source = resolvedHost && resolvedHost.element;
        if (!source) {
          return {
            ok: false,
            error: resolvedHost && resolvedHost.source === 'legacy-right-content-blocked'
              ? 'legacy-content-host-fallback-blocked'
              : 'tab-content-host-not-found',
            hostSource: resolvedHost && resolvedHost.source || 'not-found',
            fixAction: resolvedHost && resolvedHost.source === 'legacy-right-content-blocked'
              ? 'Add data-ucuf-tab-content, role=tabpanel, aria-controls, or pass --allow-legacy-content-fallback for debug-only replay.'
              : 'Add an explicit tab content contract for this source.',
            buttonCount: buttons.length,
            buttonText: buttons.map(button => button.textContent || '').slice(0, 12),
          };
        }

        const clone = document.createElement('div');
        clone.setAttribute('data-name', `${rootNamePrefix}${tabId}Root`);
        const hostName = source.getAttribute('data-name')
          || source.getAttribute('id')
          || source.getAttribute('name')
          || null;
        const computed = window.getComputedStyle ? window.getComputedStyle(source) : null;
        const rect = source.getBoundingClientRect ? source.getBoundingClientRect() : null;
        const sourceWidthCss = computed && computed.getPropertyValue('width');
        const sourceHeightCss = computed && computed.getPropertyValue('height');
        const fallbackWidth = `${Math.max(1, Math.round((rect && rect.width) || source.clientWidth || source.offsetWidth || 0))}px`;
        const fallbackHeight = `${Math.max(1, Math.round((rect && rect.height) || source.clientHeight || source.offsetHeight || 0))}px`;
        const copyProps = [
          'display',
          'flex-direction',
          'gap',
          'padding-top',
          'padding-right',
          'padding-bottom',
          'padding-left',
          'box-sizing',
          'overflow',
        ];
        for (const prop of copyProps) {
          const value = computed && computed.getPropertyValue(prop);
          if (value) clone.style.setProperty(prop, value);
        }
        clone.style.setProperty('width', sourceWidthCss && sourceWidthCss.trim() ? sourceWidthCss.trim() : fallbackWidth);
        clone.style.setProperty('min-height', sourceHeightCss && sourceHeightCss.trim() ? sourceHeightCss.trim() : fallbackHeight);
        for (const child of Array.from(source.childNodes)) {
          clone.appendChild(child.cloneNode(true));
        }
        return {
          ok: true,
          head: document.head ? document.head.innerHTML : '',
          html: clone.outerHTML,
          textLength: (clone.textContent || '').trim().length,
          childCount: clone.children ? clone.children.length : 0,
          buttonCount: buttons.length,
          hostSource: resolvedHost.source,
          hostName,
          legacyHost: !!resolvedHost.legacy,
        };
      }, {
        tabKey: tab.key,
        tabId: tab.id,
        index,
        tabSelector: opts.tabSelector,
        contentSelector: opts.contentSelector,
        rootNamePrefix: opts.rootNamePrefix || toPascal(opts.screenId),
        allowLegacyContentFallback: opts.allowLegacyContentFallback,
        tabTextHints: TAB_TEXT_HINTS,
      });

      const fragmentPath = path.join(outputDir, `${opts.screenId}.${tab.key}.right-content.html`);
      const regions = [];
      let hides = [];
      if (result.ok) {
        const html = `<!doctype html>\n<html><head>${result.head}</head><body>${result.html}</body></html>\n`;
        fs.writeFileSync(fragmentPath, html, 'utf8');
        // Areas outside the content host that this tab shows or hides (e.g. a full-width
        // family tree replacing the portrait); each shown area becomes its own fragment.
        const delta = await page.evaluate(collectTabRegionDelta, {
          baseline: baselineVisibleIds,
          hostName: result.hostName,
          rootNamePrefix: `${opts.rootNamePrefix || toPascal(opts.screenId)}${tab.id}`,
        });
        hides = delta.hides;
        for (const region of delta.regions) {
          const regionPath = path.join(outputDir, `${opts.screenId}.${tab.key}.region.${region.id}.html`);
          fs.writeFileSync(regionPath, `<!doctype html>\n<html><head>${result.head}</head><body>${region.html}</body></html>\n`, 'utf8');
          regions.push({ id: region.id, html: regionPath });
        }
      }
      manifest.tabs.push({
        id: tab.id,
        key: tab.key,
        ok: !!result.ok,
        html: result.ok ? fragmentPath : null,
        error: result.error || null,
        childCount: result.childCount || 0,
        textLength: result.textLength || 0,
        buttonCount: result.buttonCount || 0,
        buttonText: result.buttonText || undefined,
        hostSource: result.hostSource || null,
        hostName: result.hostName || null,
        legacyHost: !!result.legacyHost,
        fixAction: result.fixAction || undefined,
        regions: regions.length > 0 ? regions : undefined,
        hides: hides.length > 0 ? hides : undefined,
      });
    }

    await page.close();
  } finally {
    if (browser) await browser.close();
    try { fs.unlinkSync(preparedPath); } catch {}
  }

  const manifestPath = path.join(outputDir, `${opts.screenId}.tab-fragments.json`);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`[render-html-tab-fragments] wrote ${manifest.tabs.filter(tab => tab.ok).length}/${manifest.tabs.length} fragments to ${outputDir}`);
  console.log(`[render-html-tab-fragments] manifest=${manifestPath}`);
  if (manifest.tabs.some(tab => !tab.ok)) process.exit(1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('[render-html-tab-fragments] error:', error && error.stack || error);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  main,
};

async function discoverTabs(page, opts) {
  const discovered = await page.evaluate(({ tabSelector }) => {
    const queryAll = selector => {
      if (!selector) return [];
      try { return Array.from(document.querySelectorAll(selector)); } catch { return []; }
    };
    const uniqueElements = elements => {
      const seen = new Set();
      const out = [];
      for (const element of elements) {
        if (!element || seen.has(element)) continue;
        seen.add(element);
        out.push(element);
      }
      return out;
    };
    const buttons = uniqueElements([
      ...queryAll(tabSelector),
      ...queryAll('[role="tab"]'),
      ...queryAll('[data-tab]'),
      ...queryAll('[aria-controls]'),
      ...queryAll('button[data-target]'),
    ]);
    return buttons.map((button, index) => {
      const raw = button.getAttribute('data-tab')
        || button.getAttribute('data-target')
        || button.getAttribute('aria-controls')
        || button.id
        || (button.textContent || '').trim()
        || `tab-${index + 1}`;
      return { raw };
    });
  }, { tabSelector: opts.tabSelector });
  return discovered
    .map(item => toTabDescriptor(item.raw))
    .filter(tab => tab && tab.key);
}

function toTabDescriptor(value) {
  const key = String(value || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  if (!key) return null;
  return { id: toRuntimeTabId(key), key };
}

// Runs in the page: ids of elements the user can currently see.
function collectVisibleIds() {
  const isVisible = (element) => {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  return Array.from(document.querySelectorAll('[id]')).filter(isVisible).map(element => element.id);
}

// Runs in the page: id'd areas outside the tab content host that the current tab shows
// (cloned as fragment HTML) or hides, compared with the page's default state.
async function collectTabRegionDelta({ baseline, hostName, rootNamePrefix }) {
  // Let show/hide transitions settle so visibility reflects the tab's resting state.
  // Looping animations never finish, so cap the wait.
  const settled = Promise.all((document.getAnimations ? document.getAnimations() : []).map(a => a.finished.catch(() => null)));
  await Promise.race([settled, new Promise(resolve => setTimeout(resolve, 1000))]);
  const host = hostName ? document.getElementById(hostName) : null;
  const related = (element) => !!host && (element === host || element.contains(host) || host.contains(element));
  const outermost = (elements) => elements.filter(element => !elements.some(other => other !== element && other.contains(element)));
  const nowVisible = new Set(collectVisibleIdsInPage());
  const before = new Set(baseline || []);
  const byId = id => document.getElementById(id);
  const shown = outermost([...nowVisible].filter(id => !before.has(id)).map(byId).filter(el => el && !related(el)));
  const hidden = outermost([...before].filter(id => !nowVisible.has(id)).map(byId).filter(el => el && !related(el)));
  const regions = shown.map((element) => {
    const computed = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const clone = document.createElement('div');
    const pascal = String(element.id).replace(/(^|[-_\s]+)(\w)/g, (_, __, c) => c.toUpperCase());
    clone.setAttribute('data-name', `${rootNamePrefix}${pascal}Root`);
    // The mount keeps the area's own box (background, padding); the fragment is its content box.
    const padX = parseFloat(computed.paddingLeft) + parseFloat(computed.paddingRight);
    const padY = parseFloat(computed.paddingTop) + parseFloat(computed.paddingBottom);
    for (const prop of ['display', 'flex-direction', 'gap', 'box-sizing']) {
      const value = computed.getPropertyValue(prop);
      if (value) clone.style.setProperty(prop, value);
    }
    clone.style.setProperty('width', `${Math.max(1, Math.round(rect.width - padX))}px`);
    clone.style.setProperty('min-height', `${Math.max(1, Math.round(element.scrollHeight - padY))}px`);
    for (const child of Array.from(element.childNodes)) clone.appendChild(child.cloneNode(true));
    return { id: element.id, html: clone.outerHTML };
  });
  return { regions, hides: hidden.map(element => element.id) };

  function collectVisibleIdsInPage() {
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    return Array.from(document.querySelectorAll('[id]')).filter(isVisible).map(element => element.id);
  }
}
