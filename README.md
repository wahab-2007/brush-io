# Brush IO

[Open Brush IO](https://wahab-2007.github.io/brush-io/) · [Tutorial](#tutorial)

## Tutorial

1. Open [Brush IO](https://wahab-2007.github.io/brush-io/). Scroll inside the calendar to browse years. Click a year on the left, or paint any cell, to make that year active.
2. Left-click a cell to add one and right-click to subtract one. Hold either mouse button to repeat faster over time, or drag across cells to paint them in one stroke. Adding and subtracting have distinct sounds. Hovering shows the date and count silently. Use **Undo** to reverse a stroke, **Redo** to replay it, or the red **X** at the far left to clear the active year.
3. Use the arrow keys to move between cells, **Enter** or **+** to add, and **−** to subtract. On a touchscreen, tap to add.
4. Click the color cubes to choose a chart palette. **Rainbow** uses seven colors for counts from one through seven or more. Open **Theme** in the toolbar to choose **True Light**, **True Dark**, or another site theme. **System** follows your device and uses the matching True theme. The circular **?** just to its right opens help. The site theme and chart palette are saved in your browser. When **Disco** is active, open **Theme** again to play or pause its music.
5. Select **Download Script** to export the active year, then follow [Run the generated script](#run-the-generated-script). Your canvas is saved in your browser.

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
