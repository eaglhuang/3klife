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

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-extensions', '--allow-file-access-from-files'],
  });

  const manifest = {
    screenId: opts.screenId,
    generatedAt: new Date().toISOString(),
    rootNamePrefix: opts.rootNamePrefix || toPascal(opts.screenId),
    legacyContentFallbackAllowed: !!opts.allowLegacyContentFallback,
    tabs: [],
  };

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

    for (let index = 0; index < tabs.length; index += 1) {
      const tab = tabs[index];
      const result = await page.evaluate(async ({ tabKey, tabId, index, tabSelector, contentSelector, rootNamePrefix, allowLegacyContentFallback }) => {
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
        }) || buttons[index] || null;

        if (target) {
          target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          await wait(350);
        }
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        await wait(150);

        const resolvedHost = resolveContentHost(target, contentSelector, tabKey, tabId, allowLegacyContentFallback);
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
      });

      const fragmentPath = path.join(outputDir, `${opts.screenId}.${tab.key}.right-content.html`);
      if (result.ok) {
        const html = `<!doctype html>\n<html><head>${result.head}</head><body>${result.html}</body></html>\n`;
        fs.writeFileSync(fragmentPath, html, 'utf8');
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
      });
    }

    await page.close();
  } finally {
    await browser.close();
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
