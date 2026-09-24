# OTS 7 + optional 8th-ranking report automation

This is an **optional local helper** for the existing production dashboard, with a separate optional statewide ranking export. It does not replace the dashboard, edit its calculation engine, or save government login credentials. It opens a real Chromium window on your own Mac/Windows computer.

## What it does

- First-time setup: after YOU sign in to `upulbots.in`, record click paths for each of the seven report exports and optionally the eighth statewide DHQ ranking export. The click recorder retains CSS selectors and page paths only, never input values, passwords, cookies, OTPs or response bodies.
- First-time setup also downloads the reports and sends the seven original reports, plus the optional separate ranking report, to the existing website through its original **Manage Reports → Submit Reports & Recalculate** flow.
- Later: after YOU sign in, replay the recorded clicks to download the seven original reports and optional eighth ranking report, then open the dashboard for your separate dashboard admin login and upload them. It waits for the existing dashboard's explicit live-publication success message.
- Temporary downloaded files are stored only on your computer and removed on normal program exit. Nothing is committed to GitHub.

The website's content-based seven-report identifier, reconciliation, manual mappings and publish code remain authoritative. Do not infer that an Excel download or dashboard upload succeeded merely because a button was clicked.

## Prerequisites

Node.js 20+ and a desktop machine (Mac or Windows) with a GUI. This helper is **not** meant to run on GitHub Pages, iPhone/iPad Safari, GitHub Actions or an unattended server. Install only on a computer authorized to access the departmental reports.

From the repository's `automation` folder:

```bash
npm install
npx playwright install chromium
npm run setup
```

Follow the terminal prompts and use the opened browser to log in yourself. For each named report, press Enter *before* clicking through the OTS reporting screens and exporting that report. Click only the actions needed for that export; avoid unrelated clicks. When the seventh download is complete, the existing OTS dashboard opens in a second tab. Log in to its **separate dashboard administrator account**, leave the Manage Reports dialog open and press Enter in the terminal. The helper selects the seven files and invokes the normal submit/recalculate pipeline.

After a successful setup, later runs use:

```bash
npm run refresh
```

The selector plan is at `~/.agra-ots-automation/selectors.json` (Windows: your user home folder). It contains no government passwords or taxpayer rows. Do **not** copy it to a public repository if internal page paths are sensitive.

## Safeguards and limitations

- You must complete login, OTP and CAPTCHA yourself. No bypass is attempted. A separate dashboard administrator login is also required.
- First setup can record clicks and navigation, **not changed filter input values**. If a report needs a manually chosen date range or select menu value, use appropriate defaults before recording or extend/review this script locally. Verify the date range on the downloaded reports.
- Portal layout/IDs may change. If replay stops, run `npm run setup` again. Never silently treat failed downloads or a failed live publish as success.
- Downloads and reports are temporary local files; a crash may leave files in the system temp directory named `agra-ots-reports-*`. Delete those securely according to your workplace retention policy.
- The helper is untested against the authenticated departmental pages until you use your account. There is no claim of an official government API or fully unattended integration.
- Keep the private applicant/receipt spreadsheets out of the public GitHub repository. The dashboard's existing browser-local/controlled publishing path is used as-is.

## Report order

1. Applications
2. Zone/Ward Application Summary
3. Collection Report
4. FULL Payment Data
5. PART Payment Data
6. In-Process Report
7. Approved Application Summary

The eighth report is optional and recorded in the same local selectors configuration. To add it to an older seven-report setup, rerun `npm run setup` and record all exports. The script asks for the eighth report's as-of date at each import; it does not guess this date. The existing website identifies the seven original report types from **content**, not user filenames. Wrong/duplicate reports should be rejected by its validator.

## Eighth report integration

The new dashboard ranking panel uses the separate 75-ULB DHQ dataset to show Agra's received-amount rank, Top Five leaderboard, immediate higher/lower collection gaps, and directional arrows only when two dated statewide snapshots exist. Original seven input files, calculations and original local private data handling are unchanged. If the optional eighth export is absent, the previous ranking remains available and is explicitly labelled as a historical reference until a dated DHQ report is supplied.


## Dashboard's "Update Dashboard" button (Mac/Windows)

The public GitHub Pages website cannot directly sign into the separate government portal, use its cookies, or fetch protected exports. This feature therefore requires the **local helper** running on your own computer; it is not a remotely hosted or unattended government login.

One-time setup (record the seven export clicks, plus the optional statewide ranking export):

~~~bash
cd automation
npm install
npx playwright install chromium
npm run setup
~~~

Then, whenever you want to update from the website, keep a terminal open and run:

~~~bash
npm run bridge
~~~

Visit https://xuvish.github.io/agra-nagar-nigam-ots-2026/ots/ and click **Update Dashboard**. An embedded local page (127.0.0.1 only) requests your government ID/password and your *separate* dashboard administrator ID/password. Credentials do **not** pass through the public GitHub Pages JavaScript, are not stored in the repository, and are never sent to a third-party login relay. If Chrome blocks the embedded local page, choose **Open local helper** and use the same form directly at http://127.0.0.1:8765/control.

The helper opens visible Chromium on the official OTS domain, attempts to prefill an unambiguous login form and then **waits for you to complete official login, CAPTCHA and OTP yourself**. Press **I have completed official login · Continue** in the local page. The helper then replays the recorded exports, validates all seven via the existing content-based importer, and publishes through the existing administrator workflow. If an eighth ranking report was recorded it is uploaded separately through the ranking popup after the seven reports are published. Progress and failures are shown with actual states—nothing is labelled successful until the existing dashboard confirms publication.

The local helper must remain running while a refresh is under way. Do not paste credentials into ChatGPT or commit files in your local report directory. Closing the terminal stops the helper. Changes to government portal pages/export controls can invalidate recorded selectors; rerun npm run setup if that happens. If the page's original seven-report reconciliation fails, the helper stops and reports the failure instead of publishing guessed totals. There is no claim of a completed authenticated end-to-end test without your account.
