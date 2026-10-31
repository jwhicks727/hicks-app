# Home-screen icon options

The app's icon is made from one of these square pictures. Both are Jason's
ChatGPT reworkings of the app's sprout (Lucide's, ISC licence), kept as
stand-ins until a human-made icon replaces them (docs/DECISIONS-LOG.md).

| Picture | Status |
|---|---|
| `sprout-outline.png` | In use |
| `sprout-leafy.png` | Pinned, then set aside: too busy at home-screen size (Jason) |
| `h-sprout.png` | A white, blocky H with a seedling rising from its crossbar (Jason's idea, 2026-11-01): to choose from |
| `h-leaf.png` | An H whose stems are two tall leaves, joined by a vine: to choose from |
| `h-caprasimo.png` | The app's own Caprasimo H, a leaf unfurling from its shoulder: to choose from |

`compare.png` shows the two sprouts on a phone's home screen, as Android's
circle and as the browser tab's icon; `compare-h.png` shows the three H's
beside the sprout now in use, large and at home-screen size. The H's are
simple shapes drawn in code on the current icon's own gradient
(`scripts/draw-h-icons.cjs`), not made by an image generator.

To switch, from the repository (needs Playwright's Chromium):

```sh
node scripts/make-icons.mjs docs/icon-options/sprout-leafy.png
```

That rewrites every size in `public/icons/`; update the table above and the
README's credits to match.
