// Rooktest voor Blanche: opent index.html met nepgegevens (test/testdata.json, geen echte wijnen) en een nep-Supabase (test/mock.js)
// en klikt de belangrijkste schermen door. Faalt bij een JavaScript-fout of een leeg scherm.
// Draait vanzelf op GitHub bij elke push (.github/workflows/rooktest.yml). Lokaal: npm i playwright && npx playwright install chromium && node test/rooktest.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
(async () => {
  const fouten = [], stappen = [];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => fouten.push('JS-fout: ' + e.message));
  await p.route('**/*', (r) => {
    const u = r.request().url();
    if (u.includes('supabase-js')) return r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8'), contentType: 'text/javascript' });
    if (u.startsWith('file:')) return r.continue();
    return r.abort();
  });
  await p.addInitScript((d) => { window.__D = JSON.parse(d); localStorage.clear(); }, fs.readFileSync(path.join(__dirname, 'testdata.json'), 'utf8'));
  await p.goto('file://' + path.join(ROOT, 'index.html'));
  await p.waitForTimeout(1500);
  const check = async (naam, fn, arg) => { try { const r = await p.evaluate(fn, arg); if (!r) fouten.push(naam + ': leeg of mislukt'); else stappen.push('✓ ' + naam + (r === true ? '' : ' (' + r + ')')); } catch (e) { fouten.push(naam + ': ' + e.message); } await p.waitForTimeout(400); };
  await check('Kelder laadt', () => document.querySelectorAll('#main .card').length);
  await check('Te doen / alert', () => typeof todoBox === 'function' && typeof nuOpLijst === 'function');
  await check('Wijnkaart opent', async () => { detail(S.kelder[0].wijn_id); await new Promise((r) => setTimeout(r, 500)); return !!document.querySelector('#sh .big-scores'); });
  await check('Drinken-scherm', async () => { drinkFlow(0); await new Promise((r) => setTimeout(r, 300)); const n = document.querySelectorAll('#fs button').length; closeSheet(); return n === 5 && n; });
  await check('Indeling rustig', () => { ls.set('kmodus', 'rustig'); const P = kastPlan(); return P && P.units.length; });
  await check('Indeling strak', () => { ls.set('kmodus', 'strak'); const P = kastPlan(); ls.set('kmodus', 'rustig'); return P && P.units.length; });
  await check('Kaart', async () => { S.groep = 'kaart'; drawKelder(); await new Promise((r) => setTimeout(r, 300)); const ok = /Kelderkaart/.test(document.querySelector('#main').innerText); S.groep = 'zone'; return ok; });
  for (const t of ['geproefd', 'ontdek', 'smaak']) await check('Tabblad ' + t, async (t) => { go(t); await new Promise((r) => setTimeout(r, 700)); return document.querySelector('#main').innerText.trim().length > 20; }, t);
  await check('Beheer', async () => { beheer(); await new Promise((r) => setTimeout(r, 200)); const ok = !!document.querySelector('#bkp'); closeSheet(); return ok; });
  await b.close();
  console.log(stappen.join('\n'));
  if (fouten.length) { console.error('\n✗ ROOKTEST MISLUKT\n' + fouten.join('\n')); process.exit(1); }
  console.log('\nRooktest geslaagd');
})();
