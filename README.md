# Brush IO

A blank contribution calendar for planning Git commits. Select a year, click a day, and set its count. Use the arrow keys to move between days and Enter to edit. Edits are saved in your browser. Select **Copy Python** or **Download Python** to export the current year.

Choose a **Brush** preset or a custom amount to add commits per click. **Randomize** replaces the current edits with a new plan. The density slider controls how likely each day is to receive an addition. **FILL ALL** adds one to every displayed day. You can undo either fill as one edit. Use **Sound** to mute the gentle feedback for clicks, hovering over calendar cells, and slider changes. Hover feedback starts after the browser receives a click or keypress.

**Site theme** changes the workspace colors. Click the **Palette** cubes to change the calendar independently and includes Mono and Black & White. Use **Odd months** to pick a second palette for January, March, May, July, September, and November. Select **Disco** for a light show and an original looping track. **Pause music** controls the track separately from brush sounds.

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
