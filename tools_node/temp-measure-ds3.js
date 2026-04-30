const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const htmlPath = path.resolve('Design System 3/ui_kits/character/index.html');
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'));
  await new Promise(r => setTimeout(r, 600));

  const measures = await page.evaluate(() => {
      const pick = (el) => {
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      };
      // right-content children (header / mini-cards / bloodline / bio)
      const rc = document.querySelector('#right-content > div');
      const rcChildren = rc ? Array.from(rc.children).map((c, i) => ({
        i, tag: c.tagName, ...pick(c), text: c.textContent.trim().slice(0, 40)
      })) : [];
      // tab-item icons
      const tabItems = Array.from(document.querySelectorAll('.tab-item,.tab-icon')).map(el => ({
        cls: el.className.slice(0, 40), ...pick(el)
      }));
      // tab-rail-wrap children
      const trw = document.querySelector('.tab-rail-wrap');
      const railChildren = trw ? Array.from(trw.children).map((c, i) => ({
        i, cls: c.className.slice(0, 40), ...pick(c)
      })) : [];
      return { rcChildren, tabItems, railChildren };
  });

  console.log(JSON.stringify(measures, null, 2));
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
