# Home-screen icon options

The app's icon is made from one of these square pictures. Both are Jason's
ChatGPT reworkings of the app's sprout (Lucide's, ISC licence), kept as
stand-ins until a human-made icon replaces them (docs/DECISIONS-LOG.md).

| Picture | Status |
|---|---|
| `sprout-outline.png` | In use until 2026-11-01; set aside for the Agbalumo H |
| `sprout-leafy.png` | Pinned, then set aside: too busy at home-screen size (Jason) |
| `h-sprout.png` | A white, blocky H with a seedling rising from its crossbar (Jason's idea, 2026-11-01): to choose from |
| `h-leaf.png` | An H whose stems are two tall leaves, joined by a vine: to choose from |
| `h-caprasimo.png` | The app's own Caprasimo H, a leaf unfurling from its shoulder: to choose from |
| `h-matemasie.png` | Matemasie's H: a seed opening into its first two leaves (and a heart) |
| `h-microbe.png` | Rubik Microbe's H: built of cells |
| `h-wetpaint.png` | Rubik Wet Paint's H: still wet, dripping off the brush |
| `h-bubbles.png` | Rubik Bubbles' H: foam, or a cumulus cloud building |
| `h-hanalei.png` | Hanalei Fill's H: two stalks of bamboo, knuckled at every node |
| `h-darumadrop.png` | Darumadrop One's H: ink soaking into paper fibre, every edge ragged |
| `h-agbalumo.png` | **In use** (Jason's pick, 2026-11-01). Agbalumo's H: named for the African star apple, with ripe, swelling curves. `h-agbalumo-maskable.png` is its Android version, the H smaller so a circle crop keeps it |
| `h-beastly.png` | Rubik Beastly's H: furred, or a thistle head |
| `h-akaya.png` | Akaya Kanadaka's H: two knobbly twigs, lashed together |
| `h-moonrocks.png` | Rubik Moonrocks' H: pumice, stone full of holes |

`compare.png` shows the two sprouts on a phone's home screen, as Android's
circle and as the browser tab's icon; `compare-h.png` shows the first three
H's beside the sprout now in use, large and at home-screen size, and
`compare-h2.png` the ten font H's the same way. All are drawn by
`scripts/draw-h-icons.cjs` on the current icon's own gradient, not made by an
image generator: the first three are simple shapes (and the app's Caprasimo),
the ten are each font's own H with nothing added. Those fonts come from
Google Fonts under the SIL Open Font License.

To switch, from the repository (needs Playwright's Chromium):

```sh
node scripts/make-icons.mjs docs/icon-options/sprout-leafy.png
```

That rewrites every size in `public/icons/`; update the table above and the
README's credits to match.
