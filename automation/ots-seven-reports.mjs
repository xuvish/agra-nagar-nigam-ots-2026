#!/usr/bin/env node
/**
 * User-authorized, local-only browser automation for the seven OTS exports.
 * Run setup once to record clicks; subsequent runs replay those clicks.
 * Human login / OTP / CAPTCHA are never recorded or bypassed.
 * Taxpayer spreadsheets remain in a temporary local directory, never in Git.
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(os.homedir(), '.agra-ots-automation');
const CONFIG = path.join(ROOT, 'selectors.json');
const PORTAL = 'https://www.upulbots.in/Login.aspx';
const ORIGIN = new URL(PORTAL).origin;
const DASHBOARD = 'https://xuvish.github.io/agra-nagar-nigam-ots-2026/';
const REPORTS = [
  {key: 'apps', label: 'Applications'},
  {key: 'zone', label: 'Zone/Ward Application Summary'},
  {key: 'collection', label: 'Collection Report'},
  {key: 'full', label: 'FULL Payment Data'},
  {key: 'part', label: 'PART Payment Data'},
  {key: 'inprocess', label: 'In-Process Report'},
  {key: 'approved', label: 'Approved Application Summary'}
];
const RANKING = {key: 'ranking', label: '75 ULB Statewide DHQ Ranking'};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const safeName = s => String(s || 'export.xls').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 95);

function watchDownload(context, timeoutMs = 600000) {
  let finish, timer, onPage;
  const listeners = new Map();
  let settled = false;
  const promise = new Promise((resolve, reject) => {
    finish = (error, download) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      for (const [p, handler] of listeners) p.off('download', handler);
      context.off('page', onPage);
      if (error) reject(error);
      else resolve(download);
    };
    const attach = p => {
      if (listeners.has(p)) return;
      const handler = d => finish(null, d);
      listeners.set(p, handler);
      p.on('download', handler);
    };
    onPage = p => attach(p);
    context.pages().forEach(attach);
    context.on('page', onPage);
    timer = setTimeout(() => finish(new Error('No download detected. Check that the report was exported.')), timeoutMs);
  });
  return {promise, cancel: () => finish(new Error('Download watcher cancelled.'))};
}

async function storeDownload(download, directory, key, index) {
  const extension = path.extname(download.suggestedFilename()).toLowerCase();
  if (!['.xls', '.xlsx', '.csv'].includes(extension)) {
    throw new Error('Unexpected report extension: ' + extension + '. Expected Excel/CSV.');
  }
  const filename = String(index + 1).padStart(2, '0') + '-' + key + '-' + safeName(download.suggestedFilename());
  const destination = path.join(directory, filename);
  await download.saveAs(destination);
  const stat = await fs.stat(destination);
  if (stat.size === 0) throw new Error('Empty download: ' + filename);
  console.log('Saved locally: ' + filename + ' (' + stat.size + ' bytes)');
  return destination;
}

async function loadConfig() {
  const cfg = JSON.parse(await fs.readFile(CONFIG, 'utf8'));
  if (cfg.version !== 1 || cfg.portalOrigin !== ORIGIN || !Array.isArray(cfg.reports) || cfg.reports.length !== 7) {
    throw new Error('Selector configuration is invalid. Run npm run setup again.');
  }
  for (let i = 0; i < REPORTS.length; i++) {
    const r = cfg.reports[i];
    if (r.key !== REPORTS[i].key || !Array.isArray(r.steps) || !r.steps.length) {
      throw new Error('Missing recorded steps for ' + REPORTS[i].label + '.');
    }
    for (const step of r.steps) {
      if (typeof step.path !== 'string' || !step.path.startsWith('/') ||
          step.path.startsWith('//') || typeof step.selector !== 'string' ||
          !step.selector || step.selector.length > 1000) {
        throw new Error('Unsafe or incomplete recorded selector for ' + r.key);
      }
    }
  }
  if (cfg.ranking) {
    if (cfg.ranking.key !== RANKING.key || !Array.isArray(cfg.ranking.steps) || !cfg.ranking.steps.length)
      throw new Error('Invalid optional eighth-report selector plan.');
    for (const step of cfg.ranking.steps) {
      if (typeof step.path !== 'string' || !step.path.startsWith('/') || step.path.startsWith('//') ||
        typeof step.selector !== 'string' || !step.selector || step.selector.length > 1000)
        throw new Error('Invalid eighth-report selector.');
    }
  }
  return cfg;
}

async function replay(page, context, config, directory) {
  const files = [];
  for (let i = 0; i < REPORTS.length; i++) {
    const report = config.reports[i];
    console.log('Export ' + (i + 1) + '/7: ' + report.label);
    const steps = report.steps;
    for (let j = 0; j < steps.length; j++) {
      const step = steps[j];
      const currentPath = new URL(page.url()).pathname;
      if (currentPath !== step.path) {
        await page.goto(ORIGIN + step.path, {waitUntil: 'domcontentloaded', timeout: 60000});
      }
      const locator = page.locator(step.selector).first();
      if (j === steps.length - 1) {
        const watcher = watchDownload(context, 120000);
        try {
          await locator.click({timeout: 30000});
          const download = await watcher.promise;
          files.push(await storeDownload(download, directory, report.key, i));
        } catch (error) {
          watcher.cancel();
          throw new Error(report.label + ' export failed at selector ' + step.selector + ': ' + error.message);
        }
      } else {
        await locator.click({timeout: 30000});
        await sleep(400);
      }
    }
  }
  return files;
}

async function replayRanking(page, context, plan, directory) {
  if (!plan) return null;
  console.log('Export 8/8: ' + RANKING.label);
  for (let j = 0; j < plan.steps.length; j++) {
    const step = plan.steps[j];
    if (new URL(page.url()).pathname !== step.path)
      await page.goto(ORIGIN + step.path, {waitUntil: 'domcontentloaded', timeout: 60000});
    const locator = page.locator(step.selector).first();
    if (j === plan.steps.length - 1) {
      const watcher = watchDownload(context, 120000);
      try {
        await locator.click({timeout: 30000});
        return await storeDownload(await watcher.promise, directory, 'ranking', 7);
      } catch (e) {watcher.cancel();throw new Error('Eighth ranking export failed: '+e.message)}
    }
    await locator.click({timeout: 30000});
    await sleep(400);
  }
  throw new Error('Missing eighth ranking export steps.');
}

async function uploadToDashboard(context, rl, files, rankingFile = null) {
  const page = await context.newPage();
  await page.goto(DASHBOARD, {waitUntil: 'domcontentloaded', timeout: 90000});
  await page.waitForFunction(() => window.__OTS_BOOTSTRAP_READY === true, null, {timeout: 90000});
  console.log('\nDashboard opened in another browser tab.');
  console.log('Click Manage Reports, enter YOUR dashboard admin login and leave Manage Reports open.');
  await rl.question('Press Enter HERE once the 7-file upload modal is visible: ');
  await page.waitForFunction(() => document.querySelector('#reportModal')?.classList.contains('on') === true,
    null, {timeout: 30000});
  const picker = page.locator('#masterFile');
  await picker.setInputFiles(files);
  await page.waitForFunction(() => {
    const input = document.querySelector('#masterFile');
    const msg = document.querySelector('#uploadMsg')?.textContent || '';
    return input?.files?.length === 7 && /7 reports identified by CONTENT/i.test(msg);
  }, null, {timeout: 120000});
  if (rankingFile) {
    await page.locator('#otsRankingFile').setInputFiles(rankingFile);
    let rankingDate = (await rl.question('Enter 8th statewide ranking report AS-OF date (YYYY-MM-DD): ')).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rankingDate) ||
        Number.isNaN(new Date(rankingDate + 'T00:00:00').getTime())) {
      throw new Error('Valid ranking report date is required; no upload submitted.');
    }
    await page.locator('#otsRankingDate').fill(rankingDate);
  }
  await page.locator('#reportModal .btn.primary').click();
  try {
    await page.waitForFunction(() => {
      const msg = document.querySelector('#uploadMsg')?.textContent || '';
      return /published successfully|live publish failed|missing sheet|not recognized|could not identify|invalid|failed:/i.test(msg);
    }, null, {timeout: 240000});
  } catch (error) {
    const msg = await page.locator('#uploadMsg').textContent().catch(() => '');
    throw new Error('No confirmed publish result. Dashboard message: ' + (msg || '[none]') + '. ' + error.message);
  }
  const message = (await page.locator('#uploadMsg').textContent()) || '';
  if (!/published successfully/i.test(message)) {
    throw new Error('Dashboard did not confirm LIVE publish: ' + message);
  }
  console.log('\nSUCCESS: ' + message.trim());
  console.log('Dashboard: ' + DASHBOARD);
  return page;
}

async function main() {
  const mode = process.argv[2] || 'run';
  if (!['setup', 'run'].includes(mode)) {
    console.error('Usage: node ots-seven-reports.mjs setup | run');
    process.exitCode = 2;
    return;
  }
  await fs.mkdir(ROOT, {recursive: true, mode: 0o700});
  if (mode === 'run') await loadConfig(); // fail before launching browser
  const rl = createInterface({input, output});
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'agra-ots-reports-'));
  const browser = await chromium.launch({headless: false});
  const context = await browser.newContext({acceptDownloads: true});
  let captureActive = false;
  const tapLog = [];
  await context.exposeBinding('__otsRecordClick', (source, detail) => {
    if (!captureActive || !source.page || typeof detail?.selector !== 'string') return;
    try {
      if (new URL(source.page.url()).origin !== ORIGIN) return;
      if (!detail.path?.startsWith('/') || detail.path.startsWith('//')) return;
      tapLog.push({path: detail.path, selector: detail.selector});
    } catch (_) {}
  });
  await context.addInitScript({path: path.join(HERE, 'capture.js')});
  const page = await context.newPage();
  try {
    await page.goto(PORTAL, {waitUntil: 'domcontentloaded', timeout: 90000});
    console.log('Use YOUR government-portal login in the opened browser. Complete any OTP/CAPTCHA yourself.');
    console.log('Do not type credentials in this terminal or store them in the repository.');
    await rl.question('After login, navigate to the report section and press Enter HERE: ');
    let files, rankingFile = null;
    if (mode === 'setup') {
      const recorded = [];
      files = [];
      for (let i = 0; i < REPORTS.length; i++) {
        const report = REPORTS[i];
        console.log('\nReport ' + (i + 1) + '/7: ' + report.label);
        console.log('Navigate/click inside the OTS portal to export this report.');
        await rl.question('Press Enter HERE immediately BEFORE starting those clicks: ');
        const start = tapLog.length;
        captureActive = true;
        const watcher = watchDownload(context);
        let download;
        try { download = await watcher.promise; }
        finally { captureActive = false; }
        await sleep(350); // allow asynchronous click binding events to arrive
        const steps = tapLog.slice(start);
        if (!steps.length) throw new Error('No report-export click was captured for ' + report.label);
        files.push(await storeDownload(download, temporary, report.key, i));
        recorded.push({key: report.key, label: report.label, steps});
        console.log('Captured ' + steps.length + ' click(s) for ' + report.label + '.');
      }
      let ranking = null;
      const answer = (await rl.question('\nRecord the 8th statewide DHQ ranking report now? Type YES to include: ')).trim().toLowerCase();
      if (answer === 'yes') {
        console.log('Navigate to the DHQ 75 ULB ranking report. Start its export after pressing Enter.');
        await rl.question('Press Enter immediately BEFORE the eighth export clicks: ');
        const start = tapLog.length;
        captureActive = true;
        const watcher = watchDownload(context);
        let download;
        try {download = await watcher.promise}
        finally {captureActive = false}
        await sleep(350);
        const steps = tapLog.slice(start);
        if (!steps.length) throw new Error('No eighth-report export click was captured.');
        rankingFile = await storeDownload(download, temporary, 'ranking', 7);
        ranking = {...RANKING, steps};
      }
      const cfg = {version: 1, portalOrigin: ORIGIN, reports: recorded, ranking};
      await fs.writeFile(CONFIG, JSON.stringify(cfg, null, 2), {mode: 0o600});
      console.log('\nLocal selector setup saved (no passwords or report data): ' + CONFIG);
    } else {
      const cfg = await loadConfig();
      files = await replay(page, context, cfg, temporary);
      rankingFile = await replayRanking(page, context, cfg.ranking, temporary);
    }
    if (files.length !== 7) throw new Error('Exactly seven reports are required.');
    captureActive = false;
    await uploadToDashboard(context, rl, files, rankingFile);
  } finally {
    captureActive = false;
    await browser.close();
    await fs.rm(temporary, {recursive: true, force: true});
    rl.close();
  }
}

main().catch(error => {
  console.error('\nSTOPPED: ' + (error?.message || String(error)));
  console.error('No success is claimed unless the existing dashboard confirms live publication.');
  process.exitCode = 1;
});
