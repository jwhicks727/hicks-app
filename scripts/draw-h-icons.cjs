// Draws the three "H" home-screen icon options in docs/icon-options/ (decisions log, 2026-11-01).
// Usage: node scripts/draw-h-icons.cjs (needs Playwright, as scripts/make-icons.mjs does). Simple shapes drawn
// in code on the current icon's gradient, and the app's own Caprasimo for option C.
// Three home-screen icon options: a white, blocky, leafy H on the current icon's sky.
const { chromium } = require('playwright');
const fs = require('fs');
const BG = `<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#6772C2"/><stop offset=".22" stop-color="#9580C1"/><stop offset=".42" stop-color="#C98FB5"/>
    <stop offset=".62" stop-color="#F6B897"/><stop offset=".82" stop-color="#FEC07B"/><stop offset="1" stop-color="#FC8F4D"/></linearGradient>
  <radialGradient id="glow" cx=".5" cy=".55" r=".55"><stop offset="0" stop-color="#FFF5E6" stop-opacity=".55"/><stop offset="1" stop-color="#FFF5E6" stop-opacity="0"/></radialGradient>
  <linearGradient id="leafg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B7DC6A"/><stop offset="1" stop-color="#5FA33A"/></linearGradient>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#7A3A20" flood-opacity=".28"/></filter>
</defs>
<rect width="1024" height="1024" fill="url(#sky)"/><rect width="1024" height="1024" fill="url(#glow)"/>`;
const W = '#FFF8EE';
const OPTIONS = {
  // A: a chunky, soft H, a seedling rising from its crossbar between the stems
  'h-sprout': `<g filter="url(#sh)">
    <rect x="212" y="236" width="184" height="600" rx="64" fill="${W}"/><rect x="628" y="236" width="184" height="600" rx="64" fill="${W}"/>
    <rect x="360" y="508" width="304" height="140" rx="48" fill="${W}"/>
    <path d="M512 520 C 504 440, 494 390, 512 300" fill="none" stroke="${W}" stroke-width="36" stroke-linecap="round"/>
    <path d="M504 400 C 460 414, 414 392, 404 316 C 462 304, 498 344, 504 400 Z" fill="${W}"/>
    <path d="M496 392 C 464 396, 432 378, 424 332 C 462 326, 490 350, 496 392 Z" fill="url(#leafg)"/>
    <path d="M516 350 C 560 360, 618 336, 626 258 C 560 250, 520 292, 516 350 Z" fill="${W}"/>
    <path d="M526 340 C 560 344, 598 326, 606 274 C 562 272, 532 300, 526 340 Z" fill="url(#leafg)"/>
  </g>`,
  'h-leaf': `<g filter="url(#sh)">
    <path d="M320 850 C 196 700, 196 400, 320 180 C 444 400, 444 700, 320 850 Z" fill="${W}"/>
    <path d="M704 850 C 580 700, 580 400, 704 180 C 828 400, 828 700, 704 850 Z" fill="${W}"/>
    <path d="M320 810 V 230 M320 640 L 268 572 M320 480 L 268 418 M320 560 L 372 494 M704 810 V 230 M704 640 L 756 572 M704 480 L 756 418 M704 560 L 652 494" stroke="#EBC9A6" stroke-width="16" stroke-linecap="round" fill="none"/>
    <path d="M384 566 C 456 514, 568 618, 640 560" fill="none" stroke="${W}" stroke-width="84" stroke-linecap="round"/>
    <path d="M498 548 C 472 486, 498 430, 560 410 C 570 472, 550 526, 498 548 Z" fill="${W}"/>
    <path d="M508 528 C 492 486, 510 450, 546 434 C 552 474, 536 508, 508 528 Z" fill="url(#leafg)"/>
  </g>`,
  'h-caprasimo': `<g filter="url(#sh)">
    <text x="500" y="826" text-anchor="middle" font-family="Caprasimo" font-size="800" fill="${W}">H</text>
    <path d="M700 268 C 716 190, 800 140, 896 160 C 880 248, 800 296, 700 268 Z" fill="${W}"/>
    <path d="M720 256 C 742 202, 800 172, 870 180 C 852 238, 794 268, 720 256 Z" fill="url(#leafg)"/>
    <path d="M706 266 C 690 240, 684 212, 690 190" fill="none" stroke="${W}" stroke-width="18" stroke-linecap="round"/>
  </g>`,
};
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  for (const [name, art] of Object.entries(OPTIONS)) {
    await p.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Caprasimo&display=block" rel="stylesheet"><style>body{margin:0}</style></head><body><svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${BG}${art}</svg></body></html>`);
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
    await p.screenshot({ path: require('path').join(__dirname, '..', 'docs', 'icon-options', name + '.png') });
  }
  // Side by side, at home-screen size and large, with the current one
  const imgs = ['sprout-outline', 'h-sprout', 'h-leaf', 'h-caprasimo'].map((n) => 'data:image/png;base64,' + fs.readFileSync(require('path').join(__dirname, '..', 'docs', 'icon-options', n + '.png')).toString('base64'));
  await p.setViewportSize({ width: 1180, height: 520 });
  await p.setContent(`<body style="margin:0;background:#1D1A2E;font:700 18px Nunito,system-ui;color:#fff;padding:24px;display:grid;grid-template-columns:repeat(4,1fr);gap:24px;text-align:center">${imgs.map((s, i) => `<div><img src="${s}" style="width:240px;border-radius:52px;display:block;margin:0 auto 14px"><img src="${s}" style="width:60px;border-radius:14px"><div style="margin-top:8px">${['Now (sprout)', 'A · Sprouting H', 'B · Leaf H', 'C · Caprasimo H'][i]}</div></div>`).join('')}</body>`);
  await p.waitForTimeout(300);
  await p.screenshot({ path: require('path').join(__dirname, '..', 'docs', 'icon-options') + '/compare-h.png' });
  await b.close();
})();
