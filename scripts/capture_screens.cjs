/* eslint-disable no-undef */
const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\HandlerOne\\.gemini\\antigravity\\brain\\c271c4ec-6593-41be-a1e1-0b2a76f8c6c5';
const TARGET_URL = 'http://localhost:5173';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    try {
        console.log('Launching browser...');
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
            defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true }
        });
        const page = await browser.newPage();

        // 0. Launch OS & Open App
        console.log('Loading OS...');
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
        await sleep(2000);

        console.log('Finding Messenger Icon...');
        await page.waitForSelector('button[data-app-id="messenger"]', { timeout: 10000 });
        await page.click('button[data-app-id="messenger"]');

        console.log('Waiting for Messenger App to open...');
        await sleep(2000);

        // 1. Home (Chat List)
        console.log('Processing 01_ChatList...');
        await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_ChatList.png') });

        // 2. Contacts tab
        console.log('Processing 02_Contacts...');
        const tabs = await page.$$('button');
        for (const btn of tabs) {
            const t = await page.evaluate(el => el.textContent, btn);
            if (t.includes('通讯录')) { await btn.click(); break; }
        }
        await sleep(1000);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_Contacts.png') });

        // 3. Me tab
        console.log('Processing 03_Me...');
        const meTabs = await page.$$('button');
        for (const btn of meTabs) {
            const t = await page.evaluate(el => el.textContent, btn);
            if (t.includes('我')) { await btn.click(); break; }
        }
        await sleep(1000);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_Me.png') });

        // 4. Persona Editor (Click '新建人设')
        console.log('Processing 04_PersonaEditor...');
        // Need to be careful. The text is "新建人设" in a span.
        // XPath is safer.
        await sleep(500);
        const spans = await page.$$('span');
        for (const s of spans) {
            const t = await page.evaluate(n => n.textContent, s);
            if (t === '新建人设') { await s.click(); break; }
        }
        await sleep(1500);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_PersonaEditor.png') });

        // Exit Persona Editor (Click Back - Top Left)
        await page.mouse.click(25, 65);
        await sleep(1000);

        // 5. Discover Tab
        console.log('Processing 05_Discover...');
        const dTabs = await page.$$('button');
        for (const btn of dTabs) {
            const t = await page.evaluate(el => el.textContent, btn);
            if (t.includes('发现')) { await btn.click(); break; }
        }
        await sleep(1000);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, '05_Discover.png') });

        // 6. World Book
        console.log('Processing 06_WorldBookManager...');
        // Click "世界书" area
        const wmItems = await page.$$('h3, div');
        for (const item of wmItems) {
            const t = await page.evaluate(el => el.textContent, item);
            if (t.includes('世界书')) { await item.click(); break; }
        }
        await sleep(1500);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_WorldBookManager.png') });

        // Back
        await page.mouse.click(25, 65);
        await sleep(1000);

        // 7. Character Editor (via Contacts -> Plus)
        console.log('Processing 07_CharacterEditor...');
        const cTabs = await page.$$('button');
        for (const btn of cTabs) {
            const t = await page.evaluate(el => el.textContent, btn);
            if (t.includes('通讯录')) { await btn.click(); break; }
        }
        await sleep(500);
        // Click Plus (Top Right)
        await page.mouse.click(350, 65);
        await sleep(1500);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, '07_CharacterEditor.png') });

        await browser.close();
        console.log('Capture Complete.');
    } catch (err) {
        console.error('Script Failed:', err);
    }
})();
