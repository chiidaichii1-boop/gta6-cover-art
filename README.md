# Vice Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/chiidaichii1-boop/gta6-cover-art/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/chiidaichii1-boop/gta6-cover-art/reward.svg)](https://make.fun/c/gta6-cover-art-01)

Turn any photo and a caption into GTA-style poster cover art, in the browser, offline.

Vice Cover Studio is a free offline web app: pick your photos (or use the four
samples), drop them into a multi-panel poster layout, pick a neon-sunset grade,
write a caption, and export a PNG to share. Your photos never leave your machine
— there is no upload, no account, and no network request at all.

## What it does

- **Multi-panel covers** — five poster layouts: Hero + Three, Four Corners,
  Full Bleed, Tilted Snap, and Nine Panel. Fill the panels with one photo or
  several, one per panel.
- **Any photo** — upload up to 12 photos, drag to pan each one inside its
  panel, scroll or slide to zoom, reset the framing, or fill every panel with
  one photo.
- **Sunset grades** — five colour grades (Sunset, Neon Night, Vice, Noir,
  Golden Hour) plus film grain and a vignette.
- **Bold lettering** — the title is set in Anton (SIL Open Font License) with
  an outline, the subtitle in Pacifico script, in white, sun yellow or hot
  pink, at the top or the bottom.
- **Fast export** — one click exports a PNG in Square 1080 × 1080, Portrait
  1080 × 1350, or Wide 1920 × 1080 — or all three sizes at once.

## Try it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no
install, no network.

## How it is built

- `app/index.html` — the editor page.
- `app/style.css` — the dark neon editor UI.
- `app/src/cover.js` — the cover engine: layouts, grades, lettering, grain.
- `app/src/main.js` — the editor wiring: photos, drag and zoom, export.
- `app/src/shots.js` — fixed scenes for the screenshots.
- `app/fonts/` — Anton and Pacifico under the SIL Open Font License.
- `app/samples/` — four sample photos made with an image model, free to use.
- `main.ts` — the entry program: copies `app/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library.

Everything in this repository is original work. It contains no Rockstar Games
logo, artwork, or font.

## License

MIT — see [LICENSE](LICENSE).
