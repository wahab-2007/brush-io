# Brush IO

[Open Brush IO](https://wahab-2007.github.io/brush-io/) · [Tutorial](#tutorial)

## Tutorial

1. Open [Brush IO](https://wahab-2007.github.io/brush-io/). Choose a year beside **Normal** and **Expanded**.
2. Click a day, set its commit count, and select **Apply**. Use the arrow keys to move between days and Enter to edit.
3. Open **Tools** in the footer to choose a brush, adjust random fill density, use **Randomize** or **FILL ALL**, or toggle sound. **FILL ALL** adds one to every day.
4. Click the **Palette** cubes to recolor the chart. Choose an **Odd months** palette to alternate colors. Use the site theme selector in the footer to change the rest of the page. **Disco** has a separate music control.
5. Open **Presets** in the footer, enter a name, and select **Save**. The browser keeps your calendar, palettes, and chart size. Pick a saved preset and select **Load** to restore it, or **Delete** to remove it.
6. Select **Copy Python** or **Download Python**, then follow [Run the generated script](#run-the-generated-script). Use the JSON export to back up the current canvas.

## Run locally

Use Node.js 24.10 or newer. Run `npm ci` and `npm run dev`. The app uses no API, account data, or server credentials.

Run `npm test` for the canvas tests and Python integration tests, which use a temporary local Git repository. To verify the static build in Chromium, run `npm run build` and `npm run test:browser`. If Chromium is unavailable, install it with `npx playwright-core install chromium` or set `CHROMIUM_PATH`.

## GitHub Pages

The built site is on the `gh-pages` branch. In **Settings → Pages**, select **Deploy from a branch**, then `gh-pages` and `/(root)`. The project site is served at **https://wahab-2007.github.io/brush-io/**. To publish later changes, run `npm run build` and update the files on `gh-pages` with the contents of `dist/`, keeping `.nojekyll` at the root.

## Run the generated script

Keep the script outside a clean local repository you control. Run these commands from that repository with Python 3.9 or newer and Git installed.

```text
python /path/to/github_contributions.py --dry-run
python /path/to/github_contributions.py --apply
python /path/to/github_contributions.py --push
```

The script uses your configured Git author identity and timestamps at midnight UTC by default. `--apply` confirms and creates local commits. `--push` confirms and pushes an already completed plan. Use an email associated with your GitHub account for contributions to qualify. GitHub determines which commits appear on a profile.
